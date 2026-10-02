/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CodeTree,
  type CodeTreeHandle,
  type CodeTreeSearch,
} from './code-tree';
import type { TreeNodeData } from './code-tree-model';

const VIEWPORT = 220;

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 400,
    bottom: VIEWPORT,
    width: 400,
    height: VIEWPORT,
    toJSON: () => ({}),
  } as DOMRect);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const leaf = (id: string, text = '1'): TreeNodeData => ({
  id,
  label: `"${id}"`,
  value: { text, kind: 'number' },
  childCount: 0,
});

const obj = (id: string, kids: TreeNodeData[]): TreeNodeData => ({
  id,
  label: `"${id}"`,
  summary: `{${kids.length}}`,
  childCount: kids.length,
  children: () => kids,
});

/** store { book { title, price }, bicycle { color } }, meta */
const makeRoots = () => [
  obj('store', [
    obj('book', [leaf('title'), leaf('price')]),
    obj('bicycle', [leaf('color')]),
  ]),
  leaf('meta'),
];

function Harness({
  initialExpanded = [],
  initialSelected = null,
  search,
  treeRef,
  roots: given,
  onSelect,
}: {
  initialExpanded?: string[];
  initialSelected?: string | null;
  search?: CodeTreeSearch;
  treeRef?: React.Ref<CodeTreeHandle>;
  roots?: TreeNodeData[];
  onSelect?: (id: string) => void;
}) {
  const [roots] = useState(() => given ?? makeRoots());
  const [expanded, setExpanded] = useState(() => new Set(initialExpanded));
  const [selected, setSelected] = useState<string | null>(initialSelected);
  return (
    <CodeTree
      ref={treeRef}
      roots={roots}
      expanded={expanded}
      onExpandedChange={setExpanded}
      selectedId={selected}
      onSelect={(id) => {
        setSelected(id);
        onSelect?.(id);
      }}
      search={search}
      ariaLabel="Document"
    />
  );
}

function clickRow(el: Element) {
  act(() => (el as HTMLElement).focus());
  fireEvent.click(el);
}

function press(...keys: string[]) {
  for (const key of keys) fireEvent.keyDown(document.activeElement!, { key });
}

const item = (name: string) =>
  screen.getByRole('treeitem', { name: new RegExp(`^"${name}"`) });

