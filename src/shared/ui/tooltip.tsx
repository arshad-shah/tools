import React, { useEffect, useId, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { ShortcutHint } from './shortcut-hint';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom';
  /** Hotkey combo shown after the content, e.g. `Mod+Z`. */
  shortcut?: string;
  className?: string;
}

/**
 * Hover/focus tooltip meeting WCAG 1.4.13: it appears on pointer hover and
 * keyboard focus (the trigger must be focusable), stays while the pointer
 * is over the bubble, and Escape dismisses it without moving focus. The
 * trigger is described by an always-mounted, visually hidden copy, so the
 * description is available whether or not the bubble shows.
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  shortcut,
  className,
}) => {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = (hovered || focused) && !dismissed;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDismissed(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

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
      className="relative inline-flex"
      onPointerEnter={() => {
        setHovered(true);
        setDismissed(false);
      }}
      onPointerLeave={() => setHovered(false)}
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
      {open ? (
        <span
          aria-hidden="true"
          data-tooltip-bubble=""
          className={cn(
            'absolute left-1/2 z-popover inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-md bg-surface-3 px-2 py-1 text-xs text-fg shadow-e2',
            side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
            className,
          )}
        >
          {body}
        </span>
      ) : null}
    </span>
  );
};
Tooltip.displayName = 'Tooltip';
