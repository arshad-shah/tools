/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ObjectLayer,
  type LayerObject,
  type ObjectLayerProps,
} from './object-layer';

/** PDF page space (y up, 792pt tall) to CSS px at zoom 1. */
const PDF = { a: 1, b: 0, c: 0, d: -1, e: 0, f: 792 };

const OBJECTS: LayerObject[] = [
  {
    id: 'a',
    box: { x: 100, y: 700, width: 50, height: 20 },
    label: 'Text box: A',
    editable: true,
    rotatable: true,
  },
  { id: 'b', box: { x: 300, y: 500, width: 40, height: 40 }, label: 'Image' },
];

type Spies = Partial<ObjectLayerProps>;

function Harness(props: Spies & { initial?: string[] }) {
  const [sel, setSel] = useState<ReadonlySet<string>>(
    new Set(props.initial ?? []),
  );
  return (
    <ObjectLayer
      transform={PDF}
      width={612}
      height={792}
      label="Objects on page 1"
      objects={OBJECTS}
      selected={sel}
      onCommit={() => {}}
      onDelete={() => {}}
      {...props}
      onSelect={(ids, mode) => {
        props.onSelect?.(ids, mode);
        setSel((prev) => {
          if (mode === 'replace') return new Set(ids);
          const next = new Set(prev);
          for (const id of ids)
            if (mode === 'add' || !next.has(id)) next.add(id);
            else next.delete(id);
          return next;
        });
      }}
    />
  );
}

const obj = (name: string) => screen.getByRole('button', { name });
const down = (el: Element, x: number, y: number, extra = {}) =>
  fireEvent.pointerDown(el, {
    button: 0,
    pointerId: 1,
    clientX: x,
    clientY: y,
    ...extra,
  });
const move = (el: Element, x: number, y: number) =>
  fireEvent.pointerMove(el, { pointerId: 1, clientX: x, clientY: y });
const up = (el: Element, x: number, y: number) =>
  fireEvent.pointerUp(el, { pointerId: 1, clientX: x, clientY: y });

afterEach(() => vi.useRealTimers());

