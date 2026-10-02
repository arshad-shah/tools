import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useCommands } from '@/shared/lib/commands';
import { useTheme } from '@/shared/lib/theme';
import { IconSearch } from '@/shared/ui/icons';
import {
  AppShell,
  Breadcrumb,
  Button,
  CommandPalette,
  ShortcutHint,
  Toaster,
  TopBar,
  useCommandPaletteHotkey,
} from '@/shared/ui';
import {
  favouriteCommands,
  routeCommands,
  themeCommands,
  toolCommands,
} from '../commands/app-commands';
import { useFavoritesStore } from '../favorites';
import Footer from '../Footer';
import { TOOLS } from '../registry';
import { toolPath } from '../routes';
import { useBreadcrumbSegments } from './breadcrumb';
import { BreadcrumbProvider } from './breadcrumb-context';
import { PaletteContext } from './palette';
import { routerLink } from './router-link';
import { ThemeMenu } from './ThemeMenu';

function Frame() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const segments = useBreadcrumbSegments();
  const { setPreference } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  useCommandPaletteHotkey(setPaletteOpen);

  // Registration order is the empty-query group order: favourites first.
  useCommands(
    favouriteCommands(navigate, () => useFavoritesStore.getState().ids, TOOLS),
    [navigate],
  );
  useCommands(routeCommands(navigate), [navigate]);
  useCommands(toolCommands(navigate, TOOLS), [navigate]);
  useCommands(themeCommands(setPreference), [setPreference]);

  // A new page starts at the top.
  // Braces: newer browsers return a Promise from scrollTo, which React
  // would take for a cleanup function.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <PaletteContext.Provider value={openPalette}>
      <AppShell
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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={openPalette}
                  leftIcon={<IconSearch size="sm" />}
                  rightIcon={<ShortcutHint keys="Mod+K" />}
                  className="text-fg-muted"
                >
                  Search
                </Button>
                <ThemeMenu />
              </>
            }
          />
        }
      >
        <div className="flex min-h-full flex-col">
          <div className="flex-1">
            <Outlet />
          </div>
          <Footer tool={TOOLS.find((t) => toolPath(t) === pathname)} />
        </div>
      </AppShell>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <Toaster />
    </PaletteContext.Provider>
  );
}

/** Layout route: AppShell with TopBar, Mod+K palette, toasts and footer. */
export default function AppFrame() {
  return (
    <BreadcrumbProvider>
      <Frame />
    </BreadcrumbProvider>
  );
}
