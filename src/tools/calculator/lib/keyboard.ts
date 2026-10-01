/**
 * The calculator's page-level shortcuts must never steal keys from a text
 * field (the expression box keeps native caret editing) or from browser
 * shortcuts such as Ctrl+C.
 */
export function shouldHandleCalculatorKey(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return true;
  if (target.isContentEditable) return false;
  return !target.closest('input, textarea, select, [contenteditable="true"]');
}
