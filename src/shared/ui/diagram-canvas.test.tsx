/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HEADER_H,
  ROW_H,
  minimapToWorld,
  toPng,
  type Card,
  type Diagram,
} from '@/shared/diagram';
import { layoutInWorker } from '@/shared/diagram/layout-client';
import { recordingContext } from '@/shared/diagram/test-canvas';
import { randomTree, rec } from '@/shared/diagram/test-fixtures';
import { saveBlob } from '@/shared/lib/download';
import {
  DiagramCanvas,
  type DiagramCanvasHandle,
  type DiagramLayoutInfo,
} from './diagram-canvas';

vi.mock('@/shared/diagram/layout-client', async (importOriginal) => {
  const core = await import('@/shared/diagram/layout-core');
  return {
    ...(await importOriginal<object>()),
    layoutInWorker: vi.fn(async (...args: Parameters<typeof core.layoutSync>) =>
      core.layoutSync(...args),
    ),
  };
});
vi.mock('@/shared/diagram/export', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  toPng: vi.fn(async () => ({
    blob: new Blob(['png'], { type: 'image/png' }),
    scaleUsed: 2,
  })),
}));
vi.mock('@/shared/lib/download', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  saveBlob: vi.fn(),
}));

// --- browser stubs ---------------------------------------------------------
let frames = new Map<number, FrameRequestCallback>();
let nextFrame = 0;
const contexts = new WeakMap<
  HTMLCanvasElement,
  ReturnType<typeof recordingContext>
>();
const observers: { disconnect: ReturnType<typeof vi.fn> }[] = [];

beforeEach(() => {
  frames = new Map();
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((cb: FrameRequestCallback) => {
      frames.set(++nextFrame, cb);
      return nextFrame;
    }),
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => frames.delete(id)),
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect = vi.fn();
      constructor(private cb: () => void) {
        observers.push(this);
      }
      observe() {
        this.cb();
      }
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    function (this: HTMLCanvasElement) {
      let ctx = contexts.get(this);
      if (!ctx) contexts.set(this, (ctx = recordingContext()));
      return ctx as unknown as CanvasRenderingContext2D;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext,
  );
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    right: 800,
    bottom: 600,
    toJSON: () => ({}),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  observers.length = 0;
  document.documentElement.removeAttribute('data-theme');
});

const flush = () =>
  act(() => {
    const due = [...frames.values()];
    frames.clear();
    for (const cb of due) cb(0);
  });

// --- fixtures ----------------------------------------------------------------
const DIAGRAM: Diagram = {
  nodes: [
    {
      id: 'root',
      eyebrow: 'object',
      title: '$',
      rows: [
        { key: 'a', value: '1', kind: 'object', role: 'link' },
        { key: 'b', value: '1', kind: 'object', role: 'link' },
        { key: 'c', value: '1', kind: 'object', role: 'link' },
        { key: '+3 more', value: '', kind: 'more' },
      ],
    },
    rec('A', 1),
    rec('B', 2),
    rec('C', 1),
  ],
  edges: [
    { id: 'ea', from: 'A', to: 'root', toRow: 0 },
    { id: 'eb', from: 'B', to: 'root', toRow: 1 },
    { id: 'ec', from: 'C', to: 'root', toRow: 2 },
  ],
};

function mount(
  props: Partial<React.ComponentProps<typeof DiagramCanvas>> = {},
) {
  const ref = React.createRef<DiagramCanvasHandle>();
  const layouts: DiagramLayoutInfo[] = [];
  const onSelect = vi.fn();
  const onExpandMore = vi.fn();
  const utils = render(
    <DiagramCanvas
      ref={ref}
      diagram={DIAGRAM}
      ariaLabel="Map of the document"
      ariaSummary="Map of 4 objects"
      onSelect={onSelect}
      onExpandMore={onExpandMore}
      onLayout={(info) => layouts.push(info)}
      {...props}
    />,
  );
  const canvas = screen.getByTestId('diagram-canvas');
  const card = (id: string) =>
    layouts.at(-1)!.cards.find((c: Card) => c.id === id)!;
  /** Screen point of a world point. */
  const at = (wx: number, wy: number) => {
    const v = ref.current!.getView();
    return { clientX: wx * v.scale + v.x, clientY: wy * v.scale + v.y };
  };
  const click = (wx: number, wy: number, el: Element = canvas) => {
    const p = { ...at(wx, wy), pointerId: 1 };
    fireEvent.pointerDown(el, p);
    fireEvent.pointerUp(el, p);
  };
  return {
    ...utils,
    ref,
    layouts,
    onSelect,
    onExpandMore,
    canvas,
    card,
    at,
    click,
  };
}

