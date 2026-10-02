import { newId } from '@/shared/lib/id';
import type { Auth, BodyKind, HttpRequest } from './model';

/** A key-value row as stored: JSON only (no File). */
export type StoredRow = {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
  type: 'text' | 'secret' | 'file';
  description: string;
};

/** A request as stored in a collection: no files, every field present. */
export type StoredRequest = {
  mode: 'rest' | 'graphql';
  method: string;
  url: string;
  params: StoredRow[];
  headers: StoredRow[];
  auth: Auth;
  body: {
    kind: BodyKind;
    text: string;
    form: StoredRow[];
    contentType: string;
  };
  graphql: { query: string; variables: string };
};

export type SavedRequest = {
  id: string;
  type: 'request';
  name: string;
  request: StoredRequest;
};

export type Folder = {
  id: string;
  type: 'folder';
  name: string;
  children: (SavedRequest | Folder)[];
};

const str = (v: unknown, fallback = '') =>
  typeof v === 'string' ? v : fallback;
const rec = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};

const row = (key: string, value: string, enabled = true): StoredRow => ({
  id: newId(),
  enabled,
  key,
  value,
  type: 'text',
  description: '',
});

/** Rows from v1 `{ key, value, enabled? }[]`, blank rows dropped. */
function rowsFrom(v: unknown): StoredRow[] {
  if (!Array.isArray(v)) return [];
  return v
    .map(rec)
    .filter((r) => str(r.key).trim() || str(r.value).trim())
    .map((r) => row(str(r.key), str(r.value), r.enabled !== false));
}

/** v1 kept form bodies as `a=1&b=2` text. */
function formRows(text: string): StoredRow[] {
  return text
    .split('&')
    .filter(Boolean)
    .map((pair) => {
      const [k, ...v] = pair.split('=');
      return row(k, v.join('='));
    });
}

const V1_BODY: Record<string, BodyKind> = {
  none: 'none',
  json: 'json',
  'form-data': 'form-data',
  'x-www-form-urlencoded': 'urlencoded',
};

/** One v1 flat request (types.ts RequestItemType) in the new shape. */
export function migrateRequest(v: unknown): SavedRequest {
  const r = rec(v);
  const kind = V1_BODY[str(r.bodyType, 'none')] ?? 'none';
  const bodyText = str(r.body);
  const isForm = kind === 'form-data' || kind === 'urlencoded';
  return {
    id: str(r.id) || newId(),
    type: 'request',
    name: str(r.name, 'Request'),
    request: {
      mode: r.requestType === 'graphql' ? 'graphql' : 'rest',
      method: str(r.method, 'GET').toUpperCase(),
      url: str(r.url),
      params: rowsFrom(r.params),
      headers: rowsFrom(r.headers),
      auth: { kind: 'none' },
      body: {
        kind,
        text: isForm ? '' : bodyText,
        form: isForm ? formRows(bodyText) : [],
        contentType: '',
      },
      graphql: {
        query: str(r.graphqlQuery),
        variables: str(r.graphqlVariables),
      },
    },
  };
}

function migrateNode(v: unknown): SavedRequest | Folder | null {
  const n = rec(v);
  if (n.type === 'folder' && Array.isArray(n.children))
    return {
      id: str(n.id) || newId(),
      type: 'folder',
      name: str(n.name, 'Folder'),
      children: n.children
        .map(migrateNode)
        .filter((c): c is SavedRequest | Folder => c !== null),
    };
  if (n.type === 'request') return migrateRequest(n);
  return null;
}

/** v1 collections (folders of flat requests) to the v2 shape; junk dropped. */
export function migrateCollections(v: unknown): Folder[] {
  if (!Array.isArray(v)) return [];
  return v
    .map(migrateNode)
    .filter((n): n is Folder => n !== null && n.type === 'folder');
}

