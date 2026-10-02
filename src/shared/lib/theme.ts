import { useSyncExternalStore } from 'react';

/**
 * Theme preference and the resolved data-theme (spec §4.2). The first paint
 * is resolved by public/theme-init.js with the same key and rules; this
 * module keeps it in sync afterwards.
 */
export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
export const THEME_KEY = 'tools:theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';
const isPreference = (v: unknown): v is ThemePreference =>
  v === 'system' || v === 'light' || v === 'dark';

let memory: ThemePreference | null = null;
const listeners = new Set<() => void>();

const prefersDark = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(DARK_QUERY).matches;

export function readThemePreference(): ThemePreference {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (isPreference(raw)) return raw;
  } catch {
    // Storage blocked: the in-memory preference (or 'system') applies.
  }
  return 'system';
}

export function resolveTheme(p: ThemePreference, dark: boolean): ResolvedTheme {
  if (p === 'system') return dark ? 'dark' : 'light';
  return p;
}

export function applyTheme(t: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = t;
  root.style.colorScheme = t;
}

function notify(): void {
  for (const l of listeners) l();
}

/** Persists (best effort), applies and notifies subscribers. Never throws. */
export function writeThemePreference(p: ThemePreference): void {
  memory = p;
  try {
    localStorage.setItem(THEME_KEY, p);
  } catch {
    // Private mode or quota: keep the in-memory preference.
  }
  applyTheme(resolveTheme(p, prefersDark()));
  notify();
}

let stopSync: (() => void) | null = null;

/**
 * One module-level sync, independent of mounted components: follows OS
 * theme changes while the preference is 'system', and preference changes
 * made in other tabs (storage events). Idempotent; main.tsx starts it and
 * every subscriber ensures it.
 */
export function startThemeSync(): void {
  if (stopSync || typeof window === 'undefined') return;
  const mq =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(DARK_QUERY)
      : null;
  const onMedia = () => {
    if (readThemePreference() === 'system')
      applyTheme(resolveTheme('system', mq?.matches ?? false));
    notify();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_KEY) return;
    memory = isPreference(e.newValue) ? e.newValue : null;
    applyTheme(resolveTheme(readThemePreference(), prefersDark()));
    notify();
  };
  mq?.addEventListener('change', onMedia);
  window.addEventListener('storage', onStorage);
  stopSync = () => {
    mq?.removeEventListener('change', onMedia);
    window.removeEventListener('storage', onStorage);
    stopSync = null;
  };
}

function subscribe(listener: () => void): () => void {
  startThemeSync();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const snapshot = (): string => {
  const p = readThemePreference();
  return `${p}:${resolveTheme(p, prefersDark())}`;
};

export function useTheme(): {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference(p: ThemePreference): void;
} {
  const snap = useSyncExternalStore(subscribe, snapshot, () => 'system:light');
  const [preference, resolved] = snap.split(':') as [
    ThemePreference,
    ResolvedTheme,
  ];
  return { preference, resolved, setPreference: writeThemePreference };
}

/** Test seam: forget the in-memory preference and stop the sync. */
export function resetThemeForTests(): void {
  memory = null;
  stopSync?.();
}
