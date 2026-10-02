import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LoadingState } from '@/shared/ui';
import ErrorBoundary from './ErrorBoundary';
import { getEnabledTools } from './registry';
import { toolPath } from './routes';
import { ToolPage } from './pages/ToolPage';

const AppFrame = lazy(() => import('./shell/AppFrame'));
const Home = lazy(() => import('./pages/Home'));
const HubRoute = lazy(() => import('./pages/HubRoute'));
const NotFound = lazy(() => import('./pages/NotFound'));
// Dev-only kit gallery (decision G18): absent from production builds. It
// stays outside AppFrame: its AppShell example renders its own landmarks.
const KitGallery = import.meta.env.DEV
  ? lazy(() => import('./gallery/KitGallery'))
  : null;

// Built once at module scope: one lazy component per tool, stable across
// renders. Disabled tools get no route (clean break, spec §3).
const toolRoutes = getEnabledTools().map((manifest) => ({
  manifest,
  Component: lazy(manifest.load),
}));

const App: React.FC = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <Suspense fallback={<LoadingState label="Loading" />}>
        <Routes>
          {KitGallery ? <Route path="/__kit" element={<KitGallery />} /> : null}
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
);

export default App;
