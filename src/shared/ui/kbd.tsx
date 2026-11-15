import { Kbd as CyKbd } from '@arshad-shah/cynosure';
import { hotkeyCaps } from '@/shared/lib/hotkeys';

export interface KbdProps {
  /** A hotkey combo, e.g. `Mod+Shift+Z`. */
  keys: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Key caps for a hotkey, drawn by Cynosure's Kbd. Decorative (`aria-hidden`):
 * pair it with text, as ShortcutHint does. Modifiers read as words named for
 * the platform (Cmd and Option on macOS); letters are upper case.
 */
export function Kbd({ keys, size = 'sm', className }: KbdProps) {
  return (
    <span aria-hidden="true" className={className}>
      <CyKbd keys={hotkeyCaps(keys)} size={size} />
    </span>
  );
}
Kbd.displayName = 'Kbd';
