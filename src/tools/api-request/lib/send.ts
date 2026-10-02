import { ToolError } from '@/shared/lib/errors';
import { classifyFetchError } from './errors';
import { buildRequest, readResponse, type HttpResponse } from './http';
import type { HttpRequest } from './model';

export interface SendResult {
  response: HttpResponse;
  /** Total time in ms. */
  durationMs: number;
  /** The final URL sent (params and auth applied). */
  url: string;
}

export interface SendOptions {
  signal?: AbortSignal;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

/**
 * Sends the request: refuses unresolved variables, aborts after
 * `timeoutMs` (TIMEOUT) or on `signal` (CANCELLED), and maps fetch
 * failures through classifyFetchError.
 */
export async function sendHttp(
  req: HttpRequest,
  env: Record<string, string>,
  {
    signal,
    timeoutMs,
    fetchImpl = fetch,
    now = () => performance.now(),
  }: SendOptions,
): Promise<SendResult> {
  if (!req.url.trim()) throw new ToolError('INVALID_INPUT', 'Enter a URL');
  const built = buildRequest(req, env);
  if (built.unresolved.length)
    throw new ToolError(
      'INVALID_INPUT',
      `Unresolved variables: ${built.unresolved.join(', ')}`,
    );
  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const start = now();
  try {
    const res = await fetchImpl(built.url, { ...built.init, signal: combined });
    const response = await readResponse(res);
    return { response, durationMs: Math.round(now() - start), url: built.url };
  } catch (e) {
    const reason =
      timeout.aborted && !signal?.aborted
        ? new DOMException('Timed out', 'TimeoutError')
        : signal?.aborted
          ? new DOMException('Aborted', 'AbortError')
          : e;
    throw classifyFetchError(reason, built.url, undefined, { timeoutMs });
  }
}
