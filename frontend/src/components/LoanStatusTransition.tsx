import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { loansApi } from '../api/loans';
import type { TransitionOption } from '../api/loans';
import { StatusBadge } from './StatusBadge';
import type { LoanStatus } from '@loan-management/shared';
import { STATUS_LABELS } from '@loan-management/shared';

interface LoanStatusTransitionProps {
  loanId: string;
  currentStatus: LoanStatus;
  transitions: TransitionOption[];
}

export function LoanStatusTransition({
  loanId,
  currentStatus,
  transitions,
}: LoanStatusTransitionProps) {
  const queryClient = useQueryClient();
  const [pendingTransition, setPendingTransition] = useState<LoanStatus | null>(null);

  const transitionMutation = useMutation({
    mutationFn: (toStatus: LoanStatus) => loansApi.transition(loanId, { toStatus }),
    onSuccess: () => {
      setPendingTransition(null);
      queryClient.invalidateQueries({ queryKey: ['loans', loanId] });
      queryClient.invalidateQueries({ queryKey: ['events', loanId] });
      queryClient.invalidateQueries({ queryKey: ['transitions', loanId] });
    },
  });

  const handleTransitionClick = (toStatus: LoanStatus) => {
    setPendingTransition(toStatus);
  };

  const handleTransitionConfirm = () => {
    if (pendingTransition) {
      transitionMutation.mutate(pendingTransition);
    }
  };

  return (
    <div className="md:col-span-2">
      <dt className="text-sm font-medium text-gray-500">Status</dt>
      <dd className="mt-1 flex items-center gap-3 flex-wrap">
        <StatusBadge status={currentStatus} size="md" />
        {pendingTransition ? (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <span className="text-sm text-amber-800">
              Change to <strong>{STATUS_LABELS[pendingTransition]}</strong>?
            </span>
            <button
              onClick={handleTransitionConfirm}
              disabled={transitionMutation.isPending}
              className="px-3 py-1 text-sm font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {transitionMutation.isPending ? 'Updating...' : 'Confirm'}
            </button>
            <button
              onClick={() => setPendingTransition(null)}
              disabled={transitionMutation.isPending}
              className="px-3 py-1 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            {transitions.length > 0 && (
              <>
                <span className="text-gray-400 text-lg">→</span>
                {transitions.map((transition) => (
                  <div key={transition.toStatus} className="relative group">
                    <button
                      onClick={() => transition.allowed && handleTransitionClick(transition.toStatus)}
                      disabled={!transition.allowed || transitionMutation.isPending}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                        transition.allowed
                          ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-blue-300'
                          : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      } disabled:opacity-50`}
                    >
                      {STATUS_LABELS[transition.toStatus]}
                    </button>
                    {!transition.allowed && transition.reason && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                        {transition.reason}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
            {transitions.length === 0 && (
              <span className="text-sm text-gray-500 italic">Terminal status</span>
            )}
          </>
        )}
      </dd>
      {transitionMutation.error && (
        <p className="mt-2 text-sm text-red-600">
          {transitionMutation.error.message}
        </p>
      )}
    </div>
  );
}
