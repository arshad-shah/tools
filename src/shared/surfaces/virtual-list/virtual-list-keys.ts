import type { SizeModel } from './virtual-list-offsets';

/**
 * Target row for a roving-focus key, or null when the key is not handled
 * (Enter, Space, ArrowLeft and ArrowRight are left to `renderItem` consumers).
 * PageUp and PageDown move by one viewport of rows, and by at least one row.
 */
export function nextIndexForKey(
  key: string,
  active: number,
  model: SizeModel,
  viewport: number,
): number | null {
  const last = model.count - 1;
  if (last < 0) return null;
  const clamp = (i: number) => Math.min(last, Math.max(0, i));
  switch (key) {
    case 'ArrowDown':
      return clamp(active + 1);
    case 'ArrowUp':
      return clamp(active - 1);
    case 'Home':
      return 0;
    case 'End':
      return last;
    case 'PageDown': {
      const to = model.indexAt(model.offsetOf(active) + viewport);
      return clamp(to > active ? to : active + 1);
    }
    case 'PageUp': {
      const to = model.indexAt(model.offsetOf(active) - viewport);
      return clamp(to < active ? to : active - 1);
    }
    default:
      return null;
  }
}

/** Keys typed into a text field inside a row stay with that field. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}
