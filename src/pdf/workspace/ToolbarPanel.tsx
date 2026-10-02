import { useRef, useState, type ReactNode } from 'react';
import {
  Button,
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
import type { ModeProps } from './modes/types';

export interface ToolbarPanelProps {
  layout: ModeProps['layout'];
  /** Accessible name of the button, e.g. "Style: Yellow". */
  label: string;
  /** Visible text beside `leading` from md up, e.g. "Style". */
  text: string;
  /** Shown before the text: an icon or a swatch. */
  leading: ReactNode;
  /** Title of the panel it opens. */
  title: string;
  children: ReactNode;
}

/**
 * A mode's custom controls in its toolbar's trailing slot (backlog P5-D,
 * P5-E): a button that opens them by itself, as a bottom sheet on phones.
 * 44px in Focus and on phones.
 */
export function ToolbarPanel({
  layout,
  label,
  text,
  leading,
  title,
  children,
}: ToolbarPanelProps) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const touch = layout !== 'standard';
  return (
    <>
      <Button
        ref={anchor}
        variant="ghost"
        size={touch ? 'lg' : 'sm'}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        leftIcon={leading}
        className={touch ? 'min-w-touch px-2' : 'px-2'}
      >
        <span className="hidden md:inline">{text}</span>
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        label={title}
        presentation={layout === 'phone' ? 'sheet' : 'popover'}
        anchor={anchor}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
      </Dialog>
    </>
  );
}
