import { describe, expect, it } from 'vitest';
import { buildApi, type Api, type Operation } from './api';
import { exampleFor, typeLabel } from './example';
import { filterGroups } from './filter';
import { loadSpec } from './load';
import { deref, lookupRef, resolve } from './refs';
import {
  buildRequest,
  serverUrl,
  toCurlCommand,
  toHttpClient,
} from './request';
import { SAMPLE_OPENAPI } from './samples';
import { schemaRows } from './schema-rows';

const load = async (text: string) => {
  const spec = await loadSpec(text);
  return { spec, api: buildApi(spec) };
};

const op = (api: Api, id: string): Operation => {
  const found = api.groups
    .flatMap((g) => g.operations)
    .find((o) => o.id === id);
  if (!found) throw new Error(`no ${id}`);
  return found;
};

describe('refs', () => {
  const doc = {
    a: { 'b/c': { '~d': 1 } },
    list: [10, 20],
    loop: { $ref: '#/loop2' },
    loop2: { $ref: '#/loop' },
    node: { properties: { next: { $ref: '#/node' } } },
  };

  it('looks up JSON pointers with escapes and arrays', () => {
    expect(lookupRef(doc, '#/a/b~1c/~0d')).toBe(1);
    expect(lookupRef(doc, '#/list/1')).toBe(20);
    expect(lookupRef(doc, '#/nope')).toBeUndefined();
    expect(lookupRef(doc, 'other.yaml#/a')).toBeUndefined();
  });

  it('reports ref loops and missing refs', () => {
    expect(resolve(doc, { $ref: '#/loop' }).circular).toBe('#/loop');
    expect(resolve(doc, { $ref: '#/x' }).missing).toBe('#/x');
  });

  it('expands a self-referencing schema once', () => {
    expect(deref(doc, { $ref: '#/node' })).toEqual({
      properties: { next: { $circular: '#/node' } },
    });
  });
});

describe('loadSpec', () => {
  it('reads YAML and JSON, OpenAPI 3 and Swagger 2', async () => {
    const y = await loadSpec(SAMPLE_OPENAPI);
    expect(y).toMatchObject({
      kind: 'openapi3',
      version: '3.0.3',
      format: 'yaml',
    });
    const j = await loadSpec(
      '{"swagger":"2.0","info":{"title":"T","version":"1"},"paths":{}}',
    );
    expect(j).toMatchObject({ kind: 'swagger2', format: 'json' });
  });

  it('explains what is wrong', async () => {
    await expect(loadSpec('')).rejects.toThrow(/Paste or open/);
    await expect(loadSpec('{"a":')).rejects.toThrow(/Not valid JSON/);
    await expect(loadSpec('a: [1')).rejects.toThrow();
    await expect(loadSpec('name: x')).rejects.toThrow(
      /no "openapi" or "swagger"/,
    );
    await expect(loadSpec('openapi: 4.0.0')).rejects.toThrow(/not supported/);
    await expect(loadSpec('- 1')).rejects.toThrow(/not an object/);
  });
});

describe('buildApi (OpenAPI 3)', () => {
  it('reads info, servers and groups operations by tag in tag order', async () => {
    const { api } = await load(SAMPLE_OPENAPI);
    expect(api).toMatchObject({
      title: 'Pet Store',
      version: '1.2.0',
      operationCount: 6,
    });
    expect(api.servers.map((s) => s.url)).toEqual([
      'https://{region}.api.example.com/v1',
      '/v1',
    ]);
    expect(api.groups.map((g) => [g.name, g.operations.length])).toEqual([
      ['pets', 4],
      ['owners', 1],
      ['Untagged', 1],
    ]);
    expect(api.groups[0].description).toBe('Everything about pets');
  });

  it('merges path parameters and resolves parameter, response and security refs', async () => {
    const { api } = await load(SAMPLE_OPENAPI);
    const get = op(api, 'GET /pets/{petId}');
    expect(get.parameters.map((p) => `${p.in}:${p.name}`)).toEqual([
      'path:petId',
    ]);
    const list = op(api, 'GET /pets');
    expect(list.parameters.map((p) => p.name)).toEqual([
      'limit',
      'status',
      'X-Trace-Id',
    ]);
    expect(list.security).toEqual([
      {
        name: 'apiKey',
        type: 'apiKey',
        paramName: 'X-API-Key',
        in: 'header',
        scheme: undefined,
      },
    ]);
    const post = op(api, 'POST /pets');
    expect(post.responses[0]).toMatchObject({
      status: '201',
      description: 'Created',
    });
    expect(op(api, 'DELETE /pets/{petId}')).toMatchObject({ deprecated: true });
    expect(op(api, 'GET /health').security).toEqual([]);
  });
});

