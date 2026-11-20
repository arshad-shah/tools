import { describe, expect, it } from 'vitest';
import { toCurl } from './gen-curl';
import { toGo } from './gen-go';
import { toHttpie } from './gen-httpie';
import { toAxios, toFetch } from './gen-js';
import { toPhp } from './gen-php';
import { toPython } from './gen-python';
import {
  goString,
  jsString,
  phpString,
  pyLiteral,
  pyString,
  shQuote,
} from './literals';
import { effectiveHeaders, formPairs } from './model';
import { parseCurl } from './parse';
import { TARGETS } from './targets';

const req = (cmd: string) => parseCurl(cmd).request;

const JSON_POST = req(
  `curl -X POST https://api.test/users -H 'Content-Type: application/json' -d '{"name":"Ada","admin":false,"tags":null}' -u ada:pw -k`,
);
const FORM = req(
  `curl -F name=Ada -F 'photo=@me.png;type=image/png' https://api.test/upload`,
);
const URLENC = req(`curl https://api.test/login -d user=ada -d 'pass=a b'`);

describe('literals', () => {
  it('quotes for each language', () => {
    expect(shQuote('abc-1.2/x:y')).toBe('abc-1.2/x:y');
    expect(shQuote("it's")).toBe(`'it'\\''s'`);
    expect(jsString("a'b\n\\")).toBe(`'a\\'b\\n\\\\'`);
    expect(pyString("a'b\t")).toBe(`'a\\'b\\t'`);
    expect(goString('a"b')).toBe('`a"b`');
    expect(goString('plain')).toBe('"plain"');
    expect(goString('a`"b')).toBe('"a`\\"b"');
    expect(goString('a\nb')).toBe('`a\nb`');
    expect(phpString("a'b\\")).toBe(`'a\\'b\\\\'`);
    expect(pyLiteral({ a: [true, null, 1.5] })).toBe(
      "{\n    'a': [True, None, 1.5],\n}",
    );
    expect(pyLiteral([{ a: 1 }])).toBe("[\n    {\n        'a': 1,\n    },\n]");
  });
});

describe('model helpers', () => {
  it('adds the urlencoded Content-Type and Cookie curl sends itself', () => {
    const r = req("curl -d a=1 -b 's=1' https://x.test");
    expect(effectiveHeaders(r)).toEqual([
      { name: 'Content-Type', value: 'application/x-www-form-urlencoded' },
      { name: 'Cookie', value: 's=1' },
    ]);
    expect(effectiveHeaders(req('curl -T f https://x.test'))).toEqual([]);
  });

  it('splits urlencoded bodies only when they are clean pairs', () => {
    expect(formPairs(URLENC)).toEqual([
      ['user', 'ada'],
      ['pass', 'a b'],
    ]);
    expect(formPairs(req("curl -d 'not pairs' https://x.test"))).toBeNull();
    expect(formPairs(JSON_POST)).toBeNull();
  });
});

describe('curl', () => {
  it('round-trips through the parser', () => {
    for (const r of [JSON_POST, FORM, URLENC]) {
      const again = parseCurl(toCurl(r)).request;
      expect(again).toEqual(r);
    }
  });

  it('writes one option per line and leaves the implied method out', () => {
    expect(toCurl(URLENC)).toBe(
      "curl https://api.test/login \\\n  --data-raw 'user=ada&pass=a b'",
    );
    expect(toCurl(req('curl https://x.test'))).toBe('curl https://x.test');
    expect(toCurl(req('curl -I https://x.test'))).toBe(
      'curl -I https://x.test',
    );
    expect(toCurl(req('curl -X DELETE https://x.test'))).toBe(
      'curl -X DELETE https://x.test',
    );
  });

  it('uses --form-string for a text value that would read as a file', () => {
    expect(toCurl(req("curl --form-string 'a=@b' https://x.test"))).toContain(
      '--form-string a=@b',
    );
  });
});

