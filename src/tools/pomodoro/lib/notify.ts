import { MODE_INFO } from './modes';
import type { TimerMode } from '../types';

export type NotifyPermission = 'default' | 'granted' | 'denied' | 'unsupported';

/** The Notification permission now, or `unsupported`. */
export function notificationPermission(): NotifyPermission {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/** Asks for permission (call from the opt-in toggle's click). */
export async function requestNotifications(): Promise<NotifyPermission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * A system notification for a finished session, only when the user opted
 * in, permission is granted and the tab is hidden (a visible tab already
 * shows the change). Returns whether one was shown.
 */
export function notifySessionEnd(
  enabled: boolean,
  ended: TimerMode,
  next: TimerMode,
): boolean {
  if (!enabled || notificationPermission() !== 'granted') return false;
  if (typeof document === 'undefined' || !document.hidden) return false;
  try {
    new Notification(`${MODE_INFO[ended].label} finished`, {
      body: `Next: ${MODE_INFO[next].label}`,
      tag: 'pomodoro',
    });
    return true;
  } catch {
    // Some platforms only allow notifications from a service worker.
    return false;
  }
}
