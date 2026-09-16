import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';

export default function ReportSummaryCard({
  title,
  subtitle,
  fields,
  isExpandable = false,
  isExpanded = false,
  onToggle,
  children,
}) {
  return (
    <div
      className={`bg-[#DFEDE2] dark:bg-[#1E3A3F] rounded-xl p-4 transition-all duration-200 ${
        isExpandable
          ? 'cursor-pointer select-none hover:ring-1 hover:ring-[#024A5B]/30 dark:hover:ring-white/20'
          : ''
      }`}
      onClick={isExpandable ? onToggle : undefined}
      role={isExpandable ? 'button' : undefined}
      tabIndex={isExpandable ? 0 : undefined}
      onKeyDown={
        isExpandable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggle?.();
              }
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-[#024A5B] dark:text-white">{title}</span>
        <div className="flex items-center gap-1.5">
          {subtitle && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</span>
          )}
          {isExpandable && (
            <ChevronDown
              className={`w-4 h-4 text-[#024A5B] dark:text-gray-300 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          )}
        </div>
      </div>
      <div className="space-y-2">
        {fields.map((f, i) => (
          <div key={i} className="flex justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">{f.label}</span>
            <span className={
              f.revenue
                ? 'font-semibold text-[#024A5B] dark:text-[#CAEAFD]'
                : f.highlighted
                  ? 'font-medium text-[#024A5B] dark:text-[#CAEAFD]'
                  : 'font-medium text-gray-700 dark:text-gray-200'
            }>
              {f.revenue
                ? `${(f.value || 0).toLocaleString()} ETB`
                : (f.value || 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      {isExpandable && isExpanded && (
        <div className="border-t border-[#024A5B]/15 dark:border-white/10 pt-3 mt-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

ReportSummaryCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  fields: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      revenue: PropTypes.bool,
      highlighted: PropTypes.bool,
    })
  ).isRequired,
  isExpandable: PropTypes.bool,
  isExpanded: PropTypes.bool,
  onToggle: PropTypes.func,
  children: PropTypes.node,
};
