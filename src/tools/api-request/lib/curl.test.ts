import { describe, expect, it } from 'vitest';
import { parseCurl, tokenize } from './curl';

const kv = (rows: { key: string; value: string }[]) =>
  rows.map((r) => [r.key, r.value]);

describe('tokenize', () => {
  it('honours single quotes, double quotes and backslash continuations', () => {
    expect(tokenize(`curl 'a b' "c \\"d\\"" e\\ f \\\n  -s`)).toEqual([
      'curl',
      'a b',
      'c "d"',
      'e f',
      '-s',
    ]);
  });
  it('rejects an unterminated quote', () => {
    expect(() => tokenize(`curl 'oops`)).toThrow(/quote/);
  });
});

describe('parseCurl', () => {
  it('reads method, URL, header and JSON body', () => {
    const { request } = parseCurl(
      `curl -X POST 'https://a.b/c?x=1' -H 'Content-Type: application/json' -d '{"a":1}'`,
    );
    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://a.b/c?x=1');
    expect(kv(request.headers)).toEqual([['Content-Type', 'application/json']]);
    expect(request.body.kind).toBe('json');
    expect(request.body.text).toBe('{"a":1}');
  });

  it('turns -F file fields into form-data rows with a warning', () => {
    const { request, warnings } = parseCurl(
      `curl https://a.test -F 'name=Ada' -F 'f=@file.txt;type=text/plain'`,
    );
    expect(request.method).toBe('POST');
    expect(request.body.kind).toBe('form-data');
    expect(
      request.body.form.map((r) => [r.key, r.value, r.type ?? 'text']),
    ).toEqual([
      ['name', 'Ada', 'text'],
      ['f', 'file.txt', 'file'],
    ]);
    expect(warnings).toContain('Choose the file for f');
  });

  it('reads -u as basic auth', () => {
    expect(parseCurl('curl -u user:pass https://a.test').request.auth).toEqual({
      kind: 'basic',
      user: 'user',
      pass: 'pass',
    });
  });

  it('joins backslash line continuations', () => {
    const { request } = parseCurl(
      'curl \\\n  --request PUT \\\n  --url https://a.test/x \\\n  --header "X-A: 1"',
    );
    expect(request.method).toBe('PUT');
    expect(request.url).toBe('https://a.test/x');
    expect(kv(request.headers)).toEqual([['X-A', '1']]);
  });

  it('defaults to POST with form data and splits it into rows', () => {
    const { request } = parseCurl(
      `curl https://a.test -d 'a=1' --data-urlencode 'q=a b&c'`,
    );
    expect(request.method).toBe('POST');
    expect(request.body.kind).toBe('urlencoded');
    expect(kv(request.body.form)).toEqual([
      ['a', '1'],
      ['q', 'a b&c'],
    ]);
  });

  it('-G moves data into the query', () => {
    const { request } = parseCurl(`curl -G https://a.test -d 'a=1' -d b=2`);
    expect(request.method).toBe('GET');
    expect(kv(request.params)).toEqual([
      ['a', '1'],
      ['b', '2'],
    ]);
    expect(request.body.kind).toBe('none');
  });

  it('accepts attached short values and --long=value', () => {
    const { request } = parseCurl(
      `curl -XDELETE -H'X-A: 1' --url=https://a.test`,
    );
    expect(request.method).toBe('DELETE');
    expect(request.url).toBe('https://a.test');
    expect(kv(request.headers)).toEqual([['X-A', '1']]);
  });

  it('lists unknown and browser-impossible options as warnings', () => {
    const { warnings } = parseCurl(
      'curl -s -L --compressed -k --frobnicate https://a.test',
    );
    expect(warnings).toEqual([
      'Certificate checks cannot be turned off in a browser (-k ignored)',
      'Ignored unknown option --frobnicate',
    ]);
  });

  it('keeps raw text bodies with their content type', () => {
    const { request } = parseCurl(
      `curl https://a.test -H 'Content-Type: text/plain' --data-raw 'hello there'`,
    );
    expect(request.body).toMatchObject({
      kind: 'raw',
      text: 'hello there',
      contentType: 'text/plain',
    });
  });

  it('refuses text that is not a curl command or has no URL', () => {
    expect(() => parseCurl('wget x')).toThrow(/cURL/);
    expect(() => parseCurl('curl -s')).toThrow(/URL/);
  });
});
