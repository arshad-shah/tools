/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { buildRequest, readResponse } from './http';
import { emptyRequest, type KvRow } from './model';

let n = 0;
const row = (key: string, value: string, over: Partial<KvRow> = {}): KvRow => ({
  id: `r${++n}`,
  enabled: true,
  key,
  value,
  ...over,
});

describe('buildRequest', () => {
  it('applies query params for every method, POST included', () => {
    const { url, init } = buildRequest(
      emptyRequest({
        method: 'POST',
        url: 'https://a.test/p?z=1',
        params: [row('q', 'a b'), row('off', '1', { enabled: false })],
      }),
      {},
    );
    expect(url).toBe('https://a.test/p?z=1&q=a+b');
    expect(init.method).toBe('POST');
  });

  it('builds form-data with text and file parts and no content type', () => {
    const file = new File(['hello'], 'f.txt', { type: 'text/plain' });
    const { init } = buildRequest(
      emptyRequest({
        method: 'POST',
        url: 'https://a.test',
        headers: [row('Content-Type', 'multipart/form-data')],
        body: {
          kind: 'form-data',
          text: '',
          contentType: '',
          form: [
            row('name', 'Ada'),
            row('upload', '', { type: 'file', file }),
            row('skip', 'x', { enabled: false }),
          ],
        },
      }),
      {},
    );
    const fd = init.body as FormData;
    expect(fd).toBeInstanceOf(FormData);
    expect(fd.get('name')).toBe('Ada');
    expect((fd.get('upload') as File).name).toBe('f.txt');
    expect(fd.has('skip')).toBe(false);
    expect(new Headers(init.headers).has('content-type')).toBe(false);
  });

  it('encodes urlencoded rows', () => {
    const { init } = buildRequest(
      emptyRequest({
        method: 'POST',
        url: 'https://a.test',
        body: {
          kind: 'urlencoded',
          text: '',
          contentType: '',
          form: [row('a', '1 2'), row('b&c', 'x=y')],
        },
      }),
      {},
    );
    expect(String(init.body)).toBe('a=1+2&b%26c=x%3Dy');
    expect(new Headers(init.headers).get('content-type')).toBe(
      'application/x-www-form-urlencoded',
    );
  });

  it('validates and sends JSON with its content type', () => {
    const { init } = buildRequest(
      emptyRequest({
        method: 'PUT',
        url: 'https://a.test',
        body: {
          kind: 'json',
          text: '{"a": 1}',
          form: [],
          contentType: '',
        },
      }),
      {},
    );
    expect(init.body).toBe('{"a": 1}');
    expect(new Headers(init.headers).get('content-type')).toBe(
      'application/json',
    );
    expect(() =>
      buildRequest(
        emptyRequest({
          method: 'PUT',
          url: 'https://a.test',
          body: { kind: 'json', text: '{oops', form: [], contentType: '' },
        }),
        {},
      ),
    ).toThrow(/Invalid JSON/);
  });

  it('never attaches a body to GET or HEAD', () => {
    const { init } = buildRequest(
      emptyRequest({
        url: 'https://a.test',
        body: { kind: 'raw', text: 'x', form: [], contentType: 'text/plain' },
      }),
      {},
    );
    expect(init.body).toBeUndefined();
  });

  it('interpolates variables and reports the unresolved ones', () => {
    const r = buildRequest(
      emptyRequest({
        url: '{{base}}/u',
        headers: [row('X-Id', '{{id}}'), row('X-Missing', '{{nope}}')],
      }),
      { base: 'https://x.test', id: '7' },
    );
    expect(r.url).toBe('https://x.test/u');
    expect(new Headers(r.init.headers).get('x-id')).toBe('7');
    expect(r.unresolved).toEqual(['nope']);
  });

  it('sends GraphQL as a JSON POST', () => {
    const { init } = buildRequest(
      emptyRequest({
        mode: 'graphql',
        url: 'https://a.test/gql',
        graphql: { query: '{ a }', variables: '{"x":1}' },
      }),
      {},
    );
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      query: '{ a }',
      variables: { x: 1 },
    });
  });
});

describe('readResponse', () => {
  it('handles an empty 204 JSON response', async () => {
    const res = new Response(null, {
      status: 204,
      headers: { 'content-type': 'application/json' },
    });
    const r = await readResponse(res);
    expect(r.status).toBe(204);
    expect(r.json).toBeUndefined();
    expect(r.size).toBe(0);
  });

  it('keeps the status and text when JSON is invalid', async () => {
    const res = new Response('<html>oops</html>', {
      status: 502,
      statusText: 'Bad Gateway',
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
    const r = await readResponse(res);
    expect(r.status).toBe(502);
    expect(r.statusText).toBe('Bad Gateway');
    expect(r.json).toBeUndefined();
    expect(r.text).toBe('<html>oops</html>');
  });

  it('parses JSON, lists headers and measures bytes', async () => {
    const res = new Response('{"a":"é"}', {
      status: 200,
      headers: { 'content-type': 'application/vnd.api+json' },
    });
    const r = await readResponse(res);
    expect(r.json).toEqual({ a: 'é' });
    expect(r.size).toBe(10);
    expect(r.headers).toContainEqual([
      'content-type',
      'application/vnd.api+json',
    ]);
    expect(r.contentType).toBe('application/vnd.api+json');
  });

  it('decodes text by charset and leaves binary undecoded', async () => {
    const latin = new Response(new Uint8Array([0x63, 0x61, 0x66, 0xe9]), {
      headers: { 'content-type': 'text/plain; charset=iso-8859-1' },
    });
    expect((await readResponse(latin)).text).toBe('café');
    const png = new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
      headers: { 'content-type': 'image/png' },
    });
    const r = await readResponse(png);
    expect(r.text).toBeUndefined();
    expect(r.bytes).toHaveLength(4);
  });
});