describe('fetch and axios', () => {
  it('fetch: JSON body, basic auth and the -k note', () => {
    const g = toFetch(JSON_POST);
    expect(g.code).toContain("await fetch('https://api.test/users', {");
    expect(g.code).toContain("method: 'POST',");
    expect(g.code).toContain("'Content-Type': 'application/json',");
    expect(g.code).toContain("Authorization: 'Basic ' + btoa('ada:pw'),");
    expect(g.code).toContain("body: JSON.stringify({\n    name: 'Ada',");
    expect(g.notes.join(' ')).toMatch(/certificate/);
  });

  it('fetch: multipart with files read by openAsBlob', () => {
    const g = toFetch(FORM);
    expect(g.code).toContain("import { openAsBlob } from 'node:fs';");
    expect(g.code).toContain("form.append('name', 'Ada');");
    expect(g.code).toContain(
      "form.append('photo', await openAsBlob('me.png', { type: 'image/png' }), 'me.png');",
    );
    expect(g.code).toContain('body: form,');
  });

  it('fetch: a plain GET has no options', () => {
    expect(toFetch(req('curl https://x.test')).code).toContain(
      "const response = await fetch('https://x.test');",
    );
  });

  it('axios: auth object and an https agent for -k', () => {
    const g = toAxios(JSON_POST);
    expect(g.code).toContain("import https from 'node:https';");
    expect(g.code).toContain("method: 'post',");
    expect(g.code).toContain("username: 'ada',");
    expect(g.code).toContain('rejectUnauthorized: false');
    expect(g.code).toContain("data: {\n    name: 'Ada',");
  });
});

describe('python', () => {
  it('json=, auth= and verify=False', () => {
    const { code } = toPython(JSON_POST);
    expect(code).toContain(
      "json_data = {\n    'name': 'Ada',\n    'admin': False,\n    'tags': None,\n}",
    );
    expect(code).toContain("auth=('ada', 'pw')");
    expect(code).toContain('verify=False');
    expect(code).toContain('requests.post(');
  });

  it('a urlencoded body becomes a dict, multipart becomes files', () => {
    expect(toPython(URLENC).code).toContain(
      "data = {\n    'user': 'ada',\n    'pass': 'a b',\n}",
    );
    const { code } = toPython(FORM);
    expect(code).toContain("('name', (None, 'Ada')),");
    expect(code).toContain(
      "('photo', ('me.png', open('me.png', 'rb'), 'image/png')),",
    );
    expect(code).not.toContain('Content-Type');
  });

  it('uses requests.request for other methods', () => {
    expect(toPython(req('curl -X PURGE https://x.test')).code).toContain(
      "requests.request('PURGE', 'https://x.test')",
    );
  });
});

describe('go', () => {
  it('builds a whole program with the body, headers and auth', () => {
    const { code } = toGo(JSON_POST);
    expect(code).toMatch(/^package main\n\nimport \(\n\t"crypto\/tls"/);
    expect(code).toContain('body := strings.NewReader(`{"name":"Ada",');
    expect(code).toContain(
      'req.Header.Set("Content-Type", "application/json")',
    );
    expect(code).toContain('req.SetBasicAuth("ada", "pw")');
    expect(code).toContain('InsecureSkipVerify: true');
  });

  it('writes multipart fields and files', () => {
    const { code } = toGo(FORM);
    expect(code).toContain('writer.WriteField("name", "Ada")');
    expect(code).toContain('h1.Set("Content-Type", "image/png")');
    expect(code).toContain(
      'req.Header.Set("Content-Type", writer.FormDataContentType())',
    );
    expect(code).toContain('"net/textproto"');
  });
});

describe('php and httpie', () => {
  it('php: options array', () => {
    const { code } = toPhp(JSON_POST);
    expect(code).toContain("CURLOPT_CUSTOMREQUEST => 'POST',");
    expect(code).toContain("CURLOPT_USERPWD => 'ada:pw',");
    expect(code).toContain('CURLOPT_SSL_VERIFYPEER => false,');
    expect(toPhp(FORM).code).toContain(
      "'photo' => new CURLFile('me.png', 'image/png', 'me.png'),",
    );
  });

  it('httpie: raw JSON, form items and multipart files', () => {
    expect(toHttpie(JSON_POST).code).toContain(
      `http --raw '{"name":"Ada","admin":false,"tags":null}' -a ada:pw --verify=no POST https://api.test/users`,
    );
    expect(toHttpie(URLENC).code).toContain(
      '--form POST https://api.test/login',
    );
    expect(toHttpie(URLENC).code).toContain("'pass=a b'");
    expect(toHttpie(FORM).code).toContain("'photo@me.png;type=image/png'");
    expect(toHttpie(req('curl -T a.bin https://x.test')).code).toBe(
      'http PUT https://x.test < a.bin',
    );
  });
});

describe('targets', () => {
  it('every target generates for every body kind', () => {
    for (const t of TARGETS)
      for (const r of [JSON_POST, FORM, URLENC, req('curl -I https://x.test')])
        expect(t.generate(r).code.length).toBeGreaterThan(10);
  });
});
