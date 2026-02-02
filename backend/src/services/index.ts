/**
 * Service Layer
 *
 * Business logic layer that sits between routes and database.
 * All services use the ServiceResult pattern for consistent error handling.
 */

export { borrowerService } from './borrower.service.js';
export type { CreateBorrowerInput, UpdateBorrowerInput } from './borrower.service.js';

export { loanService } from './loan.service.js';
export type { LoanWithBorrower, CreateLoanInput, UpdateLoanInput } from './loan.service.js';

export { paymentService } from './payment.service.js';
export type { CreatePaymentInput, UpdatePaymentInput } from './payment.service.js';

export { statusService } from './status.service.js';
export type { TransitionInput, TransitionOption, AvailableTransitions } from './status.service.js';

// Re-export event service functions
export {
  recordLoanCreated,
  recordLoanEdited,
  recordStatusChange,
  recordPaymentReceived,
  getLoanEvents,
} from './event.service.js';

// Re-export types and helpers
export type { ServiceResult, ServiceErrorCode, ActorContext, TxContext } from './types.js';
export { success, fail, httpStatus } from './types.js';
