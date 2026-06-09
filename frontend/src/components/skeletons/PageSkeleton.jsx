import Skeleton from '../ui/Skeleton';
import CardSkeleton, { DashboardCardsSkeleton, ActivitySkeleton } from './CardSkeleton';
import TableSkeleton from './TableSkeleton';

export default function PageSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton variant="title" className="w-40 mb-2" />
          <Skeleton variant="text" className="w-56" />
        </div>
        <Skeleton variant="button" className="w-32" />
      </div>
      
      <div className="bg-white dark:bg-[#12262A] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#1E3A3F]">
        <TableSkeleton rows={8} columns={4} />
      </div>
    </div>
  );
}