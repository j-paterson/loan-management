/**
 * Shared Types
 *
 * Single source of truth for types used across frontend and backend.
 */

/**
 * Loan status enum values
 *
 * Pre-disbursement (origination):
 * - DRAFT: Initial application, incomplete
 * - SUBMITTED: Application submitted for review
 * - UNDER_REVIEW: Underwriting in progress
 * - INFO_REQUESTED: Awaiting additional documentation
 * - APPROVED: Approved, awaiting disbursement
 * - DENIED: Application rejected
 * - WITHDRAWN: Borrower cancelled
 * - EXPIRED: Approval expired without disbursement
 *
 * Post-disbursement (servicing):
 * - ACTIVE: Funds disbursed, in good standing
 * - DELINQUENT: Payment(s) past due
 * - DEFAULT: Seriously delinquent
 * - CHARGED_OFF: Written off as loss
 * - PAID_OFF: Fully repaid
 * - REFINANCED: Replaced by new loan
 */
export const LOAN_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'INFO_REQUESTED',
  'APPROVED',
  'DENIED',
  'WITHDRAWN',
  'EXPIRED',
  'ACTIVE',
  'DELINQUENT',
  'DEFAULT',
  'CHARGED_OFF',
  'PAID_OFF',
  'REFINANCED',
] as const;

export type LoanStatus = (typeof LOAN_STATUSES)[number];

/**
 * Event types for loan audit trail
 */
export const EVENT_TYPES = [
  'LOAN_CREATED',
  'LOAN_EDITED',
  'STATUS_CHANGE',
  'PAYMENT_RECEIVED',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/**
 * Borrower interface
 */
export interface Borrower {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  creditScore: number | null;
  annualIncomeMicros: number | null;
  monthlyDebtMicros: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Loan interface
 */
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

/**
 * Loan event for audit trail
 */
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

/**
 * Payment interface
 */
export interface Payment {
  id: string;
  loanId: string;
  amountMicros: number;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * API response wrappers
 */
export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: {
    message: string;
    details?: unknown;
  };
}
