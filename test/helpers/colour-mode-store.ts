/*
 * A Cynosure colour mode a test can switch, for components that repaint on
 * `useCynosureTheme()`: render with `wrapper: ColourModeWrapper`, then
 * `setColourMode('dark')` inside act().
 */
let mode: 'light' | 'dark' = 'light';
const listeners = new Set<() => void>();

export function setColourMode(next: 'light' | 'dark'): void {
  mode = next;
  for (const l of listeners) l();
}

export function subscribeColourMode(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const colourMode = () => mode;
