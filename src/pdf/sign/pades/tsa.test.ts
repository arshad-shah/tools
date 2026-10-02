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

  it('sends a nonce that is minimal positive DER', async () => {
    vi.spyOn(crypto, 'getRandomValues').mockImplementation(<T>(a: T): T => {
      (a as Uint8Array).fill(0);
      (a as Uint8Array)[1] = 0x05;
      return a;
    });
    let sent: Uint8Array | null = null;
    vi.stubGlobal('fetch', async (_u: unknown, init: RequestInit) => {
      sent = init.body as Uint8Array;
      throw new TypeError('Failed to fetch');
    });
    await expect(requestTimestamp(sig, opts())).rejects.toBeTruthy();
    vi.restoreAllMocks();
    const req = pkijs.TimeStampReq.fromBER(sent!.slice().buffer);
    const first = new Uint8Array(req.nonce!.valueBlock.valueHexView)[0];
    // Not 0x00 (non-minimal before a byte under 0x80) and not negative.
    expect(first & 0x80).toBe(0);
    expect(first).not.toBe(0);
  });

  it('cuts a long status text from the server short', async () => {
    const long = 'x'.repeat(5000);
    const resp = new pkijs.TimeStampResp({
      status: new pkijs.PKIStatusInfo({
        status: 2,
        statusStrings: [new asn1js.Utf8String({ value: long })],
      }),
    });
    vi.stubGlobal(
      'fetch',
      async () => new Response(new Uint8Array(resp.toSchema().toBER(false))),
    );
    const err = (await requestTimestamp(sig, opts()).catch((e) => e)) as Error;
    expect(err).toMatchObject({ code: 'NETWORK' });
    expect(err.message.length).toBeLessThanOrEqual(200);
    expect(err.message.startsWith('xxx')).toBe(true);
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
