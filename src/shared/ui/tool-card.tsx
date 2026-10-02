import { useId } from 'react';
import { cn } from '@/shared/lib/cn';
import { Badge } from './badge';
import { IconStar, IconStarFilled, type IconComponent } from './icons';
import { defaultRenderLink, type RenderLink } from './link';

export interface ToolCardProps {
  href: string;
  renderLink?: RenderLink;
  icon: IconComponent;
  title: string;
  description: string;
  /** Cross-list tag, e.g. 'pdf'. */
  tag?: string;
  isNew?: boolean;
  /** A separate toggle button, outside the link. */
  favourite?: { active: boolean; onToggle(): void };
  className?: string;
}

/**
 * Card whose whole surface is one link, named by the title and described by
 * the description (tags stay out of the name).
 */
export function ToolCard({
  href,
  renderLink = defaultRenderLink,
  icon: Icon,
  title,
  description,
  tag,
  isNew,
  favourite,
  className,
}: ToolCardProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  return (
    <div
      className={cn(
        'group/card relative rounded-lg bg-surface shadow-e1 transition-colors duration-fast ease-out-soft hover:bg-surface-2',
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus',
        className,
      )}
    >
      {renderLink({
        href,
        'aria-labelledby': titleId,
        'aria-describedby': descId,
        className:
          'flex h-full flex-col gap-3 rounded-lg p-4 pr-14 outline-none sm:pr-12',
        children: (
          <>
            <span className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-accent-fg group-hover/card:bg-surface-3">
                <Icon size="md" />
              </span>
              <span
                id={titleId}
                className="min-w-0 flex-1 truncate font-medium text-fg"
              >
                {title}
              </span>
            </span>
            <span id={descId} className="line-clamp-2 text-sm text-fg-muted">
              {description}
            </span>
            {tag || isNew ? (
              <span className="flex flex-wrap gap-1.5">
                {tag ? (
                  <Badge size="xs" tone="neutral">
                    {tag}
                  </Badge>
                ) : null}
                {isNew ? (
                  <Badge size="xs" tone="accent">
                    new
                  </Badge>
                ) : null}
              </span>
            ) : null}
          </>
        ),
      })}
      {favourite ? (
        <button
          type="button"
          aria-pressed={favourite.active}
          aria-label={`Favourite ${title}`}
          onClick={favourite.onToggle}
          className={cn(
            // 44px touch target on phones (spec §13.2), 32px from sm up.
            'absolute top-1.5 right-1.5 inline-flex size-touch items-center justify-center rounded-md transition-colors duration-fast hover:bg-surface-3 sm:top-3 sm:right-3 sm:size-8',
            favourite.active
              ? 'text-accent-fg'
              : 'text-fg-subtle hover:text-fg',
          )}
        >
          {favourite.active ? (
            <IconStarFilled size="sm" />
          ) : (
            <IconStar size="sm" />
          )}
        </button>
      ) : null}
    </div>
  );
}
ToolCard.displayName = 'ToolCard';
