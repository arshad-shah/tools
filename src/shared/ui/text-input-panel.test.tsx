/** @vitest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { putHandoff } from '@/shared/lib/handoff';
import { hotkeyLabel } from '@/shared/lib/hotkeys';
import { TextInputPanel, type TextInputPanelProps } from './text-input-panel';

const notify = vi.hoisted(() => ({
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/shared/lib/notify', () => ({ notify }));

function Panel({
  initial = '',
  onValue,
  ...rest
}: Partial<TextInputPanelProps> & {
  initial?: string;
  onValue?: (v: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <TextInputPanel
      label="Input"
      language="json"
      {...rest}
      value={value}
      onChange={(v) => {
        setValue(v);
        onValue?.(v);
      }}
    />
  );
}

const group = () => screen.getByRole('group', { name: 'Input' });
const editor = () =>
  screen.getByRole('textbox', { name: 'Input' }) as HTMLTextAreaElement;
const drop = (file: File) =>
  fireEvent.drop(group(), {
    dataTransfer: { types: ['Files'], files: [file] },
  });

beforeEach(() => {
  notify.info.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TextInputPanel', () => {
  it('is a labelled group whose toolbar buttons have names and tooltips', () => {
    render(<Panel downloadName="input.json" />);
    expect(group()).toBeTruthy();
    const open = screen.getByRole('button', { name: 'Open file' });
    const tip = document.getElementById(open.getAttribute('aria-describedby')!);
    expect(tip?.textContent).toContain('Open file');
    expect(tip?.textContent).toContain(hotkeyLabel('Mod+O'));
    for (const name of ['Paste', 'Clear', 'Download'])
      expect(screen.getByRole('button', { name })).toBeTruthy();
  });

  it('Paste reads the clipboard; a blocked read shows an inline notice', async () => {
    const readText = vi.fn().mockResolvedValue('{"a":1}');
    vi.stubGlobal('navigator', { ...navigator, clipboard: { readText } });
    const onValue = vi.fn();
    render(<Panel onValue={onValue} />);
    fireEvent.click(screen.getByRole('button', { name: 'Paste' }));
    await waitFor(() => expect(onValue).toHaveBeenCalledWith('{"a":1}'));

    readText.mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    fireEvent.click(screen.getByRole('button', { name: 'Paste' }));
    expect(
      await screen.findByText(
        `Clipboard access was blocked; press ${hotkeyLabel('Mod+V')} in the editor instead`,
      ),
    ).toBeTruthy();
  });

  it('a dropped .json file fills the panel; a binary file is refused', async () => {
    const onValue = vi.fn();
    const onError = vi.fn();
    render(<Panel onValue={onValue} onError={onError} />);
    drop(new File(['{"b":2}'], 'data.json', { type: 'application/json' }));
    await waitFor(() => expect(onValue).toHaveBeenCalledWith('{"b":2}'));

    drop(new File([new Uint8Array([0x7b, 0x00, 0x7d])], 'blob.bin'));
    const alert = await screen.findByText(/This looks like a binary file/);
    expect(
      alert.closest('[data-error-code]')?.getAttribute('data-error-code'),
    ).toBe('INVALID_FILE');
    expect(onError.mock.calls[0][0].code).toBe('INVALID_FILE');
    expect(onValue).toHaveBeenCalledTimes(1);
  });

  it('one sample loads directly; several open a menu', () => {
    const onValue = vi.fn();
    const { unmount } = render(
      <Panel onValue={onValue} samples={[{ label: 'Small', value: '[1]' }]} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Load sample' }));
    expect(onValue).toHaveBeenLastCalledWith('[1]');
    unmount();

    render(
      <Panel
        onValue={onValue}
        samples={[
          { label: 'Small', value: '[1]' },
          { label: 'Nested', value: '{"a":{"b":1}}' },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Load a sample' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Nested' }));
    expect(onValue).toHaveBeenLastCalledWith('{"a":{"b":1}}');
  });

  it('Clear empties the text and its toast action Undo restores it', () => {
    const onValue = vi.fn();
    render(<Panel initial="keep me" onValue={onValue} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onValue).toHaveBeenLastCalledWith('');
    const [, opts] = notify.info.mock.calls[0];
    expect(opts.action.label).toBe('Undo');
    act(() => opts.action.onClick());
    expect(onValue).toHaveBeenLastCalledWith('keep me');
    expect(editor().value).toBe('keep me');
  });

  it('the status line counts characters, lines and UTF-8 bytes', () => {
    render(<Panel initial={'é€€\nb\nc'} />);
    const status = document.querySelector('[data-status-line]')!;
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toContain('7 characters');
    expect(status.textContent).toContain('3 lines');
    expect(status.textContent).toContain('12 bytes');
  });

  it('warns over warnBytes and refuses input over maxBytes', () => {
    const onValue = vi.fn();
    render(
      <Panel
        initial="0123456789ab"
        warnBytes={10}
        maxBytes={20}
        onValue={onValue}
      />,
    );
    expect(screen.getByText('Large input')).toBeTruthy();
    fireEvent.change(editor(), { target: { value: 'x'.repeat(21) } });
    expect(onValue).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe(
      'The text is larger than the 20 B limit',
    );
  });

  it('fills from a matching hand-off once', async () => {
    const id = putHandoff({
      kind: 'text',
      mime: 'application/json',
      text: '{"from":"elsewhere"}',
      sourceTool: 'other-tool',
    });
    window.history.replaceState(null, '', `/?handoff=${id}`);
    const onValue = vi.fn();
    const { rerender } = render(
      <Panel onValue={onValue} handoff={(p) => p.kind === 'text'} />,
    );
    await waitFor(() =>
      expect(onValue).toHaveBeenCalledWith('{"from":"elsewhere"}'),
    );
    rerender(<Panel onValue={onValue} handoff={(p) => p.kind === 'text'} />);
    expect(onValue).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe('');
  });

  it('decodes windows-1252 files: byte 0x80 is the euro sign', async () => {
    const onValue = vi.fn();
    render(
      <Panel onValue={onValue} encodingOptions={['utf-8', 'windows-1252']} />,
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Encoding' }), {
      target: { value: 'windows-1252' },
    });
    drop(new File([new Uint8Array([0x80])], 'price.txt'));
    await waitFor(() => expect(onValue).toHaveBeenCalled());
    expect(onValue.mock.calls[0][0].codePointAt(0)).toBe(0x20ac);
  });

  it('read-only panes offer Copy and Download, not Paste', () => {
    render(<Panel initial="out" readOnly downloadName="out.txt" />);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Paste' })).toBeNull();
  });
});
