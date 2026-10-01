import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildGraphqlInit,
  buildRestInit,
  buildUrl,
  sendRequest,
  type RequestInput,
} from './request';

const input = (over: Partial<RequestInput> = {}): RequestInput => ({
  requestType: 'rest',
  method: 'GET',
  url: 'https://x.test',
  params: [],
  headers: [],
  bodyType: 'none',
  body: '',
  graphqlQuery: '',
  graphqlVariables: '',
  ...over,
});

const jsonResponse = (data: unknown) =>
  new Response(JSON.stringify(data), {
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
  });

describe('api-request builder', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('appends only enabled params with keys', () => {
    expect(
      buildUrl('https://x.test/a?z=1', [
        { key: 'q', value: 'a b', enabled: true },
        { key: 'off', value: '1', enabled: false },
        { key: ' ', value: 'blank', enabled: true },
      ]),
    ).toBe('https://x.test/a?z=1&q=a+b');
  });
  it('returns the raw string for an invalid URL', () => {
    expect(
      buildUrl('not a url', [{ key: 'a', value: '1', enabled: true }]),
    ).toBe('not a url');
  });
  it('trims headers and drops blank ones; JSON body sets content type', () => {
    const init = buildRestInit({
      method: 'POST',
      headers: [
        { key: ' X-A ', value: ' 1 ' },
        { key: '', value: 'x' },
        { key: 'X-Empty', value: ' ' },
      ],
      bodyType: 'json',
      body: '{"a":1}',
    });
    expect(init.headers).toEqual({
      'X-A': '1',
      'Content-Type': 'application/json',
    });
    expect(init.body).toBe('{"a":1}');
  });
  it('rejects invalid JSON bodies', () => {
    expect(() =>
      buildRestInit({
        method: 'POST',
        headers: [],
        bodyType: 'json',
        body: '{',
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        message: 'Invalid JSON in request body',
      }),
    );
  });
  it('builds x-www-form-urlencoded bodies', () => {
    const init = buildRestInit({
      method: 'POST',
      headers: [],
      bodyType: 'x-www-form-urlencoded',
      body: 'a=1&b=&c',
    });
    expect(String(init.body)).toBe('a=1&b=&c=');
    expect(init.headers['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );
  });
  it('sends no body for GET', () => {
    expect(
      buildRestInit({
        method: 'GET',
        headers: [],
        bodyType: 'json',
        body: '{"a":1}',
      }).body,
    ).toBeUndefined();
  });
  it('wraps GraphQL query and variables', () => {
    const init = buildGraphqlInit({
      headers: [],
      query: '{ me }',
      variables: '{"id":1}',
    });
    expect(JSON.parse(init.body)).toEqual({
      query: '{ me }',
      variables: { id: 1 },
    });
    expect(init.headers['Content-Type']).toBe('application/json');
  });
  it('rejects invalid GraphQL variables', () => {
    expect(() =>
      buildGraphqlInit({ headers: [], query: '{ me }', variables: '{' }),
    ).toThrow(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        message: 'Invalid JSON in GraphQL variables',
      }),
    );
  });
  it('rejects a missing URL', async () => {
    await expect(
      sendRequest(input({ url: '' }), new AbortController().signal),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: 'Please enter a URL',
    });
  });
  it('applies params to GET requests and parses JSON responses', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetch);
    let t = 100;
    const r = await sendRequest(
      input({ params: [{ key: 'q', value: '1', enabled: true }] }),
      new AbortController().signal,
      () => (t += 50),
    );
    expect(fetch.mock.calls[0][0]).toBe('https://x.test/?q=1');
    expect(r).toMatchObject({
      status: 200,
      statusText: 'OK',
      time: 50,
      data: { ok: true },
      headers: { 'content-type': 'application/json' },
    });
  });
  it('does not apply params to non-GET requests (as before)', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('plain'));
    vi.stubGlobal('fetch', fetch);
    const r = await sendRequest(
      input({
        method: 'POST',
        params: [{ key: 'q', value: '1', enabled: true }],
      }),
      new AbortController().signal,
    );
    expect(fetch.mock.calls[0][0]).toBe('https://x.test');
    expect(r.data).toBe('plain');
  });
  it('sends GraphQL as a POST', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ data: 1 }));
    vi.stubGlobal('fetch', fetch);
    const r = await sendRequest(
      input({ requestType: 'graphql', graphqlQuery: '{ me }' }),
      new AbortController().signal,
    );
    expect(fetch.mock.calls[0][1].method).toBe('POST');
    expect(r.data).toEqual({ data: 1 });
  });
  it('maps network failures to a status-0 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );
    const r = await sendRequest(input(), new AbortController().signal);
    expect(r.status).toBe(0);
    expect(r.statusText).toBe('Network error');
    expect(r.data).toEqual({ error: 'Failed to fetch' });
  });
  it('rejects with CANCELLED when aborted', async () => {
    const ctrl = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        ctrl.abort();
        return Promise.reject(new DOMException('aborted', 'AbortError'));
      }),
    );
    await expect(sendRequest(input(), ctrl.signal)).rejects.toMatchObject({
      code: 'CANCELLED',
    });
  });
});
