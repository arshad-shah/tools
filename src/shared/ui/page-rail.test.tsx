/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PageRail, type RailPage } from './page-rail';

const make = (n: number): RailPage[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    label: String(i + 1),
    aspect: 612 / 792,
  }));

function Harness({
  count = 5,
  onSelect = vi.fn(),
  onDelete,
  onMoveSpy,
}: {
  count?: number;
  onSelect?: (id: string, m: { shift: boolean; meta: boolean }) => void;
  onDelete?: (ids: string[]) => void;
  onMoveSpy?: (ids: string[], to: number) => void;
}) {
  const [pages, setPages] = useState(() => make(count));
  return (
    <PageRail
      label="Pages"
      pages={pages}
      selected={new Set(['p2'])}
      current="p1"
      width={160}
      onSelect={onSelect}
      onActivate={() => {}}
      onDelete={onDelete}
      onMove={(ids, to) => {
        onMoveSpy?.(ids, to);
        setPages((list) => {
          const moving = list.filter((p) => ids.includes(p.id));
          const rest = list.filter((p) => !ids.includes(p.id));
          rest.splice(to, 0, ...moving);
          return rest;
        });
      }}
      renderThumb={(p) => <span>thumb {p.label}</span>}
    />
  );
}

describe('PageRail', () => {
  it('is a multi-select listbox with labelled options', () => {
    render(<Harness />);
    const list = screen.getByRole('listbox', { name: 'Pages' });
    expect(list.getAttribute('aria-multiselectable')).toBe('true');
    const opt = screen.getByRole('option', { name: 'Page 2 of 5' });
    expect(opt.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('option', { name: 'Page 1 of 5' }).tabIndex).toBe(
      0,
    );
  });

  it('renders only a window of a long document', () => {
    render(<Harness count={300} />);
    const n = screen.getAllByRole('option').length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(40);
    expect(
      screen
        .getByRole('option', { name: 'Page 1 of 300' })
        .getAttribute('aria-setsize'),
    ).toBe('300');
  });

  it('keeps a tab stop when the remembered page scrolls out of the window (review I9)', () => {
    render(<Harness count={300} />);
    const list = screen.getByRole('listbox', { name: 'Pages' });
    // Page 1 (current, the remembered tab stop) scrolls far out of view.
    list.scrollTop = 20000;
    fireEvent.scroll(list);
    expect(screen.queryByRole('option', { name: 'Page 1 of 300' })).toBeNull();
    const stops = screen.getAllByRole('option').filter((o) => o.tabIndex === 0);
    expect(stops).toHaveLength(1);
    expect(stops[0]).toBe(screen.getAllByRole('option')[0]);
  });

  it('includes badge text in the option name', () => {
    render(
      <PageRail
        label="Pages"
        pages={[
          {
            id: 'a',
            label: '1',
            aspect: 1,
            badges: [{ tone: 'warning', label: 'Rotated' }],
          },
        ]}
        selected={new Set()}
        current={null}
        width={160}
        onSelect={() => {}}
        onActivate={() => {}}
        renderThumb={() => null}
      />,
    );
    expect(
      screen.getByRole('option', { name: 'Page 1 of 1, Rotated' }),
    ).toBeTruthy();
  });

  it('Alt+ArrowDown moves the page, keeps focus and announces it', () => {
    const onMoveSpy = vi.fn();
    render(<Harness onMoveSpy={onMoveSpy} />);
    const opt = screen.getByRole('option', { name: 'Page 1 of 5' });
    act(() => opt.focus());
    fireEvent.keyDown(opt, { key: 'ArrowDown', altKey: true });
    expect(onMoveSpy).toHaveBeenCalledWith(['p1'], 1);
    const moved = screen.getByRole('option', { name: 'Page 2 of 5' });
    expect(moved.textContent).toContain('thumb 1');
    expect(document.activeElement).toBe(moved);
    expect(screen.getByRole('status').textContent).toBe(
      'Moved page 1 to position 2',
    );
  });

  it('Shift+click selects with shift; meta click with meta', () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    const opt = screen.getByRole('option', { name: 'Page 3 of 5' });
    fireEvent.click(opt, { shiftKey: true });
    expect(onSelect).toHaveBeenLastCalledWith('p3', {
      shift: true,
      meta: false,
    });
    fireEvent.click(opt, { ctrlKey: true });
    expect(onSelect).toHaveBeenLastCalledWith('p3', {
      shift: false,
      meta: true,
    });
  });

  it('Delete and Backspace call onDelete with the selection', () => {
    const onDelete = vi.fn();
    render(<Harness onDelete={onDelete} />);
    fireEvent.keyDown(screen.getByRole('option', { name: 'Page 2 of 5' }), {
      key: 'Delete',
    });
    expect(onDelete).toHaveBeenLastCalledWith(['p2']);
    // A focused page outside the selection deletes just itself.
    fireEvent.keyDown(screen.getByRole('option', { name: 'Page 4 of 5' }), {
      key: 'Backspace',
    });
    expect(onDelete).toHaveBeenLastCalledWith(['p4']);
  });

  it('ArrowDown moves focus and selects; Enter activates', () => {
    const onSelect = vi.fn();
    const onActivate = vi.fn();
    render(
      <PageRail
        label="Pages"
        pages={make(3)}
        selected={new Set()}
        current="p1"
        width={160}
        onSelect={onSelect}
        onActivate={onActivate}
        renderThumb={() => null}
      />,
    );
    const first = screen.getByRole('option', { name: 'Page 1 of 3' });
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(onSelect).toHaveBeenLastCalledWith('p2', {
      shift: false,
      meta: false,
    });
    const second = screen.getByRole('option', { name: 'Page 2 of 3' });
    expect(document.activeElement).toBe(second);
    fireEvent.keyDown(second, { key: 'Enter' });
    expect(onActivate).toHaveBeenCalledWith('p2');
  });
});

describe('PageRail on touch', () => {
  it('a tap goes to the page; a mouse click only selects', () => {
    const onActivate = vi.fn();
    const onSelect = vi.fn();
    render(
      <PageRail
        label="Pages"
        pages={make(3)}
        selected={new Set()}
        current="p1"
        width={160}
        onSelect={onSelect}
        onActivate={onActivate}
        renderThumb={() => null}
      />,
    );
    const opt = screen.getByRole('option', { name: 'Page 2 of 3' });
    fireEvent.pointerDown(opt, { pointerType: 'mouse' });
    fireEvent.click(opt);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onActivate).not.toHaveBeenCalled();
    fireEvent.pointerDown(opt, { pointerType: 'touch' });
    fireEvent.click(opt);
    expect(onActivate).toHaveBeenCalledWith('p2');
  });
});
