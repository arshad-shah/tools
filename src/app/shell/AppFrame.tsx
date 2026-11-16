import {
  AppShell,
  Breadcrumbs,
  EmptyState,
  IconTile,
  Link,
  ListRow,
  ListRows,
  Sheet,
  SideNav,
  Toaster,
  useAppShell,
} from '@arshad-shah/cynosure';
import { home, search, star } from '@arshad-shah/cynosure/icons';
import { fileText } from '@arshad-shah/cynosure/icons';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { NotifyBridge } from '@/shared/lib/notify-bridge';
import { Logo, LogoMark } from '@/shared/surfaces/logo/Logo';
import { useFavorites } from '../favorites';
import { useRecentToolsStore } from '../recents';
import { getEnabledTools, TOOLS } from '../registry';
import { toolPath } from '../routes';
import { AppNav } from './AppNav';
import { AppPalette } from './AppPalette';
import { useBreadcrumbSegments } from './breadcrumb';
import { BreadcrumbProvider } from './breadcrumb-context';
import { HelpContext } from './help-context';
import { useHelpDialogs } from './HelpDialogs';
import { KeepAliveOutlet } from './keep-alive';
import { PaletteContext } from './palette';
import { useAppCommands } from './use-app-commands';
import { renderRouterLink } from './router-link';

/** The desktop rail's state, kept between visits (AppShell navCollapsedKey). */
const NAV_COLLAPSED_KEY = 'tools:nav-collapsed';

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

/** The product mark at the head of the navigation (the caret tile in the rail). */
function Brand() {
  const { navCollapsed } = useAppShell();
  return (
    <Link
      href="/"
      renderLink={renderRouterLink}
      underline="none"
      tone="neutral"
      aria-label="tools home"
    >
      {navCollapsed ? <LogoMark size={28} label="tools home" /> : <Logo />}
    </Link>
  );
}

/** The top bar: where you are. */
function HeaderBar() {
  const { narrow } = useAppShell();
  const segments = useBreadcrumbSegments();
  return narrow || !segments.length ? null : (
    <Breadcrumbs
      size="sm"
      renderLink={renderRouterLink}
      items={[
        { label: 'Home', href: '/' },
        ...segments.map((s) =>
          s.href ? { label: s.label, href: s.href } : { label: s.label },
        ),
      ]}
    />
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
              renderLink={renderRouterLink}
              label={t.name}
              description={t.description}
              leading={<IconTile icon={t.icon} size="sm" />}
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
  const { dialogs: helpDialogs, ...help } = useHelpDialogs();

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
        <Toaster position={narrow ? 'top-center' : 'bottom-end'}>
          <NotifyBridge />
          <AppShell
            collapseBelow={1024}
            onNarrowChange={setNarrow}
            labels={{ nav: 'Menu', openNav: 'Menu' }}
            brand={<Brand />}
            navToggle
            navCollapsedKey={NAV_COLLAPSED_KEY}
            header={<HeaderBar />}
            nav={<AppNav onSearch={openPalette} onPrivacy={help.openPrivacy} />}
            tabs={
              <SideNav
                label="Sections"
                layout="bar"
                current={tab}
                renderLink={renderRouterLink}
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
