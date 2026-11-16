import { Button, IconButton, Popover, Sheet } from '@arshad-shah/cynosure';
import type { IconData } from '@arshad-shah/cynosure/icons';
import { useState, type ReactNode } from 'react';
import type { ModeProps } from './modes/types';

export interface ToolbarPanelProps {
  layout: ModeProps['layout'];
  /** Accessible name of the button, e.g. "Style: Yellow". */
  label: string;
  /** Visible text beside the icon where the bar shows labels, e.g. "Style". */
  text: string;
  icon: IconData;
  /** Title of the panel it opens. */
  title: string;
  children: ReactNode;
}

/**
 * A mode's own settings in its toolbar's trailing slot: a button that opens
 * them in a Popover beside it, or a bottom Sheet on phones.
 */
export function ToolbarPanel({
  layout,
  label,
  text,
  icon,
  title,
  children,
}: ToolbarPanelProps) {
  const [open, setOpen] = useState(false);
  if (layout === 'phone')
    return (
      <>
        <IconButton
          icon={icon}
          label={label}
          size="lg"
          variant="ghost"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        />
        <Sheet open={open} onOpenChange={setOpen} side="bottom" title={title}>
          {children}
        </Sheet>
      </>
    );
  return (
    <Popover
      label={title}
      open={open}
      onOpenChange={setOpen}
      placement="bottom"
      size="md"
      trigger={(t) =>
        layout === 'focus' ? (
          <IconButton
            {...t}
            icon={icon}
            label={label}
            size="lg"
            variant="ghost"
          />
        ) : (
          <Button
            {...t}
            icon={icon}
            variant="ghost"
            size="sm"
            aria-label={label === text ? undefined : label}
          >
            {text}
          </Button>
        )
      }
    >
      {children}
    </Popover>
  );
}
