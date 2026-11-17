import { bytesToBase64, utf8Encode } from '@/shared/lib/encoding';

/** One header as written, in order. */
export interface Header {
  name: string;
  value: string;
}

/** A multipart field (`-F`): text, or a file named by its path. */
export interface FormField {
  name: string;
  /** The text, or the file's path when `file` is set. */
  value: string;
  file?: boolean;
  /** `;type=` */
  type?: string;
  /** `;filename=` */
  filename?: string;
}

export type Body =
  | { kind: 'none' }
  /** -d, --data-raw, --data-urlencode, --json: the parts joined with `&`. */
  | { kind: 'data'; text: string }
  /** --data-binary @file (`upload: false`) or -T file (`upload: true`). */
  | { kind: 'file'; path: string; upload: boolean }
  | { kind: 'form'; fields: FormField[] };

/** A request as curl would send it, in a shape every generator reads. */
export interface CurlRequest {
  method: string;
  /** Absolute URL with its query (and -G data merged in). */
  url: string;
  headers: Header[];
  body: Body;
  /** -u: sent as basic auth. */
  auth: { user: string; pass: string } | null;
  /** -b with name=value pairs ('' for none). */
  cookie: string;
  /** --compressed */
  compressed: boolean;
  /** -k */
  insecure: boolean;
  /** -L */
  location: boolean;
}

export function emptyCurlRequest(over: Partial<CurlRequest> = {}): CurlRequest {
  return {
    method: 'GET',
    url: '',
    headers: [],
    body: { kind: 'none' },
    auth: null,
    cookie: '',
    compressed: false,
    insecure: false,
    location: false,
    ...over,
  };
}

/** The value of header `name` (any case), or undefined. */
export function headerValue(
  headers: readonly Header[],
  name: string,
): string | undefined {
  const n = name.toLowerCase();
  return headers.find((h) => h.name.toLowerCase() === n)?.value;
}

/**
 * The headers curl would send on its own account and code must state:
 * the urlencoded Content-Type of -d and --data-binary, and the Cookie
 * header of -b. Basic auth is left to each generator.
 */
export function effectiveHeaders(req: CurlRequest): Header[] {
  const out = [...req.headers];
  const sendsForm =
    req.body.kind === 'data' || (req.body.kind === 'file' && !req.body.upload);
  if (sendsForm && headerValue(out, 'content-type') === undefined)
    out.push({
      name: 'Content-Type',
      value: 'application/x-www-form-urlencoded',
    });
  if (req.cookie && headerValue(out, 'cookie') === undefined)
    out.push({ name: 'Cookie', value: req.cookie });
  return out;
}

/** The headers without Content-Type (multipart: the library sets it). */
export function withoutContentType(headers: readonly Header[]): Header[] {
  return headers.filter((h) => h.name.toLowerCase() !== 'content-type');
}

/** True when the body is text and the Content-Type says JSON. */
export function isJsonBody(req: CurlRequest): boolean {
  return (
    req.body.kind === 'data' &&
    /\bjson\b|\+json/i.test(headerValue(req.headers, 'content-type') ?? '')
  );
}

/** The body parsed as JSON when it is a JSON body that parses, else undefined. */
export function jsonValue(req: CurlRequest): unknown {
  if (!isJsonBody(req) || req.body.kind !== 'data') return undefined;
  try {
    return JSON.parse(req.body.text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * The body as `key=value` pairs when it is a urlencoded form body that
 * splits cleanly, else null.
 */
export function formPairs(req: CurlRequest): [string, string][] | null {
  if (req.body.kind !== 'data') return null;
  const ct = headerValue(req.headers, 'content-type');
  if (ct !== undefined && !/x-www-form-urlencoded/i.test(ct)) return null;
  const text = req.body.text;
  if (!text || !/^[^=&\s]+=[^&\n]*(&[^=&\s]+=[^&\n]*)*$/.test(text))
    return null;
  try {
    return [...new URLSearchParams(text)];
  } catch {
    return null;
  }
}

/** The method a request would use with no -X: the one to leave unsaid. */
export function impliedMethod(req: CurlRequest): string {
  if (req.body.kind === 'file' && req.body.upload) return 'PUT';
  return req.body.kind === 'none' ? 'GET' : 'POST';
}

/** The basic auth credentials as base64 `user:pass` (UTF-8). */
export function basicToken(user: string, pass: string): string {
  return bytesToBase64(utf8Encode(`${user}:${pass}`));
}
