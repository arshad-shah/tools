import { CynosureTheme } from '@arshad-shah/cynosure';
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useTheme, useThemeSync } from '@/shared/lib/theme';
import { Toaster } from '@/shared/ui';
import { toolsTheme } from '@/theme/tools-theme';
import ErrorBoundary from './ErrorBoundary';
import { getEnabledTools, getWorkspaceTool } from './registry';
import { toolPath } from './routes';
import { ToolPage } from './pages/ToolPage';
import { PageLoading } from './ui/PageLoading';

const AppFrame = lazy(() => import('./shell/AppFrame'));
const WorkspaceFrame = lazy(() => import('./shell/WorkspaceFrame'));
const Home = lazy(() => import('./pages/Home'));
const HubRoute = lazy(() => import('./pages/HubRoute'));
const NotFound = lazy(() => import('./pages/NotFound'));
// Dev-only kit gallery (decision G18): absent from production builds. It
// stays outside AppFrame: its AppShell example renders its own landmarks.
const KitGallery = import.meta.env.DEV
  ? lazy(() => import('./gallery/KitGallery'))
  : null;

// Built once at module scope: one lazy component per tool, stable across
// renders. Disabled tools get no route (clean break, spec §3). The
// workspace has its own route and frame.
const toolRoutes = getEnabledTools()
  .filter((t) => t.kind !== 'workspace')
  .map((manifest) => ({ manifest, Component: lazy(manifest.load) }));
const workspace = getWorkspaceTool();
const Workspace = workspace ? lazy(workspace.load) : null;

/**
 * The tools theme on the whole document (redesign spec, rule 4), in the
 * colour mode saved under tools:theme.
 */
function Theme({ children }: { children: React.ReactNode }) {
  const { preference } = useTheme();
  useThemeSync();
  return (
    <CynosureTheme theme={toolsTheme} mode={preference} target="document">
      {children}
    </CynosureTheme>
  );
}

const App: React.FC = () => (
  <Theme>
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            {KitGallery ? (
              <Route
                path="/__kit"
                element={
                  <>
                    <Toaster />
                    <KitGallery />
                  </>
                }
              />
            ) : null}
            {workspace && Workspace ? (
              <Route element={<WorkspaceFrame />}>
                <Route
                  path="/pdf/edit/:mode?"
                  element={<Workspace definition={workspace} />}
                />
              </Route>
            ) : null}
            <Route element={<AppFrame />}>
              <Route path="/" element={<Home />} />
              <Route path="/:category" element={<HubRoute />} />
              {toolRoutes.map(({ manifest, Component }) => (
                <Route
                  key={manifest.id}
                  path={toolPath(manifest)}
                  element={
                    <ToolPage tool={manifest}>
                      <Component definition={manifest} />
                    </ToolPage>
                  }
                />
              ))}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  </Theme>
);

export default App;
