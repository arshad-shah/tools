/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { computeDiff } from '../lib/engine';
import { buildViewModel } from '../lib/view-model';
import { DiffView } from './DiffView';

const NAMES = { left: 'a.txt', right: 'b.txt' };
const lines = (n: number) =>
  Array.from({ length: n }, (_, i) => `line ${i + 1}`).join('\n');

function renderSplit(left: string, right: string) {
  const vm = buildViewModel(
    computeDiff(left, right),
    { left, right },
    { view: 'split', context: 'all', expanded: new Set() },
  );
  return render(
    <DiffView
      vm={vm}
      language="plain"
      names={NAMES}
      wrap={false}
      onUnfold={() => {}}
    />,
  );
}

const scrollerOf = (name: string) =>
  screen
    .getByRole('textbox', { name })
    .closest('[data-cs-scroller]') as HTMLDivElement;

describe('DiffView', () => {
  it('the gutter shows original line numbers, blank on padding rows', () => {
    const { container } = renderSplit('a\nb\nc', 'a\nc\nd\ne');
    const gutter = (side: number) => {
      const col = container.querySelectorAll('[data-cs-gutter]')[side];
      return [...col.querySelectorAll('[data-cs-gutter-row]')].map(
        (c) => c.textContent,
      );
    };
    // Left: a, b (removed), c, then padding for the added d and e.
    expect(gutter(0)).toEqual(['1', '2', '3', '', '']);
    // Right: a, padding against the removed b, c, d, e.
    expect(gutter(1)).toEqual(['1', '', '2', '3', '4']);
  });

  it('scrolling one side of the split view scrolls the other', () => {
    renderSplit(lines(300), lines(300).replace('line 150', 'changed'));
    const left = scrollerOf('a.txt, compared');
    const right = scrollerOf('b.txt, compared');
    left.scrollTop = 200;
    left.scrollLeft = 15;
    fireEvent.scroll(left);
    expect([right.scrollTop, right.scrollLeft]).toEqual([200, 15]);
    right.scrollTop = 40;
    fireEvent.scroll(right);
    expect(left.scrollTop).toBe(40);
  });
});
