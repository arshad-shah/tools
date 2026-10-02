import React from 'react';
import { cn } from '@/shared/lib/cn';
import { IconChevronRight } from './icons';
import { defaultRenderLink, type RenderLink } from './link';

export interface BreadcrumbProps {
  /** Path parts after the logo, e.g. [{label:'pdf', href:'/pdf'}, {label:'edit'}]. */
  segments: { label: string; href?: string }[];
  renderLink?: RenderLink;
  className?: string;
}

/** Mono path segments separated by a chevron icon, never a character. */
export function Breadcrumb({
  segments,
  renderLink = defaultRenderLink,
  className,
}: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="flex min-w-0 items-center gap-1.5 font-mono-meta text-sm text-fg-muted">
        {segments.map((s, i) => {
          const last = i === segments.length - 1;
          // Phones keep one crumb, the parent (a way back up); the page's
          // own heading already names where you are.
          const phone = i === Math.max(0, segments.length - 2);
          return (
            <li
              key={`${i}-${s.label}`}
              className={cn(
                'flex min-w-0 items-center gap-1.5',
                !phone && 'max-sm:hidden',
              )}
            >
              {i > 0 ? (
                <IconChevronRight
                  size="xs"
                  className={cn('text-fg-subtle', phone && 'max-sm:hidden')}
                />
              ) : null}
              {last || !s.href ? (
                <span
                  aria-current={last ? 'page' : undefined}
                  className={cn('truncate', last && 'text-fg')}
                >
                  {s.label}
                </span>
              ) : (
                <React.Fragment>
                  {renderLink({
                    href: s.href,
                    className:
                      'truncate rounded-sm transition-colors duration-fast hover:text-fg pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:min-w-11 pointer-coarse:items-center',
                    children: s.label,
                  })}
                </React.Fragment>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
Breadcrumb.displayName = 'Breadcrumb';
