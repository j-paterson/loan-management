import { pgTable, uuid, bigint, integer, timestamp, text } from 'drizzle-orm/pg-core';

/**
 * Borrowers table
 */
export const borrowers = pgTable('borrowers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export type Borrower = typeof borrowers.$inferSelect;

/**
 * Loans table
 *
 * Monetary values are stored as integers to avoid floating-point precision issues:
 * - principalAmountMicros: Amount in micro-units (10,000ths of a dollar)
 *   e.g., $50,000.1234 is stored as 500001234
 * - interestRateBps: Interest rate in basis points (1 bp = 0.01%)
 *   e.g., 5.50% is stored as 550
 */
export const loans = pgTable('loans', {
  id: uuid('id').defaultRandom().primaryKey(),
  borrowerId: uuid('borrower_id').references(() => borrowers.id).notNull(),
  principalAmountMicros: bigint('principal_amount_micros', { mode: 'number' }).notNull(),
  interestRateBps: integer('interest_rate_bps').notNull(),
  termMonths: integer('term_months').notNull(),
  status: text('status', { enum: ['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED'] }).default('DRAFT').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export type Loan = typeof loans.$inferSelect;

/**
 * Payments table
 *
 * Tracks payments made against loans.
 * amountMicros uses the same micro-unit format as loan amounts.
 */
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  loanId: uuid('loan_id').notNull().references(() => loans.id),
  amountMicros: bigint('amount_micros', { mode: 'number' }).notNull(),
  paidAt: timestamp('paid_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export type Payment = typeof payments.$inferSelect;
