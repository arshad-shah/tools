/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryCommands } from '@/shared/lib/commands';
import { IconFileCode } from '@/shared/ui/icons';
import type { ToolDefinition } from '@/app/tool';
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
  icon: IconFileCode,
  keywords: [],
  enabled: true,
};

const editor = () =>
  screen.getByRole('textbox', { name: 'Markdown' }) as HTMLTextAreaElement;
const frame = () => screen.getByTitle('Preview') as HTMLIFrameElement;
const type = (value: string) =>
  fireEvent.change(editor(), { target: { value } });
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
    editor().setSelectionRange(0, 5);
    fireEvent.select(editor());
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }));
    expect(editor().value).toBe('**hello** world');
    expect([editor().selectionStart, editor().selectionEnd]).toEqual([2, 7]);
  });

  it('binds Mod+B and Mod+Shift+L, and Shift+7 by physical key', () => {
    render(<MarkdownEditor definition={definition} />);
    type('word');
    editor().setSelectionRange(0, 4);
    fireEvent.select(editor());
    fireEvent.keyDown(editor(), { key: 'b', ctrlKey: true });
    expect(editor().value).toBe('**word**');
    fireEvent.keyDown(editor(), { key: 'L', ctrlKey: true, shiftKey: true });
    expect(editor().value).toBe('**[word](url)**');
    type('a\nb');
    editor().setSelectionRange(0, 3);
    fireEvent.select(editor());
    fireEvent.keyDown(editor(), {
      key: '&',
      code: 'Digit7',
      ctrlKey: true,
      shiftKey: true,
    });
    expect(editor().value).toBe('1. a\n2. b');
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
    expect(editor().selectionStart).toBe('# One\n\ntext\n\n'.length);
    expect(document.activeElement).toBe(editor());
  });

  it('shows Edit and Preview as tabs (R41)', async () => {
    render(<MarkdownEditor definition={definition} />);
    fireEvent.click(screen.getByRole('tab', { name: /^Edit/ }));
    type('# Hi');
    // Live: no auto switch; the Preview tab gets a dot when it changes.
    await vi.waitFor(() =>
      expect(
        screen.getByRole('tab', { name: /^Preview, updated/ }),
      ).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('tab', { name: /^Preview/ }));
    expect(screen.queryByRole('textbox', { name: 'Markdown' })).toBeNull();
    expect(frame().closest('[role="tabpanel"]')?.hasAttribute('hidden')).toBe(
      false,
    );
    fireEvent.click(screen.getByRole('tab', { name: /^Edit/ }));
  });

  it('the outline moves the shown preview to the heading', async () => {
    render(<MarkdownEditor definition={definition} />);
    fireEvent.click(screen.getByRole('tab', { name: /^Edit/ }));
    type('# One\n\ntext\n\n## Two');
    await vi.waitFor(() => expect(srcdoc()).toContain('id="two"'));
    fireEvent.click(screen.getByRole('tab', { name: /^Preview/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Outline' }));
    fireEvent.click(screen.getByRole('button', { name: 'Two' }));
    expect(srcdoc()).toContain('[id="two"]{scroll-initial-target:nearest}');
    fireEvent.click(screen.getByRole('tab', { name: /^Edit/ }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Load sample' }));
    expect(editor().value).toContain('# Project notes');
    await vi.waitFor(() => expect(srcdoc()).toContain('<table'), {
      timeout: 5000,
    });
  });
});
