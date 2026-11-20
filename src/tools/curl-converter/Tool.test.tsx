/** @vitest-environment jsdom */
import { Toaster } from '@arshad-shah/cynosure';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HANDOFF_PARAM, putHandoff } from '@/shared/lib/handoff';
import { editorValue, setEditorValue } from '@/shared/editor/testing';
import CurlConverter from './Tool';

beforeEach(() => localStorage.clear());
afterEach(() => window.history.replaceState(null, '', '/'));

const renderTool = (search = '') =>
  render(
    <MemoryRouter initialEntries={[`/web/curl${search}`]}>
      <Toaster>
        <CurlConverter />
      </Toaster>
    </MemoryRouter>,
  );

describe('CurlConverter', () => {
  it('starts empty, converts the example and lists ignored options', async () => {
    renderTool();
    expect(
      screen.getByRole('heading', { name: 'No command yet' }),
    ).toBeTruthy();
    // Nothing to send yet, and the example is offered once (empty state).
    expect(
      screen.queryByRole('button', { name: 'Send to HTTP Client' }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try an example' }));
    expect(await screen.findByText(/1 option not converted/)).toBeTruthy();
    expect(screen.getByText('-s')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Copy the JavaScript fetch code' }),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole('button', {
          name: 'Send to HTTP Client',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });

  it('takes a curl hand-off and goes to the Build form and back', async () => {
    const id = putHandoff({
      kind: 'text',
      mime: 'application/x-curl',
      text: "curl -X DELETE https://x.test/items/1 -H 'A: 1'",
      sourceTool: 'test',
    });
    await act(async () => {
      renderTool(`?${HANDOFF_PARAM}=${id}`);
    });
    expect(await screen.findByText('DELETE')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Build' }));
    const url = screen.getByRole('textbox', {
      name: 'URL',
    }) as HTMLInputElement;
    expect(url.value).toBe('https://x.test/items/1');
    fireEvent.change(url, { target: { value: 'https://x.test/items/2' } });
    fireEvent.click(screen.getByRole('radio', { name: 'curl command' }));
    const editor = screen.getByRole('textbox', { name: 'curl command' });
    expect(editorValue(editor)).toBe(
      "curl -X DELETE https://x.test/items/2 \\\n  -H 'A: 1'",
    );
  });

  it('shows why a command cannot be converted, and converts a fixed one', () => {
    renderTool();
    const editor = screen.getByRole('textbox', { name: 'curl command' });
    setEditorValue(editor, 'wget https://x.test');
    expect(screen.getByText(/This is not a curl command/)).toBeTruthy();
    setEditorValue(editor, "curl -F 'a=@f.png' https://x.test --frobnicate");
    expect(screen.getByText('--frobnicate')).toBeTruthy();
    fireEvent.click(screen.getByRole('combobox', { name: 'Convert to' }));
    fireEvent.click(screen.getByRole('option', { name: 'Python requests' }));
    expect(screen.getByText(/open\('f.png', 'rb'\)/)).toBeTruthy();
  });
});
