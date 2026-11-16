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
import { editorValue, setEditorValue } from '@/shared/editor/testing';

const renderTool = () =>
  render(
    <MemoryRouter>
      <RegexTester />
    </MemoryRouter>,
  );
const textbox = (name: string) => screen.getByRole('textbox', { name });
/** The result modes are a segmented control (radios). */
const mode = (name: string) =>
  fireEvent.click(screen.getByRole('radio', { name }));

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

    expect(editorValue(textbox('Regex pattern'))).toBe('(\\d+)');
    expect(editorValue(textbox('Test string'))).toBe('a1 b22');
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: 'Ignore case (i)' })
          .getAttribute('aria-pressed'),
      ).toBe('true'),
    );
    expect(
      (screen.getByRole('radio', { name: 'Replace' }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    await waitFor(() =>
      expect(document.body.textContent).toContain('a<1> b<22>'),
    );
    expect(shareState.select?.()).toEqual(shared);
    expect(regexSettings.getSettings()).toMatchObject({
      flags: 'gi',
      mode: 'replace',
    });
  });

  it('shows the test text beside the results; flags toggle without primary', async () => {
    renderTool();
    setEditorValue(textbox('Test string'), 'a1 b2');
    setEditorValue(textbox('Regex pattern'), '\\d');
    mode('Match');
    expect(await screen.findAllByText('2 matches')).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Copy match 1' })).toBeTruthy();
    const flag = screen.getByRole('button', { name: 'Global (g)' });
    expect(flag.getAttribute('aria-pressed')).toBe('true');
    expect(flag.className).not.toMatch(/bg-accent(\s|$)/);
    expect(
      screen.getByRole('button', { name: 'Copy regex with flags' }),
    ).toBeTruthy();
  });

  it('shows pass and fail for each test case with a summary', async () => {
    renderTool();
    mode('Tests');
    setEditorValue(textbox('Regex pattern'), '^\\d+$');
    setEditorValue(textbox('Should match'), '123\nabc');
    setEditorValue(textbox('Should not match'), 'xyz\n456');

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
