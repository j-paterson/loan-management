import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { loans, loanStatusHistory, borrowers, type LoanStatus, type Loan, type Borrower } from '../../db/schema.js';
import { isValidTransition, getValidNextStatuses, isTerminalStatus } from './transitions.js';
import { checkTransitionGuard, type TransitionContext } from './guards.js';

export { isValidTransition, getValidNextStatuses, isTerminalStatus } from './transitions.js';
export { STATUS_CATEGORIES, VALID_TRANSITIONS } from './transitions.js';

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
 * and records the change in the audit history.
 */
export async function transitionLoanStatus(options: TransitionOptions): Promise<TransitionResult> {
  const { loanId, toStatus, changedBy = 'system', reason, metadata } = options;

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

  // Build context for guards
  const context: TransitionContext = {
    loan,
    borrower,
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

  // Perform the update and record history in a transaction
  const [updatedLoan] = await db.transaction(async (tx) => {
    // Update the loan
    const updated = await tx
      .update(loans)
      .set(updateData)
      .where(eq(loans.id, loanId))
      .returning();

    // Record in status history
    await tx.insert(loanStatusHistory).values({
      loanId,
      fromStatus,
      toStatus,
      changedAt: now,
      changedBy,
      reason,
      metadata: metadata || null,
    });

    return updated;
  });

  return { success: true, loan: updatedLoan };
}

/**
 * Get the status history for a loan
 */
export async function getLoanStatusHistory(loanId: string) {
  return db
    .select()
    .from(loanStatusHistory)
    .where(eq(loanStatusHistory.loanId, loanId))
    .orderBy(loanStatusHistory.changedAt);
}

/**
 * Record initial status when a loan is created
 * (Called during loan creation, not a transition)
 */
export async function recordInitialStatus(
  loanId: string,
  status: LoanStatus,
  changedBy?: string
): Promise<void> {
  await db.insert(loanStatusHistory).values({
    loanId,
    fromStatus: null,
    toStatus: status,
    changedAt: new Date(),
    changedBy: changedBy || 'system',
    reason: 'Loan created',
  });
}
