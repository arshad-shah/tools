// src/components/ToolErrorBoundary.tsx

import { RefreshCw, Home, AlertCircle } from 'lucide-react';
import React, { Component, ErrorInfo } from 'react';
import { Button } from './Button';

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
          <div className="w-full bg-slate-800 rounded-xl overflow-hidden shadow-xl border border-slate-700">
            <div className="relative overflow-hidden">
              {/* Tool error header with glitch animation */}
              <div className="px-6 py-4 bg-red-900/20 border-b border-slate-700 relative">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-400 to-transparent opacity-50 animate-pulse"></div>
                <h3 className="text-xl font-bold text-white flex items-center">
                  <AlertCircle className="h-6 w-6 mr-2 text-red-400" />
                  {toolName} Tool Error
                </h3>
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-400 to-transparent opacity-50 animate-pulse delay-150"></div>
              </div>
              
              <div className="px-6 py-6 text-slate-300">
                <div className="flex items-start mb-4">
                  <div className="flex-shrink-0 bg-red-900/30 rounded-lg p-3 mr-4">
                    <AlertCircle className="h-8 w-8 text-red-400" />
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
                  <Button 
                    variant="primary"
                    onClick={this.handleRetry}
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                  >
                    Retry {toolName}
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={this.handleNavigateHome}
                    leftIcon={<Home className="h-4 w-4" />}
                  >
                    Go to Dashboard
                  </Button>
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
            <details className="mt-4 w-full bg-slate-800 rounded-lg border border-slate-700 overflow-hidden text-sm">
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