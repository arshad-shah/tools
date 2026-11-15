import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Popover as CyPopover } from '@arshad-shah/cynosure';
import { cn } from '@/shared/lib/cn';
import {
  isRefAnchor,
  toPlacement,
  type Align,
  type Anchor,
  type Side,
} from './position';

export interface PopoverProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** An element ref, or a virtual anchor such as a selection rectangle. */
  anchor: Anchor;
  side?: Side;
  /** Kept for the callers; Cynosure lines the panel up with its anchor's start edge. */
  align?: Align;
  /** Kept for the callers; Cynosure keeps its own gap from the anchor. */
  offset?: number;
  /** Accessible name of the dialog surface. */
  label: string;
  /** false: non-modal (Tab out closes). true: focus is trapped inside. */
  modal?: boolean;
  initialFocus?: React.RefObject<HTMLElement | null>;
  /**
   * false: opening leaves focus where it is (a toolbar that accompanies an
   * editor; reach it with Tab). Default true.
   */
  autoFocus?: boolean;
  /**
   * Layout of the content (width, padding, flex), as on the kit panel; it
   * goes on a box inside Cynosure's panel, which keeps its own look.
   */
  className?: string;
  children: React.ReactNode;
}

/**
 * Cynosure's Popover: an anchored, labelled non-modal dialog in the top
 * layer. Escape and an outside pointer-down close it, and focus goes back
 * to where it was. `modal` keeps Tab inside. The content mounts only while
 * it is open.
 */
export function Popover({
  open,
  onOpenChange,
  anchor,
  side = 'bottom',
  label,
  modal = false,
  initialFocus,
  autoFocus = true,
  className,
  children,
}: PopoverProps) {
  // Cynosure takes an element or a virtual anchor; a ref not attached yet
  // is read when the panel is placed.
  const at = isRefAnchor(anchor)
    ? (anchor.current ?? {
        getBoundingClientRect: () =>
          anchor.current?.getBoundingClientRect() ?? new DOMRect(),
      })
    : anchor;

  // A chosen first focus (a field further down) once the panel is shown.
  useEffect(() => {
    if (open && autoFocus) initialFocus?.current?.focus();
  }, [open, autoFocus, initialFocus]);

  const panel = (
    <CyPopover
      open={open}
      onOpenChange={onOpenChange}
      anchor={at}
      label={label}
      placement={toPlacement(side)}
      modal={modal}
      initialFocus={autoFocus ? 'first' : 'none'}
      // The content box sets the padding (p-3 unless the caller says), and
      // the panel grows to it, up to the large preset.
      size="lg"
      style={{ '--cy-popover-padding': '0' } as React.CSSProperties}
    >
      {open ? <div className={cn('p-3', className)}>{children}</div> : null}
    </CyPopover>
  );
  // In <body>, as before: the top layer lifts it above everything, but it
  // would still inherit an ancestor's pointer-events or visibility.
  return typeof document === 'undefined'
    ? null
    : createPortal(panel, document.body);
}
Popover.displayName = 'Popover';
