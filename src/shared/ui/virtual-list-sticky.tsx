import React from 'react';

/**
 * Visual copy of the current header pinned to the top of the scroll region.
 * The real header row stays in the list for assistive technology, so the
 * copy is aria-hidden and inert. Zero height so it never shifts the rows.
 */
export function StickyOverlay({
  push,
  children,
}: {
  push: number;
  children: React.ReactNode;
}) {
  return (
    <div
      data-vl-sticky=""
      aria-hidden="true"
      inert
      className="sticky top-0 z-10 h-0 overflow-visible"
    >
      <div
        className="bg-surface"
        style={{ transform: `translateY(${push}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
