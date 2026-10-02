/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findMatches } from './lib/match';
import { replaceText, splitText } from './lib/replace';
import { evaluateTestCases } from './lib/test-cases';
import type { RegexShare } from './share';

const shareState = vi.hoisted(() => ({
  loaded: null as unknown,
  select: null as null | (() => unknown),
}));
vi.mock('@/shared/lib/use-shareable-state', () => ({
  useShareableState: (opts: { select: () => unknown }) => {
    shareState.select = opts.select;
    return {
      share: () => Promise.resolve('link'),
      canShare: true,
      loaded: shareState.loaded,
    };
  },
}));

// The worker is replaced by the same pure functions it runs.
vi.mock('./hooks/useRegexRunner', () => ({
  useRegexRunner: () => ({
    match: (p: string, f: string, t: string) =>
      Promise.resolve(findMatches(p, f, t)),
    replace: (p: string, f: string, t: string, r: string) =>
      Promise.resolve(replaceText(p, f, t, r)),
    split: (p: string, f: string, t: string) =>
      Promise.resolve(splitText(p, f, t)),
    tests: (p: string, f: string, c: Parameters<typeof evaluateTestCases>[2]) =>
      Promise.resolve(evaluateTestCases(p, f, c)),
    dispose: () => {},
  }),
}));

import RegexTester from './Tool';
import { regexSettings } from './settings';

const renderTool = () =>
  render(
    <MemoryRouter>
      <RegexTester />
    </MemoryRouter>,
  );
const textbox = (name: string) =>
  screen.getByRole('textbox', { name }) as HTMLTextAreaElement;

describe('RegexTester', () => {
  beforeEach(() => {
    shareState.loaded = null;
    localStorage.clear();
  });

  it('hydrates pattern, flags, text and mode from a share link and shares the same state', async () => {
    const shared: RegexShare = {
      v: 1,
      pattern: '(\\d+)',
      flags: 'gi',
      text: 'a1 b22',
      replacement: '<$1>',
      mode: 'replace',
      cases: [{ text: '7', expect: 'match' }],
    };
    shareState.loaded = shared;
    renderTool();

    expect(textbox('Regex pattern').value).toBe('(\\d+)');
    expect(textbox('Test string').value).toBe('a1 b22');
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: 'Ignore case (i)' })
          .getAttribute('aria-pressed'),
      ).toBe('true'),
    );
    expect(
      screen
        .getByRole('tab', { name: 'Replace' })
        .getAttribute('aria-selected'),
    ).toBe('true');
    await waitFor(() =>
      expect(textbox('Replace result').value).toBe('a<1> b<22>'),
    );
    expect(shareState.select?.()).toEqual(shared);
    expect(regexSettings.getSettings()).toMatchObject({
      flags: 'gi',
      mode: 'replace',
    });
  });

  it('shows pass and fail for each test case with a summary', async () => {
    renderTool();
    fireEvent.click(screen.getByRole('tab', { name: 'Tests' }));
    fireEvent.change(textbox('Regex pattern'), {
      target: { value: '^\\d+$' },
    });
    fireEvent.change(textbox('Should match'), {
      target: { value: '123\nabc' },
    });
    fireEvent.change(textbox('Should not match'), {
      target: { value: 'xyz\n456' },
    });

    expect(await screen.findByText('2 of 4 passing')).toBeTruthy();
    const results = screen.getByRole('list', { name: 'Test results' });
    const rows = [...results.querySelectorAll('li')].map(
      (li) => li.textContent,
    );
    expect(rows).toEqual([
      expect.stringMatching(/^Pass123should match$/),
      expect.stringMatching(/^Failabcshould match, but did not match$/),
      expect.stringMatching(/^Passxyzshould not match$/),
      expect.stringMatching(/^Fail456should not match, but matched$/),
    ]);
  });
});