/** The editable request for a stored one (files are chosen again). */
export function toHttpRequest(s: StoredRequest): HttpRequest {
  return {
    ...s,
    params: s.params.map((r) => ({ ...r })),
    headers: s.headers.map((r) => ({ ...r })),
    body: { ...s.body, form: s.body.form.map((r) => ({ ...r })), file: null },
  };
}

/** A request as stored: files dropped, optional fields filled. */
export function toStoredRequest(r: HttpRequest): StoredRequest {
  const rows = (rs: HttpRequest['params']): StoredRow[] =>
    rs.map((x) => ({
      id: x.id,
      enabled: x.enabled,
      key: x.key,
      value: x.value,
      type: x.type ?? 'text',
      description: x.description ?? '',
    }));
  return {
    mode: r.mode,
    method: r.method,
    url: r.url,
    params: rows(r.params),
    headers: rows(r.headers),
    auth: r.auth,
    body: {
      kind: r.body.kind,
      text: r.body.text,
      form: rows(r.body.form),
      contentType: r.body.contentType,
    },
    graphql: { ...r.graphql },
  };
}

const AUTH_KINDS = new Set(['none', 'bearer', 'basic', 'apikey']);
const BODY_KINDS = new Set<BodyKind>([
  'none',
  'json',
  'form-data',
  'urlencoded',
  'raw',
  'binary',
]);

function storedRowsFrom(v: unknown): StoredRow[] {
  if (!Array.isArray(v)) return [];
  return v.map(rec).map((r) => ({
    id: str(r.id) || newId(),
    enabled: r.enabled !== false,
    key: str(r.key),
    value: str(r.value),
    type: r.type === 'secret' || r.type === 'file' ? r.type : 'text',
    description: str(r.description),
  }));
}

function authFrom(v: unknown): Auth {
  const a = rec(v);
  if (!AUTH_KINDS.has(str(a.kind))) return { kind: 'none' };
  switch (a.kind) {
    case 'bearer':
      return { kind: 'bearer', token: str(a.token) };
    case 'basic':
      return { kind: 'basic', user: str(a.user), pass: str(a.pass) };
    case 'apikey':
      return {
        kind: 'apikey',
        name: str(a.name),
        value: str(a.value),
        in: a.in === 'query' ? 'query' : 'header',
      };
    default:
      return { kind: 'none' };
  }
}

/** A v2 stored request from untrusted JSON (an import), every field coerced. */
export function normalizeStoredRequest(v: unknown): StoredRequest {
  const r = rec(v);
  const b = rec(r.body);
  const g = rec(r.graphql);
  const kind = str(b.kind) as BodyKind;
  return {
    mode: r.mode === 'graphql' ? 'graphql' : 'rest',
    method: str(r.method, 'GET').toUpperCase() || 'GET',
    url: str(r.url),
    params: storedRowsFrom(r.params),
    headers: storedRowsFrom(r.headers),
    auth: authFrom(r.auth),
    body: {
      kind: BODY_KINDS.has(kind) ? kind : 'none',
      text: str(b.text),
      form: storedRowsFrom(b.form),
      contentType: str(b.contentType),
    },
    graphql: { query: str(g.query), variables: str(g.variables) },
  };
}

function normalizeNode(v: unknown): SavedRequest | Folder | null {
  const n = rec(v);
  if (n.type === 'folder' && Array.isArray(n.children))
    return {
      id: str(n.id) || newId(),
      type: 'folder',
      name: str(n.name, 'Folder'),
      children: n.children
        .map(normalizeNode)
        .filter((c): c is SavedRequest | Folder => c !== null),
    };
  if (n.type === 'request' && typeof n.request === 'object' && n.request)
    return {
      id: str(n.id) || newId(),
      type: 'request',
      name: str(n.name, 'Request'),
      request: normalizeStoredRequest(n.request),
    };
  return null;
}

/** v2 collections from untrusted JSON; anything else is dropped. */
export function normalizeCollections(v: unknown): Folder[] {
  if (!Array.isArray(v)) return [];
  return v
    .map(normalizeNode)
    .filter((n): n is Folder => n !== null && n.type === 'folder');
}
