/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Transferred } from '@/shared/lib/worker-rpc';
import { textHandlers } from '@/shared/workers/handlers';
import TextEncrypt from './Tool';

// The worker runs in-process (PBKDF2 at the real 600,000 iterations).
vi.mock('@/shared/workers/text-client', () => ({
  createTextWorker: () => ({
    call: async (
      method: string,
      args: unknown[],
      opts: { signal?: AbortSignal } = {},
    ) => {
      const fn = (textHandlers as Record<string, (...a: unknown[]) => unknown>)[
        method
      ];
      const out = await fn(
        {
          signal: opts.signal ?? new AbortController().signal,
          progress: () => {},
        },
        ...args,
      );
      return out instanceof Transferred ? out.value : out;
    },
    terminate: () => {},
  }),
}));
beforeEach(() => localStorage.clear());

/** The panes remember the last one shown, so each test starts on Input. */
const showPane = (name: 'Input' | 'Output') =>
  fireEvent.click(screen.getByRole('tab', { name }));
const renderTool = () => {
  const r = render(
    <MemoryRouter>
      <TextEncrypt />
    </MemoryRouter>,
  );
  showPane('Input');
  return r;
};
const pass = ['amber', 'quartz', 'river'].join(' ');
const box = (name: string) =>
  screen.getByRole('textbox', { name }) as HTMLTextAreaElement;

async function encrypt(text: string) {
  fireEvent.change(box('Message'), { target: { value: text } });
  fireEvent.change(screen.getByLabelText('Passphrase'), {
    target: { value: pass },
  });
  fireEvent.change(screen.getByLabelText('Confirm passphrase'), {
    target: { value: pass },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Encrypt' }));
  await waitFor(
    () =>
      expect(box('Encrypted message').value).toMatch(/BEGIN TOOLS ENCRYPTED/),
    { timeout: 10_000 },
  );
  return box('Encrypted message').value;
}

describe('TextEncrypt', () => {
  it('round-trips and reports a wrong passphrase', async () => {
    renderTool();
    const armoured = await encrypt('meet at noon');
    // Encrypt showed the Output pane (R41); the next input goes in Input.
    expect(
      screen.getByRole('tab', { name: 'Output' }).getAttribute('aria-selected'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'Decrypt' }));
    showPane('Input');
    fireEvent.change(box('Encrypted message'), { target: { value: armoured } });
    fireEvent.change(screen.getByLabelText('Passphrase'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Decrypt' }));
    expect(
      await screen.findByText(
        'Wrong passphrase, or the data was changed',
        {},
        { timeout: 10_000 },
      ),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Passphrase'), {
      target: { value: pass },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Decrypt' }));
    await waitFor(
      () => expect(box('Decrypted message').value).toBe('meet at noon'),
      { timeout: 10_000 },
    );
  }, 30_000);

  it('a mismatched confirmation blocks encrypt', () => {
    renderTool();
    fireEvent.change(box('Message'), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText('Passphrase'), {
      target: { value: pass },
    });
    fireEvent.change(screen.getByLabelText('Confirm passphrase'), {
      target: { value: 'other' },
    });
    expect(screen.getByText('The passphrases do not match')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Encrypt' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
