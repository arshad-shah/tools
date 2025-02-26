// src/App.tsx

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ToolLayout from './components/ToolLayout';
import NotFound from './components/NotFound';
import { TOOL_DEFINITIONS } from './data/ToolDefinitions';
import { getToolComponent } from './registry/ToolRegistry';

/**
 * Main Application component with routing setup
 */
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Dashboard as home route */}
        <Route path="/" element={<Dashboard />} />
        
        {/* Dynamically generate routes based on tool definitions */}
        {TOOL_DEFINITIONS.map(toolDefinition => {
          const ToolComponent = getToolComponent(toolDefinition.id);
          
          // Skip if component isn't registered
          if (!ToolComponent) {
            console.warn(`No component registered for tool: ${toolDefinition.id}`);
            return null;
          }
          
          return (
            <Route 
              key={toolDefinition.id}
              path={`/${toolDefinition.id}/*`} 
              element={
                toolDefinition.enabled ? (
                  <ToolLayout
                    definition={toolDefinition}
                    ToolComponent={ToolComponent}
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
    </BrowserRouter>
  );
};

export default App;