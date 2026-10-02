/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { createToolSettings } from './tool-settings';

beforeEach(() => localStorage.clear());

describe('createToolSettings', () => {
  it('returns defaults, persists patches under the tool key, resets', () => {
    const s = createToolSettings(
      'demo',
      { indent: 2, wrap: false },
      { version: 1 },
    );
    const { result } = renderHook(() => s.useSettings());
    expect(result.current[0]).toEqual({ indent: 2, wrap: false });
    act(() => result.current[1]({ indent: 4 }));
    expect(result.current[0].indent).toBe(4);
    expect(localStorage.getItem('kit:store:tool:demo')).toContain('"indent":4');
    act(() => result.current[2]());
    expect(s.getSettings()).toEqual({ indent: 2, wrap: false });
  });
  it('re-renders a keyed subscriber only when its keys change', () => {
    const s = createToolSettings(
      'demo-keys',
      { indent: 2, wrap: false as boolean, cap: 10 },
      { version: 1 },
    );
    let renders = 0;
    const { result } = renderHook(() => {
      renders++;
      return s.useSettings(['indent', 'wrap']);
    });
    expect(result.current[0]).toEqual({ indent: 2, wrap: false });
    const before = renders;
    act(() => result.current[1]({ cap: 20 }));
    expect(renders).toBe(before);
    act(() => result.current[1]({ wrap: true }));
    expect(result.current[0]).toEqual({ indent: 2, wrap: true });
  });

  it('migrates stored state from an older version', () => {
    localStorage.setItem(
      'kit:store:tool:old',
      JSON.stringify({ state: { history: ['1+1 = 2'] }, version: 0 }),
    );
    const s = createToolSettings(
      'old',
      { history: [] as string[], precision: 10 },
      {
        version: 1,
        migrate: (old) => ({
          history: (old as { history?: string[] }).history ?? [],
          precision: 10,
        }),
      },
    );
    expect(s.getSettings().history).toEqual(['1+1 = 2']);
  });
  it('passes the stored version to migrate', () => {
    localStorage.setItem(
      'kit:store:tool:from',
      JSON.stringify({ state: { n: 1 }, version: 2 }),
    );
    const seen: number[] = [];
    createToolSettings(
      'from',
      { n: 0 },
      {
        version: 3,
        migrate: (old, from) => {
          seen.push(from);
          return old as { n: number };
        },
      },
    );
    expect(seen).toEqual([2]);
  });
  it('keeps only known keys with the default type, and falls back on a failed migration', () => {
    localStorage.setItem(
      'kit:store:tool:shape',
      JSON.stringify({
        state: { indent: 'four', wrap: true, stale: 1 },
        version: 1,
      }),
    );
    const s = createToolSettings(
      'shape',
      { indent: 2, wrap: false },
      { version: 1 },
    );
    expect(s.getSettings()).toEqual({ indent: 2, wrap: true });

    localStorage.setItem(
      'kit:store:tool:broken',
      JSON.stringify({ state: { indent: 9 }, version: 0 }),
    );
    const b = createToolSettings(
      'broken',
      { indent: 2 },
      {
        version: 1,
        migrate: () => {
          throw new Error('bad');
        },
      },
    );
    expect(b.getSettings()).toEqual({ indent: 2 });
  });
  it('checks array elements and nested objects against the defaults', () => {
    const defaults = {
      zones: ['UTC'],
      history: [] as string[],
      fields: [{ name: 'id', unique: true }],
      resize: { w: 0, h: 0 },
      memories: [{ label: 'M1', value: null as number | null }],
      byLang: {} as { [k: string]: number },
    };
    const load = (id: string, state: Record<string, unknown>) => {
      localStorage.setItem(
        `kit:store:tool:${id}`,
        JSON.stringify({ state, version: 1 }),
      );
      return createToolSettings(id, defaults, { version: 1 }).getSettings();
    };
    // Mismatched element kinds, nested kinds or missing nested keys fall back.
    expect(
      load('deep-bad', {
        zones: ['Europe/Dublin', { evil: 1 }],
        history: ['a', { evil: 1 }],
        fields: [{ name: 'x', unique: 'yes' }],
        resize: { w: 5 },
      }),
    ).toEqual(defaults);
    expect(load('deep-kind', { resize: { w: 'wide', h: 1 } }).resize).toEqual(
      defaults.resize,
    );
    // Matching shapes are kept; extra keys and free-form maps are allowed.
    const good = {
      zones: ['Europe/Dublin', 'Asia/Tokyo'],
      history: ['a', 'b'],
      fields: [{ name: 'x' }, { name: 'y', unique: false, extra: [1] }],
      resize: { w: 5, h: 6 },
      // A nested null default is nullable: any value is kept.
      memories: [{ label: 'M1', value: 5 }],
      byLang: { js: 2 },
    };
    expect(load('deep-good', good)).toEqual(good);
  });
  it('refuses values that are not JSON', () => {
    const s = createToolSettings('json', { when: 0 }, { version: 1 });
    const { result } = renderHook(() => s.useSettings());
    expect(() =>
      result.current[1]({ when: new Date() as unknown as number }),
    ).toThrow(/JSON/);
  });
});

describe('assertNoDataFields', () => {
  it('rejects data-like keys', () => {
    expect(() => assertNoDataFields({ indent: 2, input: '' })).toThrow(/input/);
    expect(() => assertNoDataFields({ apiToken: '' })).toThrow(/apiToken/);
    expect(() =>
      assertNoDataFields({ indent: 2, keyFormat: 'hex' }),
    ).not.toThrow();
  });
});
