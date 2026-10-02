/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notifySessionEnd } from './notify';

const shown: unknown[] = [];
class FakeNotification {
  static permission = 'granted';
  static requestPermission = vi.fn(async () => FakeNotification.permission);
  constructor(title: string, opts: unknown) {
    shown.push({ title, opts });
  }
}

const setHidden = (hidden: boolean) =>
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });

describe('notifySessionEnd', () => {
  beforeEach(() => {
    shown.length = 0;
    vi.stubGlobal('Notification', FakeNotification);
    FakeNotification.permission = 'granted';
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    setHidden(false);
  });

  it('notifies only while the tab is hidden', () => {
    setHidden(false);
    expect(notifySessionEnd(true, 'work', 'shortBreak')).toBe(false);
    setHidden(true);
    expect(notifySessionEnd(true, 'work', 'shortBreak')).toBe(true);
    expect(shown).toEqual([
      {
        title: 'Focus Time finished',
        opts: { body: 'Next: Short Break', tag: 'pomodoro' },
      },
    ]);
  });
  it('needs the opt-in and a granted permission', () => {
    setHidden(true);
    expect(notifySessionEnd(false, 'work', 'shortBreak')).toBe(false);
    FakeNotification.permission = 'denied';
    expect(notifySessionEnd(true, 'work', 'shortBreak')).toBe(false);
    expect(shown).toHaveLength(0);
  });
});