describe('ObjectLayer', () => {
  it('a press selects; Shift adds and removes', () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    down(obj('Text box: A'), 110, 100);
    up(obj('Text box: A'), 110, 100);
    expect(obj('Text box: A').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByTestId('selection-frame')).toHaveLength(1);
    down(obj('Image'), 310, 300, { shiftKey: true });
    up(obj('Image'), 310, 300);
    expect(obj('Image').getAttribute('aria-pressed')).toBe('true');
    down(obj('Image'), 310, 300, { shiftKey: true });
    expect(obj('Image').getAttribute('aria-pressed')).toBe('false');
    expect(onSelect).toHaveBeenLastCalledWith(['b'], 'toggle');
  });

  it('dragging an unselected object selects and moves it in one gesture', () => {
    const onCommit = vi.fn();
    const onPreview = vi.fn();
    render(<Harness onCommit={onCommit} onPreview={onPreview} />);
    const el = obj('Text box: A');
    down(el, 110, 100);
    move(el, 120, 95);
    expect(onPreview).toHaveBeenLastCalledWith(
      new Map([
        [
          'a',
          {
            id: 'a',
            box: { x: 110, y: 705, width: 50, height: 20 },
            rotate: 0,
          },
        ],
      ]),
    );
    up(el, 120, 95);
    expect(onCommit).toHaveBeenCalledWith(
      [{ id: 'a', box: { x: 110, y: 705, width: 50, height: 20 }, rotate: 0 }],
      'pointer',
    );
    expect(onPreview).toHaveBeenLastCalledWith(null);
  });

  it('a click without travel commits nothing', () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    down(obj('Image'), 310, 300);
    move(obj('Image'), 311, 300);
    up(obj('Image'), 311, 300);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('dragging one of several selected objects moves them all', () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} initial={['a', 'b']} />);
    down(obj('Image'), 310, 300);
    move(obj('Image'), 330, 300);
    up(obj('Image'), 330, 300);
    expect(onCommit.mock.calls[0][0].map((c: { id: string }) => c.id)).toEqual([
      'a',
      'b',
    ]);
    expect(onCommit.mock.calls[0][0][1].box.x).toBe(320);
  });

  it('a corner handle resizes; Shift keeps the aspect', () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} initial={['b']} />);
    const se = document.querySelector('[data-handle="se"]')!;
    down(se, 340, 292);
    move(se, 360, 297);
    up(se, 360, 297);
    expect(onCommit).toHaveBeenLastCalledWith(
      [{ id: 'b', box: { x: 300, y: 495, width: 60, height: 45 }, rotate: 0 }],
      'pointer',
    );
    down(se, 340, 292, { shiftKey: true });
    fireEvent.pointerMove(se, {
      pointerId: 1,
      clientX: 360,
      clientY: 297,
      shiftKey: true,
    });
    up(se, 360, 297);
    const box = onCommit.mock.calls[1][0][0].box;
    expect(box.width).toBeCloseTo(box.height, 6);
  });

  it('handle dots never take presses: only the handle box does', () => {
    render(<Harness initial={['a']} />);
    const handles = [
      ...document.querySelectorAll<HTMLElement>('[data-handle]'),
    ];
    expect(handles.length).toBeGreaterThan(0);
    for (const h of handles)
      expect(h.firstElementChild?.className).toContain('pointer-events-none');
  });

  it('shows resize handles for one selection and a rotate handle when rotatable', () => {
    const { unmount } = render(<Harness initial={['a']} />);
    // 50 x 20 px: no top and bottom handles over its middle (drag area).
    const names = [...document.querySelectorAll<HTMLElement>('[data-handle]')]
      .map((h) => h.dataset.handle)
      .sort();
    expect(names).toEqual(['e', 'ne', 'nw', 'rotate', 'se', 'sw', 'w']);
    unmount();
    render(<Harness initial={['a', 'b']} />);
    expect(document.querySelectorAll('[data-handle]')).toHaveLength(0);
    expect(screen.getAllByTestId('selection-frame')).toHaveLength(2);
  });

  it('keyboard: arrows nudge (Shift 10), Delete removes, Esc deselects, Enter edits', () => {
    const onCommit = vi.fn();
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    render(
      <Harness
        onCommit={onCommit}
        onDelete={onDelete}
        onEdit={onEdit}
        initial={['a']}
      />,
    );
    const el = obj('Text box: A');
    fireEvent.keyDown(el, { key: 'ArrowRight' });
    fireEvent.keyUp(el, { key: 'ArrowRight' });
    expect(onCommit).toHaveBeenLastCalledWith(
      [{ id: 'a', box: { x: 101, y: 700, width: 50, height: 20 }, rotate: 0 }],
      'keyboard',
    );
    fireEvent.keyDown(el, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyUp(el, { key: 'ArrowDown', shiftKey: true });
    expect(onCommit.mock.calls[1][0][0].box.y).toBe(690);
    fireEvent.keyDown(el, { key: 'Enter' });
    expect(onEdit).toHaveBeenCalledWith('a');
    fireEvent.keyDown(el, { key: 'Delete' });
    expect(onDelete).toHaveBeenCalledWith(['a']);
    const esc = fireEvent.keyDown(el, { key: 'Escape' });
    expect(esc).toBe(false);
    expect(el.getAttribute('aria-pressed')).toBe('false');
    // Nothing selected: Esc is left for the workspace.
    expect(fireEvent.keyDown(el, { key: 'Escape' })).toBe(true);
  });

  it('] rotates a rotatable object 15 degrees', () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} initial={['a']} />);
    fireEvent.keyDown(obj('Text box: A'), { key: ']' });
    fireEvent.keyUp(obj('Text box: A'), { key: ']' });
    expect(onCommit.mock.calls[0][0][0].rotate).toBe(15);
  });

  it('double-click edits an editable object', () => {
    const onEdit = vi.fn();
    render(<Harness onEdit={onEdit} />);
    fireEvent.doubleClick(obj('Text box: A'));
    expect(onEdit).toHaveBeenCalledWith('a');
    fireEvent.doubleClick(obj('Image'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('right-click opens the object menu: duplicate, order, delete', () => {
    const onDuplicate = vi.fn();
    const onOrder = vi.fn();
    const onDelete = vi.fn();
    render(
      <Harness
        onDuplicate={onDuplicate}
        onOrder={onOrder}
        onDelete={onDelete}
        onProperties={() => {}}
      />,
    );
    fireEvent.contextMenu(obj('Image'), { clientX: 310, clientY: 300 });
    expect(obj('Image').getAttribute('aria-pressed')).toBe('true');
    const items = screen.getAllByRole('menuitem').map((b) => b.textContent);
    expect(items).toEqual(
      expect.arrayContaining([
        'Properties',
        expect.stringContaining('Duplicate'),
        'Bring to front',
        'Send to back',
        expect.stringContaining('Delete'),
      ]),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Send to back' }));
    expect(onOrder).toHaveBeenCalledWith(['b'], 'back');
    fireEvent.contextMenu(obj('Image'), { clientX: 310, clientY: 300 });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));
    expect(onDuplicate).toHaveBeenCalledWith(['b']);
  });

  it('a long touch press opens the menu', () => {
    vi.useFakeTimers();
    render(<Harness />);
    down(obj('Image'), 310, 300, { pointerType: 'touch' });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByRole('menu', { name: 'Object actions' })).toBeTruthy();
  });

  it('marquee: a drag on the empty page selects what it touches; a click clears', () => {
    render(<Harness marquee initial={['a']} />);
    const bg = screen.getByTestId('object-layer-background');
    down(bg, 280, 280);
    move(bg, 350, 350);
    expect(screen.getByTestId('selection-band')).toBeTruthy();
    up(bg, 350, 350);
    expect(obj('Image').getAttribute('aria-pressed')).toBe('true');
    expect(obj('Text box: A').getAttribute('aria-pressed')).toBe('false');
    down(bg, 10, 10);
    up(bg, 10, 10);
    expect(obj('Image').getAttribute('aria-pressed')).toBe('false');
  });

  it('hit areas are at least 16px and follow the object rotation', () => {
    render(
      <ObjectLayer
        transform={PDF}
        width={612}
        height={792}
        label="Objects"
        objects={[
          {
            id: 'l',
            box: { x: 10, y: 10, width: 100, height: 0 },
            rotate: 30,
            label: 'Line',
          },
        ]}
        selected={new Set()}
        onSelect={() => {}}
        onCommit={() => {}}
        onDelete={() => {}}
      />,
    );
    const el = obj('Line');
    expect(el.style.height).toBe('16px');
    expect(el.style.transform).toBe('rotate(30deg)');
  });
  it('a fixed object is picked and deleted but not moved', () => {
    const onCommit = vi.fn();
    const onDelete = vi.fn();
    render(
      <ObjectLayer
        transform={PDF}
        width={612}
        height={792}
        label="Objects"
        objects={[
          {
            id: 'i',
            box: { x: 10, y: 10, width: 100, height: 100 },
            label: 'Initials',
            movable: false,
          },
        ]}
        selected={new Set(['i'])}
        onSelect={() => {}}
        onCommit={onCommit}
        onDelete={onDelete}
      />,
    );
    const el = obj('Initials');
    down(el, 50, 740);
    move(el, 90, 760);
    up(el, 90, 760);
    fireEvent.keyDown(el, { key: 'ArrowRight' });
    fireEvent.keyUp(el, { key: 'ArrowRight' });
    expect(onCommit).not.toHaveBeenCalled();
    expect(document.querySelectorAll('[data-handle]')).toHaveLength(0);
    fireEvent.keyDown(el, { key: 'Delete' });
    expect(onDelete).toHaveBeenCalledWith(['i']);
  });
});
