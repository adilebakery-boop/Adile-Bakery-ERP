import { AlertTriangle, RefreshCw, Home, XCircle } from 'lucide-react';

export default function ErrorState({ 
  title = 'Something went wrong',
  message = 'An error occurred while loading this content.',
  onRetry,
  showHomeButton = false,
  onHome,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
        <XCircle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-[#024A5B] dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-500 text-center max-w-md mb-6">
        {message}
      </p>
      <div className="flex items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2.5 bg-[#4CB094] text-[#002830] rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-[#236B56] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}
        {showHomeButton && (
          <button
            onClick={onHome || (() => window.location.href = '/dashboard')}
            className="px-4 py-2.5 border border-[#E5E1D8] dark:border-[#1E3A3F] text-gray-600 dark:text-gray-500 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-[#DFEDE2] dark:hover:bg-[#1E3A3F] transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
        )}
      </div>
    </div>
  );
}

export function ApiErrorState({ 
  error, 
  onRetry,
  className = '' 
}) {
  const getErrorMessage = () => {
    if (!error) return 'An unexpected error occurred';
    
    if (error.status === 0) {
      return 'Network error. Please check your connection.';
    }
    if (error.status === 401) {
      return 'Your session has expired. Please log in again.';
    }
    if (error.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (error.status === 404) {
      return 'The requested resource was not found.';
    }
    if (error.status >= 500) {
      return 'Server error. Please try again later.';
    }
    
    return error.message || 'An unexpected error occurred';
  };

  return (
    <ErrorState
      title="Failed to load data"
      message={getErrorMessage()}
      onRetry={onRetry}
      className={className}
    />
  );
}