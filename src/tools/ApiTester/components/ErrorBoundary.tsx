import React from 'react';
import { ErrorBoundaryProps, ErrorBoundaryState } from '../../../types/ApiTesterTypes';

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("API Tester error:", error, errorInfo);
    
    // You could also log to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Something went wrong</h2>
          <p className="mb-4 text-gray-700">The application encountered an error. Please try refreshing the page.</p>
          <pre className="bg-gray-100 p-4 rounded text-sm text-left overflow-auto max-h-40">
            {this.state.error && this.state.error.toString()}
          </pre>
          <div className="mt-4 flex justify-center space-x-4">
            <button 
              className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
            <button 
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}