import {
  Button,
  IconButton,
  Inline,
  Kbd,
  SideNav,
  Stack,
  ThemeToggle,
  useAppShell,
  type NavEntry,
  type NavItem,
} from '@arshad-shah/cynosure';
import { home, search, shieldCheck } from '@arshad-shah/cynosure/icons';
import { useLocation } from 'react-router-dom';
import { THEME_KEY } from '@/theme/tools-theme';
import { CATEGORIES } from '../categories';
import { useFavorites } from '../favorites';
import { useRecentToolsStore } from '../recents';
import { getEnabledTools, TOOLS } from '../registry';
import { categoryPath, toolPath } from '../routes';
import type { ToolManifest } from '../tool';
import { HelpMenu } from './HelpMenu';
import { renderRouterLink } from './router-link';

/** Recent tools listed in the navigation (spec: the last five). */
const RECENT = 5;

const toolItem = (t: ToolManifest, prefix = ''): NavItem => ({
  id: `${prefix}${toolPath(t)}`,
  label: t.name,
  href: toolPath(t),
  icon: t.icon,
});

export interface AppNavProps {
  onSearch(): void;
  onPrivacy(): void;
}

/**
 * The navigation footer (SideNav `footer`): the privacy status, the Help
 * menu and the colour mode; stacked icons in the desktop rail.
 */
function NavFooter({
  onPrivacy,
  tool,
}: {
  onPrivacy(): void;
  tool: ToolManifest | undefined;
}) {
  const { navCollapsed } = useAppShell();
  const privacy = 'Files stay on this device';
  return navCollapsed ? (
    <Stack gap="2" align="center" paddingBlock="4">
      <IconButton
        icon={shieldCheck}
        label={privacy}
        variant="ghost"
        tone="neutral"
        onClick={onPrivacy}
      />
      <HelpMenu tool={tool} />
      <ThemeToggle variant="cycle" storageKey={THEME_KEY} />
    </Stack>
  ) : (
    <Stack gap="2" paddingInline="4" paddingBlock="4">
      <Button
        variant="ghost"
        tone="neutral"
        icon={shieldCheck}
        fullWidth
        onClick={onPrivacy}
      >
        {privacy}
      </Button>
      <Inline justify="between" align="center">
        <HelpMenu tool={tool} />
        <ThemeToggle variant="cycle" storageKey={THEME_KEY} />
      </Inline>
    </Stack>
  );
}

export function AppNav({ onSearch, onPrivacy }: AppNavProps) {
  const { navCollapsed: collapsed } = useAppShell();
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
          icon: c.icon,
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
    <SideNav
      label="Tools navigation"
      items={items}
      current={pathname}
      renderLink={renderRouterLink}
      onNavigate={(id) => {
        if (id === 'search') onSearch();
      }}
      footer={<NavFooter onPrivacy={onPrivacy} tool={tool} />}
    />
  );
}
