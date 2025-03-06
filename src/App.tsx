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

// Tool loader component that handles error states for specific tools
const ToolComponentLoader = ({ toolId, children }: { toolId: string, children: React.ReactNode }) => (
  <ErrorBoundary
    fallback={
      <div className="min-h-screen bg-slate-900 p-6 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-slate-800 rounded-xl overflow-hidden shadow-xl border border-slate-700">
          <div className="px-6 py-4 bg-red-900/20 border-b border-slate-700">
            <h3 className="text-xl font-bold text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Tool Failed to Load
            </h3>
          </div>
          <div className="px-6 py-4">
            <p className="text-slate-300 mb-4">
              We couldn't load the tool <span className="font-mono text-white bg-slate-700 px-1.5 py-0.5 rounded text-sm">{toolId}</span>
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors flex items-center text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7m-14 0l2 2m0 0l7 7 7-7m-14 0l2-2m0 0l7-7 7 7m-14 0l2 2m0 0l7 7 7-7" />
                </svg>
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
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
                      <ToolComponentLoader toolId={toolDefinition.id}>
                        <ToolLayout
                          definition={toolDefinition}
                          ToolComponent={LazyToolComponent}
                        />
                      </ToolComponentLoader>
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