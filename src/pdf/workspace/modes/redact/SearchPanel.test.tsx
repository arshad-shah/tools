/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PageTextItems, TextItemGeom } from '@/pdf/render';
import type { DocumentApi } from '../types';
import { SearchPanel } from './SearchPanel';

const item = (str: string, y: number): TextItemGeom => ({
  str,
  transform: [12, 0, 0, 12, 72, y],
  width: str.length * 6,
  height: 12,
  fontName: 'f1',
  hasEOL: true,
});
const items = (...lines: string[]): PageTextItems => ({
  items: lines.map((l, i) => item(l, 700 - i * 20)),
  styles: {
    f1: { ascent: 0.8, descent: -0.2, vertical: false, fontFamily: 'sans' },
  },
});

function fakeDoc(texts: PageTextItems[]) {
  const pages = texts.map((_, i) => ({
    id: `p${i}`,
    source: 's0',
    index: i,
    rotate: 0 as const,
  }));
  const dispatch = vi.fn((ops: unknown[]) =>
    ops.map((_, i) => ({ id: `o${i}`, label: 'x' })),
  );
  const doc = {
    view: {
      checkpoint: 'c0',
      pages,
      overlays: new Map(),
      docOverlays: [],
      pageLabels: null,
      hidden: new Set(),
    },
    text: async (p: { index: number }) => texts[p.index],
    dispatch,
    announce: vi.fn(),
  } as unknown as DocumentApi;
  return { doc, dispatch };
}

const find = () => screen.getByRole('textbox', { name: 'Find' });

describe('SearchPanel', () => {
  it('lists matches with checkboxes and marks them all in one grouped op', async () => {
    const { doc, dispatch } = fakeDoc([
      items('My Secret plan', 'secretary'),
      items('Top SECRET'),
    ]);
    render(<SearchPanel doc={doc} />);
    fireEvent.change(find(), { target: { value: 'secret' } });
    expect(
      await screen.findByText('3 matches', {}, { timeout: 2000 }),
    ).toBeTruthy();
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(3);
    expect(boxes[0].getAttribute('aria-label')).toBe(
      'Match 1 on page 1: Secret',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mark all' }));
    expect(dispatch).toHaveBeenCalledTimes(1);
    const [ops, label] = dispatch.mock.calls[0] as unknown as [
      {
        type: string;
        params: { pageId: string; source: { matched: string } };
      }[],
      string,
    ];
    expect(label).toBe('Mark 3 search matches for redaction');
    expect(
      ops.map((o) => [o.type, o.params.pageId, o.params.source.matched]),
    ).toEqual([
      ['redact.mark', 'p0', 'Secret'],
      ['redact.mark', 'p0', 'secret'],
      ['redact.mark', 'p1', 'SECRET'],
    ]);
  });

  it('marks only the selected matches', async () => {
    const { doc, dispatch } = fakeDoc([items('one secret', 'two secret')]);
    render(<SearchPanel doc={doc} />);
    fireEvent.change(find(), { target: { value: 'secret' } });
    await screen.findByText('2 matches', {}, { timeout: 2000 });
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Mark selected' }));
    expect((dispatch.mock.calls[0] as unknown as [unknown[], string])[1]).toBe(
      'Mark 1 search match for redaction',
    );
  });

  it('shows an invalid regular expression inline', () => {
    const { doc } = fakeDoc([items('x')]);
    render(<SearchPanel doc={doc} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Regular expression' }));
    fireEvent.change(find(), { target: { value: '(' } });
    expect(screen.getByText('That search pattern is not valid')).toBeTruthy();
    expect(find().getAttribute('aria-invalid')).toBe('true');
  });
});
