/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';

const KEY = 'kit:store:tool:api-request';

describe('HTTP Client settings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('holds no data fields', async () => {
    const { HTTP_DEFAULTS } = await import('./settings');
    assertNoDataFields(HTTP_DEFAULTS);
  });

  it('migrates a v1 store snapshot and keeps the collections', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        version: 1,
        state: {
          collections: [
            {
              id: 'c1',
              type: 'folder',
              name: 'Mine',
              children: [
                {
                  id: 'r1',
                  type: 'request',
                  name: 'Ping',
                  method: 'GET',
                  url: 'https://x.test',
                },
              ],
            },
          ],
        },
      }),
    );
    const { httpSettings } = await import('./settings');
    const [col] = httpSettings.getSettings().collections;
    expect(col.name).toBe('Mine');
    expect(col.children[0]).toMatchObject({
      id: 'r1',
      name: 'Ping',
      request: { method: 'GET', url: 'https://x.test' },
    });
  });

  it('imports apiTesterCollections once', async () => {
    const saved = [{ id: 'x', type: 'folder', name: 'Legacy', children: [] }];
    localStorage.setItem('apiTesterCollections', JSON.stringify(saved));
    const { httpSettings } = await import('./settings');
    expect(httpSettings.getSettings().collections[0].name).toBe('Legacy');
    expect(localStorage.getItem('apiTesterCollections')).toBeNull();
  });

  it('keeps a malformed legacy value and seeds the defaults', async () => {
    localStorage.setItem('apiTesterCollections', '{oops');
    const { httpSettings } = await import('./settings');
    expect(httpSettings.getSettings().collections[0].name).toBe(
      'My Collection',
    );
    expect(localStorage.getItem('apiTesterCollections')).toBe('{oops');
  });
});