describe('buildApi (Swagger 2)', () => {
  const SWAGGER = JSON.stringify({
    swagger: '2.0',
    info: { title: 'Old', version: 1 },
    host: 'api.example.com',
    basePath: '/v2',
    schemes: ['https', 'http'],
    consumes: ['application/json'],
    securityDefinitions: {
      key: { type: 'apiKey', in: 'query', name: 'api_key' },
    },
    paths: {
      '/items/{id}': {
        put: {
          parameters: [
            { name: 'id', in: 'path', required: true, type: 'integer' },
            {
              name: 'body',
              in: 'body',
              required: true,
              schema: { $ref: '#/definitions/Item' },
            },
          ],
          responses: {
            200: { description: 'ok', schema: { $ref: '#/definitions/Item' } },
          },
          security: [{ key: [] }],
        },
      },
      '/upload': {
        post: {
          consumes: ['multipart/form-data'],
          parameters: [
            { name: 'note', in: 'formData', type: 'string' },
            { name: 'file', in: 'formData', type: 'file', required: true },
          ],
          responses: { 204: { description: 'done' } },
        },
      },
    },
    definitions: {
      Item: { type: 'object', properties: { name: { type: 'string' } } },
    },
  });

  it('maps host, body and formData parameters', async () => {
    const { spec, api } = await load(SWAGGER);
    expect(api.version).toBe('1');
    expect(api.servers.map((s) => s.url)).toEqual([
      'https://api.example.com/v2',
      'http://api.example.com/v2',
    ]);
    const put = op(api, 'PUT /items/{id}');
    expect(put.parameters.map((p) => p.name)).toEqual(['id']);
    expect(put.requestBody?.contents[0].mediaType).toBe('application/json');
    expect(put.responses[0].contents[0].mediaType).toBe('application/json');
    const r = buildRequest(spec.doc, put, api.servers[0]);
    expect(r.url).toBe(
      'https://api.example.com/v2/items/{{id}}?api_key={{key}}',
    );
    const up = op(api, 'POST /upload');
    expect(up.requestBody?.contents[0].mediaType).toBe('multipart/form-data');
    const ur = buildRequest(spec.doc, up, api.servers[0]);
    expect(ur.body).toEqual({
      kind: 'form',
      fields: [
        { name: 'note', value: 'string', file: false },
        { name: 'file', value: 'file.bin', file: true },
      ],
    });
  });
});

describe('examples, types and schema rows', () => {
  it('builds an example, skipping readOnly and stopping at cycles', async () => {
    const { spec } = await load(SAMPLE_OPENAPI);
    const pet = { $ref: '#/components/schemas/Pet' };
    expect(exampleFor(spec.doc, pet, { skip: 'readOnly' })).toEqual({
      name: 'Rex',
      tags: ['string'],
      category: { name: 'string', parent: null, children: [null] },
      owner: { email: 'user@example.com' },
    });
    expect(exampleFor(spec.doc, pet)).toMatchObject({ id: 0 });
    expect(exampleFor({}, { type: ['null', 'number'], minimum: 5 })).toBe(5);
    expect(
      exampleFor({}, { oneOf: [{ type: 'boolean' }, { type: 'string' }] }),
    ).toBe(true);
  });

  it('labels types', async () => {
    const { spec } = await load(SAMPLE_OPENAPI);
    expect(
      typeLabel(spec.doc, {
        type: 'array',
        items: { $ref: '#/components/schemas/Pet' },
      }),
    ).toBe('array of Pet');
    expect(
      typeLabel(spec.doc, { type: 'string', format: 'uuid', nullable: true }),
    ).toBe('string (uuid), nullable');
    expect(typeLabel(spec.doc, { $ref: '#/components/schemas/Nope' })).toBe(
      'Nope (not found)',
    );
  });

  it('flattens properties with paths and marks cycles', async () => {
    const { spec } = await load(SAMPLE_OPENAPI);
    const { rows } = schemaRows(spec.doc, { $ref: '#/components/schemas/Pet' });
    const by = Object.fromEntries(rows.map((r) => [r.path, r]));
    expect(Object.keys(by)).toEqual([
      'id',
      'name',
      'tags',
      'category',
      'category.name',
      'category.parent',
      'category.children',
      'owner',
      'owner.email',
    ]);
    expect(by.name.required).toBe(true);
    expect(by.id.notes).toContain('Read only');
    expect(by['category.parent'].type).toBe('Category (circular)');
    expect(by['category.children'].type).toBe('array of Category');
  });

  it('describes array responses through their items', async () => {
    const { spec } = await load(SAMPLE_OPENAPI);
    const { rows } = schemaRows(spec.doc, {
      type: 'array',
      items: { $ref: '#/components/schemas/Owner' },
    });
    expect(rows.map((r) => r.path)).toEqual(['[].email']);
  });
});

