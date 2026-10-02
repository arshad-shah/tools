/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CopyButton } from './copy-button';

const writeText = vi.fn<(t: string) => Promise<void>>();
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText },
  configurable: true,
});
afterEach(() => writeText.mockReset());

describe('CopyButton', () => {
  it('copies the value and swaps to a Copied state', async () => {
    writeText.mockResolvedValue();
    render(<CopyButton label="hex" value="#ff0000" />);
    const b = screen.getByRole('button', { name: 'Copy hex' });
    await act(async () => fireEvent.click(b));
    expect(writeText).toHaveBeenCalledWith('#ff0000');
    expect(screen.getByRole('button', { name: 'Copied hex' })).toBeTruthy();
  });

  it('reads a lazy value at click time', async () => {
    writeText.mockResolvedValue();
    const get = vi.fn(() => 'later');
    render(<CopyButton label="text" value={get} />);
    expect(get).not.toHaveBeenCalled();
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Copy text' })),
    );
    expect(writeText).toHaveBeenCalledWith('later');
  });

  it('is disabled with nothing to copy', () => {
    render(<CopyButton label="hex" value="" />);
    expect(
      (screen.getByRole('button', { name: 'Copy hex' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('the text variant shows Copy and Copied as words', async () => {
    writeText.mockResolvedValue();
    render(<CopyButton variant="text" label="runs" value="a" />);
    const b = screen.getByRole('button', { name: 'Copy runs' });
    expect(b.textContent).toContain('Copy runs');
    await act(async () => fireEvent.click(b));
    expect(
      screen.getByRole('button', { name: 'Copied runs' }).textContent,
    ).toContain('Copied');
  });
});
