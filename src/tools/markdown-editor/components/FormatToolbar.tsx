import { IconButton, Tooltip } from '@/shared/ui';
import type { FormatAction } from '../lib/format-actions';
import { FORMAT_ITEMS } from './format-items';

/** Formatting buttons; each wraps or prefixes the editor selection. */
export function FormatToolbar({
  onFormat,
}: {
  onFormat(action: FormatAction): void;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-1"
    >
      {FORMAT_ITEMS.map((item) => (
        <Tooltip
          key={item.action}
          content={item.label}
          shortcut={item.shortcut}
        >
          <IconButton
            label={item.label}
            icon={item.icon}
            size="sm"
            variant="ghost"
            // Keep the editor's selection: the button must not take focus.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFormat(item.action)}
          />
        </Tooltip>
      ))}
    </div>
  );
}