describe('DiagramCanvas host', () => {
  it('lays small diagrams out synchronously and large ones in the worker', async () => {
    const small = mount();
    expect(small.layouts).toHaveLength(1);
    expect(layoutInWorker).not.toHaveBeenCalled();
    small.unmount();

    const big = mount({ diagram: randomTree(400, 3) });
    await act(async () => {});
    expect(layoutInWorker).toHaveBeenCalledTimes(1);
    expect(big.layouts.at(-1)?.cards).toHaveLength(400);
  });

  it('selects a card from its header and a row by its index', () => {
    const t = mount();
    const root = t.card('root');
    t.click(root.x + 20, root.y + 10);
    expect(t.onSelect).toHaveBeenLastCalledWith('root');
    t.click(root.x + 20, root.y + HEADER_H + 2 * ROW_H + ROW_H / 2);
    expect(t.onSelect).toHaveBeenLastCalledWith('root', 2);
    t.click(root.x + 20, root.y + HEADER_H + 3 * ROW_H + ROW_H / 2);
    expect(t.onExpandMore).toHaveBeenCalledWith('root');
  });

  it('zooms about the cursor on wheel', () => {
    const t = mount();
    const before = t.ref.current!.getView();
    const wx = (300 - before.x) / before.scale;
    fireEvent.wheel(t.canvas, { deltaY: -120, clientX: 300, clientY: 200 });
    const after = t.ref.current!.getView();
    expect(after.scale).toBeGreaterThan(before.scale);
    expect((300 - after.x) / after.scale).toBeCloseTo(wx, 9);
  });

  it('recentres from a minimap click', () => {
    const t = mount();
    const mini = screen.getByTestId('diagram-minimap');
    fireEvent.pointerDown(mini, { clientX: 30, clientY: 40, pointerId: 2 });
    const { wx, wy } = minimapToWorld(t.layouts.at(-1)!.cards, 30, 40);
    const v = t.ref.current!.getView();
    expect(wx * v.scale + v.x).toBeCloseTo(400, 9);
    expect(wy * v.scale + v.y).toBeCloseTo(300, 9);
  });

  it('repaints when the theme changes', async () => {
    mount();
    flush();
    expect(frames.size).toBe(0);
    document.documentElement.setAttribute('data-theme', 'dark');
    await act(async () => {});
    expect(frames.size).toBe(1);
    const canvas = screen.getByTestId('diagram-canvas') as HTMLCanvasElement;
    const ctx = contexts.get(canvas)!;
    const before = ctx.calls.length;
    flush();
    expect(ctx.calls.length).toBeGreaterThan(before);
  });

  it('cancels the pending frame and disconnects the observer on unmount', () => {
    const t = mount();
    expect(frames.size).toBe(1);
    t.unmount();
    expect(cancelAnimationFrame).toHaveBeenCalled();
    expect(frames.size).toBe(0);
    expect(observers.every((o) => o.disconnect.mock.calls.length === 1)).toBe(
      true,
    );
  });
});

