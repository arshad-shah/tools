import { describe, expect, it } from 'vitest';
import { curlEscape, parseCurl } from './parse';
import { splitMsvcrt, splitPosix, uncaret } from './shell-words';

const req = (cmd: string) => parseCurl(cmd).request;

describe('shell words', () => {
  it('splits POSIX quoting, escapes and line continuations', () => {
    expect(
      splitPosix(`curl 'a b' "c \\"d\\" $e" f\\ g \\\n  -H $'x\\ty' ''`),
    ).toEqual(['curl', 'a b', 'c "d" $e', 'f g', '-H', 'x\ty', '']);
  });

  it('returns unquoted operators as their own words', () => {
    expect(splitPosix('curl a | jq . && echo "x|y"')).toEqual([
      'curl',
      'a',
      '|',
      'jq',
      '.',
      '&&',
      'echo',
      'x|y',
    ]);
    expect(splitPosix('curl http://a?x=1&y=2')).toEqual([
      'curl',
      'http://a?x=1&y=2',
    ]);
  });

  it('rejects an unterminated quote', () => {
    expect(() => splitPosix("curl 'abc")).toThrow(/unterminated/);
  });

  it('removes cmd carets and splits like the C runtime', () => {
    expect(uncaret('a ^"b^" ^\r\n c^^')).toBe('a "b"  c^');
    expect(splitMsvcrt('curl "a b" c\\d "e\\"f" "g""h" \\\\"i j"')).toEqual([
      'curl',
      'a b',
      'c\\d',
      'e"f',
      'g"h',
      '\\i j',
    ]);
  });
});

