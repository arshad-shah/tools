/**
 * curl's options as the converter understands them. Every option maps to
 * what the converter does with it; anything not listed is reported as not
 * recognised. Long names are without the leading `--`.
 */

/** Options the converter turns into part of the request. */
export type Handled =
  | 'method'
  | 'header'
  | 'data'
  | 'data-raw'
  | 'data-binary'
  | 'data-urlencode'
  | 'json'
  | 'form'
  | 'form-string'
  | 'user'
  | 'cookie'
  | 'agent'
  | 'referer'
  | 'url'
  | 'url-query'
  | 'upload'
  | 'bearer'
  | 'range'
  | 'get'
  | 'head'
  | 'insecure'
  | 'location'
  | 'compressed';

/** Why an option is left out of the conversion. */
export type IgnoreReason = 'output' | 'connection' | 'auth' | 'unsupported';

export const IGNORE_TEXT: Record<IgnoreReason, string> = {
  output: 'Only changes what curl prints or saves; the request is the same',
  connection:
    'Changes how curl connects (timeouts, retries, proxy, TLS files or protocol version); not carried into the code',
  auth: 'Only basic auth is converted; -u is sent as basic auth',
  unsupported: 'Not supported by the converter; left out',
};

export interface OptionSpec {
  /** Takes a value (the next word, or the rest of a short cluster). */
  value: boolean;
  handled?: Handled;
  ignore?: IgnoreReason;
}

const h = (handled: Handled, value = true): OptionSpec => ({ value, handled });
const ig = (ignore: IgnoreReason, value = false): OptionSpec => ({
  value,
  ignore,
});

