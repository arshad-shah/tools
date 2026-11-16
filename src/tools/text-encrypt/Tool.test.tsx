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

const renderTool = () =>
  render(
    <MemoryRouter>
      <TextEncrypt />
    </MemoryRouter>,
  );
/** A result CodeBlock's code. */
const block = (name: string) =>
  screen.getByRole('figure', { name }).querySelector('pre, code')?.textContent;
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
    () => expect(block('Encrypted message')).toMatch(/BEGIN TOOLS ENCRYPTED/),
    { timeout: 10_000 },
  );
  return block('Encrypted message')!;
}

describe('TextEncrypt', () => {
  it('round-trips and reports a wrong passphrase', async () => {
    renderTool();
    const armoured = await encrypt('meet at noon');
    fireEvent.click(screen.getByRole('radio', { name: 'Decrypt' }));
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
      () => expect(block('Decrypted message')).toBe('meet at noon'),
      { timeout: 10_000 },
    );
  }, 30_000);

  it('starts with an empty result that says what to do', () => {
    renderTool();
    expect(
      screen.getByRole('heading', { name: 'Nothing encrypted yet' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'File' }));
    expect(screen.getByRole('heading', { name: 'No file yet' })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Text' }));
  });

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
      screen.getByRole('meter', { name: 'Passphrase strength' }),
    ).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Encrypt' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
