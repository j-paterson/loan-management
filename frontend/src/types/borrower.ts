/**
 * Borrower Types
 *
 * Re-exports from shared package for backwards compatibility.
 * New code should import directly from @loan-management/shared.
 */

export type { Borrower } from '@loan-management/shared';

// Input types specific to the API layer
export interface CreateBorrowerInput {
  name: string;
  email: string;
  phone?: string;
  creditScore?: number | null;
  annualIncomeMicros?: number | null;
  monthlyDebtMicros?: number | null;
}

export interface UpdateBorrowerInput {
  name?: string;
  email?: string;
  phone?: string;
  creditScore?: number | null;
  annualIncomeMicros?: number | null;
  monthlyDebtMicros?: number | null;
}
