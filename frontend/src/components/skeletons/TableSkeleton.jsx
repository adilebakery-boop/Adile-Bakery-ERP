import Skeleton from '../ui/Skeleton';

export default function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  showPagination = false,
  className = '' 
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="overflow-hidden rounded-2xl border border-[#E5E1D8] dark:border-[#2d2d4a]">
        <table className="w-full">
          <thead className="bg-[#F9F7F2]/50 dark:bg-[#2d2d4a]">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-6 py-4 text-left">
                  <Skeleton variant="text" className="w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E1D8] dark:divide-[#2d2d4a]">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a]">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <Skeleton 
                      variant="text" 
                      className={colIndex === 0 ? 'w-32' : 'w-24'} 
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {showPagination && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E1D8] dark:border-[#2d2d4a]">
          <Skeleton variant="text" className="w-48" />
          <div className="flex items-center gap-2">
            <Skeleton variant="text" className="w-8 h-8 rounded-lg" />
            <Skeleton variant="text" className="w-16" />
            <Skeleton variant="text" className="w-8 h-8 rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}