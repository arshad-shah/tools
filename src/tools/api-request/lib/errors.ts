import { ToolError } from '@/shared/lib/errors';

export type NetworkFailureKind =
  | 'mixed-content'
  | 'cross-origin'
  | 'same-origin';

const LOOPBACK = /^(localhost|127(\.\d+){3}|\[::1\])$/;

/** Why a fetch to `url` from a page at `pageOrigin` may fail. */
export function networkFailureKind(
  url: string,
  pageOrigin: string,
): NetworkFailureKind {
  const target = new URL(url, pageOrigin);
  const page = new URL(pageOrigin);
  if (
    page.protocol === 'https:' &&
    target.protocol === 'http:' &&
    !LOOPBACK.test(target.hostname)
  )
    return 'mixed-content';
  return target.origin === page.origin ? 'same-origin' : 'cross-origin';
}

const pageOrigin = () =>
  typeof location === 'undefined' ? 'http://localhost' : location.origin;

/**
 * A fetch failure as a ToolError (spec §8.8): an honest NETWORK error for
 * blocked or unreachable URLs (CORS cannot be told apart from a dead host),
 * mixed content, INVALID_INPUT for a bad URL, CANCELLED and TIMEOUT.
 */
export function classifyFetchError(
  e: unknown,
  url: string,
  origin: string = pageOrigin(),
  opts: { timeoutMs?: number } = {},
): ToolError {
  if (e instanceof ToolError) return e;
  const name = e instanceof Error || e instanceof DOMException ? e.name : '';
  if (name === 'TimeoutError')
    return new ToolError(
      'TIMEOUT',
      `No response within ${Math.round((opts.timeoutMs ?? 0) / 1000)} s`,
      { cause: e },
    );
  if (name === 'AbortError')
    return new ToolError('CANCELLED', 'Request cancelled', { cause: e });
  let kind: NetworkFailureKind;
  try {
    if (!/^https?:\/\//i.test(url)) throw new TypeError('Not http');
    kind = networkFailureKind(url, origin);
  } catch (cause) {
    return new ToolError(
      'INVALID_INPUT',
      'Not a valid URL. Use a full http:// or https:// address',
      { cause },
    );
  }
  if (kind === 'mixed-content')
    return new ToolError(
      'NETWORK',
      'This page uses https, so the browser blocks requests to http URLs (mixed content)',
      { cause: e },
    );
  if (kind === 'same-origin')
    return new ToolError('NETWORK', 'Could not reach this URL', { cause: e });
  return new ToolError(
    'NETWORK',
    'The browser blocked or could not reach this URL',
    { cause: e },
  );
}
