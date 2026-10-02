import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';
import type { Side } from './position';
import { ShortcutHint } from './shortcut-hint';
import { useFloating } from './use-floating';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  /** Preferred side; flips when there is no room. */
  side?: Side;
  /** Hotkey combo shown after the content, e.g. `Mod+Z`. */
  shortcut?: string;
  className?: string;
}

/** Grace period for the pointer to cross from the trigger to the bubble. */
const LEAVE_MS = 120;
const ARROW_PX = 8;

/** The arrow's box: on the edge facing the trigger, at the layout's offset. */
const arrowClass: Record<Side, string> = {
  top: 'top-full -translate-x-1/2 -translate-y-1/2',
  bottom: 'bottom-full -translate-x-1/2 translate-y-1/2',
  left: 'left-full -translate-x-1/2 -translate-y-1/2',
  right: 'right-full translate-x-1/2 -translate-y-1/2',
};

/**
 * Hover/focus tooltip meeting WCAG 1.4.13: it appears on pointer hover and
 * keyboard focus (the trigger must be focusable), stays while the pointer
 * is over the bubble, and Escape dismisses it without moving focus. The
 * trigger is described by an always-mounted, visually hidden copy, so the
 * description is available whether or not the bubble shows.
 *
 * The bubble is portalled and fixed, so scrolling toolbars and rails never
 * clip it; it flips, shifts inside an 8px viewport margin, wraps to the room
 * left, and its arrow keeps pointing at the trigger.
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  shortcut,
  className,
}) => {
  const id = useId();
  const wrapper = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const [overBubble, setOverBubble] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const leave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = (hovered || overBubble || focused) && !dismissed;
  const { ref, layout, style } = useFloating<HTMLSpanElement>({
    open,
    anchor: wrapper,
    side,
    align: 'center',
    offset: ARROW_PX - 2,
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDismissed(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(
    () => () => {
      if (leave.current) clearTimeout(leave.current);
    },
    [],
  );

  const enter = () => {
    if (leave.current) clearTimeout(leave.current);
    leave.current = null;
    setHovered(true);
    setDismissed(false);
  };
  const exit = () => {
    if (leave.current) clearTimeout(leave.current);
    leave.current = setTimeout(() => setHovered(false), LEAVE_MS);
  };

  const trigger = React.isValidElement<{ 'aria-describedby'?: string }>(
    children,
  )
    ? React.cloneElement(children, {
        'aria-describedby': cn(children.props['aria-describedby'], id),
      })
    : children;
  const body = (
    <>
      <span>{content}</span>
      {shortcut ? <ShortcutHint keys={shortcut} /> : null}
    </>
  );
  const placed = layout?.side ?? side;
  const vertical = placed === 'top' || placed === 'bottom';
  return (
    <span
      ref={wrapper}
      className="relative inline-flex"
      onPointerEnter={enter}
      onPointerLeave={exit}
      onFocus={() => {
        setFocused(true);
        setDismissed(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setFocused(false);
      }}
    >
      {trigger}
      <span id={id} role="tooltip" className="sr-only">
        {body}
      </span>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <span
              ref={ref}
              aria-hidden="true"
              data-tooltip-bubble=""
              data-side={placed}
              onPointerEnter={() => {
                if (leave.current) clearTimeout(leave.current);
                setOverBubble(true);
              }}
              onPointerLeave={() => {
                setOverBubble(false);
                exit();
              }}
              className={cn(
                'fixed z-popover inline-flex w-max items-center gap-2 rounded-md bg-surface-3 px-2 py-1 text-xs text-fg shadow-e2',
                className,
              )}
              style={style}
            >
              {body}
              <span
                aria-hidden="true"
                data-tooltip-arrow=""
                className={cn(
                  'absolute size-2 rotate-45 bg-surface-3',
                  arrowClass[placed],
                )}
                style={
                  layout
                    ? vertical
                      ? { left: layout.arrow }
                      : { top: layout.arrow }
                    : undefined
                }
              />
            </span>,
            document.body,
          )
        : null}
    </span>
  );
};
Tooltip.displayName = 'Tooltip';
