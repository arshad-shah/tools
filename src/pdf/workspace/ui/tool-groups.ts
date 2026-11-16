import type { IconData } from '@arshad-shah/cynosure/icons';
import type { RefObject } from 'react';

/** One tool of a mode's toolbar, rendered by `ModeToolbar` for each layout. */
export interface ToolItem {
  id: string;
  /** Accessible name, and the visible text where the bar shows labels. */
  label: string;
  /** Shorter visible text (default `label`). */
  shortLabel?: string;
  icon: IconData;
  /** The key that runs it, as the workspace map writes it ("Shift+R"). */
  shortcut?: string;
  /**
   * `button` runs `onSelect`; `toggle` shows `pressed`; `split` runs
   * `onSelect` and offers `menu` beside it; `menu` only opens `menu`.
   */
  kind: 'button' | 'toggle' | 'split' | 'menu';
  pressed?: boolean;
  /** true, or the reason it is unavailable (said in its name). */
  disabled?: boolean | string;
  onSelect?(): void;
  /** Split and menu entries. */
  menu?: { id: string; label: string; onSelect(): void }[];
  /** Receives the item's button, e.g. to anchor the panel it opens. */
  anchor?: RefObject<HTMLButtonElement | null>;
}

export interface ToolGroup {
  id: string;
  label: string;
  items: ToolItem[];
}
