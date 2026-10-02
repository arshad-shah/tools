/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtualList, type VirtualListHandle } from './virtual-list';

type Entry = { target: Element; borderBoxSize?: { blockSize: number }[] };

class FakeResizeObserver {
  static all: FakeResizeObserver[] = [];
  targets = new Set<Element>();
  constructor(private cb: (entries: Entry[]) => void) {
    FakeResizeObserver.all.push(this);
  }
  observe(el: Element) {
    this.targets.add(el);
  }
  unobserve(el: Element) {
    this.targets.delete(el);
  }
  disconnect() {
    this.targets.clear();
  }
  fire(entries: Entry[]) {
    this.cb(entries);
  }
}

const VIEWPORT = 200;

beforeEach(() => {
  FakeResizeObserver.all = [];
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 300,
    bottom: VIEWPORT,
    width: 300,
    height: VIEWPORT,
    toJSON: () => ({}),
  } as DOMRect);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const makeItems = (n: number) => Array.from({ length: n }, (_, i) => i);

function Basic({
  count = 100_000,
  measure,
  listRef,
  onRangeChange,
  stickyHeaders,
}: {
  count?: number;
  measure?: boolean;
  listRef?: React.Ref<VirtualListHandle>;
  onRangeChange?: (s: number, e: number) => void;
  stickyHeaders?: { index: number; render(): React.ReactNode }[];
}) {
  const [items] = useState(() => makeItems(count));
  return (
    <VirtualList
      ref={listRef}
      items={items}
      estimateSize={20}
      measure={measure}
      getKey={(item) => item}
      role="listbox"
      ariaLabel="Numbers"
      onRangeChange={onRangeChange}
      stickyHeaders={stickyHeaders}
      renderItem={(item, _i, { focused }) => (
        <span>{`Row ${item}${focused ? ' focused' : ''}`}</span>
      )}
    />
  );
}

const rows = () => screen.getAllByRole('option');
const list = () => screen.getByRole('listbox', { name: 'Numbers' });

