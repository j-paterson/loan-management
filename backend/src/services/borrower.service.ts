import { eq, isNull, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { borrowers, type Borrower } from '../db/schema.js';
import { success, fail, type ServiceResult, type TxContext } from './types.js';

export interface CreateBorrowerInput {
  name: string;
  email: string;
  phone?: string;
  creditScore?: number | null;
  annualIncomeMicros?: number | null;
  monthlyDebtMicros?: number | null;
}

export interface UpdateBorrowerInput {
  name?: string;
  email?: string;
  phone?: string;
  creditScore?: number | null;
  annualIncomeMicros?: number | null;
  monthlyDebtMicros?: number | null;
}

/**
 * List all borrowers (excluding soft-deleted)
 */
export async function list(): Promise<ServiceResult<Borrower[]>> {
  const result = await db
    .select()
    .from(borrowers)
    .where(isNull(borrowers.deletedAt))
    .orderBy(borrowers.name);

  return success(result);
}

/**
 * Get a borrower by ID
 */
export async function getById(id: string): Promise<ServiceResult<Borrower>> {
  const result = await db
    .select()
    .from(borrowers)
    .where(and(eq(borrowers.id, id), isNull(borrowers.deletedAt)));

  if (!result.length) {
    return fail('Borrower not found', 'NOT_FOUND');
  }

  return success(result[0]);
}

/**
 * Create a new borrower
 */
export async function create(
  input: CreateBorrowerInput,
  tx?: TxContext
): Promise<ServiceResult<Borrower>> {
  const client = tx ?? db;

  const [borrower] = await client
    .insert(borrowers)
    .values({
      name: input.name,
      email: input.email,
      phone: input.phone,
      creditScore: input.creditScore,
      annualIncomeMicros: input.annualIncomeMicros,
      monthlyDebtMicros: input.monthlyDebtMicros,
    })
    .returning();

  return success(borrower);
}

/**
 * Update a borrower
 */
export async function update(
  id: string,
  input: UpdateBorrowerInput
): Promise<ServiceResult<Borrower>> {
  // Check if borrower exists
  const existing = await db
    .select()
    .from(borrowers)
    .where(and(eq(borrowers.id, id), isNull(borrowers.deletedAt)));

  if (!existing.length) {
    return fail('Borrower not found', 'NOT_FOUND');
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (input.name !== undefined) updates.name = input.name;
  if (input.email !== undefined) updates.email = input.email;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.creditScore !== undefined) updates.creditScore = input.creditScore;
  if (input.annualIncomeMicros !== undefined) updates.annualIncomeMicros = input.annualIncomeMicros;
  if (input.monthlyDebtMicros !== undefined) updates.monthlyDebtMicros = input.monthlyDebtMicros;

  const [borrower] = await db
    .update(borrowers)
    .set(updates)
    .where(eq(borrowers.id, id))
    .returning();

  return success(borrower);
}

/**
 * Soft delete a borrower
 */
export async function remove(id: string): Promise<ServiceResult<Borrower>> {
  // Check if borrower exists
  const existing = await db
    .select()
    .from(borrowers)
    .where(and(eq(borrowers.id, id), isNull(borrowers.deletedAt)));

  if (!existing.length) {
    return fail('Borrower not found', 'NOT_FOUND');
  }

  const [borrower] = await db
    .update(borrowers)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(borrowers.id, id))
    .returning();

  return success(borrower);
}

export const borrowerService = {
  list,
  getById,
  create,
  update,
  remove,
};
