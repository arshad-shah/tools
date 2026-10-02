import React, { useCallback, useId, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { createToolSettings } from '@/shared/lib/tool-settings';
import { IconButton } from './button';
import {
  IconPanelBottomClose,
  IconPanelBottomOpen,
  IconPanelLeftClose,
  IconPanelLeftOpen,
  IconPanelRightClose,
  IconPanelRightOpen,
  IconPanelTopClose,
  IconPanelTopOpen,
} from './icons';
import { useMinWidth } from './use-min-width';

export type SplitBreakpoint = 'sm' | 'md' | 'lg';

export interface SplitPaneProps {
  /** 'horizontal': panes side by side; 'vertical': one above the other. */
  direction: 'horizontal' | 'vertical';
  /** Share of the first pane, 0 to 1. */
  defaultRatio?: number;
  /** Smallest share either pane may have; the largest is `1 - min`. */
  min?: number;
  /** Persist the ratio under this key (settings only, never content). */
  persistKey?: string;
  collapsible?: 'start' | 'end' | 'both';
  /** Below this breakpoint the panes stack and the separator goes; false never stacks. */
  stackBelow?: SplitBreakpoint | false;
  /** Accessible name of the separator. */
  separatorLabel?: string;
  className?: string;
  children: [React.ReactNode, React.ReactNode];
}

/** Mirrors --breakpoint-* in src/theme/tokens.css. */
const BREAKPOINT_PX: Record<SplitBreakpoint, number> = {
  sm: 640,
  md: 900,
  lg: 1200,
};
const STEP = 0.05;
const BIG_STEP = 0.2;

const splitSettings = createToolSettings(
  'kit-split',
  { ratios: {} as Record<string, number> },
  { version: 1 },
);

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const tidy = (v: number) => Math.round(v * 10_000) / 10_000;

function useRatio(persistKey: string | undefined, fallback: number) {
  const [stored, update] = splitSettings.useSettings();
  const [local, setLocal] = useState(fallback);
  const saved = persistKey ? stored.ratios[persistKey] : undefined;
  const valid = typeof saved === 'number' && saved >= 0 && saved <= 1;
  const ratio = valid ? saved : persistKey ? fallback : local;
  const setRatio = useCallback(
    (r: number) => {
      if (!persistKey) return setLocal(r);
      const ratios = splitSettings.getSettings().ratios;
      update({ ratios: { ...ratios, [persistKey]: r } });
    },
    [persistKey, update],
  );
  return [ratio, setRatio] as const;
}

const PANE = 'min-h-0 min-w-0 overflow-auto';

/**
 * Two resizable panes (spec §5). The separator is a focusable `separator`
 * (arrows 5%, Shift 20%, Home and End to the limits, Enter or double-click
 * resets) and can be dragged. Below `stackBelow` the panes stack.
 */
export const SplitPane: React.FC<SplitPaneProps> = ({
  direction,
  defaultRatio = 0.5,
  min = 0.15,
  persistKey,
  collapsible,
  stackBelow = 'md',
  separatorLabel = 'Resize panes',
  className,
  children,
}) => {
  const firstId = useId();
  const root = useRef<HTMLDivElement>(null);
  const max = 1 - min;
  const [ratio, setRatio] = useRatio(persistKey, defaultRatio);
  const [drag, setDrag] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<'start' | 'end' | null>(null);
  const wide = useMinWidth(stackBelow ? BREAKPOINT_PX[stackBelow] : null);
  const horizontal = direction === 'horizontal';

  const [first, second] = children;
  if (!wide)
    return (
      <div data-split-pane="" className={cn('flex flex-col gap-4', className)}>
        <div id={firstId} className={PANE}>
          {first}
        </div>
        <div className={PANE}>{second}</div>
      </div>
    );

  const current = clamp(drag ?? ratio, min, max);
  const resize = (r: number) => {
    setCollapsed(null);
    setRatio(tidy(clamp(r, min, max)));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? BIG_STEP : STEP;
    const from =
      collapsed === 'start' ? min : collapsed === 'end' ? max : current;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => resize(from - step),
      ArrowUp: () => resize(from - step),
      ArrowRight: () => resize(from + step),
      ArrowDown: () => resize(from + step),
      Home: () => resize(min),
      End: () => resize(max),
      Enter: () => resize(defaultRatio),
    };
    const act = keys[e.key];
    if (!act) return;
    e.preventDefault();
    act();
  };

  const ratioAt = (e: React.PointerEvent) => {
    const box = root.current?.getBoundingClientRect();
    if (!box) return current;
    const span = horizontal ? box.width : box.height;
    if (span <= 0) return current;
    const at = horizontal ? e.clientX - box.left : e.clientY - box.top;
    return clamp(at / span, min, max);
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setCollapsed(null);
    setDrag(current);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (drag !== null) setDrag(ratioAt(e));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag === null) return;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    resize(ratioAt(e));
    setDrag(null);
  };

  const valueNow =
    collapsed === 'start'
      ? 0
      : collapsed === 'end'
        ? 100
        : Math.round(current * 100);
  const icons = horizontal
    ? {
        startClose: IconPanelLeftClose,
        startOpen: IconPanelLeftOpen,
        endClose: IconPanelRightClose,
        endOpen: IconPanelRightOpen,
      }
    : {
        startClose: IconPanelTopClose,
        startOpen: IconPanelTopOpen,
        endClose: IconPanelBottomClose,
        endOpen: IconPanelBottomOpen,
      };
  const toggle = (side: 'start' | 'end') =>
    setCollapsed(collapsed === side ? null : side);
  const collapseButton = (side: 'start' | 'end') => {
    if (collapsible !== side && collapsible !== 'both') return null;
    const other = side === 'start' ? 'end' : 'start';
    if (collapsed === other) return null;
    const isCollapsed = collapsed === side;
    const which = side === 'start' ? 'first' : 'second';
    return (
      <IconButton
        size="sm"
        variant="ghost"
        label={`${isCollapsed ? 'Expand' : 'Collapse'} ${which} pane`}
        icon={
          side === 'start'
            ? isCollapsed
              ? icons.startOpen
              : icons.startClose
            : isCollapsed
              ? icons.endOpen
              : icons.endClose
        }
        onClick={() => toggle(side)}
      />
    );
  };

  return (
    <div
      ref={root}
      data-split-pane=""
      className={cn(
        'flex min-h-0 min-w-0',
        horizontal ? 'flex-row' : 'flex-col',
        className,
      )}
    >
      <div
        id={firstId}
        hidden={collapsed === 'start'}
        className={PANE}
        style={
          collapsed === 'end'
            ? { flex: '1 1 0%' }
            : { flex: `0 0 ${current * 100}%` }
        }
      >
        {first}
      </div>
      <div
        className={cn(
          'flex shrink-0 items-center gap-1',
          horizontal ? 'flex-col px-0.5' : 'flex-row py-0.5',
        )}
      >
        {collapseButton('start')}
        <div
          role="separator"
          aria-label={separatorLabel}
          aria-orientation={horizontal ? 'vertical' : 'horizontal'}
          aria-valuenow={valueNow}
          aria-valuemin={collapsed ? 0 : Math.round(min * 100)}
          aria-valuemax={collapsed ? 100 : Math.round(max * 100)}
          aria-controls={firstId}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onDoubleClick={() => resize(defaultRatio)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => setDrag(null)}
          className={cn(
            'flex-1 touch-none rounded-full bg-line outline-none transition-colors duration-fast',
            'hover:bg-line-strong focus-visible:bg-accent-indicator focus-visible:ring-2 focus-visible:ring-focus',
            drag !== null && 'bg-accent-indicator',
            horizontal
              ? 'min-h-8 w-1.5 cursor-col-resize'
              : 'h-1.5 min-w-8 cursor-row-resize',
          )}
        />
        {collapseButton('end')}
      </div>
      <div hidden={collapsed === 'end'} className={cn(PANE, 'flex-1 basis-0')}>
        {second}
      </div>
    </div>
  );
};
SplitPane.displayName = 'SplitPane';
