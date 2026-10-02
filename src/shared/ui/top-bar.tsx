import React from 'react';
import { cn } from '@/shared/lib/cn';
import { Logo } from './icons';
import { defaultRenderLink, type RenderLink } from './link';

export interface TopBarProps {
  /** Usually a Breadcrumb. */
  breadcrumb?: React.ReactNode;
  /** Centre slot, e.g. the workspace filename field. */
  center?: React.ReactNode;
  /** Right-hand actions. */
  actions?: React.ReactNode;
  /** 48px instead of 56px. */
  compact?: boolean;
  homeHref?: string;
  renderLink?: RenderLink;
  className?: string;
}

/** Wordmark home link, breadcrumb, centre slot and actions. */
export function TopBar({
  breadcrumb,
  center,
  actions,
  compact,
  homeHref = '/',
  renderLink = defaultRenderLink,
  className,
}: TopBarProps) {
  return (
    <div
      className={cn(
        'flex items-center border-b border-line bg-surface',
        // Compact (Focus, phone): 44px targets in a 56px bar, tighter gutters.
        compact ? 'h-[56px] gap-2 px-2' : 'h-14 gap-4 px-4',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {renderLink({
          href: homeHref,
          className: cn(
            'inline-flex shrink-0 items-center rounded-sm text-fg transition-colors duration-fast hover:text-fg-muted pointer-coarse:min-h-touch',
            compact && 'min-h-touch',
          ),
          'aria-label': 'tools home',
          children: <Logo label="tools home" className="h-5" />,
        })}
        {breadcrumb}
      </div>
      {center ? (
        <div className="flex min-w-0 justify-center">{center}</div>
      ) : null}
      {actions ? (
        <div className="flex flex-1 items-center justify-end gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
TopBar.displayName = 'TopBar';
