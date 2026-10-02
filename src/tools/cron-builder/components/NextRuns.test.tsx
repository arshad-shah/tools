/** @vitest-environment jsdom */
import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseCron } from '../lib/parse';
import { NextRuns } from './NextRuns';

const noop = () => {};
const first = () =>
  within(screen.getByRole('list', { name: 'Next runs' })).getAllByRole(
    'listitem',
  )[0].textContent;

describe('NextRuns', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(new Date('2026-03-02T12:00:30Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('lists from now and refreshes on the next minute tick (P6-F)', () => {
    render(
      <NextRuns
        ast={parseCron('* * * * *', 'unix')}
        zone="UTC"
        onZone={noop}
        count={10}
        onCount={noop}
      />,
    );
    expect(first()).toMatch(/^2026-03-02T12:01:00/);
    // 30 s later the minute turns: the list moves on without a reload.
    act(() => vi.advanceTimersByTime(30_000));
    expect(first()).toMatch(/^2026-03-02T12:02:00/);
    act(() => vi.advanceTimersByTime(60_000));
    expect(first()).toMatch(/^2026-03-02T12:03:00/);
  });
});
