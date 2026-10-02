import React, { useMemo, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { LayoutContext, type ShellLayout } from './layout-context';

export interface AppShellProps {
  topBar: React.ReactNode;
  /** Main content. */
  children: React.ReactNode;
  /** Optional complementary region on the left. */
  aside?: React.ReactNode;
  asideLabel?: string;
  /** Optional complementary region on the right. */
  asideEnd?: React.ReactNode;
  asideEndLabel?: string;
  layout?: ShellLayout;
  /** Skip-link target; default 'main'. */
  mainId?: string;
  skipLinks?: SkipLink[];
  className?: string;
}

export interface SkipLink {
  href: string;
  label: string;
}

/**
 * Visually hidden links that appear on focus, first in the tab order
 * (spec §13.2). AppShell renders them; a custom frame (the PDF workspace)
 * renders them itself.
 */
export function SkipLinks({ links }: { links: readonly SkipLink[] }) {
  return (
    <>
      {links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          className="sr-only rounded-md bg-surface px-3 py-2 text-sm font-medium text-fg shadow-e2 focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-palette"
        >
          {l.label}
        </a>
      ))}
    </>
  );
}

/**
 * Page frame: skip links, a banner, optional side regions and the main
 * landmark (spec §4.6, §5.1).
 */
export function AppShell({
  topBar,
  children,
  aside,
  asideLabel = 'Sidebar',
  asideEnd,
  asideEndLabel = 'Details',
  layout: initialLayout = 'standard',
  mainId = 'main',
  skipLinks,
  className,
}: AppShellProps) {
  const [layout, setLayout] = useState<ShellLayout>(initialLayout);
  // A changed layout prop wins over the internal state (render-phase sync).
  const [prop, setProp] = useState(initialLayout);
  if (prop !== initialLayout) {
    setProp(initialLayout);
    setLayout(initialLayout);
  }
  const ctx = useMemo(() => ({ layout, setLayout }), [layout]);
  const links = skipLinks ?? [{ href: `#${mainId}`, label: 'Skip to content' }];
  return (
    <LayoutContext.Provider value={ctx}>
      <div
        data-layout={layout}
        className={cn(
          'grid min-h-dvh grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr] bg-canvas text-fg',
          className,
        )}
      >
        <div>
          <SkipLinks links={links} />
          <header role="banner">{topBar}</header>
        </div>
        <div className="flex min-h-0 min-w-0">
          {aside ? (
            <aside aria-label={asideLabel} className="shrink-0 bg-canvas">
              {aside}
            </aside>
          ) : null}
          <main
            id={mainId}
            tabIndex={-1}
            className="min-w-0 flex-1 bg-canvas outline-none"
          >
            {children}
          </main>
          {asideEnd ? (
            <aside aria-label={asideEndLabel} className="shrink-0 bg-canvas">
              {asideEnd}
            </aside>
          ) : null}
        </div>
      </div>
    </LayoutContext.Provider>
  );
}
AppShell.displayName = 'AppShell';
