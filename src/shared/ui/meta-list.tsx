import React from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Inline list of meta values (sizes, counts, dates). Items are separated by
 * a decorative dot element, never a character (spec 1A R3).
 */
export function MetaList({
  items,
  className,
}: {
  items: React.ReactNode[];
  className?: string;
}) {
  return (
    <ul
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 font-mono-meta text-xs text-fg-subtle',
        className,
      )}
    >
      {items.map((item, i) => (
        <li key={i} className="inline-flex items-center gap-2">
          {i > 0 ? (
            <span
              aria-hidden="true"
              data-separator=""
              className="size-1 shrink-0 rounded-full bg-fg-subtle"
            />
          ) : null}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
MetaList.displayName = 'MetaList';
