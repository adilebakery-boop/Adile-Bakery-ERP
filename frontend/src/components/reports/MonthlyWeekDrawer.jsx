import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

export default function MonthlyWeekDrawer({ week, title, onClose }) {
  const { t } = useTranslation();
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (window.innerWidth >= 768) {
      closeButtonRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!week) return null;

  const dateRangeLabel =
    week.weekEndDate && week.weekEndDate !== week.weekStartDate
      ? `${week.weekStartDate} — ${week.weekEndDate}`
      : week.weekStartDate || '';

  const days = week.days || [];

  return (
    <div className="hidden md:block">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="monthly-week-drawer-title"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-[380px] lg:max-w-[420px] bg-white dark:bg-[#12262A] shadow-2xl border-l border-[#E5E1D8] dark:border-[#1E3A3F] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5E1D8] dark:border-[#1E3A3F] shrink-0">
          <div>
            <h2
              id="monthly-week-drawer-title"
              className="text-base font-semibold text-[#024A5B] dark:text-white"
            >
              {title || t('reports.week')}
            </h2>
            {dateRangeLabel && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {dateRangeLabel}
              </p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="p-1.5 rounded-lg text-[#024A5B] dark:text-gray-300 hover:bg-[#DFEDE2] dark:hover:bg-[#1E3A3F] transition-colors focus:outline-none focus:ring-2 focus:ring-[#024A5B] dark:focus:ring-[#CAEAFD]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {days.length > 0 ? (
            days.map((day, idx) => {
              const parts = (day.date || '').split('-');
              const dateLabel = parts.length === 3 ? `${parts[2]}/${parts[1]}` : (day.date || '-');
              const weekday = day.dayName ? day.dayName.slice(0, 3) : '';
              const fullDateLabel = weekday ? `${dateLabel} — ${weekday}` : dateLabel;

              const dayTotals = day.totals || {};
              const dayRev = Number(dayTotals.totalEstimatedRevenue) || 0;
              const formattedRev = dayRev.toLocaleString(undefined, {
                minimumFractionDigits: dayRev % 1 !== 0 ? 2 : 0,
                maximumFractionDigits: 2,
              });

              return (
                <div
                  key={day.date || idx}
                  className="bg-[#DFEDE2]/60 dark:bg-[#1E3A3F]/50 rounded-xl p-3.5 border border-[#E5E1D8]/60 dark:border-[#1E3A3F]/80 space-y-2"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#024A5B]/10 dark:border-white/10">
                    <span className="text-xs font-semibold text-[#024A5B] dark:text-white">
                      {fullDateLabel}
                    </span>
                    <span className="text-xs font-semibold text-[#024A5B] dark:text-[#CAEAFD]">
                      {formattedRev} ETB
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        {t('reports.dayProduction')}
                      </span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {(dayTotals.totalDayProduction || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        {t('reports.nightProduction')}
                      </span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {(dayTotals.totalNightProduction || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        {t('reports.remaining')}
                      </span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {(dayTotals.totalRemainingStock || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        {t('reports.waste')}
                      </span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {(dayTotals.totalWasteQuantity || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        {t('reports.estSold')}
                      </span>
                      <span className="font-medium text-[#024A5B] dark:text-[#CAEAFD]">
                        {(dayTotals.totalEstimatedSold || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs pt-1 border-t border-[#024A5B]/5 dark:border-white/5">
                      <span className="text-gray-500 dark:text-gray-400">
                        {t('reports.revenue')}
                      </span>
                      <span className="font-semibold text-[#024A5B] dark:text-[#CAEAFD]">
                        {formattedRev} ETB
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-6">
              {t('reports.noDataForPeriod')}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

MonthlyWeekDrawer.propTypes = {
  week: PropTypes.shape({
    weekStartDate: PropTypes.string,
    weekEndDate: PropTypes.string,
    days: PropTypes.arrayOf(
      PropTypes.shape({
        date: PropTypes.string,
        dayName: PropTypes.string,
        totals: PropTypes.shape({
          totalDayProduction: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
          totalNightProduction: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
          totalRemainingStock: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
          totalWasteQuantity: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
          totalEstimatedSold: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
          totalEstimatedRevenue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        }),
      })
    ),
  }),
  title: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};
