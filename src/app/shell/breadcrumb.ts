import { createContext, useContext, useEffect } from 'react';

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

export const BreadcrumbSetterContext = createContext<
  ((segments: BreadcrumbSegment[]) => void) | null
>(null);
export const BreadcrumbValueContext = createContext<BreadcrumbSegment[]>([]);

/** The breadcrumb set by the page currently mounted. */
export function useBreadcrumbSegments(): BreadcrumbSegment[] {
  return useContext(BreadcrumbValueContext);
}

/** Sets the TopBar breadcrumb while the calling page is mounted. */
export function useBreadcrumb(segments: BreadcrumbSegment[]): void {
  const set = useContext(BreadcrumbSetterContext);
  // Compared by content: callers pass fresh arrays on every render.
  const key = JSON.stringify(segments);
  useEffect(() => {
    if (!set) return;
    set(JSON.parse(key) as BreadcrumbSegment[]);
    return () => set([]);
  }, [set, key]);
}
