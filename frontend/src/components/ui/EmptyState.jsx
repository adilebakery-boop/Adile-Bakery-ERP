import { Package, FileText, Users, PieChart, Search, FolderOpen } from 'lucide-react';

const iconMap = {
  products: Package,
  production: Package,
  branches: Users,
  reports: PieChart,
  search: Search,
  default: FolderOpen,
  files: FileText,
};

const defaultMessages = {
  products: 'No products found',
  branches: 'No branches found',
  reports: 'No reports available',
  search: 'No results found',
  production: 'No production records yet',
  remaining: 'No remaining items',
  users: 'No users found',
  default: 'No data available',
};

export default function EmptyState({ 
  type = 'default',
  message,
  actionLabel,
  onAction,
  className = ''
}) {
  const Icon = iconMap[type] || iconMap.default;
  const defaultMessage = defaultMessages[type] || defaultMessages.default;
  
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="w-16 h-16 bg-[#DFEDE2] dark:bg-[#1E3A3F] rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-500 dark:text-gray-500" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-500 text-center max-w-md">
        {message || defaultMessage}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2.5 bg-[#4CB094] text-[#002830] rounded-xl text-sm font-medium hover:bg-[#236B56] transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function EmptyTableState({ colSpan = 1, message = 'No data available' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center">
        <EmptyState type="default" message={message} />
      </td>
    </tr>
  );
}