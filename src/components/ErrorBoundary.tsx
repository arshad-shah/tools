// src/components/ErrorBoundary.tsx

import React, { Component, ErrorInfo } from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isDismissed: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isDismissed: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log error to your monitoring service (e.g., Sentry)
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleDismiss = (): void => {
    this.setState({ isDismissed: true });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError && !this.state.isDismissed) {
      const { error, errorInfo } = this.state;
      
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 z-50 p-6 overflow-auto">
          <div className="max-w-2xl w-full mx-auto bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
            <div className="relative">
              {/* Abstract error visual pattern */}
              <div className="absolute inset-0 opacity-10">
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0,0 L100,100 M100,0 L0,100" stroke="white" strokeWidth="1" />
                  <path d="M0,50 L100,50 M50,0 L50,100" stroke="white" strokeWidth="0.5" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="0.5" />
                  <circle cx="50" cy="50" r="30" fill="none" stroke="white" strokeWidth="0.5" />
                  <circle cx="50" cy="50" r="20" fill="none" stroke="white" strokeWidth="0.5" />
                </svg>
              </div>
              
              {/* Animated glitch effect for the top header */}
              <div className="px-6 py-4 bg-gradient-to-r from-red-500/20 via-red-600/20 to-red-500/20 border-b border-red-500/30 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-red-400 to-transparent opacity-75 animate-pulse"></div>
                <h3 className="text-xl font-bold text-white flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Application Error Detected
                </h3>
                <div className="absolute bottom-0 right-0 w-full h-0.5 bg-gradient-to-r from-transparent via-red-400 to-transparent opacity-75 animate-pulse delay-150"></div>
              </div>
              
              <div className="px-6 py-6 text-slate-300">
                <p className="mb-4 font-medium">Something went wrong in the application. Our engineers have been notified.</p>
                
                <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                  <h4 className="text-white text-sm font-semibold mb-2 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Error Details
                  </h4>
                  <div className="text-sm font-mono bg-slate-950 p-3 rounded overflow-x-auto text-red-300">
                    {error?.name}: {error?.message}
                  </div>
                </div>
                
                {/* Stack trace collapsible section (for development only) */}
                {process.env.NODE_ENV === 'development' && errorInfo && (
                  <details className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    <summary className="text-white text-sm font-semibold cursor-pointer">
                      Stack Trace (Development Only)
                    </summary>
                    <div className="mt-3 text-xs font-mono bg-slate-950 p-3 rounded overflow-x-auto max-h-60 text-slate-400">
                      {errorInfo?.componentStack?.split('\n').map((line, i) => (
                        <div key={i} className="py-0.5">{line}</div>
                      )) || 'No stack trace available'}
                    </div>
                  </details>
                )}
                
                <div className="flex flex-wrap gap-3 justify-center mt-8">
                  <button 
                    onClick={this.handleReload}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reload Application
                  </button>
                  <button 
                    onClick={this.handleGoHome}
                    className="px-5 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7m-14 0l2 2m0 0l7 7 7-7m-14 0l2-2m0 0l7-7 7 7m-14 0l2 2m0 0l7 7 7-7" />
                    </svg>
                    Go to Dashboard
                  </button>
                  <button 
                    onClick={this.handleDismiss}
                    className="px-5 py-2 bg-slate-700 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Dismiss Error
                  </button>
                </div>
              </div>
              
              {/* Bottom decorative elements */}
              <div className="px-6 py-3 bg-slate-900 border-t border-slate-700 text-center text-xs text-slate-500">
                <div className="flex justify-center space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse delay-150"></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-300"></div>
                </div>
                <p className="mt-2">Error ID: {Date.now().toString(36).toUpperCase()}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;