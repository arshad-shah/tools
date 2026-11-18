/** @vitest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryCommands } from '@/shared/lib/commands';
import { type as typeIcon } from '@arshad-shah/cynosure/icons';
import type { ToolDefinition } from '@/app/tool';
import TextToolkit from './Tool';
import { TOOLKIT_SETTINGS_DEFAULTS, toolkitSettings } from './settings';

const fake = vi.hoisted(() => ({ timeout: false, disposed: 0 }));

vi.mock('@/tools/regex-tester/lib/runner', async () => {
  const { ToolError: E } = await import('@/shared/lib/errors');
  const { findMatches: fm } = await import('@/tools/regex-tester/lib/match');
  const { replaceText: rt } = await import('@/tools/regex-tester/lib/replace');
  const slow = () =>
    Promise.reject(new E('TIMEOUT', 'Pattern took too long (over 1 s)'));
  return {
    createRegexRunner: () => ({
      match: (p: string, f: string, t: string) =>
        fake.timeout ? slow() : Promise.resolve(fm(p, f, t)),
      replace: (p: string, f: string, t: string, r: string) =>
        fake.timeout ? slow() : Promise.resolve(rt(p, f, t, r)),
      split: vi.fn(),
      tests: vi.fn(),
      dispose: () => fake.disposed++,
    }),
  };
});

// The real registry imports every tool folder; this test needs none.
vi.mock('@/app/registry', () => ({
  TOOLS: [],
  getEnabledTools: () => [],
  getTool: () => undefined,
  toolsAccepting: () => [],
}));

const definition: ToolDefinition = {
  id: 'text-toolkit',
  slug: 'toolkit',
  category: 'text',
  kind: 'tool',
  name: 'Text Toolkit',
  description: 'd',
  icon: typeIcon,
  keywords: [],
  enabled: true,
};

const setup = () =>
  render(
    <MemoryRouter>
      <TextToolkit definition={definition} />
    </MemoryRouter>,
  );
const editor = () =>
  screen.getByRole('textbox', { name: 'Text' }) as HTMLTextAreaElement;
const type = (value: string) =>
  fireEvent.change(editor(), { target: { value } });
/** Picks an operation and applies it. */
const runOp = (name: string) => {
  fireEvent.click(screen.getByRole('combobox', { name: 'Operation' }));
  fireEvent.click(screen.getByRole('option', { name }));
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
};

describe('Text Toolkit', () => {
  beforeEach(() => {
    fake.timeout = false;
  });

  it('shows the operations, find and replace, and statistics', () => {
    setup();
    for (const name of ['Operations', 'Find and replace', 'Statistics'])
      expect(screen.getByRole('region', { name })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'No words yet' })).toBeTruthy();
    expect(
      screen.getByRole('switch', { name: 'Hide common words' }),
    ).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Match case' })).toBeTruthy();
  });

  it('shows live statistics', () => {
    setup();
    type('Hello brave world.');
    expect(screen.getByText('3 words')).toBeTruthy();
    expect(
      screen.getByRole('table', { name: 'Top words' }).textContent,
    ).toContain('brave');
  });

  it('applies an operation as one undo step, and undoes from the button', () => {
    setup();
    type('b\nc\na');
    runOp('Sort A to Z');
    expect(editor().value).toBe('a\nb\nc');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(editor().value).toBe('b\nc\na');
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(editor().value).toBe('a\nb\nc');
  });

  it('takes Ctrl+Z in the editor for its own undo, not the native one', () => {
    setup();
    type('b\na');
    runOp('Upper case');
    expect(editor().value).toBe('B\nA');
    const ev = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      editor().dispatchEvent(ev);
    });
    expect(ev.defaultPrevented).toBe(true);
    expect(editor().value).toBe('b\na');
    act(() => {
      editor().dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Z',
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(editor().value).toBe('B\nA');
  });

  it('shows only the options the chosen operation reads', () => {
    setup();
    expect(screen.queryByLabelText('Join with')).toBeNull();
    fireEvent.click(screen.getByRole('combobox', { name: 'Operation' }));
    fireEvent.click(screen.getByRole('option', { name: 'Join lines' }));
    fireEvent.change(screen.getByLabelText('Join with'), {
      target: { value: '+' },
    });
    expect(screen.queryByLabelText('Tab width')).toBeNull();
    type('a\nb');
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(editor().value).toBe('a+b');
    // The chosen operation is remembered.
    expect(toolkitSettings.getSettings().operation).toBe('lines-join');
  });

  it('shows Undo and Redo once there is something to undo', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    type('b\na');
    runOp('Sort A to Z');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy();
  });

  it('registers every operation with the command palette', () => {
    setup();
    type('b\na');
    const sort = queryCommands('Sort A to Z')
      .flatMap((g) => g.commands)
      .find((c) => c.label === 'Sort A to Z');
    expect(sort).toBeTruthy();
    act(() => sort!.run());
    expect(editor().value).toBe('a\nb');
    expect(toolkitSettings.getSettings().sortMode).toBe('az');
  });

  it('replaces with a regex in the worker and counts matches live', async () => {
    setup();
    type('me@x you@y');
    fireEvent.change(screen.getByLabelText('Find'), {
      target: { value: '(\\w+)@' },
    });
    fireEvent.click(screen.getByRole('switch', { name: 'Regular expression' }));
    fireEvent.change(screen.getByLabelText('Replace with'), {
      target: { value: '[$1]' },
    });
    expect(await screen.findByText('2 matches')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Replace all' }));
    await vi.waitFor(() => expect(editor().value).toBe('[me]x [you]y'));
  });

  it('shows a timeout inline', async () => {
    fake.timeout = true;
    setup();
    type('a'.repeat(40) + 'b');
    fireEvent.change(screen.getByLabelText('Find'), {
      target: { value: '(a+)+$' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Replace all' }));
    // Open file's FileDrop keeps its own (empty) alert region for rejections.
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('alert')
          .some((a) => /^Pattern took too long/.test(a.textContent ?? '')),
      ).toBe(true),
    );
  });

  it('persists options, never the text', () => {
    setup();
    type('secret words');
    fireEvent.click(screen.getByRole('switch', { name: 'Match case' }));
    const stored = toolkitSettings.getSettings();
    expect(stored.findCaseSensitive).toBe(true);
    expect(JSON.stringify(stored)).not.toContain('secret');
    expect(Object.keys(stored).sort()).toEqual(
      Object.keys(TOOLKIT_SETTINGS_DEFAULTS).sort(),
    );
  });
});