describe('parseCurl', () => {
  it('reads method, headers, data and the URL', () => {
    const p = parseCurl(
      `curl -X PUT https://api.example.com/items/1 -H 'Content-Type: application/json' -H "Accept: */*" -d '{"a":1}'`,
    );
    expect(p.request).toMatchObject({
      method: 'PUT',
      url: 'https://api.example.com/items/1',
      headers: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Accept', value: '*/*' },
      ],
      body: { kind: 'data', text: '{"a":1}' },
    });
    expect(p.ignored).toEqual([]);
    expect(p.dialect).toBe('posix');
  });

  it('infers POST from data and GET otherwise', () => {
    expect(req('curl example.com').method).toBe('GET');
    expect(req('curl example.com').url).toBe('http://example.com');
    expect(req('curl -d a=1 https://x.test').method).toBe('POST');
    expect(req('curl -I https://x.test').method).toBe('HEAD');
    expect(req('curl -T file.bin https://x.test').method).toBe('PUT');
  });

  it('joins several -d parts with & and handles --data-urlencode', () => {
    const r = req(
      `curl https://x.test -d a=1 --data-raw '@b=2' --data-urlencode 'q=hello world&more' --data-urlencode =x/y --data-urlencode 'plain text'`,
    );
    expect(r.body).toEqual({
      kind: 'data',
      text: 'a=1&@b=2&q=hello%20world%26more&x%2Fy&plain%20text',
    });
  });

  it('curl-escapes the characters encodeURIComponent keeps', () => {
    expect(curlEscape("a!b'(c)*")).toBe('a%21b%27%28c%29%2A');
  });

  it('-G moves data into the query string', () => {
    const r = req(
      'curl -G https://x.test/s?lang=en -d q=cats --data-urlencode "n=a b"',
    );
    expect(r.method).toBe('GET');
    expect(r.url).toBe('https://x.test/s?lang=en&q=cats&n=a%20b');
    expect(r.body.kind).toBe('none');
  });

  it('keeps the fragment after added query parameters', () => {
    expect(req('curl -G https://x.test/p#top -d a=1').url).toBe(
      'https://x.test/p?a=1#top',
    );
  });

  it('--json sets the JSON headers unless given', () => {
    const r = req(`curl --json '{"x":true}' https://x.test`);
    expect(r.method).toBe('POST');
    expect(r.headers).toEqual([
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Accept', value: 'application/json' },
    ]);
    const r2 = req(
      `curl --json @body.json -H 'accept: text/plain' https://x.test`,
    );
    expect(r2.headers).toContainEqual({ name: 'accept', value: 'text/plain' });
    expect(r2.body).toEqual({ kind: 'file', path: 'body.json', upload: false });
  });

  it('reads -F fields, files and their attributes', () => {
    const r = req(
      `curl -F name=Ada -F 'photo=@me.png;type=image/png;filename=avatar.png' -F 'note=<notes.txt' --form-string 'raw=@literal' https://x.test/upload`,
    );
    expect(r.method).toBe('POST');
    expect(r.body).toEqual({
      kind: 'form',
      fields: [
        { name: 'name', value: 'Ada' },
        {
          name: 'photo',
          value: 'me.png',
          file: true,
          type: 'image/png',
          filename: 'avatar.png',
        },
        { name: 'note', value: 'notes.txt', file: true },
        { name: 'raw', value: '@literal' },
      ],
    });
  });

  it('reads -u, -b, -A, -e and --oauth2-bearer', () => {
    const p = parseCurl(
      `curl -u 'ada:s3:cret' -b 'a=1' -b 'b=2' -A 'Bot/1' -e 'https://ref.test;auto' --oauth2-bearer tok https://x.test`,
    );
    expect(p.request.auth).toEqual({ user: 'ada', pass: 's3:cret' });
    expect(p.request.cookie).toBe('a=1; b=2');
    expect(p.request.headers).toEqual([
      { name: 'User-Agent', value: 'Bot/1' },
      { name: 'Referer', value: 'https://ref.test' },
      { name: 'Authorization', value: 'Bearer tok' },
    ]);
  });

  it('reports a cookie file and -u without a password', () => {
    const p = parseCurl('curl -b jar.txt -u ada https://x.test');
    expect(p.ignored).toEqual([
      expect.objectContaining({ option: '-b', value: 'jar.txt' }),
    ]);
    expect(p.warnings[0]).toMatch(/no password/);
  });

  it('reads flags: --compressed, -k, -L and short clusters', () => {
    const r = req('curl -sSLk --compressed -XPOST -Hx-a:1 https://x.test');
    expect(r).toMatchObject({
      method: 'POST',
      compressed: true,
      insecure: true,
      location: true,
      headers: [{ name: 'x-a', value: '1' }],
    });
  });

  it('reports every option it ignores, with a reason', () => {
    const p = parseCurl(
      'curl -s -o out.json --max-time 5 --proxy http://p:8080 --digest --frobnicate -Z https://x.test https://y.test',
    );
    const by = Object.fromEntries(p.ignored.map((i) => [i.option, i]));
    expect(by['-s'].reason).toMatch(/prints or saves/);
    expect(by['-o']).toMatchObject({ value: 'out.json' });
    expect(by['--max-time'].reason).toMatch(/connects/);
    expect(by['--proxy']).toMatchObject({ value: 'http://p:8080' });
    expect(by['--digest'].reason).toMatch(/basic auth/);
    expect(by['--frobnicate'].reason).toMatch(/Not recognised/);
    expect(by['-Z'].reason).toMatch(/Not recognised/);
    expect(by['https://y.test'].reason).toMatch(/first URL/);
  });

  it('stops at a pipe and says so', () => {
    const p = parseCurl("curl https://x.test | jq '.items'");
    expect(p.request.url).toBe('https://x.test');
    expect(p.warnings[0]).toMatch(/first command/);
  });

  it('header edge cases: empty value, removal, file', () => {
    const p = parseCurl(
      "curl -H 'X-Empty;' -H 'Accept:' -H @headers.txt https://x.test",
    );
    expect(p.request.headers).toEqual([{ name: 'X-Empty', value: '' }]);
    expect(p.warnings[0]).toMatch(/removes a header/);
    expect(p.ignored[0]).toMatchObject({ option: '-H', value: '@headers.txt' });
  });

  it('parses Chrome "Copy as cURL (cmd)" output', () => {
    const cmd = [
      'curl ^"https://example.com/api?x=1^&y=2^" ^',
      '  -H ^"accept: application/json^" ^',
      '  -H ^"content-type: application/json^" ^',
      '  --data-raw ^"^{^\\^"name^\\^":^\\^"Ada Lovelace^\\^"^}^" ^',
      '  --compressed',
    ].join('\r\n');
    const p = parseCurl(cmd);
    expect(p.dialect).toBe('cmd');
    expect(p.request).toMatchObject({
      method: 'POST',
      url: 'https://example.com/api?x=1&y=2',
      headers: [
        { name: 'accept', value: 'application/json' },
        { name: 'content-type', value: 'application/json' },
      ],
      body: { kind: 'data', text: '{"name":"Ada Lovelace"}' },
      compressed: true,
    });
  });

  it('parses Chrome "Copy as cURL (bash)" output with $-quoting', () => {
    const cmd = `curl 'https://example.com/a' \\\n  -H 'accept-language: en' \\\n  --data-raw $'{"t":"it\\'s"}'`;
    expect(req(cmd).body).toEqual({ kind: 'data', text: `{"t":"it's"}` });
  });

  it('accepts a prompt, curl.exe and a full path', () => {
    expect(req('$ curl https://x.test').url).toBe('https://x.test');
    expect(req('curl.exe https://x.test').url).toBe('https://x.test');
    expect(req('/usr/bin/curl https://x.test').url).toBe('https://x.test');
  });

  it('rejects text that is not a curl command', () => {
    expect(() => parseCurl('')).toThrow(/Paste a curl command/);
    expect(() => parseCurl('wget https://x.test')).toThrow(/not a curl/);
    expect(() => parseCurl('curl -s')).toThrow(/no URL/);
    expect(() => parseCurl('curl https://x.test -H')).toThrow(/needs a value/);
  });

  it('-r becomes a Range header and --url-query adds to the query', () => {
    const r = req(
      "curl -r 0-99 --url-query 'q=a b' --url-query '+raw=%41' https://x.test/p",
    );
    expect(r.headers).toEqual([{ name: 'Range', value: 'bytes=0-99' }]);
    expect(r.url).toBe('https://x.test/p?q=a%20b&raw=%41');
  });
});
