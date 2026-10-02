import { describe, expect, it } from 'vitest';
import {
  migrateCollections,
  toHttpRequest,
  toStoredRequest,
} from './collections-migrate';

/** A v1 store snapshot (kit:store:tool:api-request state.collections). */
const V1 = [
  {
    id: '1',
    type: 'folder',
    name: 'My Collection',
    children: [
      {
        id: '2',
        type: 'request',
        name: 'Get Users',
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/users',
        params: [
          { key: 'page', value: '2', enabled: true },
          { key: '', value: '', enabled: true },
        ],
        headers: [{ key: 'Accept', value: 'application/json' }],
      },
      {
        id: 'f',
        type: 'folder',
        name: 'Nested',
        children: [
          {
            id: '3',
            type: 'request',
            name: 'Form',
            method: 'post',
            url: 'https://x.test',
            bodyType: 'x-www-form-urlencoded',
            body: 'a=1&b=x=y',
          },
          {
            id: '4',
            type: 'request',
            name: 'Gql',
            method: 'POST',
            url: 'https://x.test/gql',
            requestType: 'graphql',
            graphqlQuery: '{ me }',
            graphqlVariables: '{}',
          },
        ],
      },
    ],
  },
  { junk: true },
];

const strip = (v: unknown): unknown =>
  JSON.parse(
    JSON.stringify(v, (k, val: unknown) =>
      k === 'id' && typeof val === 'string' && val.length > 8 ? '<id>' : val,
    ),
  );

describe('collections migration v1 to v2', () => {
  it('keeps every folder and request (snapshot)', () => {
    expect(strip(migrateCollections(V1))).toMatchInlineSnapshot(`
      [
        {
          "children": [
            {
              "id": "2",
              "name": "Get Users",
              "request": {
                "auth": {
                  "kind": "none",
                },
                "body": {
                  "contentType": "",
                  "form": [],
                  "kind": "none",
                  "text": "",
                },
                "graphql": {
                  "query": "",
                  "variables": "",
                },
                "headers": [
                  {
                    "description": "",
                    "enabled": true,
                    "id": "<id>",
                    "key": "Accept",
                    "type": "text",
                    "value": "application/json",
                  },
                ],
                "method": "GET",
                "mode": "rest",
                "params": [
                  {
                    "description": "",
                    "enabled": true,
                    "id": "<id>",
                    "key": "page",
                    "type": "text",
                    "value": "2",
                  },
                ],
                "url": "https://jsonplaceholder.typicode.com/users",
              },
              "type": "request",
            },
            {
              "children": [
                {
                  "id": "3",
                  "name": "Form",
                  "request": {
                    "auth": {
                      "kind": "none",
                    },
                    "body": {
                      "contentType": "",
                      "form": [
                        {
                          "description": "",
                          "enabled": true,
                          "id": "<id>",
                          "key": "a",
                          "type": "text",
                          "value": "1",
                        },
                        {
                          "description": "",
                          "enabled": true,
                          "id": "<id>",
                          "key": "b",
                          "type": "text",
                          "value": "x=y",
                        },
                      ],
                      "kind": "urlencoded",
                      "text": "",
                    },
                    "graphql": {
                      "query": "",
                      "variables": "",
                    },
                    "headers": [],
                    "method": "POST",
                    "mode": "rest",
                    "params": [],
                    "url": "https://x.test",
                  },
                  "type": "request",
                },
                {
                  "id": "4",
                  "name": "Gql",
                  "request": {
                    "auth": {
                      "kind": "none",
                    },
                    "body": {
                      "contentType": "",
                      "form": [],
                      "kind": "none",
                      "text": "",
                    },
                    "graphql": {
                      "query": "{ me }",
                      "variables": "{}",
                    },
                    "headers": [],
                    "method": "POST",
                    "mode": "graphql",
                    "params": [],
                    "url": "https://x.test/gql",
                  },
                  "type": "request",
                },
              ],
              "id": "f",
              "name": "Nested",
              "type": "folder",
            },
          ],
          "id": "1",
          "name": "My Collection",
          "type": "folder",
        },
      ]
    `);
  });

  it('round-trips between the stored and editable forms', () => {
    const [folder] = migrateCollections(V1);
    const saved = folder.children[0];
    if (saved.type !== 'request') throw new Error('expected a request');
    expect(toStoredRequest(toHttpRequest(saved.request))).toEqual(
      saved.request,
    );
  });

  it('returns nothing for a non-list', () => {
    expect(migrateCollections({})).toEqual([]);
  });
});
