import { ToolError } from '@/shared/lib/errors';
import { newId } from '@/shared/lib/id';
import type {
  Folder,
  SavedRequest,
  StoredRequest,
  StoredRow,
} from './collections-migrate';
import type { Environment } from './env';
import type { Auth, BodyKind } from './model';

export const POSTMAN_SCHEMA =
  'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Obj) : {};
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown, d = '') =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : d;

const invalid = (message: string) => new ToolError('INVALID_INPUT', message);

const storedRow = (
  key: string,
  value: string,
  enabled = true,
  type: StoredRow['type'] = 'text',
  description = '',
): StoredRow => ({ id: newId(), enabled, key, value, type, description });

export interface PostmanImport {
  collections: Folder[];
  /** Collection variables as an environment, when there are any. */
  environment: Environment | null;
  /** Features that were dropped, each named once. */
  unsupported: string[];
}

/** Postman `[{ key, value }]` auth parameter lists to a map. */
function authParams(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of list(v)) out[str(obj(p).key)] = str(obj(p).value);
  return out;
}

function importAuth(v: unknown, unsupported: Set<string>): Auth {
  const a = obj(v);
  const type = str(a.type);
  const p = authParams(a[type]);
  switch (type) {
    case '':
    case 'noauth':
      return { kind: 'none' };
    case 'bearer':
      return { kind: 'bearer', token: p.token ?? '' };
    case 'basic':
      return { kind: 'basic', user: p.username ?? '', pass: p.password ?? '' };
    case 'apikey':
      return {
        kind: 'apikey',
        name: p.key ?? '',
        value: p.value ?? '',
        in: p.in === 'query' ? 'query' : 'header',
      };
    default:
      unsupported.add(`${type} auth`);
      return { kind: 'none' };
  }
}

function rowsFrom(v: unknown): StoredRow[] {
  return list(v).map((x) => {
    const r = obj(x);
    return storedRow(
      str(r.key),
      str(r.value),
      r.disabled !== true,
      'text',
      str(obj(r.description).content ?? r.description),
    );
  });
}

function importRequest(item: Obj, unsupported: Set<string>): SavedRequest {
  const r = obj(item.request);
  const rawUrl = typeof r.url === 'string' ? r.url : str(obj(r.url).raw);
  // With a query list, it is the params (all of them) and the raw query is
  // dropped; without one, the raw URL is kept as typed.
  const query = list(obj(r.url).query).map(obj);
  const url = query.length ? rawUrl.split('?')[0] : rawUrl;
  const body = obj(r.body);
  const mode = str(body.mode);
  const req: StoredRequest = {
    mode: 'rest',
    method: str(r.method, 'GET').toUpperCase(),
    url,
    params: query.map((q) =>
      storedRow(str(q.key), str(q.value), q.disabled !== true),
    ),
    headers: rowsFrom(r.header),
    auth: importAuth(r.auth, unsupported),
    body: { kind: 'none', text: '', form: [], contentType: '' },
    graphql: { query: '', variables: '' },
  };
  if (mode === 'raw') {
    const lang = str(obj(obj(body.options).raw).language);
    req.body.kind = lang === 'json' ? 'json' : 'raw';
    req.body.text = str(body.raw);
    if (lang === 'xml') req.body.contentType = 'application/xml';
    else if (lang === 'text' || lang === '')
      req.body.contentType = 'text/plain';
  } else if (mode === 'urlencoded') {
    req.body.kind = 'urlencoded';
    req.body.form = rowsFrom(body.urlencoded);
  } else if (mode === 'formdata') {
    req.body.kind = 'form-data';
    req.body.form = list(body.formdata).map((x) => {
      const f = obj(x);
      const isFile = f.type === 'file';
      const src = Array.isArray(f.src) ? str(f.src[0]) : str(f.src);
      return storedRow(
        str(f.key),
        isFile ? src.split(/[\\/]/).pop() || '' : str(f.value),
        f.disabled !== true,
        isFile ? 'file' : 'text',
      );
    });
  } else if (mode === 'graphql') {
    const g = obj(body.graphql);
    req.mode = 'graphql';
    req.graphql = { query: str(g.query), variables: str(g.variables) };
  } else if (mode === 'file') {
    req.body.kind = 'binary';
  } else if (mode) unsupported.add(`${mode} body`);
  if (item.event) unsupported.add('scripts');
  return {
    id: newId(),
    type: 'request',
    name: str(item.name, 'Request'),
    request: req,
  };
}

function importItems(
  items: unknown,
  unsupported: Set<string>,
): (SavedRequest | Folder)[] {
  return list(items).map((x) => {
    const it = obj(x);
    if (Array.isArray(it.item))
      return {
        id: newId(),
        type: 'folder',
        name: str(it.name, 'Folder'),
        children: importItems(it.item, unsupported),
      } satisfies Folder;
    return importRequest(it, unsupported);
  });
}

