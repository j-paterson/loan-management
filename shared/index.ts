/**
 * Shared Package
 *
 * Re-exports all shared types, constants, and validation rules.
 */

// Types
export type {
  LoanStatus,
  EventType,
  Borrower,
  Loan,
  LoanEvent,
  Payment,
  ApiResponse,
  ApiError,
} from './types';

export { LOAN_STATUSES, EVENT_TYPES } from './types';

// Constants
export {
  VALID_TRANSITIONS,
  STATUS_LABELS,
  STATUS_CATEGORIES,
  PAYMENT_ALLOWED_STATUSES,
  isValidTransition,
  getValidNextStatuses,
  isTerminalStatus,
} from './constants';

// Validation
export {
  MICROS_PER_DOLLAR,
  PRINCIPAL_MIN_DOLLARS,
  PRINCIPAL_MAX_DOLLARS,
  PRINCIPAL_MIN_MICROS,
  PRINCIPAL_MAX_MICROS,
  RATE_MIN_BPS,
  RATE_MAX_BPS,
  RATE_WARNING_BPS,
  RATE_MIN_PERCENT,
  RATE_MAX_PERCENT,
  RATE_WARNING_PERCENT,
  TERM_MIN_MONTHS,
  TERM_MAX_MONTHS,
  NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  CREDIT_SCORE_MIN,
  CREDIT_SCORE_MAX,
  ANNUAL_INCOME_MAX_DOLLARS,
  MONTHLY_DEBT_MAX_DOLLARS,
  MIN_CREDIT_SCORE_FOR_APPROVAL,
  MAX_DTI_RATIO,
} from './validation';
