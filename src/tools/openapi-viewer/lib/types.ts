import type { LoadedSpec } from './load';

export const HTTP_METHODS = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
] as const;

export interface ServerVariable {
  default: string;
  enum?: string[];
  description?: string;
}

export interface Server {
  url: string;
  description?: string;
  variables: Record<string, ServerVariable>;
}

export interface Param {
  name: string;
  /** Swagger 2.0 `body` and `formData` ones become the request body. */
  in: 'path' | 'query' | 'header' | 'cookie' | 'body' | 'formData';
  required: boolean;
  description?: string;
  deprecated?: boolean;
  /** The schema as written (may hold `$ref`). */
  schema?: unknown;
  example?: unknown;
}

export interface MediaContent {
  mediaType: string;
  schema?: unknown;
  /** An explicit example (from `example` or the first of `examples`). */
  example?: unknown;
  hasExample: boolean;
}

export interface RequestBody {
  required: boolean;
  description?: string;
  contents: MediaContent[];
}

export interface Response {
  status: string;
  description?: string;
  contents: MediaContent[];
}

/** A security requirement's schemes, resolved: name and what it sends. */
export interface SecurityScheme {
  name: string;
  type: string;
  /** apiKey: the header, query or cookie name. */
  paramName?: string;
  in?: string;
  /** http: basic, bearer... */
  scheme?: string;
}

export interface Operation {
  /** `GET /pets/{id}`: unique within a document. */
  id: string;
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags: string[];
  deprecated: boolean;
  parameters: Param[];
  requestBody?: RequestBody;
  responses: Response[];
  security: SecurityScheme[];
}

export interface TagGroup {
  name: string;
  description?: string;
  operations: Operation[];
}

export interface Api {
  title: string;
  version: string;
  description?: string;
  specVersion: string;
  kind: LoadedSpec['kind'];
  servers: Server[];
  groups: TagGroup[];
  operationCount: number;
  /** Things in the document the viewer could not use (missing refs...). */
  problems: string[];
}

export const UNTAGGED = 'Untagged';
