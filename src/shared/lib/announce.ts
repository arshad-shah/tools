/**
 * Screen-reader announcements outside any component tree: one visually
 * hidden live region per politeness, created on first use.
 */
export type Politeness = 'polite' | 'assertive';

const regions: Partial<Record<Politeness, HTMLElement>> = {};

function region(politeness: Politeness): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const existing = regions[politeness];
  if (existing && existing.isConnected) return existing;
  const el = document.createElement('div');
  el.className = 'sr-only';
  el.setAttribute('aria-live', politeness);
  el.setAttribute('aria-atomic', 'true');
  if (politeness === 'assertive') el.setAttribute('role', 'alert');
  else el.setAttribute('role', 'status');
  el.dataset.announcer = politeness;
  document.body.append(el);
  regions[politeness] = el;
  return el;
}

/** Announces `message`; repeating the same message announces it again. */
export function announce(
  message: string,
  politeness: Politeness = 'polite',
): void {
  const el = region(politeness);
  if (!el) return;
  el.textContent = '';
  // A separate task, so an identical message is still a change.
  setTimeout(() => {
    el.textContent = message;
  }, 50);
}
