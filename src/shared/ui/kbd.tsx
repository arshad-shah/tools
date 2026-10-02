import { cn } from '@/shared/lib/cn';
import { hotkeyParts } from '@/shared/lib/hotkeys';
import { isMac } from '@/shared/lib/platform';
import {
  KeyArrowDown,
  KeyArrowLeft,
  KeyArrowRight,
  KeyArrowUp,
  KeyBackspace,
  KeyCommand,
  KeyControl,
  KeyEnter,
  KeyEscape,
  KeyOption,
  KeyShift,
  KeyTab,
  type IconComponent,
} from './icons';

const ICON: Partial<Record<string, IconComponent>> = {
  Mod: KeyCommand,
  Shift: KeyShift,
  Alt: KeyOption,
  Ctrl: KeyControl,
  Enter: KeyEnter,
  Backspace: KeyBackspace,
  Tab: KeyTab,
  Escape: KeyEscape,
  ArrowUp: KeyArrowUp,
  ArrowDown: KeyArrowDown,
  ArrowLeft: KeyArrowLeft,
  ArrowRight: KeyArrowRight,
};
const MODIFIERS = new Set(['Mod', 'Alt', 'Ctrl', 'Shift']);
const WORD: Record<string, string> = {
  Mod: 'Ctrl',
  Alt: 'Alt',
  Ctrl: 'Ctrl',
  Shift: 'Shift',
  Space: 'Space',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  Delete: 'Del',
  Home: 'Home',
  End: 'End',
};

export interface KbdProps {
  /** A hotkey combo, e.g. `Mod+Shift+Z`. */
  keys: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Key chips for a hotkey. Decorative (`aria-hidden`): pair it with text,
 * as ShortcutHint does. Modifier and arrow keys are SVG key icons on macOS;
 * elsewhere modifiers read as words. Letters are mono text (spec §4.6).
 */
export function Kbd({ keys, size = 'sm', className }: KbdProps) {
  const mac = isMac();
  return (
    <span
      className={cn('inline-flex items-center gap-1', className)}
      aria-hidden="true"
    >
      {hotkeyParts(keys, mac).map((k, i) => {
        const Icon = ICON[k];
        const useIcon = Icon !== undefined && (mac || !MODIFIERS.has(k));
        return (
          <kbd
            key={i}
            className={cn(
              'inline-flex min-w-5 items-center justify-center rounded-sm border border-line-strong bg-surface-2 px-1 font-mono-meta text-fg-muted',
              size === 'sm' ? 'h-5 text-xs' : 'h-6 text-sm',
            )}
          >
            {useIcon && Icon ? (
              <Icon size="xs" />
            ) : (
              (WORD[k] ?? k.toUpperCase())
            )}
          </kbd>
        );
      })}
    </span>
  );
}
Kbd.displayName = 'Kbd';