export const LONG: Record<string, OptionSpec> = {
  request: h('method'),
  header: h('header'),
  data: h('data'),
  'data-ascii': h('data'),
  'data-raw': h('data-raw'),
  'data-binary': h('data-binary'),
  'data-urlencode': h('data-urlencode'),
  json: h('json'),
  form: h('form'),
  'form-string': h('form-string'),
  user: h('user'),
  cookie: h('cookie'),
  'user-agent': h('agent'),
  referer: h('referer'),
  url: h('url'),
  'url-query': h('url-query'),
  'upload-file': h('upload'),
  'oauth2-bearer': h('bearer'),
  range: h('range'),
  get: h('get', false),
  head: h('head', false),
  insecure: h('insecure', false),
  location: h('location', false),
  'location-trusted': h('location', false),
  compressed: h('compressed', false),
  basic: ig('auth'),
  digest: ig('auth'),
  ntlm: ig('auth'),
  negotiate: ig('auth'),
  anyauth: ig('auth'),
  'aws-sigv4': ig('auth', true),
  // Output only.
  silent: ig('output'),
  'show-error': ig('output'),
  verbose: ig('output'),
  include: ig('output'),
  'show-headers': ig('output'),
  fail: ig('output'),
  'fail-with-body': ig('output'),
  'fail-early': ig('output'),
  'progress-bar': ig('output'),
  'no-progress-meter': ig('output'),
  'remote-name': ig('output'),
  'remote-name-all': ig('output'),
  'remote-header-name': ig('output'),
  'create-dirs': ig('output'),
  'no-buffer': ig('output'),
  globoff: ig('output'),
  'styled-output': ig('output'),
  'no-styled-output': ig('output'),
  output: ig('output', true),
  'output-dir': ig('output', true),
  'write-out': ig('output', true),
  'dump-header': ig('output', true),
  trace: ig('output', true),
  'trace-ascii': ig('output', true),
  'trace-time': ig('output'),
  stderr: ig('output', true),
  'cookie-jar': ig('output', true),
  'etag-save': ig('output', true),
  // Connection.
  'max-time': ig('connection', true),
  'connect-timeout': ig('connection', true),
  retry: ig('connection', true),
  'retry-delay': ig('connection', true),
  'retry-max-time': ig('connection', true),
  'retry-all-errors': ig('connection'),
  'retry-connrefused': ig('connection'),
  proxy: ig('connection', true),
  'proxy-user': ig('connection', true),
  noproxy: ig('connection', true),
  socks5: ig('connection', true),
  'socks5-hostname': ig('connection', true),
  preproxy: ig('connection', true),
  cacert: ig('connection', true),
  capath: ig('connection', true),
  cert: ig('connection', true),
  'cert-type': ig('connection', true),
  key: ig('connection', true),
  'key-type': ig('connection', true),
  pass: ig('connection', true),
  ciphers: ig('connection', true),
  pinnedpubkey: ig('connection', true),
  resolve: ig('connection', true),
  'connect-to': ig('connection', true),
  interface: ig('connection', true),
  'local-port': ig('connection', true),
  'limit-rate': ig('connection', true),
  'max-redirs': ig('connection', true),
  'max-filesize': ig('connection', true),
  'keepalive-time': ig('connection', true),
  'unix-socket': ig('connection', true),
  'abstract-unix-socket': ig('connection', true),
  'dns-servers': ig('connection', true),
  'expect100-timeout': ig('connection', true),
  'speed-limit': ig('connection', true),
  'speed-time': ig('connection', true),
  'tls-max': ig('connection', true),
  'http1.0': ig('connection'),
  'http1.1': ig('connection'),
  http2: ig('connection'),
  'http2-prior-knowledge': ig('connection'),
  http3: ig('connection'),
  'http3-only': ig('connection'),
  tlsv1: ig('connection'),
  'tlsv1.0': ig('connection'),
  'tlsv1.1': ig('connection'),
  'tlsv1.2': ig('connection'),
  'tlsv1.3': ig('connection'),
  sslv2: ig('connection'),
  sslv3: ig('connection'),
  ipv4: ig('connection'),
  ipv6: ig('connection'),
  'tcp-nodelay': ig('connection'),
  'tcp-fastopen': ig('connection'),
  'no-keepalive': ig('connection'),
  'no-sessionid': ig('connection'),
  'path-as-is': ig('connection'),
  'ssl-no-revoke': ig('connection'),
  'proxy-insecure': ig('connection'),
  post301: ig('connection'),
  post302: ig('connection'),
  post303: ig('connection'),
  // Unsupported.
  config: ig('unsupported', true),
  next: ig('unsupported'),
  variable: ig('unsupported', true),
  'request-target': ig('unsupported', true),
  'time-cond': ig('unsupported', true),
  'continue-at': ig('unsupported', true),
  quote: ig('unsupported', true),
  'telnet-option': ig('unsupported', true),
  'ftp-port': ig('unsupported', true),
  'proxy-header': ig('unsupported', true),
  netrc: ig('unsupported'),
  'netrc-optional': ig('unsupported'),
  'netrc-file': ig('unsupported', true),
};

/** Short options by letter, as their long names. */
export const SHORT: Record<string, string> = {
  X: 'request',
  H: 'header',
  d: 'data',
  F: 'form',
  u: 'user',
  b: 'cookie',
  A: 'user-agent',
  e: 'referer',
  T: 'upload-file',
  r: 'range',
  G: 'get',
  I: 'head',
  k: 'insecure',
  L: 'location',
  s: 'silent',
  S: 'show-error',
  v: 'verbose',
  i: 'include',
  f: 'fail',
  '#': 'progress-bar',
  O: 'remote-name',
  J: 'remote-header-name',
  N: 'no-buffer',
  g: 'globoff',
  o: 'output',
  w: 'write-out',
  D: 'dump-header',
  c: 'cookie-jar',
  m: 'max-time',
  x: 'proxy',
  U: 'proxy-user',
  E: 'cert',
  '4': 'ipv4',
  '6': 'ipv6',
  '0': 'http1.0',
  '1': 'tlsv1',
  '2': 'sslv2',
  '3': 'sslv3',
  K: 'config',
  ':': 'next',
  z: 'time-cond',
  C: 'continue-at',
  Q: 'quote',
  t: 'telnet-option',
  P: 'ftp-port',
  n: 'netrc',
};
