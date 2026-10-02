import { useLocation } from 'react-router-dom';
import { IconHome } from '@/shared/ui/icons';
import { NavList, type NavItem, type NavSection } from '@/shared/ui';
import { CATEGORIES } from '../categories';
import { useFavorites } from '../favorites';
import { useRecentToolsStore } from '../recents';
import { getEnabledTools } from '../registry';
import { categoryPath, toolPath } from '../routes';
import type { ToolManifest } from '../tool';
import { routerLink } from './router-link';

const toolItem = (t: ToolManifest, pathname: string): NavItem => ({
  href: toolPath(t),
  label: t.name,
  icon: t.icon,
  current: pathname === toolPath(t),
});

/**
 * The site navigation (6-H): Home, favourites, recent tools, then every
 * category; the current category opens to its tools with the current tool
 * highlighted. The desktop sidebar and the phone menu sheet both use it.
 */
export function AppNav({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const { ids: favIds } = useFavorites();
  const recentIds = useRecentToolsStore((s) => s.ids);
  const tools = getEnabledTools();
  const byId = new Map(tools.map((t) => [t.id, t]));
  const pick = (ids: string[]) =>
    ids.flatMap((id) => {
      const t = byId.get(id);
      return t ? [toolItem(t, pathname)] : [];
    });
  const currentCategory = pathname.split('/')[1] ?? '';

  const sections: NavSection[] = [
    {
      id: 'home',
      items: [
        { href: '/', label: 'Home', icon: IconHome, current: pathname === '/' },
      ],
    },
    { id: 'favourites', title: 'Favourites', items: pick(favIds) },
    { id: 'recent', title: 'Recent', items: pick(recentIds) },
    {
      id: 'categories',
      title: 'Hubs',
      items: [...CATEGORIES]
        .sort((a, b) => a.order - b.order)
        .map((c) => ({
          href: categoryPath(c.id),
          label: c.label,
          icon: c.icon,
          current: pathname === categoryPath(c.id),
          children:
            c.id === currentCategory
              ? tools
                  .filter(
                    (t) => t.category === c.id || t.alsoIn?.includes(c.id),
                  )
                  .map((t) => toolItem(t, pathname))
              : undefined,
        })),
    },
  ];
  return (
    <NavList
      label="Tools navigation"
      sections={sections}
      renderLink={routerLink}
      className={className}
    />
  );
}
