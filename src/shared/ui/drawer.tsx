import React from 'react';
import { createPortal } from 'react-dom';
import { Sheet, VisuallyHidden } from '@arshad-shah/cynosure';

export type DrawerSide = 'left' | 'right' | 'bottom';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edge it slides in from. 'bottom' is the phone sheet. Default 'right'. */
  side?: DrawerSide;
  title?: React.ReactNode;
  /** Accessible name when there is no title. */
  label?: string;
  /** Added to the panel, for layout. */
  className?: string;
  children: React.ReactNode;
}

const SIDE = { left: 'start', right: 'end', bottom: 'bottom' } as const;

/**
 * Slide-over panel (Focus layout and phones): pages, tools or a bottom
 * sheet. Cynosure's Sheet: Escape (when it is the topmost overlay), the
 * backdrop and the close button close it; focus moves in and returns.
 */
export const Drawer: React.FC<DrawerProps> = ({
  open,
  onOpenChange,
  side = 'right',
  title,
  label = 'Panel',
  className,
  children,
}) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      side={SIDE[side]}
      title={title || <VisuallyHidden>{label}</VisuallyHidden>}
      className={className}
    >
      {open ? children : null}
    </Sheet>,
    document.body,
  );
};
Drawer.displayName = 'Drawer';
