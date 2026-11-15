import { Kbd } from '@arshad-shah/cynosure';
import { cn } from '@/shared/lib/cn';
import { hotkeyCaps, hotkeyLabel } from '@/shared/lib/hotkeys';
import { isMac } from '@/shared/lib/platform';

/** A shortcut shown as Cynosure key caps with a plain-words text alternative. */
export function ShortcutHint({
  keys,
  className,
}: {
  keys: string;
  className?: string;
}) {
  const mac = isMac();
  return (
    <Kbd
      keys={hotkeyCaps(keys, mac)}
      label={hotkeyLabel(keys, mac)}
      size="sm"
      // Keyboard hints mean nothing on touch screens.
      className={cn('pointer-coarse:hidden', className)}
    />
  );
}
ShortcutHint.displayName = 'ShortcutHint';
