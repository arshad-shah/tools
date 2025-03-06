// src/components/ToolErrorBoundary.tsx

import React, { Component, ErrorInfo } from 'react';

interface Props {
  children: React.ReactNode;
  toolName: string;
  toolId: string;
  onRetry?: () => void;
  onNavigateHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ToolErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log error to your monitoring service with tool context
    console.error(`Error in tool ${this.props.toolId}:`, error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleNavigateHome = (): void => {
    if (this.props.onNavigateHome) {
      this.props.onNavigateHome();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const { toolName, toolId } = this.props;
      
      return (
        <div className="min-h-full flex flex-col items-center justify-center p-6 bg-slate-900/50">
          <div className="max-w-lg w-full bg-slate-800 rounded-xl overflow-hidden shadow-xl border border-slate-700">
            <div className="relative overflow-hidden">
              {/* Tool error header with glitch animation */}
              <div className="px-6 py-4 bg-red-900/20 border-b border-slate-700 relative">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-400 to-transparent opacity-50 animate-pulse"></div>
                <h3 className="text-xl font-bold text-white flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {toolName} Tool Error
                </h3>
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-400 to-transparent opacity-50 animate-pulse delay-150"></div>
              </div>
              
              <div className="px-6 py-6 text-slate-300">
                <div className="flex items-start mb-4">
                  <div className="flex-shrink-0 bg-red-900/30 rounded-lg p-3 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-white mb-1">Something went wrong</h4>
                    <p className="text-slate-400">
                      We encountered an error while running the {toolName} tool
                    </p>
                  </div>
                </div>
                
                <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                  <h4 className="text-white text-sm font-semibold mb-2">Error Details</h4>
                  <div className="text-sm font-mono bg-slate-950 p-3 rounded overflow-x-auto text-red-300">
                    {error?.message || 'Unknown error occurred'}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3 justify-center mt-8">
                  <button 
                    onClick={this.handleRetry}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retry {toolName}
                  </button>
                  <button 
                    onClick={this.handleNavigateHome}
                    className="px-5 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7m-14 0l2 2m0 0l7 7 7-7m-14 0l2-2m0 0l7-7 7 7m-14 0l2 2m0 0l7 7 7-7" />
                    </svg>
                    Go to Dashboard
                  </button>
                </div>
              </div>
              
              {/* Decorative elements at the bottom */}
              <div className="px-6 py-3 bg-slate-900 border-t border-slate-700 text-center text-xs text-slate-500">
                <div className="inline-flex items-center space-x-1 bg-slate-800 px-2 py-1 rounded-full">
                  <span>Tool ID:</span>
                  <code className="font-mono bg-slate-700 px-1.5 rounded text-slate-300">{toolId}</code>
                </div>
              </div>
            </div>
          </div>
          
          {/* Technical details area for developers */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 w-full max-w-lg bg-slate-800 rounded-lg border border-slate-700 overflow-hidden text-sm">
              <summary className="px-4 py-2 bg-slate-900 cursor-pointer text-slate-400 hover:text-white transition-colors">
                Technical Details (Development Only)
              </summary>
              <div className="p-4">
                <pre className="text-xs font-mono bg-slate-900 p-3 rounded overflow-x-auto max-h-60 text-slate-400">
                  {JSON.stringify({
                    toolId,
                    errorName: this.state.error?.name,
                    errorMessage: this.state.error?.message,
                    stack: this.state.error?.stack?.split('\n')
                  }, null, 2)}
                </pre>
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ToolErrorBoundary;