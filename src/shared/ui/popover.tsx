import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';
import {
  isRefAnchor as isRef,
  useAnchoredFloating,
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
  align?: Align;
  offset?: number;
  /** Accessible name of the dialog surface. */
  label: string;
  /** false: non-modal (Tab out closes). true: focus is trapped inside. */
  modal?: boolean;
  initialFocus?: React.RefObject<HTMLElement | null>;
  /**
   * false: opening leaves focus where it is (a toolbar that accompanies an
   * editor; reach it with a shortcut). Default true.
   */
  autoFocus?: boolean;
  /**
   * false: pointer-downs and focus moving outside do not close it (it
   * follows its anchor; Esc inside still closes it). Default true.
   */
  dismissOnOutside?: boolean;
  className?: string;
  children: React.ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Anchored floating surface with collision handling (spec §4.6, no Radix).
 * Portals to body; Esc and outside pointerdown close it and focus returns to
 * the anchor. The kit owns the data-driven `style` used for its position.
 */
export function Popover({
  open,
  onOpenChange,
  anchor,
  side = 'bottom',
  align = 'start',
  offset = 8,
  label,
  modal = false,
  initialFocus,
  autoFocus = true,
  dismissOnOutside = true,
  className,
  children,
}: PopoverProps) {
  const surface = useRef<HTMLDivElement>(null);
  const focused = useRef(false);
  const floating = useAnchoredFloating({ open, anchor, side, align, offset });
  const { setFloating } = floating;
  const setSurface = useCallback(
    (el: HTMLDivElement | null) => {
      surface.current = el;
      setFloating(el);
    },
    [setFloating],
  );

  const close = useCallback(() => {
    onOpenChange(false);
    if (isRef(anchor)) anchor.current?.focus();
  }, [anchor, onOpenChange]);

  // Closing re-arms initial focus for the next open.
  useLayoutEffect(() => {
    if (!open) return;
    return () => {
      focused.current = false;
    };
  }, [open]);

  // Initial focus once the surface is positioned (and therefore focusable
  // and visible), once per open.
  const placed = floating.placed;
  useEffect(() => {
    if (!open || !placed || focused.current || !autoFocus) return;
    const el = surface.current;
    if (!el) return;
    focused.current = true;
    const target =
      initialFocus?.current ?? el.querySelector<HTMLElement>(FOCUSABLE) ?? el;
    target.focus();
  }, [open, placed, initialFocus, autoFocus]);

  useEffect(() => {
    if (!open || !dismissOnOutside) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (surface.current?.contains(t)) return;
      if (isRef(anchor) && anchor.current?.contains(t)) return;
      onOpenChange(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () =>
      document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open, anchor, onOpenChange, dismissOnOutside]);

  if (!open || typeof document === 'undefined') return null;

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab' || !modal) return;
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

  const onBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (modal || !dismissOnOutside) return;
    const next = e.relatedTarget as Node | null;
    if (next && !surface.current?.contains(next)) onOpenChange(false);
  };

  return createPortal(
    <div
      ref={setSurface}
      role="dialog"
      aria-label={label}
      aria-modal={modal || undefined}
      tabIndex={-1}
      data-side={floating.side}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      className={cn(
        'z-floating overflow-auto rounded-xl bg-surface p-3 text-fg shadow-e2 outline-none',
        className,
      )}
      style={floating.style}
    >
      {children}
    </div>,
    document.body,
  );
}
Popover.displayName = 'Popover';
