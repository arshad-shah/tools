import { cn } from '@/shared/lib/cn';
import { hotkeyLabel } from '@/shared/lib/hotkeys';
import { isMac } from '@/shared/lib/platform';
import { Kbd } from './kbd';

/** A shortcut shown as key chips with a plain-words text alternative. */
export function ShortcutHint({
  keys,
  className,
}: {
  keys: string;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      <span className="sr-only">{hotkeyLabel(keys, isMac())}</span>
      <Kbd keys={keys} />
    </span>
  );
}
ShortcutHint.displayName = 'ShortcutHint';
