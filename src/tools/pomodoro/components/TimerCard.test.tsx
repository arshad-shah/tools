/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The first test pays for a cold import of the whole card.
describe('TimerCard shortcuts', { timeout: 20_000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  const setup = async () => {
    const { TimerCard } = await import('./TimerCard');
    const { usePomodoroStore } = await import('../store');
    render(<TimerCard />);
    return usePomodoroStore;
  };

  it('Space starts and pauses without a task', async () => {
    const store = await setup();
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(store.getState().timer.isActive).toBe(true);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(store.getState().timer.isActive).toBe(false);
  });

  it('S skips without counting and R resets', async () => {
    const store = await setup();
    fireEvent.keyDown(window, { key: 's', code: 'KeyS' });
    expect(store.getState().timer.mode).toBe('shortBreak');
    expect(store.getState().stats.dailyPomodoros).toBe(0);
    store.getState().tick(10);
    fireEvent.keyDown(window, { key: 'r', code: 'KeyR' });
    expect(store.getState().timer.timeLeft).toBe(5 * 60);
  });

  it('Space on a focused button activates that button instead', async () => {
    const store = await setup();
    const reset = screen.getByRole('button', { name: 'Reset' });
    reset.focus();
    store.getState().tick(10);
    fireEvent.keyDown(reset, { key: ' ', code: 'Space' });
    expect(store.getState().timer.isActive).toBe(false);
    expect(store.getState().timer.timeLeft).toBe(25 * 60);
  });

  it('shows the long-break cycle', async () => {
    const store = await setup();
    expect(screen.getByText('Long break after 4 more sessions')).toBeTruthy();
    store.getState().complete();
    store.getState().complete();
    expect(
      await screen.findByText('Long break after 3 more sessions'),
    ).toBeTruthy();
  });

  it('F and the Focus view button open the focus view; Esc closes it', async () => {
    await setup();
    fireEvent.keyDown(window, { key: 'f', code: 'KeyF' });
    const dialog = await screen.findByRole('dialog', { name: 'Focus view' });
    expect(dialog.textContent).toContain('25:00');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Focus view' }));
    expect(screen.getByRole('dialog', { name: 'Focus view' })).toBeTruthy();
  });

  it('picks the mode in a segmented control and keeps Pause non-destructive', async () => {
    const store = await setup();
    const modes = screen.getByRole('radiogroup', { name: 'Timer mode' });
    fireEvent.click(within(modes).getByRole('radio', { name: 'Short Break' }));
    expect(store.getState().timer.mode).toBe('shortBreak');
    expect(
      within(modes)
        .getByRole('radio', { name: 'Short Break' })
        .getAttribute('aria-checked'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    const pause = screen.getByRole('button', { name: 'Pause' });
    expect(pause.className).not.toMatch(/bg-danger/);
    // Only the main action is primary: Start (now Pause) is not.
    expect(pause.className).not.toMatch(/bg-accent\b/);
  });

  it('the focus view starts and pauses the timer', async () => {
    const store = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Focus view' }));
    const dialog = screen.getByRole('dialog', { name: 'Focus view' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Start' }));
    expect(store.getState().timer.isActive).toBe(true);
    expect(within(dialog).getByRole('button', { name: 'Pause' })).toBeTruthy();
  });
});
