import type { MouseEvent } from 'react';
import { Breadcrumbs } from '@arshad-shah/cynosure';
import { useMediaQuery } from '@/shared/lib/media-query';

export interface BreadcrumbProps {
  /** Path parts after the logo, e.g. [{label:'pdf', href:'/pdf'}, {label:'edit'}]. */
  segments: { label: string; href?: string }[];
  /**
   * Client-side navigation: called with a crumb's href instead of a page load
   * (a plain click; modified clicks still open the link the browser's way).
   */
  onNavigate?: (href: string) => void;
  /** Layout only. */
  className?: string;
}

const PHONE = '(max-width: 639px)';

const plainClick = (e: MouseEvent<HTMLElement>) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/**
 * Cynosure `Breadcrumbs`: links up the path, the last segment the current
 * page. Phones keep the first crumb and the page, the rest behind "more".
 */
export function Breadcrumb({
  segments,
  onNavigate,
  className,
}: BreadcrumbProps) {
  const phone = useMediaQuery(PHONE);
  return (
    <Breadcrumbs
      size="sm"
      maxItems={phone ? 2 : undefined}
      className={className}
      items={segments.map(({ label, href }) => ({
        label,
        ...(href ? { href } : {}),
        ...(href && onNavigate
          ? {
              onClick: (e: MouseEvent<HTMLElement>) => {
                if (!plainClick(e)) return;
                e.preventDefault();
                onNavigate(href);
              },
            }
          : {}),
      }))}
    />
  );
}
Breadcrumb.displayName = 'Breadcrumb';
