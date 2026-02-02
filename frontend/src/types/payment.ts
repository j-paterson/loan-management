/**
 * Payment Types
 *
 * Re-exports from shared package for backwards compatibility.
 * New code should import directly from @loan-management/shared.
 */

export type { Payment } from '@loan-management/shared';

// Input types specific to the API layer
export interface CreatePaymentInput {
  amountMicros: number;
  paidAt?: string;
}

export interface UpdatePaymentInput {
  amountMicros?: number;
  paidAt?: string;
}
