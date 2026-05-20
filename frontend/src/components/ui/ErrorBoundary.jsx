import React from 'react';
import { AlertTriangle, RefreshCw, Home, XCircle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F9F7F2] dark:bg-[#0f0f1a] px-4">
          <div className="max-w-md w-full bg-white dark:bg-[#1a1a2e] rounded-2xl p-8 shadow-xl border border-[#E5E1D8] dark:border-[#2d2d4a]">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              
              <h1 className="text-2xl font-bold text-[#001F3F] dark:text-white mb-3">
                Something went wrong
              </h1>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                The application encountered an unexpected error. Please try again.
              </p>

              {isDev && this.state.error && (
                <div className="w-full mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-left overflow-auto max-h-40">
                  <p className="text-xs font-mono text-red-600 dark:text-red-400 break-words">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              <div className="flex gap-3 w-full">
                <button
                  onClick={this.handleReload}
                  className="flex-1 px-4 py-3 bg-[#001F3F] text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#001a35] transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 px-4 py-3 border border-[#E5E1D8] dark:border-[#2d2d4a] text-gray-600 dark:text-gray-400 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function withErrorBoundary(Component, errorFallback) {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary fallback={errorFallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}