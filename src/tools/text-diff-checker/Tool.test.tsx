/** @vitest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installChartStubs } from '@/shared/ui/chart/test-utils';
import { textHandlers } from '@/shared/workers/handlers';
import { putHandoff } from '@/shared/lib/handoff';
import { diffPairPayload } from './lib/handoff';
import TextDiff from './Tool';

vi.mock('@/shared/workers/text-client', () => ({
  createTextWorker: () => ({
    call: (method: keyof typeof textHandlers, args: unknown[]) => {
      const fn = textHandlers[method] as (...a: unknown[]) => unknown;
      return Promise.resolve(
        fn({ signal: new AbortController().signal, progress() {} }, ...args),
      );
    },
    terminate() {},
  }),
}));

beforeEach(() => {
  localStorage.clear();
  installChartStubs();
  window.history.replaceState(null, '', '/text/diff');
});

const many = (changes: number[]) =>
  Array.from({ length: 60 }, (_, i) =>
    changes.includes(i + 1) ? `changed ${i + 1}` : `line ${i + 1}`,
  ).join('\n');

describe('Text Diff', () => {
  it('moves between changes with n and p', async () => {
    const left = many([]);
    const right = many([10, 30, 50]);
    putHandoffAndOpen(left, right);
    render(<TextDiff />);
    await screen.findByText('0 added, 0 removed, 3 changed');
    expect(screen.getByText('- of 3')).toBeTruthy();
    press('n');
    expect(await screen.findByText('1 of 3')).toBeTruthy();
    press('n');
    expect(await screen.findByText('2 of 3')).toBeTruthy();
    press('p');
    expect(await screen.findByText('1 of 3')).toBeTruthy();
  });

  it('fills both sides from a pair hand-off', async () => {
    putHandoffAndOpen('alpha', 'beta');
    render(<TextDiff />);
    await waitFor(() =>
      expect(screen.getByText('0 added, 0 removed, 1 changed')).toBeTruthy(),
    );
    expect(
      (
        screen.getByRole('textbox', {
          name: 'Original text',
        }) as HTMLTextAreaElement
      ).value,
    ).toBe('alpha');
    expect(
      (
        screen.getByRole('textbox', {
          name: 'Changed text',
        }) as HTMLTextAreaElement
      ).value,
    ).toBe('beta');
  });
});

function putHandoffAndOpen(left: string, right: string) {
  const id = putHandoff(diffPairPayload({ left, right }, 'test'));
  act(() => window.history.replaceState(null, '', `/text/diff?handoff=${id}`));
}

function press(key: string) {
  fireEvent.keyDown(document.body, { key });
}
