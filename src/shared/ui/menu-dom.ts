/** Enabled items of a menu surface, in order. */
export const MENU_ITEMS = '[role="menuitem"]:not([disabled])';

/** The open menu a DropdownMenuTrigger controls (menus are portalled). */
export function menuOf(trigger: Element | null): HTMLElement | null {
  const id = trigger?.getAttribute('aria-controls');
  return id ? document.getElementById(id) : null;
}

/** Points a ref (callback or object) at `el`. */
export function assignRef<T>(ref: React.Ref<T> | undefined, el: T | null) {
  if (typeof ref === 'function') ref(el);
  else if (ref) (ref as { current: T | null }).current = el;
}
