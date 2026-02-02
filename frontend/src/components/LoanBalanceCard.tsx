import { useState } from 'react';
import { Button } from './Button';
import { PaymentForm } from './PaymentForm';
import { formatAmount } from '../utils/format';
import type { LoanStatus } from '@loan-management/shared';
import { PAYMENT_ALLOWED_STATUSES } from '@loan-management/shared';

interface LoanBalanceCardProps {
  loanId: string;
  remainingBalanceMicros: number;
  principalAmountMicros: number;
  status: LoanStatus;
}

export function LoanBalanceCard({
  loanId,
  remainingBalanceMicros,
  principalAmountMicros,
  status,
}: LoanBalanceCardProps) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const canRecordPayment = PAYMENT_ALLOWED_STATUSES.includes(status);

  return (
    <div className="md:col-span-2 bg-blue-50 p-5 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <dt className="text-sm font-medium text-blue-700">Remaining Balance</dt>
          <dd className="mt-1 text-3xl font-bold text-blue-900">
            {formatAmount(remainingBalanceMicros)}
          </dd>
          <p className="text-sm text-blue-600 mt-1">
            of {formatAmount(principalAmountMicros)} principal
          </p>
        </div>
        {!showPaymentForm && remainingBalanceMicros > 0 && (
          <div className="relative group">
            <Button
              onClick={() => setShowPaymentForm(true)}
              disabled={!canRecordPayment}
            >
              Record Payment
            </Button>
            {!canRecordPayment && (
              <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                Payments can only be recorded for active loans
                <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-900"></div>
              </div>
            )}
          </div>
        )}
      </div>
      {showPaymentForm && (
        <div className="mt-4 bg-white p-4 rounded-lg border border-blue-200">
          <PaymentForm
            loanId={loanId}
            onCancel={() => setShowPaymentForm(false)}
            onSuccess={() => setShowPaymentForm(false)}
          />
        </div>
      )}
    </div>
  );
}
