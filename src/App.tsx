// src/App.tsx

import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TOOL_DEFINITIONS } from './data/ToolDefinitions';
import { getToolComponent } from './registry/ToolRegistry';
import ErrorBoundary from './components/ErrorBoundary';
// Lazy load components for better performance
const Dashboard = lazy(() => import('./components/Dashboard'));
const ToolLayout = lazy(() => import('./components/ToolLayout'));
const NotFound = lazy(() => import('./components/NotFound'));

// Global fallback loader that matches the app's aesthetic
const GlobalLoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800">
    <div className="text-center p-6">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-purple-500 border-l-transparent animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-4 border-t-transparent border-r-cyan-400 border-b-transparent border-l-indigo-500 animate-spin animate-reverse"></div>
        </div>
      </div>
      <h3 className="text-xl font-semibold text-white mt-4">Loading</h3>
      <div className="w-48 h-1 mt-4 mx-auto bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-pulse"></div>
      </div>
    </div>
  </div>
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
            {TOOL_DEFINITIONS.map(toolDefinition => {
              // Lazy load each tool component when needed
              const LazyToolComponent = lazy(() => 
                Promise.resolve(getToolComponent(toolDefinition.id))
                  .then(component => {
                    if (!component) {
                      console.warn(`No component registered for tool: ${toolDefinition.id}`);
                      throw new Error(`Tool component not found: ${toolDefinition.id}`);
                    }
                    return { default: component };
                  })
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