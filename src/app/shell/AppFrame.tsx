import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useMediaQuery } from '@/shared/lib/media-query';
import { IconMenu, IconPanelLeft, IconSearch } from '@/shared/ui/icons';
import {
  AppShell,
  Breadcrumb,
  Button,
  CommandPalette,
  Drawer,
  IconButton,
  ShortcutHint,
  Toaster,
  TopBar,
  useCommandPaletteHotkey,
} from '@/shared/ui';
import Footer from '../Footer';
import { useNavStore, useRecentToolsStore } from '../recents';
import { TOOLS } from '../registry';
import { toolPath } from '../routes';
import { AppNav } from './AppNav';
import { useBreadcrumbSegments } from './breadcrumb';
import { BreadcrumbProvider } from './breadcrumb-context';
import { KeepAliveOutlet } from './keep-alive';
import { PaletteContext } from './palette';
import { routerLink } from './router-link';
import { ThemeMenu } from './ThemeMenu';
import { useAppCommands } from './use-app-commands';

const DESKTOP = '(min-width: 1024px)';

/**
 * New pages start at the top; Back and Forward return to where each page
 * was scrolled (positions per history entry, kept in memory only).
 */
function useScrollRestore() {
  const { key } = useLocation();
  const type = useNavigationType();
  const positions = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const saved = type === 'POP' ? positions.current.get(key) : undefined;
    window.scrollTo(0, saved ?? 0);
    const map = positions.current;
    return () => {
      map.set(key, window.scrollY);
    };
  }, [key, type]);
}

function Frame() {
  const { pathname } = useLocation();
  const segments = useBreadcrumbSegments();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  useCommandPaletteHotkey(setPaletteOpen);
  useAppCommands();
  useScrollRestore();

  const desktop = useMediaQuery(DESKTOP);
  const collapsed = useNavStore((s) => s.collapsed);
  const toggleNav = useNavStore((s) => s.toggle);
  const visit = useRecentToolsStore((s) => s.visit);
  const tool = TOOLS.find((t) => toolPath(t) === pathname);

  // Remember tool visits for the Recent list.
  useEffect(() => {
    if (tool) visit(tool.id);
  }, [tool, visit]);
  // Every navigation closes the phone menu.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    if (menuOpen) setMenuOpen(false);
  }

  const home = pathname === '/';
  const showNav = desktop && !collapsed;

  return (
    <PaletteContext.Provider value={openPalette}>
      <AppShell
        aside={
          showNav ? (
            <div className="sticky top-0 max-h-dvh w-60 overflow-y-auto border-r border-line px-3 py-4">
              <AppNav />
            </div>
          ) : undefined
        }
        asideLabel="Site navigation"
        topBar={
          <TopBar
            renderLink={routerLink}
            breadcrumb={
              segments.length ? (
                <Breadcrumb segments={segments} renderLink={routerLink} />
              ) : undefined
            }
            actions={
              <>
                {desktop ? (
                  <IconButton
                    variant="ghost"
                    label="Navigation"
                    showLabel="desktop"
                    aria-pressed={!collapsed}
                    icon={IconPanelLeft}
                    onClick={toggleNav}
                  />
                ) : (
                  <IconButton
                    variant="ghost"
                    label="Menu"
                    aria-haspopup="dialog"
                    aria-expanded={menuOpen}
                    icon={IconMenu}
                    onClick={() => setMenuOpen(true)}
                  />
                )}
                {/* Home has its own search field; one search control per page. */}
                {home ? null : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={openPalette}
                    leftIcon={<IconSearch size="sm" />}
                    rightIcon={<ShortcutHint keys="Mod+K" />}
                    className="text-fg-muted max-sm:min-w-11 max-sm:px-0"
                  >
                    {/* Icon only on phones; the name stays for screen readers. */}
                    <span className="max-sm:sr-only">Search</span>
                  </Button>
                )}
                <ThemeMenu />
              </>
            }
          />
        }
      >
        <div className="flex min-h-full flex-col">
          <div className="flex-1">
            <KeepAliveOutlet />
          </div>
          <Footer tool={tool} />
        </div>
      </AppShell>
      {desktop ? null : (
        <Drawer
          open={menuOpen}
          onOpenChange={setMenuOpen}
          side="left"
          title="Menu"
        >
          <AppNav />
        </Drawer>
      )}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <Toaster />
    </PaletteContext.Provider>
  );
}

/** Layout route: AppShell with TopBar, navigation, Mod+K palette, toasts and footer. */
export default function AppFrame() {
  return (
    <BreadcrumbProvider>
      <Frame />
    </BreadcrumbProvider>
  );
}
