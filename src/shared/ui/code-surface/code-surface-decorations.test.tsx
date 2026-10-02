/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CodeSurface } from './code-surface';
import type { CodeMarker } from './types';

const lines = (n: number) =>
  Array.from({ length: n }, (_, i) => `row ${i + 1}`).join('\n');

describe('CodeSurface decorations', () => {
  it('a marker has a labelled gutter icon, a tooltip and one announcement', () => {
    const markers: CodeMarker[] = [
      { line: 3, column: 2, message: 'Unexpected token', severity: 'error' },
    ];
    const { container, rerender } = render(
      <CodeSurface
        label="Source"
        language="plain"
        value={'a\nb\nfoo bar'}
        markers={markers}
      />,
    );
    const icon = screen.getByRole('img', { name: 'Error on line 3' });
    const tip = document.getElementById(icon.getAttribute('aria-describedby')!);
    expect(tip?.getAttribute('role')).toBe('tooltip');
    expect(tip?.textContent).toBe('Unexpected token');
    fireEvent.pointerEnter(icon.parentElement!);
    // The bubble is portaled to body.
    expect(document.querySelector('[data-tooltip-bubble]')?.textContent).toBe(
      'Unexpected token',
    );
    const underline = container.querySelector(
      '[data-cs-line="3"] .decoration-wavy',
    );
    expect(underline?.textContent).toBe('oo');

    const region = container.querySelector('[data-cs-announcer]')!;
    expect(region.getAttribute('role')).toBe('status');
    expect(region.textContent).toBe('Error on line 3: Unexpected token');
    rerender(
      <CodeSurface
        label="Source"
        language="plain"
        value={'a\nb\nfoo bar'}
        markers={[
          ...markers,
          { line: 3, message: 'Later', severity: 'warning' },
        ]}
      />,
    );
    expect(region.textContent).toBe('Error on line 3: Unexpected token');
  });

  it('a match range wraps exactly characters 2 to 5 in a mark', () => {
    const { container } = render(
      <CodeSurface
        label="Source"
        language="js"
        value="let alpha = 1"
        ranges={[{ start: 2, end: 5, kind: 'match' }]}
      />,
    );
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(1);
    expect(marks[0].textContent).toBe('t a');
    expect(marks[0].className).toContain('bg-match-soft');
  });

  it('line decorations colour the row and its gutter cell', () => {
    const { container } = render(
      <CodeSurface
        label="Source"
        language="plain"
        value={'a\nb'}
        lineDecorations={[{ line: 2, kind: 'added' }]}
      />,
    );
    expect(container.querySelector('[data-cs-line="2"]')?.className).toContain(
      'bg-diff-add-soft',
    );
    expect(
      container.querySelector('[data-cs-gutter-row="1"]')?.className,
    ).toContain('bg-diff-add-soft');
  });

  it('a fold of lines 10 to 129 shows one button and hides lines 11 to 128', () => {
    const onUnfold = vi.fn();
    const value = lines(200);
    const { container } = render(
      <CodeSurface
        label="Source"
        language="plain"
        value={value}
        folds={[{ fromLine: 10, toLine: 129, label: 'unchanged' }]}
        onUnfold={onUnfold}
      />,
    );
    const button = screen.getByRole('button', {
      name: 'Show 120 hidden lines',
    });
    for (let n = 11; n <= 128; n++)
      expect(container.querySelector(`[data-cs-line="${n}"]`)).toBeNull();
    expect(container.querySelector('[data-cs-line="9"]')).not.toBeNull();
    expect(container.querySelector('[data-cs-line="130"]')?.textContent).toBe(
      'row 130',
    );
    const ta = screen.getByRole('textbox', { name: 'Source' });
    expect(ta.getAttribute('aria-readonly')).toBe('true');
    fireEvent.click(button);
    expect(onUnfold).toHaveBeenCalledWith(0);
  });

  it('single-line mode: Enter calls onSubmit, inserts no newline, has no gutter', () => {
    const onSubmit = vi.fn();
    const onChange = vi.fn();
    const { container } = render(
      <CodeSurface
        label="Pattern"
        language="regex"
        value="a+"
        singleLine
        onSubmit={onSubmit}
        onChange={onChange}
      />,
    );
    const ta = screen.getByRole('textbox', { name: 'Pattern' });
    expect(ta.getAttribute('aria-multiline')).toBe('false');
    const notPrevented = fireEvent.keyDown(ta, { key: 'Enter' });
    expect(notPrevented).toBe(false);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(ta, { target: { value: 'a\nb' } });
    expect(onChange).toHaveBeenLastCalledWith('ab');
    expect(container.querySelector('[data-cs-gutter]')).toBeNull();
  });
});
