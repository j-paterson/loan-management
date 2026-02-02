import { eq, sum } from 'drizzle-orm';
import { db } from '../db/index.js';
import { loans, borrowers, payments, type Loan, type LoanStatus } from '../db/schema.js';
import {
  isValidTransition,
  getValidNextStatuses,
  checkTransitionGuard,
} from '../lib/state-machine/index.js';
import { recordStatusChange } from './event.service.js';
import { success, fail, type ServiceResult, type ActorContext } from './types.js';

export interface TransitionInput {
  toStatus: LoanStatus;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionOption {
  toStatus: LoanStatus;
  allowed: boolean;
  reason: string | null;
}

export interface AvailableTransitions {
  currentStatus: LoanStatus;
  transitions: TransitionOption[];
}

/**
 * Transition a loan to a new status
 * Validates transition, checks guards, and records STATUS_CHANGE event
 */
export async function transition(
  loanId: string,
  input: TransitionInput,
  actor: ActorContext
): Promise<ServiceResult<Loan>> {
  const { toStatus, reason } = input;

  // Fetch the loan
  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));

  if (!loan) {
    return fail('Loan not found', 'NOT_FOUND');
  }

  const fromStatus = loan.status as LoanStatus;

  // Check if this is a valid transition
  if (!isValidTransition(fromStatus, toStatus)) {
    const validNext = getValidNextStatuses(fromStatus);
    return fail(
      `Cannot transition from ${fromStatus} to ${toStatus}. Valid transitions: ${validNext.join(', ') || 'none (terminal state)'}`,
      'INVALID_TRANSITION'
    );
  }

  // Fetch borrower for guard checks
  const [borrower] = await db
    .select()
    .from(borrowers)
    .where(eq(borrowers.id, loan.borrowerId));

  if (!borrower) {
    return fail('Borrower not found', 'NOT_FOUND');
  }

  // Calculate remaining balance for guards
  const [paymentSum] = await db
    .select({ total: sum(payments.amountMicros) })
    .from(payments)
    .where(eq(payments.loanId, loanId));

  const totalPayments = Number(paymentSum?.total || 0);
  const remainingBalanceMicros = loan.principalAmountMicros - totalPayments;

  // Check guard conditions
  const guardResult = checkTransitionGuard(fromStatus, toStatus, {
    loan,
    borrower,
    remainingBalanceMicros,
  });

  if (!guardResult.allowed) {
    return fail(guardResult.reason || 'Transition not allowed', 'INVALID_TRANSITION');
  }

  // Prepare update data
  const now = new Date();
  const updateData: Partial<Loan> = {
    status: toStatus,
    statusChangedAt: now,
    updatedAt: now,
  };

  // Perform the update and record event in a transaction
  const [updatedLoan] = await db.transaction(async (tx) => {
    // Update the loan
    const updated = await tx
      .update(loans)
      .set(updateData)
      .where(eq(loans.id, loanId))
      .returning();

    // Record STATUS_CHANGE event
    await recordStatusChange(loanId, fromStatus, toStatus, actor.actorId, reason, tx);

    return updated;
  });

  return success(updatedLoan);
}

/**
 * Get all available transitions for a loan with guard check results
 */
export async function getAvailableTransitions(
  loanId: string
): Promise<ServiceResult<AvailableTransitions>> {
  // Fetch the loan
  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));

  if (!loan) {
    return fail('Loan not found', 'NOT_FOUND');
  }

  // Fetch borrower
  const [borrower] = await db
    .select()
    .from(borrowers)
    .where(eq(borrowers.id, loan.borrowerId));

  if (!borrower) {
    return fail('Borrower not found', 'NOT_FOUND');
  }

  // Calculate remaining balance
  const [paymentSum] = await db
    .select({ total: sum(payments.amountMicros) })
    .from(payments)
    .where(eq(payments.loanId, loanId));

  const totalPayments = Number(paymentSum?.total || 0);
  const remainingBalanceMicros = loan.principalAmountMicros - totalPayments;

  // Get valid transitions for current status
  const possibleTransitions = getValidNextStatuses(loan.status as LoanStatus);

  // Check guards for each possible transition
  const transitions = possibleTransitions.map((toStatus) => {
    const guardResult = checkTransitionGuard(loan.status as LoanStatus, toStatus, {
      loan,
      borrower,
      remainingBalanceMicros,
    });
    return {
      toStatus,
      allowed: guardResult.allowed,
      reason: guardResult.reason || null,
    };
  });

  return success({
    currentStatus: loan.status as LoanStatus,
    transitions,
  });
}

export const statusService = {
  transition,
  getAvailableTransitions,
};
