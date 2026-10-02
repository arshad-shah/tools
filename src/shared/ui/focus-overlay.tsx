import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';
import { IconButton } from './button';
import { IconX } from './icons';

export interface FocusOverlayProps {
  open: boolean;
  onClose(): void;
  /** Accessible name of the dialog. */
  label?: string;
  className?: string;
  children: React.ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A full-viewport focus view (one pane, a preview) as a modal dialog: focus
 * moves in and is trapped, Esc or Close calls `onClose`, focus returns to
 * where it was, and the page behind does not scroll. The fade-in is
 * motion-safe only.
 */
export const FocusOverlay: React.FC<FocusOverlayProps> = ({
  open,
  onClose,
  label = 'Focus view',
  className,
  children,
}) => {
  const surface = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const el = surface.current;
    (el?.querySelector<HTMLElement>(FOCUSABLE) ?? el)?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => setShown(true));
    return () => {
      cancelAnimationFrame(frame);
      setShown(false);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [
      ...(surface.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []),
    ];
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      ref={surface}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={cn(
        'fixed inset-0 z-dialog flex flex-col bg-canvas text-fg outline-none',
        'motion-safe:transition-opacity motion-safe:duration-base',
        shown ? 'opacity-100' : 'motion-safe:opacity-0',
      )}
    >
      <div className="flex shrink-0 justify-end p-2">
        <IconButton
          variant="ghost"
          label="Close"
          icon={IconX}
          onClick={onClose}
        />
      </div>
      <div className={cn('min-h-0 flex-1 overflow-auto px-4 pb-4', className)}>
        {children}
      </div>
    </div>,
    document.body,
  );
};
FocusOverlay.displayName = 'FocusOverlay';
