/** @vitest-environment jsdom */
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useIntelligentDiff } from '../hooks/useIntelligentDiff';
import type {
  DiffSegment,
  DiffSettings,
  DiffViewModeId,
  HighlightMode,
} from '../types';
import { DiffResults } from './DiffResults';

const SETTINGS: DiffSettings = {
  ignoreWhitespace: false,
  ignoreCase: false,
  wordByWord: false,
  showLineNumbers: false,
  contextLines: 3,
  trimTrailingWhitespace: true,
  highlightIntralineChanges: true,
  syntaxHighlighting: false,
  ignoreEmptyLines: false,
  trimNewlines: false,
};

const LEFT = 'alpha\nbravo one\ncharlie two\ndelta';
const RIGHT = 'alpha\nbravo ONE\ncharlie TWO\ndelta';

/** The real segments the hook produces for a highlight mode. */
function segmentsFor(mode: HighlightMode): DiffSegment[] {
  const { result } = renderHook(() => useIntelligentDiff());
  act(() => result.current.calculateDiff(LEFT, RIGHT, SETTINGS, mode));
  return result.current.diffSegments;
}

function renderView(
  segments: DiffSegment[],
  view: DiffViewModeId,
  mode: HighlightMode,
) {
  const { container, unmount } = render(
    <DiffResults
      diffSegments={segments}
      isDiffing={false}
      bothFilled
      diffViewMode={view}
      highlightMode={mode}
      diffSettings={SETTINGS}
    />,
  );
  const html = container.innerHTML;
  const text = container.textContent ?? '';
  const blocks = Array.from(container.querySelectorAll('div')).map(
    (el) => el.textContent,
  );
  unmount();
  return { html, text, blocks };
}

afterEach(cleanup);

describe('DiffResults inline view', () => {
  it.each<HighlightMode>(['line', 'word', 'character'])(
    'renders differently from unified in %s mode',
    (mode) => {
      const segments = segmentsFor(mode);
      const unified = renderView(segments, 'unified', mode);
      const inline = renderView(segments, 'inline', mode);
      expect(inline.html).not.toBe(unified.html);
    },
  );

  it('groups each modified line under the original it replaced in line mode', () => {
    const segments = segmentsFor('line');
    const unified = renderView(segments, 'unified', 'line');
    const inline = renderView(segments, 'inline', 'line');
    // Inline: one block holds the original row and the modified row under it.
    expect(inline.blocks).toContain('-bravo one+bravo ONE');
    expect(inline.blocks).toContain('-charlie two+charlie TWO');
    // Unified lists the rows flat, with no such pair block.
    expect(unified.blocks).not.toContain('-bravo one+bravo ONE');
    expect(unified.blocks).not.toContain('-charlie two+charlie TWO');
  });

  it.each<HighlightMode>(['word', 'character'])(
    'flows %s tokens as running text with no +/- row markers',
    (mode) => {
      const segments = segmentsFor(mode);
      const unified = renderView(segments, 'unified', mode);
      const inline = renderView(segments, 'inline', mode);
      expect(unified.text).toMatch(/[+-]/);
      expect(inline.text).not.toMatch(/[+-]/);
      // The text reads as the original and modified tokens in document order.
      expect(inline.text).toContain('alpha\nbravo ');
      expect(inline.text).toContain('delta');
    },
  );
});
