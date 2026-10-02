/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { emptyRequest } from './model';
import { sendHttp } from './send';

const req = (url = 'https://a.test/x') => emptyRequest({ url });

describe('sendHttp', () => {
  it('returns the response and the duration', async () => {
    let t = 0;
    const fetchImpl = vi.fn().mockResolvedValue(new Response('ok'));
    const r = await sendHttp(
      req(),
      {},
      {
        timeoutMs: 1000,
        fetchImpl,
        now: () => (t += 40),
      },
    );
    expect(r.response.text).toBe('ok');
    expect(r.durationMs).toBe(40);
  });
  it('refuses unresolved variables before sending', async () => {
    const fetchImpl = vi.fn();
    await expect(
      sendHttp(req('{{base}}/x'), {}, { timeoutMs: 1000, fetchImpl }),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: 'Unresolved variables: base',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('times out as TIMEOUT', async () => {
    const fetchImpl = vi.fn(
      (_u: string, init: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init.signal!.addEventListener('abort', () =>
            reject(new DOMException('x', 'AbortError')),
          ),
        ),
    );
    await expect(
      sendHttp(req(), {}, { timeoutMs: 20, fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
  it('cancels as CANCELLED', async () => {
    const ctrl = new AbortController();
    const fetchImpl = vi.fn(() => {
      ctrl.abort();
      return Promise.reject(new DOMException('x', 'AbortError'));
    });
    await expect(
      sendHttp(req(), {}, { timeoutMs: 1000, signal: ctrl.signal, fetchImpl }),
    ).rejects.toMatchObject({ code: 'CANCELLED' });
  });
  it('maps a blocked cross-origin fetch to NETWORK', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(
      sendHttp(
        req('https://far.example/x'),
        {},
        { timeoutMs: 1000, fetchImpl },
      ),
    ).rejects.toMatchObject({ code: 'NETWORK' });
  });
});
