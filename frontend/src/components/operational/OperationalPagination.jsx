// presentation-only — no query ownership, no i18n coupling
// parent controls disabled state via disabledPrev/disabledNext
// totalPages <= 1 hides the component automatically
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function OperationalPagination({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  disabledPrev = false,
  disabledNext = false,
  children,
  className = '',
}) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-between px-6 py-4 border-t border-[#E5E1D8] dark:border-[#2d2d4a] ${className}`}>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {children}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevious}
          disabled={disabledPrev}
          className="p-2 rounded-lg border border-[#E5E1D8] dark:border-[#2d2d4a] text-gray-600 dark:text-gray-400 hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={disabledNext}
          className="p-2 rounded-lg border border-[#E5E1D8] dark:border-[#2d2d4a] text-gray-600 dark:text-gray-400 hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
