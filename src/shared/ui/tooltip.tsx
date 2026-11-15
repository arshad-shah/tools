import React from 'react';
import { Tooltip as CyTooltip } from '@arshad-shah/cynosure';
import { ShortcutHint } from './shortcut-hint';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  /** Preferred side; it flips when there is no room. */
  side?: 'top' | 'bottom';
  /** Hotkey combo shown after the content, e.g. `Mod+Z`. */
  shortcut?: string;
  /** Added to the element around the trigger, for layout. */
  className?: string;
}

/**
 * Cynosure's Tooltip (WCAG 1.4.13: hover and keyboard focus open it, it
 * stays while the pointer is over it, Escape dismisses it, never on touch).
 * The tip describes its trigger, so the trigger must be focusable. A
 * `shortcut` is shown after the content as key chips.
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  shortcut,
  className,
}) => {
  const body = shortcut ? (
    <>
      <span>{content}</span>
      <ShortcutHint keys={shortcut} className="ms-2" />
    </>
  ) : (
    content
  );
  const trigger = React.isValidElement<Record<string, unknown>>(children) ? (
    children
  ) : (
    <span>{children}</span>
  );
  return (
    <CyTooltip content={body} placement={side} className={className}>
      {trigger}
    </CyTooltip>
  );
};
Tooltip.displayName = 'Tooltip';
