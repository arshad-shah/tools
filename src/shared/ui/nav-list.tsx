import { cn } from '@/shared/lib/cn';
import type { IconComponent } from './icons';
import { defaultRenderLink, type RenderLink } from './link';

export interface NavItem {
  href: string;
  label: string;
  icon?: IconComponent;
  /** The page being shown: highlighted and marked aria-current. */
  current?: boolean;
  /** Nested items, shown under this one (for example a category's tools). */
  children?: NavItem[];
}

export interface NavSection {
  id: string;
  /** Omitted for an untitled first section (for example Home). */
  title?: string;
  items: NavItem[];
}

export interface NavListProps {
  /** Accessible name of the navigation landmark. */
  label: string;
  sections: NavSection[];
  renderLink?: RenderLink;
  className?: string;
}

function Items({
  items,
  renderLink,
  depth,
}: {
  items: NavItem[];
  renderLink: RenderLink;
  depth: number;
}) {
  return (
    <ul
      className={cn(
        'grid gap-0.5',
        depth > 0 && 'mt-0.5 ml-3 border-l border-line pl-2',
      )}
    >
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <li key={it.href}>
            {renderLink({
              href: it.href,
              'aria-current': it.current ? 'page' : undefined,
              className: cn(
                'flex min-h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors duration-fast pointer-coarse:min-h-11',
                'outline-none focus-visible:outline-2 focus-visible:outline-focus',
                it.current
                  ? 'bg-accent-soft font-medium text-accent-fg'
                  : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
              ),
              children: (
                <>
                  {Icon ? <Icon size="sm" className="shrink-0" /> : null}
                  <span className="truncate">{it.label}</span>
                </>
              ),
            })}
            {it.children?.length ? (
              <Items
                items={it.children}
                renderLink={renderLink}
                depth={depth + 1}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Site navigation (6-H): titled sections of links, nested one level for a
 * category's tools, the current page highlighted and marked aria-current.
 */
export function NavList({
  label,
  sections,
  renderLink = defaultRenderLink,
  className,
}: NavListProps) {
  return (
    <nav aria-label={label} className={cn('grid gap-4', className)}>
      {sections
        .filter((s) => s.items.length > 0)
        .map((s) => {
          const headingId = `nav-${s.id}`;
          return (
            <section
              key={s.id}
              aria-labelledby={s.title ? headingId : undefined}
              className="grid gap-1"
            >
              {s.title ? (
                <h2
                  id={headingId}
                  className="px-2 font-mono-meta text-xs text-fg-subtle"
                >
                  {s.title}
                </h2>
              ) : null}
              <Items items={s.items} renderLink={renderLink} depth={0} />
            </section>
          );
        })}
    </nav>
  );
}
NavList.displayName = 'NavList';
