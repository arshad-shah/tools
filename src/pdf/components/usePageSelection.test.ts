/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  emptySelection,
  nextSelection,
  rangeSelect,
  usePageSelection,
} from './usePageSelection';

const keys = ['a', 'b', 'c', 'd', 'e'];
const plain = { shift: false, meta: false };
const shift = { shift: true, meta: false };
const meta = { shift: false, meta: true };
const sorted = (s: ReadonlySet<string>) => [...s].sort();

describe('rangeSelect', () => {
  it('selects inclusively in either direction', () => {
    expect(sorted(rangeSelect(keys, 'b', 'd'))).toEqual(['b', 'c', 'd']);
    expect(sorted(rangeSelect(keys, 'd', 'b'))).toEqual(['b', 'c', 'd']);
  });
  it('falls back to the key alone without a usable anchor', () => {
    expect(sorted(rangeSelect(keys, null, 'c'))).toEqual(['c']);
    expect(sorted(rangeSelect(keys, 'zz', 'c'))).toEqual(['c']);
    expect(rangeSelect(keys, 'a', 'zz').size).toBe(0);
  });
});

describe('nextSelection', () => {
  it('replace mode: a plain click selects only that item, again clears it', () => {
    let s = nextSelection(emptySelection, keys, 'b', plain);
    s = nextSelection(s, keys, 'c', plain);
    expect(sorted(s.selected)).toEqual(['c']);
    expect(s.anchor).toBe('c');
    s = nextSelection(s, keys, 'c', plain);
    expect(s.selected.size).toBe(0);
  });
  it('toggle mode: plain clicks add and remove', () => {
    let s = nextSelection(emptySelection, keys, 'b', plain, 'toggle');
    s = nextSelection(s, keys, 'd', plain, 'toggle');
    expect(sorted(s.selected)).toEqual(['b', 'd']);
    s = nextSelection(s, keys, 'b', plain, 'toggle');
    expect(sorted(s.selected)).toEqual(['d']);
  });
  it('ctrl/cmd toggles one item and moves the anchor', () => {
    let s = nextSelection(emptySelection, keys, 'a', plain);
    s = nextSelection(s, keys, 'c', meta);
    expect(sorted(s.selected)).toEqual(['a', 'c']);
    expect(s.anchor).toBe('c');
  });
  it('shift adds the range from the anchor and keeps the anchor', () => {
    let s = nextSelection(emptySelection, keys, 'b', plain);
    s = nextSelection(s, keys, 'd', shift);
    expect(sorted(s.selected)).toEqual(['b', 'c', 'd']);
    expect(s.anchor).toBe('b');
    s = nextSelection(s, keys, 'e', shift);
    expect(sorted(s.selected)).toEqual(['b', 'c', 'd', 'e']);
  });
  it('shift without an anchor selects the key and anchors there', () => {
    const s = nextSelection(emptySelection, keys, 'c', shift);
    expect(sorted(s.selected)).toEqual(['c']);
    expect(s.anchor).toBe('c');
  });
});

describe('usePageSelection', () => {
  it('drops keys that disappear and supports select all / clear', () => {
    const { result, rerender } = renderHook(({ k }) => usePageSelection(k), {
      initialProps: { k: keys },
    });
    act(() => result.current.toggle('b', plain));
    act(() => result.current.toggle('d', shift));
    expect(sorted(result.current.selected)).toEqual(['b', 'c', 'd']);

    rerender({ k: ['a', 'b', 'd', 'e'] });
    expect(sorted(result.current.selected)).toEqual(['b', 'd']);

    act(() => result.current.selectAll());
    expect(sorted(result.current.selected)).toEqual(['a', 'b', 'd', 'e']);
    act(() => result.current.clear());
    expect(result.current.selected.size).toBe(0);
    expect(result.current.anchor).toBeNull();
  });

  it('does not resurrect a removed key when it comes back', () => {
    const { result, rerender } = renderHook(({ k }) => usePageSelection(k), {
      initialProps: { k: keys },
    });
    act(() => result.current.toggle('c', plain));
    rerender({ k: ['a', 'b'] });
    act(() => result.current.toggle('a', meta));
    rerender({ k: keys });
    expect(sorted(result.current.selected)).toEqual(['a']);
  });
});