describe('CodeTree', () => {
  it('renders a tree of treeitems with level, set and selection ARIA', () => {
    render(<Harness initialExpanded={['store']} initialSelected="book" />);
    expect(screen.getByRole('tree', { name: 'Document' })).toBeTruthy();
    const book = item('book');
    expect(book.getAttribute('aria-level')).toBe('2');
    expect(book.getAttribute('aria-expanded')).toBe('false');
    expect(book.getAttribute('aria-selected')).toBe('true');
    expect(book.getAttribute('aria-setsize')).toBe('2');
    expect(book.getAttribute('aria-posinset')).toBe('1');
    const meta = item('meta');
    expect(meta.getAttribute('aria-level')).toBe('1');
    expect(meta.getAttribute('aria-posinset')).toBe('2');
    expect(meta.hasAttribute('aria-expanded')).toBe(false);
    expect(meta.getAttribute('aria-selected')).toBe('false');
  });

  it('renders code-like rows with a summary chip only while folded', () => {
    render(<Harness initialExpanded={['store']} />);
    expect(item('book').textContent).toBe('"book": {2},');
    expect(item('bicycle').textContent).toBe('"bicycle": {1}');
    clickRow(item('book'));
    press('ArrowRight');
    expect(item('book').textContent).toBe('"book"');
    expect(item('title').textContent).toBe('"title": 1,');
    expect(item('price').textContent).toBe('"price": 1');
  });

  it('ArrowRight expands, then moves to the first child', () => {
    render(<Harness />);
    clickRow(item('store'));
    press('ArrowRight');
    expect(item('store').getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(item('store'));
    press('ArrowRight');
    expect(document.activeElement).toBe(item('book'));
  });

  it('ArrowLeft collapses, then moves to the parent', () => {
    render(<Harness initialExpanded={['store', 'book']} />);
    clickRow(item('book'));
    press('ArrowLeft');
    expect(item('book').getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(item('book'));
    press('ArrowLeft');
    expect(document.activeElement).toBe(item('store'));
  });

  it('star expands all siblings', () => {
    render(<Harness initialExpanded={['store']} />);
    clickRow(item('book'));
    press('*');
    expect(item('book').getAttribute('aria-expanded')).toBe('true');
    expect(item('bicycle').getAttribute('aria-expanded')).toBe('true');
    expect(item('color')).toBeTruthy();
  });

  it('Home and End move to the first and last rows', () => {
    render(<Harness initialExpanded={['store']} />);
    clickRow(item('book'));
    press('End');
    expect(document.activeElement).toBe(item('meta'));
    press('Home');
    expect(document.activeElement).toBe(item('store'));
    press('ArrowDown');
    expect(document.activeElement).toBe(item('book'));
  });

  it('Enter selects the focused row', () => {
    const onSelect = vi.fn();
    render(<Harness initialExpanded={['store']} onSelect={onSelect} />);
    clickRow(item('store'));
    onSelect.mockClear();
    press('ArrowDown', 'Enter');
    expect(onSelect).toHaveBeenCalledWith('book');
    expect(item('book').getAttribute('aria-selected')).toBe('true');
  });

  it('type-ahead jumps to the next label starting with the typed letters', () => {
    render(<Harness initialExpanded={['store', 'book', 'bicycle']} />);
    clickRow(item('store'));
    press('b');
    expect(document.activeElement).toBe(item('book'));
    press('b');
    expect(document.activeElement).toBe(item('bicycle'));
    press('m');
    expect(document.activeElement).toBe(item('meta'));
  });

  it('type-ahead extends the prefix within the timeout', () => {
    render(<Harness initialExpanded={['store', 'book', 'bicycle']} />);
    clickRow(item('store'));
    press('b', 'i');
    expect(document.activeElement).toBe(item('bicycle'));
  });

  it('marks the ancestors of the selection as the active branch', () => {
    render(
      <Harness
        initialExpanded={['store', 'book', 'bicycle']}
        initialSelected="price"
      />,
    );
    expect(item('store').hasAttribute('data-active-branch')).toBe(true);
    expect(item('book').hasAttribute('data-active-branch')).toBe(true);
    expect(item('price').hasAttribute('data-active-branch')).toBe(false);
    expect(item('bicycle').hasAttribute('data-active-branch')).toBe(false);
    const accent = (name: string) =>
      item(name).querySelectorAll('[data-guide-accent]').length;
    expect(accent('title')).toBe(2);
    expect(accent('price')).toBe(2);
    expect(accent('color')).toBe(0);
  });

  it('ends the guide on the last child', () => {
    render(<Harness initialExpanded={['store', 'book']} />);
    const guides = (name: string) =>
      [...item(name).querySelectorAll('[data-guide]')].map((g) =>
        g.getAttribute('data-guide'),
      );
    expect(guides('title')).toEqual(['through', 'through']);
    expect(guides('price')).toEqual(['through', 'end']);
    expect(guides('bicycle')).toEqual(['end']);
  });

  it('clicking the chevron toggles without selecting', () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    const toggle = item('store').querySelector('[data-toggle]')!;
    clickRow(toggle);
    expect(item('store').getAttribute('aria-expanded')).toBe('true');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('highlights search matches and the active match', () => {
    const search = { ids: new Set(['book', 'meta']), activeId: 'meta' };
    render(<Harness initialExpanded={['store']} search={search} />);
    expect(item('book').getAttribute('data-match')).toBe('match');
    expect(item('meta').getAttribute('data-match')).toBe('active');
    expect(item('store').hasAttribute('data-match')).toBe(false);
  });

  it('expandTo opens the ancestors of a node', () => {
    const ref = createRef<CodeTreeHandle>();
    render(<Harness treeRef={ref} />);
    expect(screen.queryByRole('treeitem', { name: /^"color"/ })).toBeNull();
    let ok = false;
    act(() => {
      ok = ref.current!.expandTo('color');
    });
    expect(ok).toBe(true);
    expect(item('color')).toBeTruthy();
    expect(item('book').getAttribute('aria-expanded')).toBe('false');
    expect(ref.current!.expandTo('missing')).toBe(false);
    expect(ref.current!.scrollToId('color')).toBe(true);
  });

  it('keeps 1,000,000 flattened rows virtualised', () => {
    const roots = Array.from({ length: 1_000_000 }, (_, i) => ({
      id: `n${i}`,
      label: `${i}`,
      value: { text: 'true', kind: 'boolean' as const },
      childCount: 0,
    }));
    const ref = createRef<CodeTreeHandle>();
    render(<Harness roots={roots} treeRef={ref} />);
    const tree = screen.getByRole('tree');
    const rows = within(tree).getAllByRole('treeitem');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(100);
    expect(rows[0].getAttribute('aria-setsize')).toBe('1000000');
    act(() => {
      ref.current!.scrollToId('n999999');
    });
    const after = within(tree).getAllByRole('treeitem');
    expect(after.length).toBeLessThan(100);
    expect(
      after.some((r) => r.getAttribute('aria-posinset') === '1000000'),
    ).toBe(true);
  }, 20_000);
});

describe('CodeTree unnamed root (6-A2 minor)', () => {
  it('names a root row that has no label', () => {
    render(
      <CodeTree
        ariaLabel="Doc"
        roots={[{ id: 'r', label: '', summary: '2 keys', childCount: 0 }]}
        expanded={new Set()}
        onExpandedChange={() => {}}
        height={200}
      />,
    );
    expect(screen.getByRole('treeitem', { name: 'root, 2 keys' })).toBeTruthy();
  });
});
