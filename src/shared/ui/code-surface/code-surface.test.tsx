/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CodeSurface } from './code-surface';
import type { CodeSurfaceHandle, CodeSurfaceProps } from './types';

function Controlled({
  initial,
  onValue,
  ...rest
}: Partial<CodeSurfaceProps> & {
  initial: string;
  onValue?: (v: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <CodeSurface
      label="Source"
      language="plain"
      {...rest}
      value={value}
      onChange={(v) => {
        setValue(v);
        onValue?.(v);
      }}
    />
  );
}

const textbox = () =>
  screen.getByRole('textbox', { name: 'Source' }) as HTMLTextAreaElement;

describe('CodeSurface', () => {
  it('typing updates onChange', () => {
    const onChange = vi.fn();
    render(
      <CodeSurface label="Source" language="js" value="" onChange={onChange} />,
    );
    fireEvent.change(textbox(), { target: { value: 'let a' } });
    expect(onChange).toHaveBeenCalledWith('let a');
  });

  it('Tab indents a three-line selection by tabSize and Shift+Tab reverts', () => {
    const onValue = vi.fn();
    render(<Controlled initial={'a\nb\nc'} tabSize={4} onValue={onValue} />);
    const ta = textbox();
    ta.setSelectionRange(0, ta.value.length);
    fireEvent.keyDown(ta, { key: 'Tab' });
    expect(ta.value).toBe('    a\n    b\n    c');
    expect(onValue).toHaveBeenLastCalledWith('    a\n    b\n    c');
    fireEvent.keyDown(ta, { key: 'Tab', shiftKey: true });
    expect(ta.value).toBe('a\nb\nc');
  });

  it('Enter keeps the indentation', () => {
    const onValue = vi.fn();
    render(<Controlled initial="  foo" onValue={onValue} />);
    const ta = textbox();
    ta.setSelectionRange(5, 5);
    fireEvent.keyDown(ta, { key: 'Enter' });
    expect(onValue).toHaveBeenLastCalledWith('  foo\n  ');
    expect(ta.selectionStart).toBe(8);
  });

  it('auto-pairs brackets only before whitespace or the end', () => {
    render(<Controlled initial="x y" />);
    const ta = textbox();
    ta.setSelectionRange(1, 1);
    fireEvent.keyDown(ta, { key: '(' });
    expect(ta.value).toBe('x() y');
    ta.setSelectionRange(0, 0);
    expect(fireEvent.keyDown(ta, { key: '[' })).toBe(true);
    expect(ta.value).toBe('x() y');
  });

  it('Mod+/ toggles line comments for languages that have them', () => {
    render(<Controlled initial="a" language="js" />);
    const ta = textbox();
    fireEvent.keyDown(ta, { key: '/', ctrlKey: true });
    expect(ta.value).toBe('// a');
  });

  it('the find bar counts matches, cycles with Enter and closes with Escape', () => {
    render(<CodeSurface label="Source" language="plain" value="a b a" />);
    const ta = textbox();
    fireEvent.keyDown(ta, { key: 'f', ctrlKey: true });
    const input = screen.getByRole('textbox', { name: 'Find' });
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: 'a' } });
    expect(screen.getByText('1 of 2')).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('2 of 2')).toBeTruthy();
    expect([ta.selectionStart, ta.selectionEnd]).toEqual([4, 5]);
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(screen.getByText('1 of 2')).toBeTruthy();
    expect(document.querySelectorAll('mark').length).toBe(2);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('search')).toBeNull();
    expect(document.activeElement).toBe(ta);
  });

  it('find supports regular expressions and reports invalid ones', () => {
    render(<CodeSurface label="Source" language="plain" value="a1 b22" />);
    fireEvent.keyDown(textbox(), { key: 'f', ctrlKey: true });
    fireEvent.click(screen.getByRole('button', { name: 'Regex' }));
    const input = screen.getByRole('textbox', { name: 'Find' });
    fireEvent.change(input, { target: { value: '\\d+' } });
    expect(screen.getByText('1 of 2')).toBeTruthy();
    fireEvent.change(input, { target: { value: '(' } });
    expect(screen.getByText('Invalid pattern')).toBeTruthy();
  });

  it('read-only mode has aria-readonly and never calls onChange', () => {
    const onChange = vi.fn();
    render(
      <CodeSurface
        label="Source"
        language="plain"
        value="abc"
        readOnly
        onChange={onChange}
      />,
    );
    const ta = textbox();
    expect(ta.getAttribute('aria-readonly')).toBe('true');
    fireEvent.change(ta, { target: { value: 'abcd' } });
    fireEvent.keyDown(ta, { key: 'Tab' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('the textarea is named by label and the highlighted layer is aria-hidden', () => {
    const { container } = render(
      <CodeSurface label="Source" language="json" value={'{"a": 1}'} />,
    );
    const ta = textbox();
    expect(ta.tagName).toBe('TEXTAREA');
    expect(ta.getAttribute('spellcheck')).toBe('false');
    const layer = container.querySelector('[data-cs-highlight]')!;
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(layer.querySelector('.text-syntax-key')?.textContent).toBe('"a"');
  });

  it('renders fewer than 200 line nodes for 50,000 lines', () => {
    const value = Array.from({ length: 50_000 }, (_, i) => `line ${i}`).join(
      '\n',
    );
    const { container } = render(
      <CodeSurface label="Source" language="plain" value={value} />,
    );
    const lines = container.querySelectorAll('[data-cs-line]');
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThan(200);
    expect(
      container.querySelectorAll('[data-cs-gutter-row]').length,
    ).toBeLessThan(200);
    expect(textbox().value.length).toBe(value.length);
  });

  it('scrolls through the handle and renders the lines in view', () => {
    const value = Array.from({ length: 10_000 }, (_, i) => `line ${i}`).join(
      '\n',
    );
    const ref = createRef<CodeSurfaceHandle>();
    const { container } = render(
      <CodeSurface ref={ref} label="Source" language="plain" value={value} />,
    );
    expect(container.querySelector('[data-cs-line="5000"]')).toBeNull();
    act(() => ref.current!.scrollToLine(5000));
    expect(container.querySelector('[data-cs-line="5000"]')?.textContent).toBe(
      'line 4999',
    );
  });

  it('read-only text over the textarea limit renders as a virtual read-only textbox', () => {
    const value = Array.from({ length: 120_000 }, (_, i) => `${i}`).join('\n');
    const { container } = render(
      <CodeSurface label="Source" language="plain" value={value} readOnly />,
    );
    const box = textbox();
    expect(box.tagName).toBe('DIV');
    expect(box.getAttribute('aria-readonly')).toBe('true');
    expect(container.querySelectorAll('[data-cs-line]').length).toBeLessThan(
      200,
    );
  });

  it('wrap soft-wraps the textarea and lets rows flow', () => {
    const { container } = render(
      <CodeSurface label="Source" language="plain" value={'a\nb'} wrap />,
    );
    expect(textbox().getAttribute('wrap')).toBe('soft');
    const row = container.querySelector<HTMLElement>('[data-cs-line="2"]')!;
    expect(row.className).toContain('whitespace-pre-wrap');
    expect(row.style.top).toBe('');
  });
});
