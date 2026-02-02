import { eq, isNull, and, sum } from 'drizzle-orm';
import { db } from '../db/index.js';
import { payments, loans, type Payment, type LoanStatus } from '../db/schema.js';
import { PAYMENT_ALLOWED_STATUSES } from '@loan-management/shared';
import { recordPaymentReceived } from './event.service.js';
import { success, fail, type ServiceResult, type ActorContext } from './types.js';

export interface CreatePaymentInput {
  amountMicros: number;
  paidAt: string;
}

export interface UpdatePaymentInput {
  amountMicros?: number;
  paidAt?: string;
}

/**
 * List all payments for a loan
 */
export async function listByLoan(loanId: string): Promise<ServiceResult<Payment[]>> {
  // Verify loan exists
  const [loan] = await db
    .select()
    .from(loans)
    .where(and(eq(loans.id, loanId), isNull(loans.deletedAt)));

  if (!loan) {
    return fail('Loan not found', 'NOT_FOUND');
  }

  const result = await db
    .select()
    .from(payments)
    .where(and(eq(payments.loanId, loanId), isNull(payments.deletedAt)))
    .orderBy(payments.paidAt);

  return success(result);
}

/**
 * Get a single payment by ID
 */
export async function getById(
  loanId: string,
  paymentId: string
): Promise<ServiceResult<Payment>> {
  const result = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.id, paymentId),
        eq(payments.loanId, loanId),
        isNull(payments.deletedAt)
      )
    );

  if (!result.length) {
    return fail('Payment not found', 'NOT_FOUND');
  }

  return success(result[0]);
}

/**
 * Create a new payment
 * Records PAYMENT_RECEIVED event atomically
 */
export async function create(
  loanId: string,
  input: CreatePaymentInput,
  actor: ActorContext
): Promise<ServiceResult<Payment>> {
  // Fetch the loan to check status and calculate remaining balance
  const [loan] = await db
    .select()
    .from(loans)
    .where(and(eq(loans.id, loanId), isNull(loans.deletedAt)));

  if (!loan) {
    return fail('Loan not found', 'NOT_FOUND');
  }

  // Check loan status allows payments
  if (!PAYMENT_ALLOWED_STATUSES.includes(loan.status as LoanStatus)) {
    return fail(
      `Cannot record payment for loan in ${loan.status} status. Payments are only allowed for loans that are Active, Delinquent, Default, or Charged Off.`,
      'VALIDATION'
    );
  }

  // Calculate remaining balance
  const [paymentSum] = await db
    .select({ total: sum(payments.amountMicros) })
    .from(payments)
    .where(and(eq(payments.loanId, loanId), isNull(payments.deletedAt)));

  const totalPaid = Number(paymentSum?.total || 0);
  const remainingBalance = loan.principalAmountMicros - totalPaid;

  // Check payment doesn't exceed remaining balance
  if (input.amountMicros > remainingBalance) {
    return fail(
      `Payment amount exceeds remaining balance. Maximum payment allowed: ${remainingBalance} micros.`,
      'VALIDATION'
    );
  }

  // Wrap payment creation + event recording in transaction
  const payment = await db.transaction(async (tx) => {
    const [payment] = await tx
      .insert(payments)
      .values({
        loanId,
        amountMicros: input.amountMicros,
        paidAt: new Date(input.paidAt),
      })
      .returning();

    // Record payment event in same transaction
    await recordPaymentReceived(loanId, payment.id, payment.amountMicros, actor.actorId, tx);

    return payment;
  });

  return success(payment);
}

/**
 * Update a payment
 */
export async function update(
  loanId: string,
  paymentId: string,
  input: UpdatePaymentInput
): Promise<ServiceResult<Payment>> {
  // Check if payment exists
  const existing = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.id, paymentId),
        eq(payments.loanId, loanId),
        isNull(payments.deletedAt)
      )
    );

  if (!existing.length) {
    return fail('Payment not found', 'NOT_FOUND');
  }

  const existingPayment = existing[0];

  // If changing amount, validate against remaining balance
  if (input.amountMicros !== undefined && input.amountMicros !== existingPayment.amountMicros) {
    // Get loan principal
    const [loan] = await db
      .select()
      .from(loans)
      .where(eq(loans.id, loanId));

    if (!loan) {
      return fail('Loan not found', 'NOT_FOUND');
    }

    // Calculate remaining balance excluding this payment
    const [paymentSum] = await db
      .select({ total: sum(payments.amountMicros) })
      .from(payments)
      .where(
        and(
          eq(payments.loanId, loanId),
          isNull(payments.deletedAt)
        )
      );

    const totalPaid = Number(paymentSum?.total || 0);
    const remainingBalanceExcludingThis = loan.principalAmountMicros - totalPaid + existingPayment.amountMicros;

    if (input.amountMicros > remainingBalanceExcludingThis) {
      return fail(
        `Payment amount exceeds remaining balance. Maximum payment allowed: ${remainingBalanceExcludingThis} micros.`,
        'VALIDATION'
      );
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (input.amountMicros !== undefined) {
    updates.amountMicros = input.amountMicros;
  }
  if (input.paidAt !== undefined) {
    updates.paidAt = new Date(input.paidAt);
  }

  const [payment] = await db
    .update(payments)
    .set(updates)
    .where(eq(payments.id, paymentId))
    .returning();

  return success(payment);
}

/**
 * Soft delete a payment
 */
export async function remove(
  loanId: string,
  paymentId: string
): Promise<ServiceResult<Payment>> {
  // Check if payment exists
  const existing = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.id, paymentId),
        eq(payments.loanId, loanId),
        isNull(payments.deletedAt)
      )
    );

  if (!existing.length) {
    return fail('Payment not found', 'NOT_FOUND');
  }

  const [payment] = await db
    .update(payments)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(payments.id, paymentId))
    .returning();

  return success(payment);
}

export const paymentService = {
  listByLoan,
  getById,
  create,
  update,
  remove,
};
