// src/App.tsx

import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Center, Stack, Spinner, Text } from './components/ui';
import { TOOL_DEFINITIONS } from './data/ToolDefinitions';
import { getToolComponent } from './registry/ToolRegistry';
import ErrorBoundary from './components/ErrorBoundary';
// Lazy load components for better performance
const Dashboard = lazy(() => import('./components/Dashboard'));
const ToolLayout = lazy(() => import('./components/ToolLayout'));
const NotFound = lazy(() => import('./components/NotFound'));

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

/**
 * Main Application component with routing setup
 * Uses React.lazy for code splitting and Suspense for loading states
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<GlobalLoadingFallback />}>
          <Routes>
            {/* Dashboard as home route */}
            <Route path="/" element={<Dashboard />} />

            {/* Dynamically generate routes based on tool definitions */}
            {TOOL_DEFINITIONS.map((toolDefinition) => {
              // Lazy load each tool component when needed
              const LazyToolComponent = lazy(() =>
                Promise.resolve(getToolComponent(toolDefinition.id)).then(
                  (component) => {
                    if (!component) {
                      console.warn(
                        `No component registered for tool: ${toolDefinition.id}`,
                      );
                      throw new Error(
                        `Tool component not found: ${toolDefinition.id}`,
                      );
                    }
                    return { default: component };
                  },
                ),
              );

              return (
                <Route
                  key={toolDefinition.id}
                  path={`/${toolDefinition.id}/*`}
                  element={
                    toolDefinition.enabled ? (
                      <ToolLayout
                        definition={toolDefinition}
                        ToolComponent={LazyToolComponent}
                      />
                    ) : (
                      // Redirect disabled tools to home
                      <Navigate to="/" replace />
                    )
                  }
                />
              );
            })}

            {/* Catch-all for non-existent routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
