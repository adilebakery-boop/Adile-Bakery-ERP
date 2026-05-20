import Skeleton from '../ui/Skeleton';
import CardSkeleton, { DashboardCardsSkeleton, ActivitySkeleton } from './CardSkeleton';
import TableSkeleton from './TableSkeleton';

export default function PageSkeleton({ type = 'default' }) {
  return <PageSkeletonContent type={type} />;
}

function PageSkeletonContent({ type = 'default' }) {
  switch (type) {
    case 'dashboard':
      return <DashboardPageSkeleton />;
    case 'table':
      return <TableSkeleton rows={10} columns={5} showPagination />;
    case 'form':
      return <FormSkeleton />;
    case 'production':
      return <ProductionPageSkeleton />;
    default:
      return <DefaultPageSkeleton />;
  }
}

function DefaultPageSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton variant="title" className="w-40 mb-2" />
          <Skeleton variant="text" className="w-56" />
        </div>
        <Skeleton variant="button" className="w-32" />
      </div>
      
      <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#2d2d4a]">
        <TableSkeleton rows={8} columns={4} />
      </div>
    </div>
  );
}

function DashboardPageSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton variant="title" className="w-40 mb-2" />
          <Skeleton variant="text" className="w-56" />
        </div>
        <div className="flex gap-3">
          <Skeleton variant="button" className="w-28" />
          <Skeleton variant="text" className="w-10 h-10 rounded-xl" />
        </div>
      </div>
      
      <DashboardCardsSkeleton count={4} />
      <ActivitySkeleton />
    </div>
  );
}

function FormSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <Skeleton variant="title" className="w-40" />
      </div>
      
      <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#2d2d4a]">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <Skeleton variant="text" className="w-20 mb-2" />
            <Skeleton variant="input" className="w-full" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <Skeleton variant="text" className="w-20 mb-2" />
            <Skeleton variant="input" className="w-full" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <Skeleton variant="text" className="w-20 mb-2" />
            <Skeleton variant="input" className="w-full" />
          </div>
          <Skeleton variant="button" className="w-40" />
        </div>
      </div>
    </div>
  );
}

function ProductionPageSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton variant="title" className="w-40 mb-2" />
          <Skeleton variant="text" className="w-56" />
        </div>
      </div>
      
      <FormSkeleton />
      
      <div className="mt-8">
        <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] overflow-hidden border border-[#E5E1D8] dark:border-[#2d2d4a]">
          <div className="px-6 py-5 border-b border-[#E5E1D8] dark:border-[#2d2d4a]">
            <Skeleton variant="title" className="w-48" />
          </div>
          <TableSkeleton rows={10} columns={6} showPagination />
        </div>
      </div>
    </div>
  );
}

export { FormSkeleton, ProductionPageSkeleton };