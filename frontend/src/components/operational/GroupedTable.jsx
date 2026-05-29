// grouping-agnostic by design — grouping logic stays domain-owned
// render-prop driven — business semantics stay outside this component
// expand/collapse state is externally controlled via expandedGroups prop
import { Fragment } from 'react';
import { TableSkeleton } from '../skeletons';
import { ApiErrorState, EmptyState } from '../ui';

export default function GroupedTable({
  groups = [],
  getGroupKey = (g) => g.id,
  expandedGroups = {},
  isLoading = false,
  isError = false,
  error = null,
  onRetry = null,
  emptyType = 'default',
  emptyMessage = 'No data',
  skeletonRows = 5,
  skeletonColumns = 4,
  colSpan = 1,
  renderHeader = null,
  renderGroupRow = null,
  renderEntryTable = null,
}) {
  if (isLoading) {
    return <TableSkeleton rows={skeletonRows} columns={skeletonColumns} />;
  }

  if (isError) {
    return (
      <div className="p-6">
        <ApiErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="p-6">
        <EmptyState type={emptyType} message={emptyMessage} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        {renderHeader && (
          <thead className="bg-[#F9F7F2]/50 dark:bg-[#2d2d4a] sticky top-0 z-10">
            {renderHeader()}
          </thead>
        )}
        <tbody className="divide-y divide-[#E5E1D8] dark:divide-[#2d2d4a]">
          {groups.map((group) => {
            const groupKey = getGroupKey(group);
            const isExpanded = !!expandedGroups[groupKey];
            return (
              <Fragment key={groupKey}>
                {renderGroupRow && renderGroupRow(group, { isExpanded })}
                {isExpanded && renderEntryTable && (
                  <tr>
                    <td colSpan={colSpan} className="p-0">
                      <div className="bg-[#F9F7F2]/40 dark:bg-[#2d2d4a]/40 border-l-4 border-[#D2B48C] dark:border-[#D2B48C]/50 ml-6 mr-3 my-1 rounded-r-lg overflow-hidden">
                        <table className="w-full">
                          {renderEntryTable(group)}
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
