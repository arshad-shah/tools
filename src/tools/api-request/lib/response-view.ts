import { isJsonType, type HttpResponse } from './http';

const REASONS: Record<number, string> = {
  100: 'Continue',
  101: 'Switching Protocols',
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  206: 'Partial Content',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  413: 'Content Too Large',
  415: 'Unsupported Media Type',
  418: "I'm a teapot",
  422: 'Unprocessable Content',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

/** The server's reason phrase, or the standard one (HTTP/2 sends none). */
export function reasonPhrase(status: number, statusText = ''): string {
  return statusText.trim() || REASONS[status] || '';
}

export type StatusTone = 'ok' | 'info' | 'warning' | 'danger';
export function statusTone(status: number): StatusTone {
  if (status >= 500 || status === 0) return 'danger';
  if (status >= 400) return 'warning';
  if (status >= 300) return 'info';
  return 'ok';
}

export type BodyView =
  | 'json'
  | 'xml'
  | 'html'
  | 'image'
  | 'text'
  | 'binary'
  | 'empty';

/** Which Pretty and Preview views fit the response body. */
export function bodyView(res: HttpResponse): BodyView {
  if (res.size === 0) return 'empty';
  const t = res.contentType;
  if (t.startsWith('image/')) return 'image';
  if (res.json !== undefined) return 'json';
  if (res.text === undefined) return 'binary';
  if (t === 'text/html' || t === 'application/xhtml+xml') return 'html';
  if (/[/+]xml$/.test(t)) return 'xml';
  if (isJsonType(t)) return 'text';
  return 'text';
}

const JWT = /\beyJ[\w-]{5,}\.eyJ[\w-]{5,}\.[\w-]*/g;

/** JWT-shaped tokens in the body and headers, unique, in order found. */
export function findTokens(res: HttpResponse): string[] {
  const found = new Set<string>();
  for (const [, v] of res.headers)
    for (const m of v.matchAll(JWT)) found.add(m[0]);
  for (const m of (res.text ?? '').matchAll(JWT)) found.add(m[0]);
  return [...found];
}
