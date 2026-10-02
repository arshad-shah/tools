/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import Base64Converter from './Tool';

beforeEach(() => localStorage.clear());

const renderTool = () =>
  render(
    <MemoryRouter>
      <Base64Converter />
    </MemoryRouter>,
  );
const box = (name: string) =>
  screen.getByRole('textbox', { name }) as HTMLTextAreaElement;
const tab = (name: string) =>
  fireEvent.click(screen.getByRole('tab', { name: new RegExp(`^${name}`) }));

describe('Base64 Converter', () => {
  it('shows Input and Output as tabs (R41)', () => {
    renderTool();
    tab('Input');
    fireEvent.change(box('Text to encode'), { target: { value: 'hello' } });
    expect(screen.queryByRole('textbox', { name: 'Result' })).toBeNull();
    tab('Output');
    expect(box('Result').value).toBe('aGVsbG8=');
    // Copy and Download sit on the read-only output panel.
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download' })).toBeTruthy();
  });

  it('options are SwitchFields above the tabs', () => {
    renderTool();
    tab('Input');
    fireEvent.click(screen.getByRole('switch', { name: 'URL-safe' }));
    fireEvent.change(box('Text to encode'), { target: { value: 'a' } });
    tab('Output');
    expect(box('Result').value).toBe('YQ');
    fireEvent.click(screen.getByRole('switch', { name: 'URL-safe' }));
  });

  it('a decode failure is an error state in the Output pane', () => {
    renderTool();
    tab('Input');
    fireEvent.click(screen.getByRole('radio', { name: 'Decode' }));
    fireEvent.change(box('Base64 to decode'), { target: { value: '@@@' } });
    tab('Output');
    expect(screen.getByRole('alert').textContent).toContain(
      'Could not decode this Base64',
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Encode' }));
  });
});
