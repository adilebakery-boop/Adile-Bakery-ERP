import Skeleton from '../ui/Skeleton';

export default function CardSkeleton({ className = '' }) {
  return (
    <div className={`bg-white dark:bg-[#1a1a2e] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#2d2d4a] ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="text" className="w-32" />
        <Skeleton variant="thumbnail" className="w-10 h-10 rounded-xl" />
      </div>
      <Skeleton variant="title" className="w-24 mb-2" />
      <Skeleton variant="text" className="w-40" />
    </div>
  );
}

export function DashboardCardsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ActivitySkeleton() {
  return (
    <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#2d2d4a]">
      <Skeleton variant="title" className="w-40 mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton variant="thumbnail" className="w-8 h-8 rounded-lg" />
            <div className="flex-1">
              <Skeleton variant="text" className="w-48 mb-1" />
              <Skeleton variant="text" className="w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}