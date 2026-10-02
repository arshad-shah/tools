/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { announce } from './announce';

describe('announce', () => {
  it('writes into an assertive alert region', () => {
    vi.useFakeTimers();
    announce('That file is not a PDF', 'assertive');
    vi.advanceTimersByTime(100);
    const el = document.querySelector('[data-announcer="assertive"]')!;
    expect(el.getAttribute('aria-live')).toBe('assertive');
    expect(el.getAttribute('role')).toBe('alert');
    expect(el.textContent).toBe('That file is not a PDF');
    vi.useRealTimers();
  });
});
