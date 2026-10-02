import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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
import Footer from '../Footer';
import { TOOLS } from '../registry';
import { toolPath } from '../routes';
import { useBreadcrumbSegments } from './breadcrumb';
import { BreadcrumbProvider } from './breadcrumb-context';
import { PaletteContext } from './palette';
import { routerLink } from './router-link';
import { ThemeMenu } from './ThemeMenu';
import { useAppCommands } from './use-app-commands';

function Frame() {
  const { pathname } = useLocation();
  const segments = useBreadcrumbSegments();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  useCommandPaletteHotkey(setPaletteOpen);

  useAppCommands();

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