describe('VirtualList', () => {
  it('renders at most the visible rows plus overscan for 100,000 items', () => {
    render(<Basic />);
    expect(rows().length).toBeLessThanOrEqual(10 + 6);
    expect(rows().length).toBeGreaterThanOrEqual(10);
    expect(screen.getByText('Row 0')).toBeTruthy();
    expect(screen.queryByText('Row 20')).toBeNull();
  });

  it('renders the rows around a new scroll position', () => {
    const onRangeChange = vi.fn();
    render(<Basic onRangeChange={onRangeChange} />);
    expect(onRangeChange).toHaveBeenLastCalledWith(0, 10);
    const el = list();
    el.scrollTop = 20_000;
    fireEvent.scroll(el);
    expect(screen.getByText('Row 1000')).toBeTruthy();
    expect(screen.queryByText('Row 500')).toBeNull();
    // visible rows, overscan on both sides, plus the mounted active row 0
    expect(rows().length).toBeLessThanOrEqual(10 + 2 * 6 + 1);
    expect(onRangeChange).toHaveBeenLastCalledWith(1000, 1010);
  });

  it('scrollToIndex center sets scrollTop to offset minus half viewport plus half row', () => {
    const handle = createRef<VirtualListHandle>();
    render(<Basic listRef={handle} />);
    act(() => handle.current?.scrollToIndex(5000, 'center'));
    expect(list().scrollTop).toBe(5000 * 20 - 100 + 10);
    expect(screen.getByText('Row 5000')).toBeTruthy();
  });

  it('sets aria-setsize and aria-posinset on rows', () => {
    render(<Basic />);
    const first = rows()[0];
    expect(first.getAttribute('aria-setsize')).toBe('100000');
    expect(first.getAttribute('aria-posinset')).toBe('1');
    expect(rows()[3].getAttribute('aria-posinset')).toBe('4');
  });

  it('leaves aria-setsize and aria-posinset off grid rows', () => {
    render(
      <VirtualList
        items={[1, 2, 3]}
        estimateSize={20}
        getKey={(item) => item}
        role="grid"
        ariaLabel="Grid"
        height={100}
        rowProps={(_, i) => ({ 'aria-rowindex': i + 2 })}
        renderItem={(item) => <div role="gridcell">{item}</div>}
      />,
    );
    const row = screen.getAllByRole('row')[0];
    expect(row.getAttribute('aria-setsize')).toBeNull();
    expect(row.getAttribute('aria-posinset')).toBeNull();
    expect(row.getAttribute('aria-rowindex')).toBe('2');
  });

  it('roving focus: ArrowDown and End move the active row and scroll; Home returns', () => {
    render(<Basic />);
    const first = rows()[0];
    expect(first.tabIndex).toBe(0);
    expect(rows()[1].tabIndex).toBe(-1);
    act(() => first.focus());
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(document.activeElement?.getAttribute('aria-posinset')).toBe('2');
    expect(document.activeElement?.textContent).toBe('Row 1 focused');

    fireEvent.keyDown(document.activeElement as Element, { key: 'End' });
    expect(document.activeElement?.getAttribute('aria-posinset')).toBe(
      '100000',
    );
    expect(list().scrollTop).toBe(100_000 * 20 - VIEWPORT);

    fireEvent.keyDown(document.activeElement as Element, { key: 'Home' });
    expect(document.activeElement?.getAttribute('aria-posinset')).toBe('1');
    expect(list().scrollTop).toBe(0);
  });

  it('PageDown moves by a viewport of rows', () => {
    render(<Basic />);
    act(() => rows()[0].focus());
    fireEvent.keyDown(rows()[0], { key: 'PageDown' });
    expect(document.activeElement?.getAttribute('aria-posinset')).toBe('11');
    fireEvent.keyDown(document.activeElement as Element, { key: 'PageUp' });
    expect(document.activeElement?.getAttribute('aria-posinset')).toBe('1');
  });

  it('keeps the active row mounted after it scrolls out of view', () => {
    render(<Basic />);
    act(() => rows()[0].focus());
    const el = list();
    el.scrollTop = 50_000;
    fireEvent.scroll(el);
    expect(screen.getByText('Row 0 focused')).toBeTruthy();
    expect(document.activeElement?.textContent).toBe('Row 0 focused');
  });

  it('measured mode: after a row reports 40 px the total height updates', () => {
    render(<Basic count={100} measure />);
    const spacer = list().querySelector('[data-vl-spacer]') as HTMLElement;
    expect(spacer.style.height).toBe('2000px');
    const row0 = rows()[0];
    const ro = FakeResizeObserver.all.find((o) => o.targets.has(row0));
    expect(ro).toBeTruthy();
    act(() => ro?.fire([{ target: row0, borderBoxSize: [{ blockSize: 40 }] }]));
    expect(spacer.style.height).toBe('2020px');
    expect(rows()[1].style.transform).toBe('translateY(40px)');
  });

  it('controlled activeIndex drives the roving row', () => {
    function Controlled() {
      const [active, setActive] = useState(3);
      return (
        <>
          <output>{`active ${active}`}</output>
          <VirtualList
            items={makeItems(50)}
            estimateSize={20}
            getKey={(i) => i}
            role="list"
            ariaLabel="Plain"
            activeIndex={active}
            onActiveIndexChange={setActive}
            renderItem={(item) => `Item ${item}`}
          />
        </>
      );
    }
    render(<Controlled />);
    const items = screen.getAllByRole('listitem');
    expect(items[3].tabIndex).toBe(0);
    act(() => items[3].focus());
    fireEvent.keyDown(items[3], { key: 'ArrowUp' });
    expect(screen.getByText('active 2')).toBeTruthy();
    expect(document.activeElement?.textContent).toBe('Item 2');
  });

  it('rowProps lets consumers add attributes such as aria-level', () => {
    render(
      <VirtualList
        items={makeItems(5)}
        estimateSize={20}
        getKey={(i) => i}
        role="tree"
        ariaLabel="Files"
        rowProps={(item) => ({ 'aria-level': item + 1, 'aria-posinset': 1 })}
        renderItem={(item) => `Node ${item}`}
      />,
    );
    const nodes = screen.getAllByRole('treeitem');
    expect(nodes[2].getAttribute('aria-level')).toBe('3');
    expect(nodes[2].getAttribute('aria-posinset')).toBe('1');
    expect(nodes[2].getAttribute('aria-setsize')).toBe('5');
  });

  it('shows the current sticky header as a hidden visual overlay', () => {
    const headers = [0, 50, 100].map((index) => ({
      index,
      render: () => `Section ${index}`,
    }));
    render(<Basic count={200} stickyHeaders={headers} />);
    const el = list();
    el.scrollTop = 60 * 20;
    fireEvent.scroll(el);
    const overlay = el.querySelector('[data-vl-sticky]') as HTMLElement;
    expect(overlay.textContent).toBe('Section 50');
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
  });

  it('focusModel none makes the scroll region itself focusable', () => {
    render(
      <VirtualList
        items={makeItems(5)}
        estimateSize={20}
        getKey={(i) => i}
        role="log"
        ariaLabel="Output"
        focusModel="none"
        renderItem={(item) => `Line ${item}`}
      />,
    );
    const log = screen.getByRole('log', { name: 'Output' });
    expect(log.tabIndex).toBe(0);
    expect(screen.getAllByRole('article')[0].hasAttribute('tabindex')).toBe(
      false,
    );
  });
});
