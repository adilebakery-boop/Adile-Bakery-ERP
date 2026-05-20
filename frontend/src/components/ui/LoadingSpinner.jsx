import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <Loader2 className={`animate-spin text-[#D2B48C] ${sizeClasses[size]} ${className}`} />
  );
}

export function LoadingOverlay({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1a1a2e] rounded-2xl p-6 shadow-xl flex items-center gap-4">
        <LoadingSpinner size="lg" />
        <span className="text-[#001F3F] dark:text-white font-medium">{message}</span>
      </div>
    </div>
  );
}

export function InlineSpinner({ size = 'sm' }) {
  const inlineSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  return <Loader2 className={`animate-spin text-[#D2B48C] ${inlineSizeClasses[size]}`} />;
}