import type { Borrower } from './borrower';

/**
 * Loan types
 *
 * All monetary values are integers:
 * - principalAmountMicros: Amount in micro-units (10,000ths of a dollar)
 * - interestRateBps: Interest rate in basis points (1 bp = 0.01%)
 */

export type LoanStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'INFO_REQUESTED'
  | 'APPROVED'
  | 'DENIED'
  | 'WITHDRAWN'
  | 'EXPIRED'
  | 'ACTIVE'
  | 'DELINQUENT'
  | 'DEFAULT'
  | 'CHARGED_OFF'
  | 'PAID_OFF'
  | 'REFINANCED';

export type EventType = 'LOAN_CREATED' | 'LOAN_EDITED' | 'STATUS_CHANGE' | 'PAYMENT_RECEIVED';

export interface Loan {
  id: string;
  borrowerId: string;
  borrower: Borrower | null;
  principalAmountMicros: number;
  interestRateBps: number;
  termMonths: number;
  status: LoanStatus;
  remainingBalanceMicros: number;
  statusChangedAt?: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  disbursedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LoanEvent {
  id: string;
  loanId: string;
  eventType: EventType;
  occurredAt: string;
  actorId: string | null;
  fromStatus: LoanStatus | null;
  toStatus: LoanStatus | null;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  paymentId: string | null;
  paymentAmountMicros: number | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
}

export interface CreateLoanInput {
  principalAmountMicros: number;
  interestRateBps: number;
  termMonths: number;
  status?: LoanStatus;
  borrowerId?: string;
  newBorrower?: {
    name: string;
    email: string;
    phone?: string;
  };
}

export interface UpdateLoanInput extends Partial<CreateLoanInput> {}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: {
    message: string;
    details?: unknown;
  };
}
