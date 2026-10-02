/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import TextEncoderTool from './Tool';

beforeEach(() => localStorage.clear());

const renderTool = () =>
  render(
    <MemoryRouter>
      <TextEncoderTool />
    </MemoryRouter>,
  );
const box = (name: string) =>
  screen.getByRole('textbox', { name }) as HTMLTextAreaElement;

describe('Text Encoder', () => {
  it('swap flips the mode and decodes back to the original', () => {
    renderTool();
    fireEvent.change(box('Text to encode'), { target: { value: 'a b' } });
    expect(box('Output').value).toBe('a%20b');
    fireEvent.click(screen.getByRole('button', { name: 'Swap' }));
    expect(box('Text to decode').value).toBe('a%20b');
    expect(box('Output').value).toBe('a b');
    fireEvent.click(screen.getByRole('radio', { name: 'Encode' }));
  });

  it('encodes each line separately', () => {
    renderTool();
    fireEvent.click(
      screen.getByRole('switch', { name: 'Each line separately' }),
    );
    fireEvent.change(box('Text to encode'), { target: { value: 'a b\nc d' } });
    expect(box('Output').value).toBe('a%20b\nc%20d');
    fireEvent.click(
      screen.getByRole('switch', { name: 'Each line separately' }),
    );
  });

  it('shows the position of a decode error and decodes until stable', () => {
    renderTool();
    fireEvent.click(screen.getByRole('radio', { name: 'Decode' }));
    fireEvent.change(box('Text to decode'), { target: { value: 'ab%E2%82' } });
    expect(screen.getAllByText(/position 3/).length).toBeGreaterThan(0);
    fireEvent.change(box('Text to decode'), { target: { value: '%2541' } });
    fireEvent.click(
      screen.getByRole('button', { name: 'Decode until stable' }),
    );
    expect(screen.getByText('Decoded in 2 rounds')).toBeTruthy();
    expect(box('Output').value).toBe('A');
    fireEvent.click(screen.getByRole('radio', { name: 'Encode' }));
  });
});
