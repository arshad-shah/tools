import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';
import { ShortcutHint } from './shortcut-hint';
import { useAnchoredFloating } from './position';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  /** Preferred side; it flips when there is no room. */
  side?: 'top' | 'bottom';
  /** Hotkey combo shown after the content, e.g. `Mod+Z`. */
  shortcut?: string;
  className?: string;
}

/** Grace period for the pointer to cross the gap from trigger to bubble. */
const CLOSE_DELAY = 100;

/**
 * Hover/focus tooltip meeting WCAG 1.4.13: it appears on pointer hover and
 * keyboard focus (the trigger must be focusable), stays while the pointer
 * is over the bubble, and Escape dismisses it without moving focus. The
 * trigger is described by an always-mounted, visually hidden copy, so the
 * description is available whether or not the bubble shows. The bubble is
 * placed by the kit positioner, so it never clips at a viewport edge and
 * its arrow keeps pointing at the trigger.
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  shortcut,
  className,
}) => {
  const id = useId();
  // Elements in state, not refs: the positioner reads them during render.
  const [wrapper, setWrapper] = useState<HTMLSpanElement | null>(null);
  const [arrow, setArrow] = useState<HTMLSpanElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const open = (hovered || focused) && !dismissed;
  const {
    setFloating,
    side: placedSide,
    style,
    arrowStyle,
  } = useAnchoredFloating({
    open,
    anchor: wrapper,
    side,
    align: 'center',
    offset: 8,
    arrow,
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDismissed(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  // The bubble is portaled but stays in this React subtree, so pointer
  // enter and leave cover it too; the delay bridges the gap between them.
  const onPointerEnter = useCallback(() => {
    clearTimeout(leaveTimer.current);
    setHovered(true);
    setDismissed(false);
  }, []);
  const onPointerLeave = useCallback(() => {
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setHovered(false), CLOSE_DELAY);
  }, []);

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
  return (
    <span
      ref={setWrapper}
      className="relative inline-flex"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
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
              ref={setFloating}
              aria-hidden="true"
              data-tooltip-bubble=""
              data-side={placedSide}
              className={cn(
                'z-floating inline-flex w-max items-center gap-2 rounded-md bg-surface-3 px-2 py-1 text-xs text-fg shadow-e2',
                className,
              )}
              style={style}
            >
              {body}
              <span
                ref={setArrow}
                data-tooltip-arrow=""
                className="absolute size-2 rotate-45 bg-surface-3"
                style={arrowStyle}
              />
            </span>,
            document.body,
          )
        : null}
    </span>
  );
};
Tooltip.displayName = 'Tooltip';
