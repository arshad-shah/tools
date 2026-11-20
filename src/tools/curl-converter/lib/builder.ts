import type { KeyValuePair } from '@arshad-shah/cynosure';
import { newId } from '@/shared/lib/id';
import { emptyCurlRequest, type CurlRequest, type FormField } from './model';
import { formField } from './parse';

export type BuilderBodyKind = 'none' | 'text' | 'form' | 'file';

/** The request as the Build form edits it. */
export interface BuilderState {
  method: string;
  url: string;
  headers: KeyValuePair[];
  bodyKind: BuilderBodyKind;
  text: string;
  /** Multipart fields; a value of `@path;type=...` is a file. */
  form: KeyValuePair[];
  filePath: string;
  upload: boolean;
  user: string;
  pass: string;
  cookie: string;
  compressed: boolean;
  insecure: boolean;
  location: boolean;
}

const pair = (key: string, value: string): KeyValuePair => ({
  id: newId(),
  key,
  value,
  enabled: true,
});

function fieldText(f: FormField): string {
  if (!f.file) return f.type ? `${f.value};type=${f.type}` : f.value;
  let v = `@${f.value}`;
  if (f.type) v += `;type=${f.type}`;
  if (f.filename) v += `;filename=${f.filename}`;
  return v;
}

/** The Build form's state for a request (what the pasted command parsed to). */
export function toBuilder(req: CurlRequest): BuilderState {
  const b = req.body;
  return {
    method: req.method,
    url: req.url,
    headers: req.headers.map((h) => pair(h.name, h.value)),
    bodyKind: b.kind === 'data' ? 'text' : b.kind === 'none' ? 'none' : b.kind,
    text: b.kind === 'data' ? b.text : '',
    form:
      b.kind === 'form' ? b.fields.map((f) => pair(f.name, fieldText(f))) : [],
    filePath: b.kind === 'file' ? b.path : '',
    upload: b.kind === 'file' && b.upload,
    user: req.auth?.user ?? '',
    pass: req.auth?.pass ?? '',
    cookie: req.cookie,
    compressed: req.compressed,
    insecure: req.insecure,
    location: req.location,
  };
}

export const emptyBuilder = (): BuilderState => ({
  ...toBuilder(emptyCurlRequest({ url: 'https://' })),
});

/** The request the Build form describes; switched-off and unnamed rows are left out. */
export function fromBuilder(s: BuilderState): CurlRequest {
  const on = (rows: KeyValuePair[]) =>
    rows.filter((r) => r.enabled !== false && r.key.trim());
  let body: CurlRequest['body'] = { kind: 'none' };
  if (s.bodyKind === 'text' && s.text) body = { kind: 'data', text: s.text };
  else if (s.bodyKind === 'file' && s.filePath.trim())
    body = { kind: 'file', path: s.filePath.trim(), upload: s.upload };
  else if (s.bodyKind === 'form') {
    const fields = on(s.form).flatMap((r) => {
      const f = formField(`${r.key.trim()}=${r.value}`, false);
      return f ? [f] : [];
    });
    if (fields.length) body = { kind: 'form', fields };
  }
  const url = s.url.trim();
  return {
    method: s.method.trim() || 'GET',
    url: !url || /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `http://${url}`,
    headers: on(s.headers).map((h) => ({ name: h.key.trim(), value: h.value })),
    body,
    auth: s.user ? { user: s.user, pass: s.pass } : null,
    cookie: s.cookie.trim(),
    compressed: s.compressed,
    insecure: s.insecure,
    location: s.location,
  };
}
