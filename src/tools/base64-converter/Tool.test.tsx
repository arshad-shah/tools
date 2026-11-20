/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import Base64Converter from './Tool';

beforeEach(() => localStorage.clear());

/** Renders the tool in Encode mode (the mode is a remembered setting). */
const renderTool = () => {
  render(
    <MemoryRouter>
      <Base64Converter />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('radio', { name: 'Encode' }));
};
const box = (name: string) =>
  screen.getByRole('textbox', { name }) as HTMLTextAreaElement;
const block = (name: string) => screen.getByRole('figure', { name });

describe('Base64 Converter', () => {
  it('starts empty and encodes the example on request', () => {
    renderTool();
    expect(
      screen.getByRole('heading', { name: 'Nothing to encode yet' }),
    ).toBeTruthy();
    // One example button (by the input), and no Swap while there is no output.
    expect(screen.queryByRole('button', { name: 'Swap' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try an example' }));
    expect(block('Base64').textContent).toContain('SGVsbG8s');
    expect(screen.queryByRole('button', { name: 'Try an example' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Swap' })).toBeTruthy();
  });

  it('encodes text beside the input, with copy and download', () => {
    renderTool();
    fireEvent.change(box('Text to encode'), { target: { value: 'hello' } });
    const result = block('Base64');
    expect(result.textContent).toContain('aGVsbG8=');
    expect(
      within(result).getByRole('button', { name: 'Copy Base64' }),
    ).toBeTruthy();
    expect(
      within(result).getByRole('button', { name: 'Download Base64' }),
    ).toBeTruthy();
  });

  it('URL-safe drops the padding', () => {
    renderTool();
    fireEvent.click(screen.getByRole('switch', { name: 'URL-safe' }));
    fireEvent.change(box('Text to encode'), { target: { value: 'a' } });
    expect(block('Base64').textContent).toContain('YQ');
    expect(block('Base64').textContent).not.toContain('YQ==');
    // Settings are remembered: put URL-safe (and padding) back.
    fireEvent.click(screen.getByRole('switch', { name: 'URL-safe' }));
    expect(block('Base64').textContent).toContain('YQ==');
  });

  it('a decode failure is a danger notice in the output', () => {
    renderTool();
    fireEvent.click(screen.getByRole('radio', { name: 'Decode' }));
    fireEvent.change(box('Base64 to decode'), { target: { value: '@@@' } });
    // Open file's FileDrop keeps its own (empty) alert region for rejections.
    const alerts = screen.getAllByRole('alert').map((a) => a.textContent);
    expect(
      alerts.some((t) => t?.includes('Could not decode this Base64')),
    ).toBe(true);
  });

  it('swap moves the output to the input and flips the mode', () => {
    renderTool();
    fireEvent.change(box('Text to encode'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Swap' }));
    expect(box('Base64 to decode').value).toBe('aGVsbG8=');
    expect(block('Decoded text').textContent).toContain('hello');
  });
});
