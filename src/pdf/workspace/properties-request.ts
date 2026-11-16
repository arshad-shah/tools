/**
 * Asks the shell to show the Properties panel (a closed side panel, the
 * phone's sheet or the Focus popover): a toolbar that opens a panel in
 * Properties (Find and mark, an object's properties) calls this.
 */
const listeners = new Set<() => void>();

export function requestProperties(): void {
  for (const l of listeners) l();
}

export function onPropertiesRequest(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
