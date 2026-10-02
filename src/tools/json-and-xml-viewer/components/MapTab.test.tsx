/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useImperativeHandle } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DiagramCanvasProps } from '@/shared/ui/diagram-canvas';
import { fromValue } from '../lib/doc-model';
import { MapTab } from './MapTab';

const reveal = vi.fn();
let last: DiagramCanvasProps;

vi.mock('@/shared/ui', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  DiagramCanvas: (props: DiagramCanvasProps) => {
    last = props;
    useImperativeHandle(props.ref, () => ({
      reveal,
      fit: vi.fn(),
      zoomTo: vi.fn(),
      centreOn: vi.fn(),
      exportPng: vi.fn(),
      exportSvg: vi.fn(),
      getView: () => ({ x: 0, y: 0, scale: 1 }),
    }));
    return null;
  },
}));

beforeEach(() => {
  reveal.mockClear();
  localStorage.clear();
});

const doc = fromValue({
  store: { book: [{ title: 'a' }, { title: 'b' }], open: true },
});

function mount(selectedId: string | null = null) {
  const onSelect = vi.fn();
  const utils = render(
    <MapTab
      doc={doc}
      selectedId={selectedId}
      onSelect={onSelect}
      fileBase="data"
    />,
  );
  return { ...utils, onSelect };
}

describe('MapTab', () => {
  it('shows a Tree selection on its card, or as a row of its parent', () => {
    const t = mount('$.store.book[1]');
    expect(last.selectedId).toBe('$.store.book[1]');
    expect(last.selectedRow).toBeNull();
    t.rerender(
      <MapTab
        doc={doc}
        selectedId="$.store.open"
        onSelect={t.onSelect}
        fileBase="data"
      />,
    );
    expect(last.selectedId).toBe('$.store');
    expect(last.selectedRow).toBe(1);
  });

  it('a link row selects the child, a header the card', () => {
    const t = mount();
    act(() => last.onSelect!('$.store', 0));
    expect(t.onSelect).toHaveBeenLastCalledWith('$.store.book');
    act(() => last.onSelect!('$.store.book'));
    expect(t.onSelect).toHaveBeenLastCalledWith('$.store.book');
    act(() => last.onSelect!(null));
    expect(t.onSelect).toHaveBeenLastCalledWith(null);
  });

  it('a more click expands that parent and shows more cards', () => {
    const big = fromValue(Array.from({ length: 800 }, (_, id) => ({ id })));
    render(
      <MapTab doc={big} selectedId={null} onSelect={vi.fn()} fileBase="data" />,
    );
    fireEvent.change(screen.getByLabelText('Node cap'), {
      target: { value: '500' },
    });
    expect(screen.getByText('Showing 501 of 801 objects')).toBeTruthy();
    expect(last.diagram.nodes[0].rows.at(-1)).toMatchObject({
      kind: 'more',
      key: '+300 more',
    });
    act(() => last.onExpandMore!('$'));
    expect(screen.getByText('801 objects')).toBeTruthy();
    expect(last.diagram.nodes).toHaveLength(801);
  });

  it('names exports after the file and reveals Tree selections', () => {
    const t = mount('$.store.book[0]');
    expect(last.exportName).toBe('data-map');
    expect(reveal).toHaveBeenLastCalledWith('$.store.book[0]');
    t.rerender(
      <MapTab
        doc={doc}
        selectedId="$.store.book[1]"
        onSelect={t.onSelect}
        fileBase="data"
      />,
    );
    expect(reveal).toHaveBeenLastCalledWith('$.store.book[1]');
  });

  it('holds the view still for two seconds after the person pans', () => {
    vi.useFakeTimers();
    try {
      const t = mount('$.store');
      reveal.mockClear();
      act(() => last.onViewportChange!({ x: 1, y: 1, scale: 1 }, true));
      t.rerender(
        <MapTab
          doc={doc}
          selectedId="$.store.book"
          onSelect={t.onSelect}
          fileBase="data"
        />,
      );
      expect(reveal).not.toHaveBeenCalled();
      vi.advanceTimersByTime(2100);
      t.rerender(
        <MapTab
          doc={doc}
          selectedId="$.store.book[0]"
          onSelect={t.onSelect}
          fileBase="data"
        />,
      );
      expect(reveal).toHaveBeenCalledWith('$.store.book[0]');
    } finally {
      vi.useRealTimers();
    }
  });

  it('describes the map for screen readers', () => {
    mount();
    expect(last.ariaSummary).toBe(
      'Map of 5 objects, 4 levels deep. Use the Tree view for full keyboard and screen-reader navigation.',
    );
  });
});
