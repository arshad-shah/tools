/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { migrateCollections, type Folder } from './collections-migrate';
import {
  CURL_MIME,
  exportNative,
  HTTP_REQUEST_MIME,
  importCollectionsFile,
  requestFromHandoff,
} from './io';
import { exportPostman, importPostman } from './postman';

/** A Postman v2.1 export: one folder of two requests, one top request. */
const POSTMAN = {
  info: {
    name: 'Shop',
    schema:
      'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: [
    {
      name: 'Users',
      item: [
        {
          name: 'List',
          request: {
            method: 'GET',
            header: [{ key: 'Accept', value: 'application/json' }],
            url: {
              raw: '{{base}}/users?page=2',
              host: ['{{base}}'],
              query: [
                { key: 'page', value: '2' },
                { key: 'debug', value: '1', disabled: true },
              ],
            },
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{tok}}' }],
            },
          },
        },
        {
          name: 'Create',
          event: [{ listen: 'test', script: { exec: [] } }],
          request: {
            method: 'POST',
            url: '{{base}}/users',
            body: {
              mode: 'raw',
              raw: '{"name":"Ada"}',
              options: { raw: { language: 'json' } },
            },
          },
        },
      ],
    },
    {
      name: 'Upload',
      request: {
        method: 'POST',
        url: '{{base}}/up',
        body: {
          mode: 'formdata',
          formdata: [
            { key: 'name', value: 'x', type: 'text' },
            { key: 'f', type: 'file', src: '/home/me/cv.pdf' },
          ],
        },
        auth: { type: 'oauth2', oauth2: [] },
      },
    },
  ],
  variable: [
    { key: 'base', value: 'https://shop.test' },
    { key: 'tok', value: 's', type: 'secret' },
  ],
};

const count = (nodes: Folder['children']): [number, number] =>
  nodes.reduce<[number, number]>(
    ([f, r], n) => {
      if (n.type === 'request') return [f, r + 1];
      const [cf, cr] = count(n.children);
      return [f + 1 + cf, r + cr];
    },
    [0, 0],
  );

const noIds = (v: unknown) =>
  JSON.parse(
    JSON.stringify(v, (k, x: unknown) => (k === 'id' ? undefined : x)),
  );

describe('Postman import and export', () => {
  it('imports the folder and request counts, variables and unsupported list', () => {
    const r = importPostman(POSTMAN);
    expect(r.collections).toHaveLength(1);
    expect(r.collections[0].name).toBe('Shop');
    expect(count(r.collections[0].children)).toEqual([1, 3]);
    const users = r.collections[0].children[0] as Folder;
    const list = users.children[0];
    if (list.type !== 'request') throw new Error('request expected');
    expect(list.request.url).toBe('{{base}}/users');
    expect(list.request.params.map((p) => [p.key, p.enabled])).toEqual([
      ['page', true],
      ['debug', false],
    ]);
    expect(list.request.auth).toEqual({ kind: 'bearer', token: '{{tok}}' });
    const create = users.children[1];
    if (create.type !== 'request') throw new Error('request expected');
    expect(create.request.body).toMatchObject({
      kind: 'json',
      text: '{"name":"Ada"}',
    });
    const up = r.collections[0].children[1];
    if (up.type !== 'request') throw new Error('request expected');
    expect(up.request.body.form.map((f) => [f.key, f.value, f.type])).toEqual([
      ['name', 'x', 'text'],
      ['f', 'cv.pdf', 'file'],
    ]);
    expect(r.environment?.vars.map((v) => [v.key, v.secret])).toEqual([
      ['base', false],
      ['tok', true],
    ]);
    expect(r.unsupported.sort()).toEqual(['oauth2 auth', 'scripts']);
  });

  it('export then import is equal', () => {
    const first = importPostman(POSTMAN);
    const again = importPostman(JSON.parse(exportPostman(first.collections)));
    expect(noIds(again.collections)).toEqual(noIds(first.collections));
  });

  it('refuses a file that is not a collection', () => {
    expect(() => importPostman({ item: 1 })).toThrow(/Postman/);
  });
});

describe('native collections file', () => {
  it('round-trips and reads the v1 array', () => {
    const cols = importPostman(POSTMAN).collections;
    expect(
      noIds(importCollectionsFile(exportNative(cols)).collections),
    ).toEqual(noIds(cols));
    const v1 = [{ id: 'a', type: 'folder', name: 'Old', children: [] }];
    expect(importCollectionsFile(JSON.stringify(v1)).collections).toEqual(
      migrateCollections(v1),
    );
    expect(() => importCollectionsFile('nope')).toThrow(/not JSON/);
  });
});

describe('requestFromHandoff', () => {
  it('reads a URL Inspector request and a cURL command', () => {
    const r = requestFromHandoff({
      kind: 'text',
      mime: HTTP_REQUEST_MIME,
      sourceTool: 'url-parser',
      text: JSON.stringify({
        method: 'GET',
        url: 'https://a.test/x',
        params: [['q', '1']],
      }),
    });
    expect(r?.url).toBe('https://a.test/x');
    expect(r?.params.map((p) => [p.key, p.value])).toEqual([['q', '1']]);
    expect(
      requestFromHandoff({
        kind: 'text',
        mime: CURL_MIME,
        sourceTool: 'x',
        text: 'curl -X DELETE https://a.test/1',
      })?.method,
    ).toBe('DELETE');
    expect(
      requestFromHandoff({
        kind: 'text',
        mime: 'text/plain',
        sourceTool: 'x',
        text: '',
      }),
    ).toBeNull();
  });
});
