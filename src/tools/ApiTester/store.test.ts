/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('api-request store', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });
  it('imports apiTesterCollections once', async () => {
    const saved = [{ id: 'x', type: 'folder', name: 'Mine', children: [] }];
    localStorage.setItem('apiTesterCollections', JSON.stringify(saved));
    const { useApiCollections } = await import('./store');
    expect(useApiCollections.getState().collections).toEqual(saved);
    expect(localStorage.getItem('apiTesterCollections')).toBeNull();
    expect(
      JSON.parse(localStorage.getItem('kit:store:tool:api-request')!).state
        .collections,
    ).toEqual(saved);
  });
  it('seeds the default collection for new users', async () => {
    const { useApiCollections } = await import('./store');
    expect(useApiCollections.getState().collections[0].name).toBe(
      'My Collection',
    );
  });
  it('keeps defaults when the legacy value is malformed', async () => {
    localStorage.setItem('apiTesterCollections', '{oops');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { useApiCollections } = await import('./store');
    expect(useApiCollections.getState().collections[0].name).toBe(
      'My Collection',
    );
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
  it('setCollections persists', async () => {
    const { useApiCollections } = await import('./store');
    useApiCollections.getState().setCollections([]);
    expect(useApiCollections.getState().collections).toEqual([]);
    expect(localStorage.getItem('kit:store:tool:api-request')).toContain(
      '"collections":[]',
    );
  });
});
