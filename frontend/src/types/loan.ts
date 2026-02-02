/**
 * Loan Types
 *
 * Re-exports from shared package for backwards compatibility.
 * New code should import directly from @loan-management/shared.
 */

export type {
  LoanStatus,
  EventType,
  Loan,
  LoanEvent,
  ApiResponse,
  ApiError,
} from '@loan-management/shared';

export {
  LOAN_STATUSES,
  EVENT_TYPES,
  VALID_TRANSITIONS,
  STATUS_LABELS,
} from '@loan-management/shared';

// Input types specific to the API layer
export interface CreateLoanInput {
  principalAmountMicros: number;
  interestRateBps: number;
  termMonths: number;
  status?: import('@loan-management/shared').LoanStatus;
  borrowerId?: string;
  newBorrower?: {
    name: string;
    email: string;
    phone?: string;
  };
}

export type UpdateLoanInput = Partial<CreateLoanInput>;
