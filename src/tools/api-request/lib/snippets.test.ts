/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { parseCurl } from './curl';
import { buildRequest } from './http';
import { emptyRequest, type HttpRequest, type KvRow } from './model';
import { SNIPPET_LANGS, toSnippet } from './snippets';

let n = 0;
const row = (key: string, value: string, over: Partial<KvRow> = {}): KvRow => ({
  id: `r${++n}`,
  enabled: true,
  key,
  value,
  ...over,
});

const jsonPost = (): HttpRequest =>
  emptyRequest({
    method: 'POST',
    url: 'https://api.test/users',
    params: [row('q', "it's here")],
    headers: [row('X-Trace', 'a b')],
    auth: { kind: 'basic', user: 'ada', pass: 'p:w' },
    body: {
      kind: 'json',
      text: '{"name":"Ada","admin":true,"tags":null}',
      form: [],
      contentType: '',
    },
  });

/** What actually goes on the wire, for comparing requests. */
async function wire(req: HttpRequest) {
  const b = buildRequest(req, {});
  return {
    url: b.url,
    method: b.init.method,
    headers: [...b.init.headers].sort(),
    body: await new Request(b.url, b.init).text(),
  };
}

describe('toSnippet', () => {
  it('cURL round-trips through parseCurl to an equal request', async () => {
    for (const req of [
      jsonPost(),
      emptyRequest({
        url: 'https://a.test/x',
        headers: [row('Accept', '*/*')],
      }),
      emptyRequest({
        method: 'PUT',
        url: 'https://a.test/x',
        auth: { kind: 'bearer', token: 't0k' },
        body: {
          kind: 'urlencoded',
          text: '',
          contentType: '',
          form: [row('a', '1&2'), row('b', 'x y')],
        },
      }),
      emptyRequest({
        method: 'PATCH',
        url: 'https://a.test/x',
        body: {
          kind: 'raw',
          text: "it's raw",
          form: [],
          contentType: 'text/plain',
        },
      }),
    ]) {
      const back = parseCurl(toSnippet(req, 'curl')).request;
      expect(await wire(back)).toEqual(await wire(req));
    }
  });

  it('Python uses requests.post with json= for JSON bodies', () => {
    const py = toSnippet(jsonPost(), 'python');
    expect(py).toContain('response = requests.post(url,');
    expect(py).toContain(
      'json={\n        "name": "Ada",\n        "admin": True,\n        "tags": None,\n    }',
    );
    expect(py).toContain('auth=("ada", "p:w")');
    expect(py).not.toContain('Content-Type');
    expect(py).toContain('url = "https://api.test/users?q=it%27s+here"');
  });

  it('keeps variables unless values are included', () => {
    const req = emptyRequest({
      url: '{{base}}/x',
      headers: [row('Authorization', 'Bearer {{token}}')],
    });
    const plain = toSnippet(req, 'curl');
    expect(plain).toContain('{{base}}/x');
    expect(plain).toContain('{{token}}');
    const filled = toSnippet(req, 'curl', {
      vars: { base: 'https://a.test', token: 'abc' },
    });
    expect(filled).toContain("'https://a.test/x'");
    expect(filled).toContain('Bearer abc');
  });

  it('writes form-data with files in every language', () => {
    const req = emptyRequest({
      method: 'POST',
      url: 'https://a.test/up',
      body: {
        kind: 'form-data',
        text: '',
        contentType: '',
        form: [row('name', 'Ada'), row('doc', 'cv.pdf', { type: 'file' })],
      },
    });
    expect(toSnippet(req, 'curl')).toContain("-F 'doc=@cv.pdf'");
    expect(toSnippet(req, 'python')).toContain(
      'files={"doc": open("cv.pdf", "rb")}',
    );
    expect(toSnippet(req, 'httpie')).toContain('doc@cv.pdf');
    expect(toSnippet(req, 'node')).toContain(
      "import { readFile } from 'node:fs/promises';",
    );
    expect(toSnippet(req, 'fetch')).toContain('const form = new FormData();');
  });

  it('every language renders a JSON request', () => {
    for (const { id } of SNIPPET_LANGS) {
      const s = toSnippet(jsonPost(), id);
      expect(s).toContain('api.test/users');
    }
    expect(toSnippet(jsonPost(), 'fetch')).toContain(
      '"Authorization": "Basic YWRhOnA6dw=="',
    );
    expect(toSnippet(jsonPost(), 'axios')).toContain(
      "method: 'post'".replace(/'/g, '"'),
    );
  });
});
