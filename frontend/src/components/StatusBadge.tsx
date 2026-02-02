import type { LoanStatus } from '../types/loan';

const statusColors: Record<LoanStatus, string> = {
  // Pre-disbursement (origination)
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  INFO_REQUESTED: 'bg-orange-100 text-orange-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  DENIED: 'bg-red-100 text-red-800',
  WITHDRAWN: 'bg-slate-100 text-slate-800',
  EXPIRED: 'bg-stone-100 text-stone-800',
  // Post-disbursement (servicing)
  ACTIVE: 'bg-green-100 text-green-800',
  DELINQUENT: 'bg-amber-100 text-amber-800',
  DEFAULT: 'bg-rose-100 text-rose-800',
  CHARGED_OFF: 'bg-red-200 text-red-900',
  PAID_OFF: 'bg-teal-100 text-teal-800',
  REFINANCED: 'bg-purple-100 text-purple-800',
};

interface StatusBadgeProps {
  status: LoanStatus;
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
