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
const tab = (name: string) =>
  fireEvent.click(screen.getByRole('tab', { name: new RegExp(`^${name}`) }));

describe('Text Encoder', () => {
  it('shows input and output as tabs, one at a time (R41)', () => {
    renderTool();
    tab('Input');
    fireEvent.change(box('Text to encode'), { target: { value: 'a b' } });
    expect(screen.queryByRole('textbox', { name: 'Output' })).toBeNull();
    // Live as you type: no auto switch, the Output tab shows a dot.
    expect(screen.getByRole('tab', { name: /^Output, updated/ })).toBeTruthy();
    tab('Output');
    expect(box('Output').value).toBe('a%20b');
    expect(
      screen.queryByRole('textbox', { name: 'Text to encode' }),
    ).toBeNull();
  });

  it('swap flips the mode and decodes back to the original', () => {
    renderTool();
    tab('Input');
    fireEvent.change(box('Text to encode'), { target: { value: 'a b' } });
    tab('Output');
    expect(box('Output').value).toBe('a%20b');
    fireEvent.click(screen.getByRole('button', { name: 'Swap' }));
    expect(box('Output').value).toBe('a b');
    tab('Input');
    expect(box('Text to decode').value).toBe('a%20b');
    fireEvent.click(screen.getByRole('radio', { name: 'Encode' }));
  });

  it('encodes each line separately', () => {
    renderTool();
    tab('Input');
    fireEvent.click(
      screen.getByRole('switch', { name: 'Each line separately' }),
    );
    fireEvent.change(box('Text to encode'), { target: { value: 'a b\nc d' } });
    tab('Output');
    expect(box('Output').value).toBe('a%20b\nc%20d');
    fireEvent.click(
      screen.getByRole('switch', { name: 'Each line separately' }),
    );
  });

  it('shows the position of a decode error and decodes until stable', () => {
    renderTool();
    tab('Input');
    fireEvent.click(screen.getByRole('radio', { name: 'Decode' }));
    fireEvent.change(box('Text to decode'), { target: { value: 'ab%E2%82' } });
    tab('Output');
    expect(screen.getByRole('alert').textContent).toMatch(/position 3/);
    tab('Input');
    fireEvent.change(box('Text to decode'), { target: { value: '%2541' } });
    // An explicit run switches to the output.
    fireEvent.click(
      screen.getByRole('button', { name: 'Decode until stable' }),
    );
    expect(screen.getByText('Decoded in 2 rounds')).toBeTruthy();
    expect(box('Output').value).toBe('A');
    fireEvent.click(screen.getByRole('radio', { name: 'Encode' }));
  });
});
