/** @vitest-environment jsdom */
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import type { PageBitmap } from '@/pdf/render';
import { PageThumb } from './PageThumb';

const hook = vi.hoisted(() => ({
  result: { bitmap: null, error: null } as PageBitmap,
  calls: [] as boolean[],
  priorities: [] as (number | undefined)[],
}));
vi.mock('@/pdf/render', () => ({
  usePageBitmap: (
    _d: string,
    _p: number,
    _w: number,
    enabled: boolean,
    priority?: number,
  ) => {
    hook.calls.push(enabled);
    hook.priorities.push(priority);
    return hook.result;
  },
}));

/** Records observers by rootMargin so tests can drive near/far crossings. */
const observers = new Map<string, (hit: boolean) => void>();
class FakeObserver {
  constructor(
    private cb: IntersectionObserverCallback,
    opts?: IntersectionObserverInit,
  ) {
    observers.set(opts?.rootMargin ?? '', (hit) =>
      this.cb(
        [{ isIntersecting: hit } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      ),
    );
  }
  observe() {}
  disconnect() {}
}

const fakeBitmap = { width: 20, height: 28 } as ImageBitmap;
const page = {
  width: 600,
  height: 800,
  view: [0, 0, 600, 800] as [number, number, number, number],
  rotate: 0 as const,
};

const thumb = () =>
  render(
    <PageThumb
      docId="d"
      pageIndex={0}
      page={page}
      width={100}
      label="Page 1"
    />,
  );
const canvas = () => screen.getByRole('img', { name: 'Page 1' });
const crossing = (margin: string, hit: boolean) =>
  act(() => observers.get(margin)!(hit));

describe('PageThumb', () => {
  beforeEach(() => {
    observers.clear();
    hook.calls = [];
    hook.priorities = [];
    hook.result = { bitmap: null, error: null };
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage() {},
    } as unknown as CanvasRenderingContext2D);
  });

  it('renders only once near the viewport', () => {
    hook.result = { bitmap: fakeBitmap, error: null };
    thumb();
    expect(hook.calls.at(-1)).toBe(false);
    expect(canvas().dataset.rendered).toBeUndefined();
    crossing('400px', true);
    expect(hook.calls.at(-1)).toBe(true);
    expect(canvas().dataset.rendered).toBe('true');
    expect((canvas() as HTMLCanvasElement).width).toBe(20);
  });

  it('renders at rail priority so the canvas goes first', () => {
    thumb();
    crossing('400px', true);
    expect(new Set(hook.priorities)).toEqual(new Set([1]));
  });

  it('releases canvas pixels far off-screen and redraws on return', () => {
    hook.result = { bitmap: fakeBitmap, error: null };
    thumb();
    crossing('400px', true);
    crossing('1500px', false);
    const c = canvas() as HTMLCanvasElement;
    expect(c.width).toBe(0);
    expect(c.height).toBe(0);
    expect(c.dataset.rendered).toBeUndefined();
    expect(hook.calls.at(-1)).toBe(false);
    crossing('400px', true);
    expect(c.width).toBe(20);
    expect(c.dataset.rendered).toBe('true');
  });

  it('keeps its pixels when the cache evicts the bitmap while visible', () => {
    hook.result = { bitmap: fakeBitmap, error: null };
    const { rerender } = thumb();
    crossing('400px', true);
    hook.result = { bitmap: null, error: null };
    rerender(
      <PageThumb
        docId="d"
        pageIndex={0}
        page={page}
        width={100}
        label="Page 1"
      />,
    );
    expect(canvas().dataset.rendered).toBe('true');
    expect((canvas() as HTMLCanvasElement).width).toBe(20);
  });

  it('shows an error state when the render fails', () => {
    hook.result = {
      bitmap: null,
      error: new ToolError('WORKER_CRASHED', 'Worker stopped'),
    };
    thumb();
    crossing('400px', true);
    expect(screen.getByRole('img', { name: 'Worker stopped' })).toBeTruthy();
  });
});
