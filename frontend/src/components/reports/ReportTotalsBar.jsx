export default function ReportTotalsBar({ title, fields }) {
  return (
    <div className="bg-[#4CB094] dark:bg-[#236B56] rounded-xl p-6 text-[#002830] dark:text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <span className="text-sm font-semibold uppercase tracking-wider">{title}</span>
        <div className="flex flex-wrap gap-8">
          {fields.map((f, i) => (
            <div key={i}>
              <p className="text-xs text-[#002830] dark:text-white/70">{f.label}</p>
              <p className={f.revenue ? 'text-2xl font-bold' : 'text-xl font-bold'}>
                {f.revenue
                  ? `${(f.value || 0).toLocaleString()} ETB`
                  : (f.value || 0).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
