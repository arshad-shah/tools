import { useId } from 'react';
import { cn } from '@/shared/lib/cn';
import type { IconComponent } from './icons';
import { defaultRenderLink, type RenderLink } from './link';
import { MetaList } from './meta-list';

export interface CategoryCardProps {
  href: string;
  renderLink?: RenderLink;
  icon: IconComponent;
  label: string;
  count: number;
  /** Up to three tool names. */
  topTools: string[];
  className?: string;
}

/**
 * Card for a category: the link is named by the label and described by the
 * tool count; the top tools list sits outside the link.
 */
export function CategoryCard({
  href,
  renderLink = defaultRenderLink,
  icon: Icon,
  label,
  count,
  topTools,
  className,
}: CategoryCardProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const countId = `${id}-count`;
  return (
    <div
      className={cn(
        'flex flex-col rounded-lg bg-surface shadow-e1 transition-colors duration-fast ease-out-soft hover:bg-surface-2',
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus',
        className,
      )}
    >
      {renderLink({
        href,
        'aria-labelledby': labelId,
        'aria-describedby': countId,
        className: 'flex items-center gap-3 rounded-lg p-4 outline-none',
        children: (
          <>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-accent-fg">
              <Icon size="md" />
            </span>
            <span className="min-w-0 flex-1">
              <span id={labelId} className="block truncate font-medium text-fg">
                {label}
              </span>
              <span
                id={countId}
                className="block font-mono-meta text-xs text-fg-subtle"
              >
                {count === 1 ? '1 tool' : `${count} tools`}
              </span>
            </span>
          </>
        ),
      })}
      {topTools.length ? (
        <MetaList items={topTools.slice(0, 3)} className="px-4 pb-4" />
      ) : null}
    </div>
  );
}
CategoryCard.displayName = 'CategoryCard';
