import { eq, sum } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { loans, borrowers, payments, type LoanStatus, type Loan } from '../../db/schema.js';
import { isValidTransition, getValidNextStatuses, isTerminalStatus } from './transitions.js';
import { checkTransitionGuard, type TransitionContext } from './guards.js';
import { recordStatusChange } from '../events/index.js';

export { isValidTransition, getValidNextStatuses, isTerminalStatus } from './transitions.js';
export { STATUS_CATEGORIES, VALID_TRANSITIONS } from './transitions.js';
export { checkTransitionGuard } from './guards.js';
export type { TransitionContext } from './guards.js';

/**
 * Result of a transition attempt
 */
export interface TransitionResult {
  success: boolean;
  loan?: Loan;
  error?: string;
}

/**
 * Options for transitioning a loan status
 */
export interface TransitionOptions {
  loanId: string;
  toStatus: LoanStatus;
  changedBy?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Transition a loan to a new status
 *
 * This is the main entry point for all status changes.
 * It validates the transition, checks guards, updates the loan,
 * and records the change in the events table.
 */
export async function transitionLoanStatus(options: TransitionOptions): Promise<TransitionResult> {
  const { loanId, toStatus, changedBy = 'system', reason } = options;

  // Fetch the loan with borrower
  const loanResult = await db
    .select()
    .from(loans)
    .where(eq(loans.id, loanId));

  if (!loanResult.length) {
    return { success: false, error: 'Loan not found' };
  }

  const loan = loanResult[0];
  const fromStatus = loan.status as LoanStatus;

  // Check if this is a valid transition
  if (!isValidTransition(fromStatus, toStatus)) {
    const validNext = getValidNextStatuses(fromStatus);
    return {
      success: false,
      error: `Cannot transition from ${fromStatus} to ${toStatus}. Valid transitions: ${validNext.join(', ') || 'none (terminal state)'}`,
    };
  }

  // Fetch borrower for guard checks
  const borrowerResult = await db
    .select()
    .from(borrowers)
    .where(eq(borrowers.id, loan.borrowerId));

  if (!borrowerResult.length) {
    return { success: false, error: 'Borrower not found' };
  }

  const borrower = borrowerResult[0];

  // Calculate remaining balance for guards
  const [paymentSum] = await db
    .select({ total: sum(payments.amountMicros) })
    .from(payments)
    .where(eq(payments.loanId, loanId));

  const totalPayments = Number(paymentSum?.total || 0);
  const remainingBalanceMicros = loan.principalAmountMicros - totalPayments;

  // Build context for guards
  const context: TransitionContext = {
    loan,
    borrower,
    remainingBalanceMicros,
  };

  // Check guard conditions
  const guardResult = checkTransitionGuard(fromStatus, toStatus, context);
  if (!guardResult.allowed) {
    return { success: false, error: guardResult.reason || 'Transition not allowed' };
  }

  // Prepare update data
  const now = new Date();
  const updateData: Partial<Loan> = {
    status: toStatus,
    statusChangedAt: now,
    updatedAt: now,
  };

  // Set lifecycle timestamps based on transition
  if (toStatus === 'SUBMITTED' && !loan.submittedAt) {
    updateData.submittedAt = now;
  }
  if (toStatus === 'APPROVED' && !loan.approvedAt) {
    updateData.approvedAt = now;
  }
  if (toStatus === 'ACTIVE' && !loan.disbursedAt) {
    updateData.disbursedAt = now;
  }

  // Perform the update and record event in a transaction
  const [updatedLoan] = await db.transaction(async (tx) => {
    // Update the loan
    const updated = await tx
      .update(loans)
      .set(updateData)
      .where(eq(loans.id, loanId))
      .returning();

    // Record STATUS_CHANGE event
    await recordStatusChange(loanId, fromStatus, toStatus, changedBy, reason, tx);

    return updated;
  });

  return { success: true, loan: updatedLoan };
}