/** Postman Collection v2.1 (folders, requests, variables) to collections. */
export function importPostman(json: unknown): PostmanImport {
  const root = obj(json);
  const info = obj(root.info);
  if (!Array.isArray(root.item) || typeof info.name !== 'string')
    throw invalid('This is not a Postman v2.1 collection');
  if (
    str(info.schema) &&
    !str(info.schema).includes('v2.1') &&
    !str(info.schema).includes('v2.0')
  )
    throw invalid('Only Postman collection format v2.0 and v2.1 is supported');
  const unsupported = new Set<string>();
  if (root.event) unsupported.add('scripts');
  if (root.auth) unsupported.add('collection-level auth');
  const vars = list(root.variable).map(obj);
  return {
    collections: [
      {
        id: newId(),
        type: 'folder',
        name: info.name,
        children: importItems(root.item, unsupported),
      },
    ],
    environment: vars.length
      ? {
          id: newId(),
          name: info.name,
          rememberSecrets: false,
          vars: vars.map((v) => ({
            id: newId(),
            key: str(v.key),
            value: str(v.value),
            secret: v.type === 'secret',
          })),
        }
      : null,
    unsupported: [...unsupported],
  };
}

const exRows = (rows: StoredRow[]) =>
  rows.map((r) => ({
    key: r.key,
    value: r.value,
    ...(r.enabled ? {} : { disabled: true }),
    ...(r.description ? { description: r.description } : {}),
  }));

function exportAuth(a: Auth): Obj | undefined {
  const kv = (o: Record<string, string>) =>
    Object.entries(o).map(([key, value]) => ({ key, value, type: 'string' }));
  switch (a.kind) {
    case 'none':
      return undefined;
    case 'bearer':
      return { type: 'bearer', bearer: kv({ token: a.token }) };
    case 'basic':
      return {
        type: 'basic',
        basic: kv({ username: a.user, password: a.pass }),
      };
    case 'apikey':
      return {
        type: 'apikey',
        apikey: kv({ key: a.name, value: a.value, in: a.in }),
      };
  }
}

const RAW_LANG: Partial<Record<string, string>> = {
  'application/xml': 'xml',
  'text/html': 'html',
  'application/javascript': 'javascript',
};

function exportBody(r: StoredRequest): Obj | undefined {
  if (r.mode === 'graphql')
    return {
      mode: 'graphql',
      graphql: { query: r.graphql.query, variables: r.graphql.variables },
    };
  const b = r.body;
  const kinds: Record<BodyKind, () => Obj | undefined> = {
    none: () => undefined,
    json: () => ({
      mode: 'raw',
      raw: b.text,
      options: { raw: { language: 'json' } },
    }),
    raw: () => ({
      mode: 'raw',
      raw: b.text,
      options: { raw: { language: RAW_LANG[b.contentType] ?? 'text' } },
    }),
    urlencoded: () => ({ mode: 'urlencoded', urlencoded: exRows(b.form) }),
    'form-data': () => ({
      mode: 'formdata',
      formdata: b.form.map((f) =>
        f.type === 'file'
          ? {
              key: f.key,
              type: 'file',
              src: f.value,
              ...(f.enabled ? {} : { disabled: true }),
            }
          : {
              key: f.key,
              value: f.value,
              type: 'text',
              ...(f.enabled ? {} : { disabled: true }),
            },
      ),
    }),
    binary: () => ({ mode: 'file', file: {} }),
  };
  return kinds[b.kind]();
}

function exportUrl(r: StoredRequest): Obj {
  if (!r.params.length) return { raw: r.url };
  // Postman's query list holds every param, the URL's own included.
  const [base, own = ''] = r.url.split(/\?(.*)/s);
  const ownRows = [...new URLSearchParams(own)].map(([k, v]) =>
    storedRow(k, v),
  );
  const all = [...ownRows, ...r.params];
  const enabled = all.filter((p) => p.enabled && p.key);
  const q = new URLSearchParams(
    enabled.map((p) => [p.key, p.value]),
  ).toString();
  return { raw: q ? `${base}?${q}` : base, query: exRows(all) };
}

function exportItem(n: SavedRequest | Folder): Obj {
  if (n.type === 'folder')
    return { name: n.name, item: n.children.map(exportItem) };
  const r = n.request;
  const request: Obj = {
    method: r.mode === 'graphql' ? 'POST' : r.method,
    header: exRows(r.headers),
    url: exportUrl(r),
  };
  const body = exportBody(r);
  if (body) request.body = body;
  const auth = exportAuth(r.auth);
  if (auth) request.auth = auth;
  return { name: n.name, request };
}

/**
 * Collections as one Postman v2.1 file. A single collection is the root;
 * several become folders of a root named `name`.
 */
export function exportPostman(
  collections: Folder[],
  opts: { name?: string; environment?: Environment } = {},
): string {
  const single = collections.length === 1 ? collections[0] : null;
  const root: Obj = {
    info: {
      name: single?.name ?? opts.name ?? 'HTTP Client collections',
      schema: POSTMAN_SCHEMA,
    },
    item: single
      ? single.children.map(exportItem)
      : collections.map(exportItem),
  };
  if (opts.environment?.vars.length)
    root.variable = opts.environment.vars.map((v) => ({
      key: v.key,
      value: v.secret && !opts.environment?.rememberSecrets ? '' : v.value,
      ...(v.secret ? { type: 'secret' } : {}),
    }));
  return JSON.stringify(root, null, 2);
}
