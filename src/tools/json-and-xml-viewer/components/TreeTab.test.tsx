/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fromValue } from '../lib/doc-model';
import { searchDoc } from '../lib/search';
import { expandToDepth } from '../lib/to-tree';
import { TreeTab, type TreeSearchState } from './TreeTab';

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800);
});

const doc = fromValue({
  a: { deep: { x: 'find me' } },
  b: { c: { d: 1 } },
  e: [{ f: 'find me too' }],
});

const seen = { expanded: new Set<string>() as ReadonlySet<string> };
function Harness() {
  const [search, setSearch] = useState<TreeSearchState>({
    term: '',
    regex: false,
    active: 0,
  });
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set(['$']));
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <TreeTab
      doc={doc}
      selectedId={selected}
      onSelect={setSelected}
      search={search}
      onSearchChange={setSearch}
      result={searchDoc(doc, search.term, { regex: search.regex })}
      expanded={expanded}
      onExpandedChange={(next) => {
        seen.expanded = next;
        setExpanded(next);
      }}
    />
  );
}

describe('TreeTab', () => {
  it('Next cycles matches and expands their collapsed ancestors', () => {
    render(<Harness />);
    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Search the tree' }),
      {
        target: { value: 'find' },
      },
    );
    expect(screen.getByText('1 of 2')).toBeTruthy();
    expect(seen.expanded.has('$.a.deep')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Next match' }));
    expect(screen.getByText('2 of 2')).toBeTruthy();
    expect(seen.expanded.has('$.e[0]')).toBe(true);
    fireEvent.keyDown(
      screen.getByRole('searchbox', { name: 'Search the tree' }),
      {
        key: 'Enter',
        shiftKey: true,
      },
    );
    expect(screen.getByText('1 of 2')).toBeTruthy();
  });

  it('shows Invalid regex without throwing', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('switch', { name: 'Regex' }));
    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Search the tree' }),
      {
        target: { value: '(' },
      },
    );
    expect(screen.getByRole('alert').textContent).toBe('Invalid regex');
  });

  it('Expand to depth 2 expands exactly the first two levels', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Expand to depth'), {
      target: { value: '2' },
    });
    expect([...seen.expanded].sort()).toEqual(
      [...expandToDepth(doc, 2)].sort(),
    );
    expect([...seen.expanded].sort()).toEqual(['$', '$.a', '$.b', '$.e']);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
    expect(seen.expanded.size).toBe(0);
  });
});
