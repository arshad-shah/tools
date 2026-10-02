/**
 * The HTTP Client's request model (spec §8.8). Rows match the kit
 * `KeyValueRow` shape (6-A2) so the editor can bind them directly.
 */
export interface KvRow {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
  type?: 'text' | 'secret' | 'file';
  /** Form-data file rows only; never stored. */
  file?: File;
  description?: string;
}

export type BodyKind =
  | 'none'
  | 'json'
  | 'form-data'
  | 'urlencoded'
  | 'raw'
  | 'binary';

export type Auth =
  | { kind: 'none' }
  | { kind: 'bearer'; token: string }
  | { kind: 'basic'; user: string; pass: string }
  | { kind: 'apikey'; name: string; value: string; in: 'header' | 'query' };

export interface RequestBody {
  kind: BodyKind;
  /** json and raw bodies. */
  text: string;
  /** form-data and urlencoded rows. */
  form: KvRow[];
  /** binary body; never stored. */
  file?: File | null;
  /** Content type for raw and binary bodies (empty = none sent). */
  contentType: string;
}

export interface HttpRequest {
  mode: 'rest' | 'graphql';
  method: string;
  url: string;
  params: KvRow[];
  headers: KvRow[];
  auth: Auth;
  body: RequestBody;
  graphql: { query: string; variables: string };
}

export const METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
] as const;

export function emptyRequest(over: Partial<HttpRequest> = {}): HttpRequest {
  return {
    mode: 'rest',
    method: 'GET',
    url: '',
    params: [],
    headers: [],
    auth: { kind: 'none' },
    body: { kind: 'none', text: '', form: [], file: null, contentType: '' },
    graphql: { query: '', variables: '' },
    ...over,
  };
}
