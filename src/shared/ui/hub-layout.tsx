import React, { useId } from 'react';
import { cn } from '@/shared/lib/cn';
import { AutoGrid } from './auto-grid';
import type { IconComponent } from './icons';

export interface HubLayoutProps {
  icon: IconComponent;
  title: string;
  blurb: string;
  /** Usually a DropZone variant="hero". */
  dropZone?: React.ReactNode;
  groups: { id: string; label?: string; children: React.ReactNode }[];
  headerActions?: React.ReactNode;
  className?: string;
}

/** Category hub: header, optional drop zone, then grouped card grids. */
export function HubLayout({
  icon: Icon,
  title,
  blurb,
  dropZone,
  groups,
  headerActions,
  className,
}: HubLayoutProps) {
  const id = useId();
  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6',
        className,
      )}
    >
      <header className="flex flex-wrap items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface text-accent-fg shadow-e1">
          <Icon size="lg" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {title}
          </h1>
          <p className="max-w-2xl text-base text-fg-muted">{blurb}</p>
        </div>
        {headerActions ? (
          <div className="flex items-center gap-2">{headerActions}</div>
        ) : null}
      </header>
      {dropZone}
      {groups.map((g) => {
        const headingId = `${id}-${g.id}`;
        return (
          <section
            key={g.id}
            aria-labelledby={g.label ? headingId : undefined}
            className="flex flex-col gap-3"
          >
            {g.label ? (
              <h2
                id={headingId}
                className="font-mono-meta text-xs tracking-wide text-fg-subtle uppercase"
              >
                {g.label}
              </h2>
            ) : null}
            <AutoGrid min={240} gap="3">
              {g.children}
            </AutoGrid>
          </section>
        );
      })}
    </div>
  );
}
HubLayout.displayName = 'HubLayout';
