/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { KeyValueEditor } from './key-value-editor';
import type { KeyValueEditorProps } from './key-value-editor';
import type { KeyValueRow } from './key-value-bulk';

/** The rows from the most recent onChange. */
const state: { latest: KeyValueRow[] } = { latest: [] };

function Harness({
  initial,
  ...props
}: { initial: KeyValueRow[] } & Partial<KeyValueEditorProps>) {
  const [rows, setRows] = useState(initial);
  return (
    <KeyValueEditor
      ariaLabel="Headers"
      {...props}
      rows={rows}
      onChange={(next) => {
        state.latest = next;
        setRows(next);
      }}
    />
  );
}

const headers = (): KeyValueRow[] => [
  { id: 'a', enabled: true, key: 'Accept', value: 'application/json' },
  { id: 'b', enabled: true, key: 'Host', value: 'example.com' },
  { id: 'c', enabled: false, key: 'X-Trace', value: 'off' },
];

const bodyRows = () =>
  within(screen.getByRole('table', { name: 'Headers' }))
    .getAllByRole('row')
    .slice(1);

describe('KeyValueEditor', () => {
  it('adds a row, edits it, toggles it and deletes it', () => {
    render(<Harness initial={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
    expect(state.latest).toHaveLength(1);
    expect(state.latest[0]).toMatchObject({
      enabled: true,
      key: '',
      value: '',
    });
    const key = screen.getByRole('textbox', { name: 'Key, row 1' });
    expect(document.activeElement).toBe(key);

    fireEvent.change(key, { target: { value: 'Accept' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Value, row 1' }), {
      target: { value: 'text/html' },
    });
    expect(state.latest[0]).toMatchObject({
      key: 'Accept',
      value: 'text/html',
    });

    const toggle = screen.getByRole('checkbox', { name: 'Enable Accept' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    expect(state.latest[0].enabled).toBe(false);
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Remove Accept' }));
    expect(state.latest).toEqual([]);
  });

  it('uses the custom column labels', () => {
    render(
      <Harness initial={headers()} keyLabel="Name" valueLabel="Content" />,
    );
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeTruthy();
    expect(
      screen.getByRole('textbox', { name: 'Content, row 2' }),
    ).toBeTruthy();
  });

  it('Alt+ArrowDown moves the focused row and announces the move', () => {
    render(<Harness initial={headers()} />);
    const first = bodyRows()[0];
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown', altKey: true });
    expect(state.latest.map((r) => r.id)).toEqual(['b', 'a', 'c']);
    expect(screen.getByRole('status').textContent).toMatch(
      /^Moved Accept to position 2/,
    );
    expect(document.activeElement).toBe(bodyRows()[1]);
    fireEvent.keyDown(bodyRows()[1], { key: 'ArrowUp', altKey: true });
    expect(state.latest.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('Alt+Arrow inside a nested input never reorders', () => {
    const onChange = vi.fn();
    render(
      <KeyValueEditor
        rows={headers()}
        onChange={onChange}
        ariaLabel="Headers"
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Key, row 1' });
    const event = fireEvent.keyDown(input, { key: 'ArrowDown', altKey: true });
    expect(onChange).not.toHaveBeenCalled();
    expect(event).toBe(false);
  });

  it('allows duplicate keys', () => {
    render(<Harness initial={headers().slice(0, 1)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Key, row 2' }), {
      target: { value: 'Accept' },
    });
    expect(state.latest.map((r) => r.key)).toEqual(['Accept', 'Accept']);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('bulk edit round-trips and keeps disabled rows', () => {
    render(<Harness initial={headers()} />);
    const toggle = screen.getByRole('button', { name: 'Bulk edit' });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    const text = screen.getByRole('textbox', {
      name: 'Headers, one key: value per line',
    }) as HTMLTextAreaElement;
    expect(text.value).toBe(
      'Accept: application/json\nHost: example.com\n# X-Trace: off',
    );
    fireEvent.change(text, {
      target: { value: `${text.value}\n# Accept: text/plain` },
    });
    expect(state.latest).toHaveLength(4);
    expect(state.latest[3]).toMatchObject({
      enabled: false,
      key: 'Accept',
      value: 'text/plain',
    });
    fireEvent.click(toggle);
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
    expect(
      screen
        .getAllByRole('checkbox', { name: 'Enable Accept' })[1]
        .getAttribute('aria-checked'),
    ).toBe('false');
    expect(state.latest.slice(0, 3)).toEqual(headers());
  });

  it('hides the bulk edit toggle when bulkEdit is false', () => {
    render(<Harness initial={headers()} bulkEdit={false} />);
    expect(screen.queryByRole('button', { name: 'Bulk edit' })).toBeNull();
  });

  it('the file type shows a file picker and stores the File', () => {
    const { container } = render(
      <Harness
        initial={[{ id: 'f', enabled: true, key: 'avatar', value: '' }]}
        allowFiles
      />,
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Type of avatar' }), {
      target: { value: 'file' },
    });
    expect(state.latest[0].type).toBe('file');
    expect(screen.queryByRole('textbox', { name: 'Value, row 1' })).toBeNull();
    const input = container.querySelector(
      'input[type=file]',
    ) as HTMLInputElement;
    const click = vi.spyOn(input, 'click');
    fireEvent.click(
      screen.getByRole('button', { name: 'Choose file for avatar' }),
    );
    expect(click).toHaveBeenCalled();
    const file = new File(['x'], 'me.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(state.latest[0].file).toBe(file);
    expect(screen.getByText('me.png')).toBeTruthy();
  });

  it('a secret value is masked until revealed', () => {
    const secret = ['demo', 'value'].join('-');
    const { container } = render(
      <Harness
        initial={[
          {
            id: 's',
            enabled: true,
            key: 'token',
            value: secret,
            type: 'secret',
          },
        ]}
        allowSecret
      />,
    );
    const field = container.querySelector(
      'input[aria-label="Value, row 1"]',
    ) as HTMLInputElement;
    expect(field.type).toBe('password');
    const reveal = screen.getByRole('button', { name: 'Reveal token' });
    fireEvent.click(reveal);
    expect(field.type).toBe('text');
    expect(reveal.getAttribute('aria-pressed')).toBe('true');
  });

  it('offers no type picker without allowFiles or allowSecret', () => {
    render(<Harness initial={headers()} />);
    expect(screen.queryByRole('combobox')).toBeNull();
  });
});
