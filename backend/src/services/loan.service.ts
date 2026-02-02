import { eq, isNull, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { loans, borrowers, payments, type Loan, type Borrower, type LoanStatus } from '../db/schema.js';
import { money, micros, subtractMoney } from '../lib/money.js';
import { recordLoanCreated, recordLoanEdited } from './event.service.js';
import { borrowerService } from './borrower.service.js';
import { success, fail, type ServiceResult, type ActorContext } from './types.js';

export interface LoanWithBorrower extends Loan {
  borrower: Borrower | null;
  remainingBalanceMicros: number;
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

export interface UpdateLoanInput {
  principalAmountMicros?: number;
  interestRateBps?: number;
  termMonths?: number;
  status?: LoanStatus;
  borrowerId?: string;
  newBorrower?: {
    name: string;
    email: string;
    phone?: string;
  };
}

/**
 * Calculate remaining balance using dinero.js for precision
 */
function calculateRemainingBalance(principalMicros: number, paymentAmounts: number[]): number {
  let balance = money(principalMicros);
  for (const amount of paymentAmounts) {
    balance = subtractMoney(balance, money(amount));
  }
  return micros(balance);
}

/**
 * List all loans with borrower and remaining balance
 */
export async function list(): Promise<ServiceResult<LoanWithBorrower[]>> {
  const result = await db
    .select()
    .from(loans)
    .where(isNull(loans.deletedAt))
    .orderBy(loans.createdAt);

  // Get unique borrower IDs and fetch all borrowers in one query
  const borrowerIds = [...new Set(result.map((l) => l.borrowerId))];
  const borrowerList =
    borrowerIds.length > 0
      ? await db.select().from(borrowers).where(isNull(borrowers.deletedAt))
      : [];

  // Create borrower lookup map
  const borrowerMap = new Map(borrowerList.map((b) => [b.id, b]));

  // Get payment totals for all loans
  const loanIds = result.map((l) => l.id);
  const paymentsList =
    loanIds.length > 0
      ? await db
          .select({ loanId: payments.loanId, amountMicros: payments.amountMicros })
          .from(payments)
          .where(isNull(payments.deletedAt))
      : [];

  // Group payments by loan ID
  const paymentsByLoan = new Map<string, number[]>();
  for (const p of paymentsList) {
    const existing = paymentsByLoan.get(p.loanId) || [];
    existing.push(p.amountMicros);
    paymentsByLoan.set(p.loanId, existing);
  }

  // Attach borrower and remaining balance to each loan
  const data = result.map((loan) => ({
    ...loan,
    borrower: borrowerMap.get(loan.borrowerId) ?? null,
    remainingBalanceMicros: calculateRemainingBalance(
      loan.principalAmountMicros,
      paymentsByLoan.get(loan.id) || []
    ),
  }));

  return success(data);
}

/**
 * Get a single loan by ID with borrower and remaining balance
 */
export async function getById(id: string): Promise<ServiceResult<LoanWithBorrower>> {
  const result = await db
    .select()
    .from(loans)
    .where(and(eq(loans.id, id), isNull(loans.deletedAt)));

  if (!result.length) {
    return fail('Loan not found', 'NOT_FOUND');
  }

  const loan = result[0];

  // Fetch borrower if assigned
  let borrower: Borrower | null = null;
  if (loan.borrowerId) {
    const borrowerResult = await db
      .select()
      .from(borrowers)
      .where(eq(borrowers.id, loan.borrowerId));
    borrower = borrowerResult[0] ?? null;
  }

  // Calculate remaining balance
  const loanPayments = await db
    .select({ amountMicros: payments.amountMicros })
    .from(payments)
    .where(and(eq(payments.loanId, loan.id), isNull(payments.deletedAt)));

  const remainingBalanceMicros = calculateRemainingBalance(
    loan.principalAmountMicros,
    loanPayments.map((p) => p.amountMicros)
  );

  return success({ ...loan, borrower, remainingBalanceMicros });
}

/**
 * Create a new loan with optional inline borrower creation
 * Records LOAN_CREATED event atomically
 */
export async function create(
  input: CreateLoanInput,
  actor: ActorContext
): Promise<ServiceResult<LoanWithBorrower>> {
  // Validate borrower exists before transaction if using existing borrower
  let existingBorrower: Borrower | null = null;
  if (input.borrowerId) {
    const borrowerResult = await borrowerService.getById(input.borrowerId);
    if (!borrowerResult.success) {
      return fail('Borrower not found', 'NOT_FOUND');
    }
    existingBorrower = borrowerResult.data;
  }

  const initialStatus = input.status ?? 'DRAFT';

  // Wrap loan + borrower creation + event recording in transaction
  const { loan, borrower } = await db.transaction(async (tx) => {
    let borrowerId = input.borrowerId;
    let borrower: Borrower | null = existingBorrower;

    // If newBorrower provided, create it first
    if (input.newBorrower) {
      const borrowerResult = await borrowerService.create(
        {
          name: input.newBorrower.name,
          email: input.newBorrower.email,
          phone: input.newBorrower.phone,
        },
        tx
      );
      if (!borrowerResult.success) {
        throw new Error(borrowerResult.error);
      }
      borrower = borrowerResult.data;
      borrowerId = borrower.id;
    }

    // Insert loan
    const [loan] = await tx
      .insert(loans)
      .values({
        principalAmountMicros: input.principalAmountMicros,
        interestRateBps: input.interestRateBps,
        termMonths: input.termMonths,
        status: initialStatus,
        borrowerId: borrowerId!,
      })
      .returning();

    // Record loan created event in same transaction
    await recordLoanCreated(loan.id, initialStatus, actor.actorId, tx);

    return { loan, borrower };
  });

  return success({
    ...loan,
    borrower,
    remainingBalanceMicros: loan.principalAmountMicros, // New loan, no payments yet
  });
}

/**
 * Update a loan
 * Records LOAN_EDITED event if there were changes
 */
export async function update(
  id: string,
  input: UpdateLoanInput,
  actor: ActorContext
): Promise<ServiceResult<LoanWithBorrower>> {
  // Check if loan exists
  const existing = await db
    .select()
    .from(loans)
    .where(and(eq(loans.id, id), isNull(loans.deletedAt)));

  if (!existing.length) {
    return fail('Loan not found', 'NOT_FOUND');
  }

  const existingLoan = existing[0];

  // Validate borrower exists before transaction if changing to existing borrower
  if (input.borrowerId !== undefined) {
    const borrowerResult = await borrowerService.getById(input.borrowerId);
    if (!borrowerResult.success) {
      return fail('Borrower not found', 'NOT_FOUND');
    }
  }

  // Wrap update + borrower creation + event recording in transaction
  const { loan, borrower } = await db.transaction(async (tx) => {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    let borrower: Borrower | null = null;

    if (input.principalAmountMicros !== undefined) {
      updates.principalAmountMicros = input.principalAmountMicros;
    }
    if (input.interestRateBps !== undefined) {
      updates.interestRateBps = input.interestRateBps;
    }
    if (input.termMonths !== undefined) {
      updates.termMonths = input.termMonths;
    }
    if (input.status !== undefined) {
      updates.status = input.status;
    }

    // Handle borrower assignment
    if (input.newBorrower) {
      const borrowerResult = await borrowerService.create(
        {
          name: input.newBorrower.name,
          email: input.newBorrower.email,
          phone: input.newBorrower.phone,
        },
        tx
      );
      if (!borrowerResult.success) {
        throw new Error(borrowerResult.error);
      }
      borrower = borrowerResult.data;
      updates.borrowerId = borrower.id;
    } else if (input.borrowerId !== undefined) {
      updates.borrowerId = input.borrowerId;
    }

    // Update loan
    const [loan] = await tx
      .update(loans)
      .set(updates)
      .where(eq(loans.id, id))
      .returning();

    // Track changes for event recording
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    if (
      input.principalAmountMicros !== undefined &&
      input.principalAmountMicros !== existingLoan.principalAmountMicros
    ) {
      changes.principalAmountMicros = {
        from: existingLoan.principalAmountMicros,
        to: input.principalAmountMicros,
      };
    }
    if (
      input.interestRateBps !== undefined &&
      input.interestRateBps !== existingLoan.interestRateBps
    ) {
      changes.interestRateBps = {
        from: existingLoan.interestRateBps,
        to: input.interestRateBps,
      };
    }
    if (input.termMonths !== undefined && input.termMonths !== existingLoan.termMonths) {
      changes.termMonths = { from: existingLoan.termMonths, to: input.termMonths };
    }
    if (updates.borrowerId !== undefined && updates.borrowerId !== existingLoan.borrowerId) {
      changes.borrowerId = { from: existingLoan.borrowerId, to: updates.borrowerId };
    }

    // Record edit event if there were changes
    if (Object.keys(changes).length > 0) {
      await recordLoanEdited(id, changes, actor.actorId, tx);
    }

    // Fetch borrower data if not already loaded from inline creation
    if (!borrower && loan.borrowerId) {
      const borrowerResult = await tx
        .select()
        .from(borrowers)
        .where(eq(borrowers.id, loan.borrowerId));
      borrower = borrowerResult[0] ?? null;
    }

    return { loan, borrower };
  });

  // Calculate remaining balance
  const loanPayments = await db
    .select({ amountMicros: payments.amountMicros })
    .from(payments)
    .where(and(eq(payments.loanId, id), isNull(payments.deletedAt)));

  const remainingBalanceMicros = calculateRemainingBalance(
    loan.principalAmountMicros,
    loanPayments.map((p) => p.amountMicros)
  );

  return success({ ...loan, borrower, remainingBalanceMicros });
}

/**
 * Soft delete a loan
 */
export async function remove(id: string): Promise<ServiceResult<Loan>> {
  // Check if loan exists
  const existing = await db
    .select()
    .from(loans)
    .where(and(eq(loans.id, id), isNull(loans.deletedAt)));

  if (!existing.length) {
    return fail('Loan not found', 'NOT_FOUND');
  }

  const [loan] = await db
    .update(loans)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(loans.id, id))
    .returning();

  return success(loan);
}

export const loanService = {
  list,
  getById,
  create,
  update,
  remove,
};
