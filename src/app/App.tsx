import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Center, Spinner, Stack, Text } from '@/shared/ui';
import ErrorBoundary from './ErrorBoundary';
import { TOOLS } from './registry';

const Dashboard = lazy(() => import('./Dashboard'));
const ToolLayout = lazy(() => import('./ToolLayout'));
const NotFound = lazy(() => import('./NotFound'));

// Built once at module scope: one lazy component per tool, stable across renders.
const toolRoutes = TOOLS.map((manifest) => ({
  manifest,
  Component: lazy(manifest.load),
}));

const GlobalLoadingFallback = () => (
  <Center minScreen>
    <Stack gap="4" align="center">
      <Spinner size="xl" label="Loading" />
      <Text size="lg" weight="semibold" mono>
        Loading
      </Text>
    </Stack>
  </Center>
);

const App: React.FC = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <Toaster theme="dark" richColors position="bottom-right" />
      <Suspense fallback={<GlobalLoadingFallback />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          {toolRoutes.map(({ manifest, Component }) => (
            <Route
              key={manifest.id}
              path={`/${manifest.id}/*`}
              element={
                manifest.enabled ? (
                  <ToolLayout definition={manifest} ToolComponent={Component} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
