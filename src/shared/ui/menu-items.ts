/**
 * The open menu's items for a DropdownMenu trigger. The menu is portalled,
 * so it is found through the trigger's aria-controls, not the DOM tree.
 */
export function menuItemsOf(trigger: HTMLElement | null): HTMLElement[] {
  const id = trigger?.getAttribute('aria-controls');
  const menu = id ? document.getElementById(id) : null;
  return [...(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
}