describe('DiagramCanvas controls and keyboard', () => {
  it('names every control and gives it a tooltip with its shortcut', () => {
    mount();
    const group = screen.getByRole('group', { name: 'Diagram controls' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Zoom in',
      'Zoom out',
      'Fit to view',
      'Actual size',
      'Lay out top to bottom',
      'Minimap',
      'Centre on selection',
      'Export',
    ]);
    const tips = within(group).getAllByRole('tooltip', { hidden: true });
    // Each tooltip: the label, then the shortcut in words (and as key chips).
    const words = tips.map((t) => [
      t.firstElementChild?.textContent,
      t.querySelector('.sr-only')?.textContent,
    ]);
    expect(words).toEqual([
      ['Zoom in', 'Plus'],
      ['Zoom out', '-'],
      ['Fit to view', '0'],
      ['Actual size', '1'],
      ['Lay out top to bottom', 'D'],
      ['Minimap', 'M'],
      ['Centre on selection', 'C'],
      ['Export', expect.stringMatching(/^(Ctrl|Command) Shift E$/)],
    ]);
    for (const t of tips) expect(t.querySelector('kbd')).not.toBeNull();
  });

  it('fits on 0, toggles direction on D and the minimap on M', () => {
    const t = mount();
    act(() => t.ref.current!.zoomTo(2));
    expect(t.ref.current!.getView().scale).toBe(2);
    fireEvent.keyDown(t.canvas, { key: '0' });
    expect(t.ref.current!.getView().scale).toBeLessThanOrEqual(1);

    const root = t.card('root');
    const a = t.card('A');
    expect(a.x).toBeGreaterThan(root.x);
    fireEvent.keyDown(t.canvas, { key: 'd' });
    expect(t.layouts).toHaveLength(2);
    expect(t.card('A').y).toBeGreaterThan(t.card('root').y);
    expect(
      screen.getByRole('button', { name: 'Lay out left to right' }),
    ).toBeTruthy();

    const mini = screen.getByTestId('diagram-minimap');
    expect(mini.hidden).toBe(false);
    fireEvent.keyDown(t.canvas, { key: 'm' });
    expect(mini.hidden).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'Minimap' })
        .getAttribute('aria-pressed'),
    ).toBe('false');
  });

  it('cycles the selection with Tab in reading order and announces it', () => {
    const t = mount();
    const order = [...t.layouts.at(-1)!.cards]
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((c) => c.id);
    const status = screen.getByRole('status');
    for (const id of order) {
      fireEvent.keyDown(t.canvas, { key: 'Tab' });
      expect(t.onSelect).toHaveBeenLastCalledWith(id);
    }
    expect(status.textContent).toBe(
      `Object at ${order.at(-1)}, ${
        t.card(order.at(-1)!).node.rows.length
      } field${t.card(order.at(-1)!).node.rows.length === 1 ? '' : 's'}`,
    );
    // Past the last card Tab is left to the browser, so focus can leave.
    const ev = fireEvent.keyDown(t.canvas, { key: 'Tab' });
    expect(ev).toBe(true);
  });

  it('goes to the first child on ] and back to the parent on [', () => {
    const t = mount({ selectedId: 'root' });
    fireEvent.keyDown(t.canvas, { key: ']' });
    expect(t.onSelect).toHaveBeenLastCalledWith('A');
    fireEvent.keyDown(t.canvas, { key: 'ArrowDown', altKey: true });
    expect(t.onSelect).toHaveBeenLastCalledWith('B');
    fireEvent.keyDown(t.canvas, { key: '[' });
    expect(t.onSelect).toHaveBeenLastCalledWith('root');
    expect(screen.getByRole('status').textContent).toBe(
      'Object at $, 4 fields',
    );
    fireEvent.keyDown(t.canvas, { key: 'Escape' });
    expect(t.onSelect).toHaveBeenLastCalledWith(null);
  });

  it('exports a PNG through the menu and saves diagram.png', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Export PNG' }));
    });
    expect(toPng).toHaveBeenCalledTimes(1);
    expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'diagram.png');
  });

  it('opens the export menu with the shortcut and exports SVG', () => {
    const t = mount();
    fireEvent.keyDown(t.canvas, { key: 'E', ctrlKey: true, shiftKey: true });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Export SVG' }));
    const [blob, name] = vi.mocked(saveBlob).mock.calls.at(-1)!;
    expect(name).toBe('diagram.svg');
    expect((blob as Blob).type).toBe('image/svg+xml');
  });
});