describe('requests', () => {
  it('fills server variables, path and query examples and placeholders', async () => {
    const { spec, api } = await load(SAMPLE_OPENAPI);
    expect(serverUrl(api.servers[0])).toBe('https://eu.api.example.com/v1');
    expect(serverUrl(api.servers[1])).toBe('https://{{host}}/v1');
    expect(serverUrl(api.servers[1], 'http://localhost:8080/')).toBe(
      'http://localhost:8080/v1',
    );
    expect(serverUrl(undefined)).toBe('https://{{host}}');
    const r = buildRequest(spec.doc, op(api, 'GET /pets'), api.servers[0]);
    expect(r).toEqual({
      method: 'GET',
      url: 'https://eu.api.example.com/v1/pets?limit=20&status=available',
      headers: [
        ['X-Trace-Id', '{{X-Trace-Id}}'],
        ['X-API-Key', '{{apiKey}}'],
        ['Accept', 'application/json'],
      ],
      basic: undefined,
      body: undefined,
    });
    const g = buildRequest(
      spec.doc,
      op(api, 'GET /pets/{petId}'),
      api.servers[0],
    );
    expect(g.url).toBe('https://eu.api.example.com/v1/pets/{{petId}}');
  });

  it('builds a JSON body and basic auth, as curl for the HTTP Client', async () => {
    const { spec, api } = await load(SAMPLE_OPENAPI);
    const r = buildRequest(spec.doc, op(api, 'POST /pets'), api.servers[0]);
    expect(r.headers[0]).toEqual(['Content-Type', 'application/json']);
    expect(r.body?.kind === 'text' && JSON.parse(r.body.text)).toMatchObject({
      name: 'Rex',
    });
    const curl = toCurlCommand(r);
    expect(curl).toMatch(
      /^curl https:\/\/eu\.api\.example\.com\/v1\/pets \\\n/,
    );
    expect(curl).toContain("-H 'Content-Type: application/json'");
    expect(curl).toContain('--data-raw \'{\n  "name": "Rex",');
    expect(toHttpClient(r)).toMatchObject({
      kind: 'text',
      mime: 'application/x-curl',
    });
    const del = buildRequest(
      spec.doc,
      op(api, 'DELETE /pets/{petId}'),
      api.servers[0],
    );
    expect(del.basic).toEqual(['{{username}}', '{{password}}']);
    expect(toCurlCommand(del)).toContain("-u '{{username}}:{{password}}'");
    expect(toCurlCommand(del)).toMatch(/^curl -X DELETE /);
  });

  it('builds multipart fields and uses a plain-text example', async () => {
    const { spec, api } = await load(SAMPLE_OPENAPI);
    const put = buildRequest(
      spec.doc,
      op(api, 'PUT /owners/{ownerId}/avatar'),
      api.servers[0],
    );
    expect(put.url).toBe('https://eu.api.example.com/v1/owners/42/avatar');
    expect(toCurlCommand(put)).toContain('-F file=@file.bin');
    const health = buildRequest(
      spec.doc,
      op(api, 'GET /health'),
      api.servers[1],
    );
    expect(health.headers).toEqual([['Accept', 'text/plain']]);
    expect(toCurlCommand(health)).toBe(
      "curl 'https://{{host}}/v1/health' \\\n  -H 'Accept: text/plain'",
    );
  });
});

describe('filterGroups', () => {
  it('matches every word, with method words matching the method', async () => {
    const { api } = await load(SAMPLE_OPENAPI);
    const ids = (q: string) =>
      filterGroups(api.groups, q).flatMap((g) => g.operations.map((o) => o.id));
    expect(ids('')).toHaveLength(6);
    expect(ids('get pet')).toEqual(['GET /pets', 'GET /pets/{petId}']);
    expect(ids('avatar')).toEqual(['PUT /owners/{ownerId}/avatar']);
    expect(ids('listPets')).toEqual(['GET /pets']);
    expect(ids('nothing here')).toEqual([]);
  });
});
