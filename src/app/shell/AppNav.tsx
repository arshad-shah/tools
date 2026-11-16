import {
  Inline,
  Kbd,
  SideNav,
  Stack,
  ThemeToggle,
  type NavEntry,
  type NavItem,
  type NavLinkProps,
} from '@arshad-shah/cynosure';
import { home, search, shieldCheck } from '@arshad-shah/cynosure/icons';
import { Link, useLocation } from 'react-router-dom';
import { THEME_KEY } from '@/theme/tools-theme';
import { CATEGORIES } from '../categories';
import { useFavorites } from '../favorites';
import { useRecentToolsStore } from '../recents';
import { getEnabledTools, TOOLS } from '../registry';
import { categoryPath, toolPath } from '../routes';
import type { ToolManifest } from '../tool';
import { categoryGlyph, toolGlyph } from '../ui/glyphs';
import { HelpMenu } from './HelpMenu';

/** Recent tools listed in the navigation (spec: the last five). */
const RECENT = 5;

/** SideNav links through the router (client-side navigation). */
export function NavRouterLink({ href, ...rest }: NavLinkProps) {
  return <Link to={href} {...rest} />;
}
const renderNavLink = (props: NavLinkProps) => <NavRouterLink {...props} />;

const toolItem = (t: ToolManifest, prefix = ''): NavItem => ({
  id: `${prefix}${toolPath(t)}`,
  label: t.name,
  href: toolPath(t),
  icon: toolGlyph(t.id),
});

export interface AppNavProps {
  /** The desktop rail shows icons only. */
  collapsed?: boolean;
  onCollapsedChange?(collapsed: boolean): void;
  onSearch(): void;
  onPrivacy(): void;
}

/**
 * The site navigation (redesign spec, Shell): Search, Home, Favourites,
 * the last five tools, then every category as a group of its tools (the
 * current one open). The footer holds the privacy status, the Help menu
 * and the colour mode. The desktop rail and the phone drawer both use it.
 */
export function AppNav({
  collapsed = false,
  onCollapsedChange,
  onSearch,
  onPrivacy,
}: AppNavProps) {
  const { pathname } = useLocation();
  const { ids: favIds } = useFavorites();
  const recentIds = useRecentToolsStore((s) => s.ids);
  const tools = getEnabledTools();
  const byId = new Map(tools.map((t) => [t.id, t]));
  const pick = (ids: string[], prefix: string) =>
    ids.flatMap((id) => {
      const t = byId.get(id);
      return t ? [toolItem(t, prefix)] : [];
    });
  const favourites = pick(favIds, 'favourite:');
  const recent = pick(recentIds, 'recent:').slice(0, RECENT);
  const tool = TOOLS.find((t) => toolPath(t) === pathname);

  const items: NavEntry[] = [
    {
      id: 'search',
      label: 'Search tools',
      icon: search,
      badge: collapsed ? undefined : <Kbd keys="mod+k" size="sm" />,
    },
    { id: '/', label: 'Home', href: '/', icon: home },
    ...(favourites.length ? [{ label: 'Favourites', items: favourites }] : []),
    ...(recent.length ? [{ label: 'Recent', items: recent }] : []),
    {
      label: 'Categories',
      items: [...CATEGORIES]
        .sort((a, b) => a.order - b.order)
        .map((c) => ({
          id: `category:${c.id}`,
          label: c.label,
          icon: categoryGlyph(c.id),
          items: [
            {
              id: categoryPath(c.id),
              label: `All ${c.label} tools`,
              href: categoryPath(c.id),
            },
            ...tools.filter((t) => t.category === c.id).map((t) => toolItem(t)),
          ],
        })),
    },
  ];

  return (
    <Stack fill gap="0">
      <Stack grow minSize="0" overflow="auto">
        <SideNav
          label="Tools navigation"
          items={items}
          current={pathname}
          collapsed={collapsed}
          onCollapsedChange={onCollapsedChange}
          renderLink={renderNavLink}
          onNavigate={(id) => {
            if (id === 'search') onSearch();
            else if (id === 'privacy') onPrivacy();
          }}
          footer={[
            {
              id: 'privacy',
              label: 'Files stay on this device',
              icon: shieldCheck,
            },
          ]}
        />
      </Stack>
      {collapsed ? (
        <Stack gap="2" align="center" paddingBlock="4">
          <HelpMenu tool={tool} />
          <ThemeToggle variant="cycle" storageKey={THEME_KEY} />
        </Stack>
      ) : (
        <Inline
          justify="between"
          align="center"
          paddingInline="5"
          paddingBlock="4"
        >
          <HelpMenu tool={tool} />
          <ThemeToggle variant="cycle" storageKey={THEME_KEY} />
        </Inline>
      )}
    </Stack>
  );
}
