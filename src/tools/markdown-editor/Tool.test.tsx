/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryCommands } from '@/shared/lib/commands';
import { fileCode } from '@arshad-shah/cynosure/icons';
import type { ToolDefinition } from '@/app/tool';
import {
  editorSelection,
  editorValue,
  selectInEditor,
  setEditorValue,
} from '@/shared/editor/testing';
import MarkdownEditor from './Tool';

const saved = vi.hoisted(() => ({
  files: [] as { blob: Blob; name: string }[],
}));
vi.mock('@/shared/lib/download', () => ({
  saveBlob: (blob: Blob, name: string) => saved.files.push({ blob, name }),
}));
const notify = vi.hoisted(() => ({
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/shared/lib/notify', () => ({ notify }));

const definition: ToolDefinition = {
  id: 'markdown-editor',
  slug: 'markdown',
  category: 'text',
  kind: 'tool',
  name: 'Markdown Editor & Preview',
  description: 'd',
  icon: fileCode,
  keywords: [],
  enabled: true,
};

const editor = () => screen.getByRole('textbox', { name: 'Markdown' });
const frame = () => screen.getByTitle('Preview') as HTMLIFrameElement;
const type = (value: string) => setEditorValue(editor(), value);
const srcdoc = () => frame().getAttribute('srcdoc') ?? '';

describe('Markdown Editor', () => {
  beforeEach(() => {
    saved.files = [];
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the preview in the sandboxed frame, debounced', async () => {
    render(<MarkdownEditor definition={definition} />);
    expect(frame().getAttribute('sandbox')).toBe('');
    type('# Title\n\n| a | b |\n| - | - |\n| 1 | 2 |');
    await vi.waitFor(() => expect(srcdoc()).toContain('<table'));
    expect(srcdoc()).toContain('<h1 id="title"');
    expect(screen.getByText('5 words')).toBeTruthy();
  });

  it('escapes raw HTML so scripts never reach the frame', async () => {
    render(<MarkdownEditor definition={definition} />);
    type('<script>alert(1)</script>\n\nok');
    await vi.waitFor(() => expect(srcdoc()).toContain('ok'));
    expect(srcdoc()).not.toContain('<script>');
  });

  it('blocks remote images until the opt-in, and resets it when cleared', async () => {
    render(<MarkdownEditor definition={definition} />);
    type('![a](https://example.com/a.png)');
    expect(await screen.findByText('1 remote image blocked')).toBeTruthy();
    expect(srcdoc()).not.toMatch(/img-src[^;]*https:/);
    fireEvent.click(
      screen.getByRole('button', { name: 'Load for this document' }),
    );
    expect(srcdoc()).toMatch(/img-src[^;]*https:/);
    expect(screen.queryByText('1 remote image blocked')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    type('![b](https://example.com/b.png)');
    expect(await screen.findByText('1 remote image blocked')).toBeTruthy();
  });

  it('formats the selection and moves the selection inside the marks', () => {
    render(<MarkdownEditor definition={definition} />);
    type('hello world');
    selectInEditor(editor(), 0, 5);
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }));
    expect(editorValue(editor())).toBe('**hello** world');
    expect(editorSelection(editor())).toEqual([2, 7]);
  });

  it('folds headings and lists into menus; Outline and Export wait for text', () => {
    render(<MarkdownEditor definition={definition} />);
    expect(screen.queryByRole('button', { name: 'Outline' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Export' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Heading 2' })).toBeNull();
    type('title');
    selectInEditor(editor(), 0, 0);
    fireEvent.click(screen.getByRole('button', { name: 'Heading' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Heading 2' }));
    expect(editorValue(editor())).toBe('## title');
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    for (const name of ['Bulleted list', 'Numbered list', 'Task list'])
      expect(screen.getByRole('menuitem', { name })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Outline' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export' })).toBeTruthy();
  });

  it('binds Mod+B and Mod+Shift+L, and Shift+7 by physical key', () => {
    render(<MarkdownEditor definition={definition} />);
    type('word');
    selectInEditor(editor(), 0, 4);
    fireEvent.keyDown(editor(), { key: 'b', ctrlKey: true });
    expect(editorValue(editor())).toBe('**word**');
    fireEvent.keyDown(editor(), { key: 'L', ctrlKey: true, shiftKey: true });
    expect(editorValue(editor())).toBe('**[word](url)**');
    type('a\nb');
    selectInEditor(editor(), 0, 3);
    fireEvent.keyDown(editor(), {
      key: '&',
      code: 'Digit7',
      ctrlKey: true,
      shiftKey: true,
    });
    expect(editorValue(editor())).toBe('1. a\n2. b');
  });

  it('registers formatting with the command palette', () => {
    render(<MarkdownEditor definition={definition} />);
    const labels = queryCommands('')
      .flatMap((g) => g.commands)
      .map((c) => c.label);
    expect(labels).toEqual(
      expect.arrayContaining(['Bold', 'Numbered list', 'Download HTML']),
    );
  });

  it('jumps the caret to a heading from the outline', async () => {
    render(<MarkdownEditor definition={definition} />);
    type('# One\n\ntext\n\n## Two');
    await vi.waitFor(() => expect(srcdoc()).toContain('id="two"'));
    fireEvent.click(screen.getByRole('button', { name: 'Outline' }));
    fireEvent.click(screen.getByRole('button', { name: 'Two' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(editorSelection(editor())[0]).toBe('# One\n\ntext\n\n'.length);
    expect(document.activeElement).toBe(editor());
  });

  it('shows the editor and the preview together', async () => {
    render(<MarkdownEditor definition={definition} />);
    type('# Hi');
    await vi.waitFor(() => expect(srcdoc()).toContain('Hi'));
    expect(editor()).toBeTruthy();
    expect(frame()).toBeTruthy();
  });

  it('the outline moves the shown preview to the heading', async () => {
    render(<MarkdownEditor definition={definition} />);
    type('# One\n\ntext\n\n## Two');
    await vi.waitFor(() => expect(srcdoc()).toContain('id="two"'));
    fireEvent.click(screen.getByRole('button', { name: 'Outline' }));
    fireEvent.click(screen.getByRole('button', { name: 'Two' }));
    expect(srcdoc()).toContain('[id="two"]{scroll-initial-target:nearest}');
  });

  it('downloads a standalone HTML file and clears the leave guard', async () => {
    render(<MarkdownEditor definition={definition} />);
    type('# My Doc\n\nbody');
    const before = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(before);
    expect(before.defaultPrevented).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Download HTML' }));
    await vi.waitFor(() => expect(saved.files).toHaveLength(1));
    expect(saved.files[0].name).toBe('my-doc.html');
    const html = await saved.files[0].blob.text();
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<title>My Doc</title>');

    const after = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });

  it('downloads Markdown and falls back to HTML text without rich clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    render(<MarkdownEditor definition={definition} />);
    type('# Notes\n\n*hi*');
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Download Markdown' }),
    );
    await vi.waitFor(() => expect(saved.files).toHaveLength(1));
    expect(saved.files[0].name).toBe('notes.md');
    expect(await saved.files[0].blob.text()).toBe('# Notes\n\n*hi*');

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy rich text' }));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0][0]).toContain('<em>hi</em>');
    await vi.waitFor(() =>
      expect(notify.info).toHaveBeenCalledWith(
        expect.stringMatching(/copied as text/),
      ),
    );
  });

  it('loads the sample document', async () => {
    render(<MarkdownEditor definition={definition} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Try the sample document' }),
    );
    expect(editorValue(editor())).toContain('# Project notes');
    await vi.waitFor(() => expect(srcdoc()).toContain('<table'), {
      timeout: 5000,
    });
  });
});
