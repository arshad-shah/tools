import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';
import { FloatingToolbar } from '@arshad-shah/cynosure';
import type { Anchor } from './position';
import { dockedBarOpened } from './docked-bar-state';
import { CONTEXT_GAP, revealRect } from './reveal';
import { useVisibleViewport } from './use-visual-viewport';

/**
 * Focus handling shared by both bars: remembers where focus came from
 * when it enters the bar, and Esc inside the bar calls `onEscape` then
 * returns focus there (an editor keeps its caret and its text).
 */
function useBarFocus(onEscape?: () => void) {
  const from = useRef<HTMLElement | null>(null);
  const onFocus = (e: React.FocusEvent<HTMLElement>) => {
    const prev = e.relatedTarget as HTMLElement | null;
    if (prev && !e.currentTarget.contains(prev)) from.current = prev;
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    e.preventDefault();
    e.stopPropagation();
    const back = from.current;
    onEscape?.();
    if (back?.isConnected) back.focus();
  };
  return { onFocus, onKeyDown };
}

export interface AnchoredToolbarProps {
  /** The box being worked on (an element ref or a virtual anchor). */
  anchor: Anchor;
  /** Accessible name of the toolbar. */
  label: string;
  /** Preferred side; it flips when there is no room. Default top. */
  side?: 'top' | 'bottom';
  /** Esc inside the bar (focus then returns to where it came from). */
  onEscape?(): void;
  /** Added to the bar, for layout. */
  className?: string;
  children: React.ReactNode;
}

/**
 * A compact contextual toolbar anchored above the box it works on, like
 * the mini toolbars of Acrobat and Edge: Cynosure's FloatingToolbar. It
 * flips below when there is no room above and slides along the edge to
 * stay inside the viewport, never across the box. Non-modal: it never
 * takes focus by itself; Alt+F10 moves into it, arrows move inside it and
 * Esc returns to where focus came from.
 */
export function AnchoredToolbar({
  anchor,
  label,
  side = 'top',
  onEscape,
  className,
  children,
}: AnchoredToolbarProps) {
  return (
    <FloatingToolbar
      label={label}
      anchor={anchor}
      side={side}
      onEscape={onEscape}
      className={className}
      style={
        { '--cy-floating-toolbar-offset': `${CONTEXT_GAP}px` } as CSSProperties
      }
    >
      {children}
    </FloatingToolbar>
  );
}
AnchoredToolbar.displayName = 'AnchoredToolbar';

export interface DockedToolbarProps {
  /** Accessible name of the toolbar. */
  label: string;
  /** Esc inside the bar (focus then returns to where it came from). */
  onEscape?(): void;
  /**
   * The box being worked on: the bar scrolls the document so it stays in
   * view above the bar and the on-screen keyboard.
   */
  keepVisible?: {
    rect(): DOMRect | null;
    /** An element inside the scrolling document. */
    element(): Element | null;
  };
  /** Changes when the box being worked on changes (reveal it again). */
  revealKey?: string;
  /** Pinned after the scrolling row, always in reach (e.g. Done). */
  trailing?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  'data-testid'?: string;
}

/**
 * The phone context bar: one row docked at the bottom of the visible
 * viewport, so it rides just above the on-screen keyboard
 * (visualViewport-aware). The row never wraps; it scrolls sideways when
 * the controls do not fit. It keeps the box being worked on visible above
 * itself and the keyboard by scrolling the document, never by covering it.
 */
export function DockedToolbar({
  label,
  onEscape,
  keepVisible,
  revealKey,
  trailing,
  className,
  children,
  'data-testid': testId,
}: DockedToolbarProps) {
  const vp = useVisibleViewport();
  const bar = useRef<HTMLDivElement>(null);
  const focus = useBarFocus(onEscape);
  const target = useRef(keepVisible);
  useLayoutEffect(() => {
    target.current = keepVisible;
  });

  const reveal = useCallback(() => {
    const t = target.current;
    const rect = t?.rect();
    const el = bar.current;
    if (!t || !rect || !el) return;
    const top = el.getBoundingClientRect().top;
    revealRect(t.element(), rect, vp.top + CONTEXT_GAP, top - CONTEXT_GAP);
  }, [vp.top]);

  // The phone's own bottom bars step aside while this one is open.
  useEffect(() => dockedBarOpened(), []);

  useEffect(() => {
    const raf = requestAnimationFrame(reveal);
    return () => cancelAnimationFrame(raf);
  }, [reveal, vp.height, vp.bottomInset, revealKey]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={bar}
      role="toolbar"
      aria-label={label}
      aria-orientation="horizontal"
      data-testid={testId}
      onFocus={focus.onFocus}
      onKeyDown={focus.onKeyDown}
      className={cn(
        'fixed inset-x-0 z-popover border-t border-line bg-surface text-fg shadow-e3',
        vp.bottomInset === 0 && 'pb-[env(safe-area-inset-bottom)]',
        className,
      )}
      style={{ bottom: vp.bottomInset }}
    >
      <div className="flex h-14 items-center">
        <div className="flex h-full min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-x-auto overscroll-x-contain px-2">
          {children}
        </div>
        {trailing ? (
          <div className="flex h-full shrink-0 items-center border-l border-line px-1">
            {trailing}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
DockedToolbar.displayName = 'DockedToolbar';

/** A thin vertical divider between groups in a context bar. */
export function ToolbarDivider() {
  return (
    <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-line-strong" />
  );
}
