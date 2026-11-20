/** @vitest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { foldCode } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CodeEditor } from './CodeEditor';
import type { CodeEditorHandle, CodeEditorProps } from './types';

function Controlled({
  initial,
  onValue,
  ...rest
}: Partial<CodeEditorProps> & {
  initial: string;
  onValue?: (v: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <CodeEditor
      aria-label="Source"
      {...rest}
      value={value}
      onChange={(v) => {
        setValue(v);
        onValue?.(v);
      }}
    />
  );
}

const textbox = (name = 'Source') => screen.getByRole('textbox', { name });
const viewOf = (el: HTMLElement) => EditorView.findFromDOM(el)!;

/** What a keystroke does: an input transaction at the caret. */
function type(el: HTMLElement, text: string) {
  const view = viewOf(el);
  act(() => {
    view.dispatch(
      view.state.update({
        ...view.state.replaceSelection(text),
        userEvent: 'input.type',
      }),
    );
  });
}

describe('CodeEditor', () => {
  it('is a textbox named by aria-label', () => {
    render(<CodeEditor aria-label="Schema JSON" value="{}" />);
    expect(textbox('Schema JSON').getAttribute('contenteditable')).toBe('true');
  });

  it('is in the tab order, read-only too, so its scroller is keyboard-reachable', () => {
    const { unmount } = render(<CodeEditor aria-label="Editable" />);
    expect(
      screen
        .getByRole('textbox', { name: 'Editable' })
        .getAttribute('tabindex'),
    ).toBe('0');
    unmount();
    render(<CodeEditor aria-label="Read" readOnly defaultValue="x" />);
    expect(
      screen.getByRole('textbox', { name: 'Read' }).getAttribute('tabindex'),
    ).toBe('0');
  });

  it('typing changes the value (controlled)', () => {
    const onValue = vi.fn();
    render(<Controlled initial="ab" onValue={onValue} />);
    const box = textbox();
    act(() => viewOf(box).dispatch({ selection: { anchor: 2 } }));
    type(box, 'c');
    expect(onValue).toHaveBeenLastCalledWith('abc');
    expect(viewOf(box).state.doc.toString()).toBe('abc');
  });

  it('a new value prop replaces the text without calling onChange', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CodeEditor aria-label="Source" value="one" onChange={onChange} />,
    );
    rerender(
      <CodeEditor
        aria-label="Source"
        value={'two lines\nhere'}
        onChange={onChange}
      />,
    );
    expect(viewOf(textbox()).state.doc.toString()).toBe('two lines\nhere');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('works uncontrolled from defaultValue', () => {
    const onChange = vi.fn();
    render(
      <CodeEditor aria-label="Source" defaultValue="x" onChange={onChange} />,
    );
    type(textbox(), 'y');
    expect(onChange).toHaveBeenLastCalledWith('yx');
  });

  it('read-only text cannot be typed into and says so', () => {
    render(<CodeEditor aria-label="Source" value="fixed" readOnly />);
    const box = textbox();
    expect(box.getAttribute('aria-readonly')).toBe('true');
    expect(viewOf(box).state.readOnly).toBe(true);
  });

  it('shows diagnostics: an underline, a gutter marker and a polite status', async () => {
    const { container } = render(
      <CodeEditor
        aria-label="Source"
        value={'{\n  "a": 1,\n}'}
        diagnostics={[
          {
            line: 2,
            column: 9,
            message: 'Trailing comma',
            severity: 'error',
          },
        ]}
      />,
    );
    await waitFor(() =>
      expect(container.querySelector('.cm-lintRange-error')).not.toBeNull(),
    );
    expect(container.querySelector('.cm-lint-marker-error')).not.toBeNull();
    expect(textbox().getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('status').textContent).toBe(
      'Error on line 2, column 9: Trailing comma',
    );
  });

  it('Mod+F opens find in Cynosure controls; Enter selects the next match', async () => {
    render(<CodeEditor aria-label="Source" value={'foo bar\nfoo baz'} />);
    const box = textbox();
    fireEvent.keyDown(box, { key: 'f', ctrlKey: true });
    const find = await screen.findByRole('textbox', { name: 'Find' });
    await waitFor(() => expect(document.activeElement).toBe(find));
    fireEvent.change(find, { target: { value: 'foo' } });
    expect(await screen.findAllByText('2 matches')).not.toHaveLength(0);
    fireEvent.keyDown(find, { key: 'Enter' });
    expect(viewOf(box).state.selection.main.to).toBe(3);
    fireEvent.keyDown(find, { key: 'Enter' });
    const sel = viewOf(box).state.selection.main;
    expect([sel.from, sel.to]).toEqual([8, 11]);
    expect(await screen.findAllByText('2 of 2')).not.toHaveLength(0);
    fireEvent.keyDown(find, { key: 'Enter', shiftKey: true });
    expect(viewOf(box).state.selection.main.from).toBe(0);
  });

  it('replace all rewrites every match', async () => {
    const onValue = vi.fn();
    render(<Controlled initial={'a-a-a'} onValue={onValue} />);
    fireEvent.keyDown(textbox(), { key: 'f', ctrlKey: true });
    fireEvent.change(await screen.findByRole('textbox', { name: 'Find' }), {
      target: { value: 'a' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Replace with' }), {
      target: { value: 'b' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Replace all' }));
    expect(onValue).toHaveBeenLastCalledWith('b-b-b');
  });

  it('read-only find has no replace', async () => {
    render(<CodeEditor aria-label="Source" value="x" readOnly />);
    fireEvent.keyDown(textbox(), { key: 'f', ctrlKey: true });
    await screen.findByRole('textbox', { name: 'Find' });
    expect(screen.queryByRole('textbox', { name: 'Replace with' })).toBeNull();
  });

  it('Escape in find closes it and returns focus to the text', async () => {
    render(<CodeEditor aria-label="Source" value="x" />);
    fireEvent.keyDown(textbox(), { key: 'f', ctrlKey: true });
    const find = await screen.findByRole('textbox', { name: 'Find' });
    fireEvent.keyDown(find, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Find' })).toBeNull(),
    );
  });

  it('a one-line field submits on Enter and drops pasted newlines', () => {
    const onSubmit = vi.fn();
    const onValue = vi.fn();
    render(
      <Controlled
        initial=""
        singleLine
        onSubmit={onSubmit}
        onValue={onValue}
      />,
    );
    const box = textbox();
    expect(box.getAttribute('aria-multiline')).toBe('false');
    type(box, 'a\nb\r\nc');
    expect(onValue).toHaveBeenLastCalledWith('abc');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(viewOf(box).state.doc.lines).toBe(1);
  });

  it('marks ranges and lines with decorations', () => {
    const { container } = render(
      <CodeEditor
        aria-label="Source"
        value={'hello world\nsecond'}
        ranges={[{ start: 6, end: 11, kind: 'match' }]}
        lineDecorations={[{ line: 2, kind: 'added' }]}
      />,
    );
    expect(container.querySelector('.cm-tl-range-match')?.textContent).toBe(
      'world',
    );
    expect(container.querySelector('.cm-tl-line-added')?.textContent).toBe(
      'second',
    );
  });

  it('folds lines behind a Show button that calls onUnfold', () => {
    const onUnfold = vi.fn();
    render(
      <CodeEditor
        aria-label="Source"
        value={'1\n2\n3\n4\n5'}
        folds={[{ fromLine: 2, toLine: 4, label: '@@ -2,3 @@' }]}
        onUnfold={onUnfold}
      />,
    );
    expect(screen.queryByText('3')).toBeNull();
    expect(screen.getByText('@@ -2,3 @@')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Show 3 hidden lines' }),
    );
    expect(onUnfold).toHaveBeenCalledWith(0);
  });

  it('folds language blocks from the gutter or the fold keys', async () => {
    const { container } = render(
      <CodeEditor
        aria-label="Source"
        language="json"
        value={'{\n  "a": [\n    1,\n    2\n  ]\n}'}
      />,
    );
    const view = viewOf(textbox());
    // The JSON parser loads on demand; then the gutter offers folds.
    await waitFor(() =>
      expect(
        container.querySelector('.cm-tl-fold-marker:not(.cm-tl-closed)'),
      ).not.toBeNull(),
    );
    act(() => view.dispatch({ selection: { anchor: 8 } }));
    act(() => {
      foldCode(view);
    });
    expect(container.querySelector('.cm-foldPlaceholder')).not.toBeNull();
  });

  it('has no language folding where the tool folds lines itself', () => {
    const { container } = render(
      <CodeEditor
        aria-label="Source"
        value={'1\n2\n3'}
        folds={[{ fromLine: 2, toLine: 2, label: '' }]}
      />,
    );
    expect(container.querySelector('.cm-foldGutter')).toBeNull();
  });

  it('shows line labels instead of numbers', () => {
    const { container } = render(
      <CodeEditor aria-label="Source" value={'a\nb'} lineLabels={[10, null]} />,
    );
    const cells = [
      ...container.querySelectorAll('.cm-lineNumbers .cm-gutterElement'),
    ].map((e) => e.textContent);
    expect(cells).toContain('10');
    expect(cells).not.toContain('1');
  });

  it('the handle selects and focuses', () => {
    const ref = createRef<CodeEditorHandle>();
    render(<CodeEditor aria-label="Source" value="abcdef" ref={ref} />);
    act(() => ref.current!.setSelection(2, 4));
    const sel = ref.current!.view!.state.selection.main;
    expect([sel.from, sel.to]).toEqual([2, 4]);
  });

  it('reports selection changes', () => {
    const onSel = vi.fn();
    render(
      <CodeEditor
        aria-label="Source"
        value="abcdef"
        onSelectionChange={onSel}
      />,
    );
    act(() =>
      viewOf(textbox()).dispatch({ selection: { anchor: 1, head: 3 } }),
    );
    expect(onSel).toHaveBeenLastCalledWith(1, 3);
  });

  it('describes the Escape-then-Tab way out for editable text', () => {
    render(<CodeEditor aria-label="Source" value="" />);
    const id = textbox().getAttribute('aria-describedby')!;
    expect(document.getElementById(id)?.textContent).toMatch(
      /Escape, then Tab/,
    );
  });

  it('large-document mode turns wrapping off', () => {
    const { container } = render(
      <CodeEditor aria-label="Source" value="x" wrap largeDocument />,
    );
    expect(container.querySelector('.cm-lineWrapping')).toBeNull();
    render(<CodeEditor aria-label="Other" value="x" wrap />);
    expect(textbox('Other').classList.contains('cm-lineWrapping')).toBe(true);
  });
});
