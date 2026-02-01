import type { Loan } from '../types/loan';

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-green-100 text-green-800',
  CLOSED: 'bg-blue-100 text-blue-800',
  ARCHIVED: 'bg-red-100 text-red-800',
};

interface StatusBadgeProps {
  status: Loan['status'];
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`${sizeClasses} rounded-full font-medium ${statusColors[status]}`}>
      {status}
    </span>
  );
}
