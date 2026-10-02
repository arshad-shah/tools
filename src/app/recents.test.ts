import { beforeEach, describe, expect, it } from 'vitest';
import { useRecentToolsStore } from './recents';

beforeEach(() => useRecentToolsStore.setState({ ids: [] }));

describe('recent tools', () => {
  it('keeps the newest first, without duplicates, up to six', () => {
    const { visit } = useRecentToolsStore.getState();
    for (const id of ['a', 'b', 'c', 'a', 'd', 'e', 'f', 'g'])
      useRecentToolsStore.getState().visit(id);
    expect(useRecentToolsStore.getState().ids).toEqual([
      'g',
      'f',
      'e',
      'd',
      'a',
      'c',
    ]);
    visit('g');
    expect(useRecentToolsStore.getState().ids[0]).toBe('g');
  });
});
