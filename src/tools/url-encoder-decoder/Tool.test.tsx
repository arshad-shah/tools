/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import TextEncoderTool from './Tool';

beforeEach(() => localStorage.clear());

/** Renders the tool in Encode (the direction is a remembered setting). */
const renderTool = () => {
  render(
    <MemoryRouter>
      <TextEncoderTool />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('radio', { name: 'Encode' }));
};
const box = (name: string) =>
  screen.getByRole('textbox', { name }) as HTMLTextAreaElement;
const block = (name: string) =>
  screen.getByRole('figure', { name }).querySelector('pre, code')!.textContent;

describe('Text Encoder', () => {
  it('starts empty and offers an example', () => {
    renderTool();
    expect(
      screen.getByRole('heading', { name: 'Nothing to encode yet' }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Try an example' })[0]!,
    );
    expect(block('Encoded')).toContain('Caf%C3%A9');
  });

  it('encodes live beside the input', () => {
    renderTool();
    fireEvent.change(box('Text to encode'), { target: { value: 'a b' } });
    expect(block('Encoded')).toBe('a%20b');
  });

  it('swap flips the mode and decodes back to the original', () => {
    renderTool();
    fireEvent.change(box('Text to encode'), { target: { value: 'a b' } });
    fireEvent.click(screen.getByRole('button', { name: 'Swap' }));
    expect(box('Text to decode').value).toBe('a%20b');
    expect(block('Decoded')).toBe('a b');
  });

  it('encodes each line separately', () => {
    renderTool();
    fireEvent.click(
      screen.getByRole('switch', { name: 'Each line separately' }),
    );
    fireEvent.change(box('Text to encode'), { target: { value: 'a b\nc d' } });
    expect(block('Encoded')).toBe('a%20b\nc%20d');
    fireEvent.click(
      screen.getByRole('switch', { name: 'Each line separately' }),
    );
  });

  it('names the position of a decode error and decodes until stable', () => {
    renderTool();
    fireEvent.click(screen.getByRole('radio', { name: 'Decode' }));
    fireEvent.change(box('Text to decode'), { target: { value: 'ab%E2%82' } });
    expect(
      screen.getAllByRole('alert').map((a) => a.textContent),
    ).toContainEqual(expect.stringMatching(/position 3/));
    fireEvent.change(box('Text to decode'), { target: { value: '%2541' } });
    expect(block('Decoded')).toBe('%41');
    fireEvent.click(
      screen.getByRole('button', { name: 'Decode until stable' }),
    );
    expect(screen.getByText('Decoded in 2 rounds')).toBeTruthy();
    expect(block('Decoded')).toBe('A');
  });
});
