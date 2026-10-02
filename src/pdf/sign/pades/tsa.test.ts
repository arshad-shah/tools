import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeTestTsa, tsaFetch } from '../../../../test/fixtures/test-tsa';
import { checkTimestampToken, tstInfoOf } from './timestamp-token';
import * as pkijs from 'pkijs';
import * as asn1js from 'asn1js';
import {
  MAX_RESPONSE_BYTES,
  MISMATCH,
  NOT_REACHABLE,
  requestTimestamp,
  TOO_LARGE_RESPONSE,
  TOO_SLOW,
} from './tsa';

const sig = new Uint8Array([1, 2, 3, 4, 5]).buffer;
const opts = () => ({
  url: 'https://tsa.test/',
  signal: new AbortController().signal,
});

afterEach(() => vi.unstubAllGlobals());

describe('requestTimestamp', () => {
  it('returns a token whose imprint matches the signature value', async () => {
    vi.stubGlobal('fetch', tsaFetch(await makeTestTsa()));
    const token = await requestTimestamp(sig, opts());
    const ci = new pkijs.ContentInfo({ schema: asn1js.fromBER(token).result });
    const { info } = tstInfoOf(ci);
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', sig));
    expect(
      new Uint8Array(info.messageImprint.hashedMessage.valueBlock.valueHexView),
    ).toEqual(hash);
    expect(
      await checkTimestampToken(
        asn1js.fromBER(token).result,
        new Uint8Array(sig),
      ),
    ).toMatchObject({ genTime: expect.any(Date) });
    expect(
      await checkTimestampToken(
        asn1js.fromBER(token).result,
        new Uint8Array([9]),
      ),
    ).toBeNull();
  });

  it('refuses a token with a different nonce', async () => {
    vi.stubGlobal('fetch', tsaFetch(await makeTestTsa({ tamperNonce: true })));
    await expect(requestTimestamp(sig, opts())).rejects.toMatchObject({
      code: 'SIGNATURE_INVALID',
      message: MISMATCH,
    });
  });

  it('refuses plain http', async () => {
    await expect(
      requestTimestamp(sig, { ...opts(), url: 'http://tsa.test/' }),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: 'Timestamp servers must use https',
    });
  });

  it('reports a network or CORS failure in plain words', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.reject(new TypeError('Failed to fetch')),
    );
    await expect(requestTimestamp(sig, opts())).rejects.toMatchObject({
      code: 'NETWORK',
      message: NOT_REACHABLE,
    });
  });

  it('reports a rejected request', async () => {
    vi.stubGlobal('fetch', tsaFetch(await makeTestTsa({ reject: true })));
    await expect(requestTimestamp(sig, opts())).rejects.toMatchObject({
      code: 'NETWORK',
    });
  });

  it('gives up on a server that does not answer', async () => {
    vi.stubGlobal(
      'fetch',
      (_u: unknown, init: RequestInit) =>
        new Promise((_, reject) =>
          init.signal!.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'TimeoutError')),
          ),
        ),
    );
    await expect(
      requestTimestamp(sig, { ...opts(), timeoutMs: 20 }),
    ).rejects.toMatchObject({ code: 'NETWORK', message: TOO_SLOW });
  });

  it('refuses a response larger than 64 KiB', async () => {
    vi.stubGlobal(
      'fetch',
      async () => new Response(new Uint8Array(MAX_RESPONSE_BYTES + 1)),
    );
    await expect(requestTimestamp(sig, opts())).rejects.toMatchObject({
      code: 'NETWORK',
      message: TOO_LARGE_RESPONSE,
    });
  });

  it('still reports a cancel by the user as a cancel', async () => {
    const ctrl = new AbortController();
    vi.stubGlobal(
      'fetch',
      (_u: unknown, init: RequestInit) =>
        new Promise((_, reject) => {
          // Like fetch: an already aborted signal rejects at once.
          const stop = () => reject(new DOMException('Aborted', 'AbortError'));
          if (init.signal!.aborted) stop();
          else init.signal!.addEventListener('abort', stop);
        }),
    );
    const p = requestTimestamp(sig, {
      url: 'https://tsa.test/',
      signal: ctrl.signal,
    });
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });
});
