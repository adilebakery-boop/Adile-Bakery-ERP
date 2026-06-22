export default function ReportSummaryCard({ title, subtitle, fields }) {
  return (
    <div className="bg-[#DFEDE2] dark:bg-[#1E3A3F] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-[#024A5B] dark:text-white">{title}</span>
        {subtitle && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</span>
        )}
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
    </div>
  );
}
