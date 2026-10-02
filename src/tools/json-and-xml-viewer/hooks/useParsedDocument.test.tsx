/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseJsonFlat } from '@/shared/lib/data-formats/json-flat';
import type { DocFormat } from '../lib/detect-format';
import { useParsedDocument } from './useParsedDocument';

const call = vi.fn();
vi.mock('@/shared/workers/text-client', () => ({
  createTextWorker: () => ({ call }),
}));

beforeEach(() => {
  vi.useFakeTimers();
  call.mockReset();
});
afterEach(() => vi.useRealTimers());

const flush = async (ms = 150) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

const render = (text: string, format: DocFormat = 'json') =>
  renderHook(({ t, f }) => useParsedDocument(t, f), {
    initialProps: { t: text, f: format },
  });

describe('useParsedDocument', () => {
  it('updates only after the 150 ms debounce', async () => {
    const { result } = render('{"a":1}');
    await flush(100);
    expect(result.current.doc).toBeNull();
    expect(result.current.parsing).toBe(true);
    await flush(60);
    expect(result.current.doc?.children?.[0].id).toBe('$.a');
    expect(result.current.value).toEqual({ a: 1 });
    expect(result.current.parsing).toBe(false);
  });

  it('exposes the line and column of a parse error', async () => {
    const { result } = render('{\n  "a": 1,\n}');
    await flush();
    expect(result.current.doc).toBeNull();
    expect(result.current.error).toMatchObject({
      code: 'INVALID_INPUT',
      line: 3,
      column: 1,
    });
  });

  it('parses XML and YAML', async () => {
    const xml = render('<r a="1"/>', 'xml');
    await flush();
    expect(xml.result.current.doc?.id).toBe('/r');
    expect(xml.result.current.xml).not.toBeNull();
    const yaml = render('a:\n  - 1\n', 'yaml');
    await flush();
    // parseYaml loads `yaml` on first use.
    await act(() => vi.dynamicImportSettled());
    expect(yaml.result.current.value).toEqual({ a: [1] });
    expect(yaml.result.current.doc?.children?.[0].kind).toBe('array');
  });

  it('routes a 1.2 MB input to the worker and a 1 KB input not', async () => {
    const big = `[${'"xxxxxxxxxx",'.repeat(100_000)}1]`;
    expect(big.length).toBeGreaterThan(1_200_000);
    call.mockImplementation((_m: string, [t]: [string]) =>
      Promise.resolve(parseJsonFlat(t)),
    );
    const { result } = render(big);
    await flush();
    expect(call).toHaveBeenCalledWith(
      'json.parseFlat',
      [big],
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.current.doc?.childCount).toBe(100_001);

    call.mockClear();
    render(`[${'1,'.repeat(400)}1]`);
    await flush();
    expect(call).not.toHaveBeenCalled();
  });

  it('drops a stale result when the input changed mid-parse', async () => {
    const big = `{"old":"${'x'.repeat(1_100_000)}"}`;
    let resolveOld!: (v: unknown) => void;
    call.mockImplementation(() => new Promise((r) => (resolveOld = r)));
    const { result, rerender } = render(big);
    await flush();
    expect(call).toHaveBeenCalledTimes(1);
    rerender({ t: '{"new":1}', f: 'json' });
    await flush();
    expect(result.current.doc?.children?.[0].id).toBe('$.new');
    await act(async () => {
      resolveOld(parseJsonFlat(big));
      await Promise.resolve();
    });
    expect(result.current.doc?.children?.[0].id).toBe('$.new');
  });
});
