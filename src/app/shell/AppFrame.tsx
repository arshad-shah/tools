import {
  AppShell,
  Breadcrumbs,
  Divider,
  EmptyState,
  IconButton,
  IconTile,
  Inline,
  Link,
  ListRow,
  ListRows,
  Sheet,
  SideNav,
  Toaster,
  useAppShell,
  useToast,
} from '@arshad-shah/cynosure';
import { home, search, sidebar, star } from '@arshad-shah/cynosure/icons';
import { fileText } from '@arshad-shah/cynosure/icons';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { connectToaster } from '@/shared/lib/notify';
import { Logo } from '@/shared/ui/icons/brand/Logo';
import { useFavorites } from '../favorites';
import { useNavStore, useRecentToolsStore } from '../recents';
import { getEnabledTools, TOOLS } from '../registry';
import { toolPath } from '../routes';
import { toolGlyph } from '../ui/glyphs';
import { AppNav, NavRouterLink } from './AppNav';
import { AppPalette } from './AppPalette';
import { useBreadcrumbSegments } from './breadcrumb';
import { BreadcrumbProvider } from './breadcrumb-context';
import { HelpContext } from './help-context';
import { useHelpDialogs } from './HelpDialogs';
import { KeepAliveOutlet } from './keep-alive';
import { PaletteContext } from './palette';
import { useAppCommands } from './use-app-commands';
import { useClientLinks } from './use-client-links';

/** Hands the Toaster's API to `notify`, which code outside React calls. */
export function NotifyBridge() {
  const api = useToast();
  useEffect(() => {
    connectToaster(api);
    return () => connectToaster(null);
  }, [api]);
  return null;
}

/**
 * New pages start at the top; Back and Forward return to where each page
 * was scrolled (positions per history entry, in memory only). The shell's
 * `<main>` is what scrolls.
 */
function useScrollRestore() {
  const { key } = useLocation();
  const type = useNavigationType();
  const positions = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    const saved = type === 'POP' ? positions.current.get(key) : undefined;
    main.scrollTo?.(0, saved ?? 0);
    const map = positions.current;
    return () => {
      map.set(key, main.scrollTop);
    };
  }, [key, type]);
}

/** The top bar: the rail toggle, the logo and where you are. */
function HeaderBar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle(): void;
}) {
  const { narrow } = useAppShell();
  const navigate = useNavigate();
  const segments = useBreadcrumbSegments();
  return (
    <Inline gap="4" align="center" grow minSize="0">
      {narrow ? null : (
        <IconButton
          icon={sidebar}
          label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-pressed={!collapsed}
          variant="ghost"
          tone="neutral"
          onClick={onToggle}
        />
      )}
      <Link href="/" underline="none" tone="neutral">
        <Logo />
      </Link>
      {!narrow && segments.length ? (
        <>
          <Divider orientation="vertical" />
          <Breadcrumbs
            size="sm"
            items={[
              { label: 'Home', href: '/' },
              ...segments.map((s) =>
                s.href
                  ? {
                      label: s.label,
                      href: s.href,
                      onClick: (e: React.MouseEvent<HTMLElement>) => {
                        e.preventDefault();
                        navigate(s.href!);
                      },
                    }
                  : { label: s.label },
              ),
            ]}
          />
        </>
      ) : null}
    </Inline>
  );
}

/** Favourites from the phone tab bar. */
function FavouritesSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const { ids } = useFavorites();
  const tools = getEnabledTools();
  const list = ids.flatMap((id) => tools.filter((t) => t.id === id));
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      side="bottom"
      title="Favourites"
    >
      {list.length ? (
        <ListRows label="Favourite tools">
          {list.map((t) => (
            <ListRow
              key={t.id}
              href={toolPath(t)}
              label={t.name}
              description={t.description}
              leading={<IconTile icon={toolGlyph(t.id)} size="sm" />}
              onClick={() => onOpenChange(false)}
            />
          ))}
        </ListRows>
      ) : (
        <EmptyState
          size="sm"
          icon={star}
          title="No favourites yet"
          description="Star a tool on its page to keep it here."
        />
      )}
    </Sheet>
  );
}

function Frame() {
  const { pathname } = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [favouritesOpen, setFavouritesOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  useAppCommands();
  useScrollRestore();
  useClientLinks();
  const { dialogs: helpDialogs, ...help } = useHelpDialogs();

  const collapsed = useNavStore((s) => s.collapsed);
  const toggleNav = useNavStore((s) => s.toggle);
  const visit = useRecentToolsStore((s) => s.visit);
  const tool = TOOLS.find((t) => toolPath(t) === pathname);

  // Remember tool visits for the Recent list.
  useEffect(() => {
    if (tool) visit(tool.id);
  }, [tool, visit]);

  const tab =
    pathname === '/' ? '/' : pathname.startsWith('/pdf') ? '/pdf' : '';

  return (
    <PaletteContext.Provider value={openPalette}>
      <HelpContext.Provider value={help}>
        <AppShell
          collapseBelow={1024}
          onNarrowChange={setNarrow}
          labels={{ nav: 'Menu', openNav: 'Menu' }}
          header={<HeaderBar collapsed={collapsed} onToggle={toggleNav} />}
          nav={
            <AppNav
              collapsed={collapsed && !narrow}
              onCollapsedChange={(c) => c !== collapsed && toggleNav()}
              onSearch={openPalette}
              onPrivacy={help.openPrivacy}
            />
          }
          tabs={
            <SideNav
              label="Sections"
              layout="bar"
              current={tab}
              renderLink={(props) => <NavRouterLink {...props} />}
              onNavigate={(id) => {
                if (id === 'search') openPalette();
                else if (id === 'favourites') setFavouritesOpen(true);
              }}
              items={[
                { id: '/', label: 'Home', href: '/', icon: home },
                { id: 'search', label: 'Search', icon: search },
                { id: 'favourites', label: 'Favourites', icon: star },
                { id: '/pdf', label: 'PDF', href: '/pdf', icon: fileText },
              ]}
            />
          }
        >
          <KeepAliveOutlet />
        </AppShell>
        <AppPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        <FavouritesSheet
          open={favouritesOpen}
          onOpenChange={setFavouritesOpen}
        />
        {helpDialogs}
        <Toaster position={narrow ? 'top-center' : 'bottom-end'}>
          <NotifyBridge />
        </Toaster>
      </HelpContext.Provider>
    </PaletteContext.Provider>
  );
}

/**
 * Layout route (redesign spec, Shell): Cynosure's AppShell with the
 * navigation, the top bar, the phone tab bar, the Mod+K palette and toasts.
 */
export default function AppFrame() {
  return (
    <BreadcrumbProvider>
      <Frame />
    </BreadcrumbProvider>
  );
}
