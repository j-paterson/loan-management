import { pgTable, uuid, bigint, integer, timestamp, text, jsonb } from 'drizzle-orm/pg-core';

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

export type LoanStatus = typeof LOAN_STATUSES[number];

/**
 * Borrowers table
 */
export const borrowers = pgTable('borrowers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  // Credit profile for underwriting
  creditScore: integer('credit_score'), // 300-850
  annualIncomeMicros: bigint('annual_income_micros', { mode: 'number' }), // For DTI calculation
  monthlyDebtMicros: bigint('monthly_debt_micros', { mode: 'number' }), // For DTI calculation
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
  status: text('status', { enum: LOAN_STATUSES }).default('DRAFT').notNull(),
  // Status lifecycle timestamps
  statusChangedAt: timestamp('status_changed_at').defaultNow().notNull(),
  submittedAt: timestamp('submitted_at'),
  approvedAt: timestamp('approved_at'),
  disbursedAt: timestamp('disbursed_at'),
  // For refinanced loans, reference to the new loan
  refinancedToLoanId: uuid('refinanced_to_loan_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export type Loan = typeof loans.$inferSelect;

/**
 * Loan status history table
 *
 * Audit trail for all status transitions
 */
export const loanStatusHistory = pgTable('loan_status_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  loanId: uuid('loan_id').notNull().references(() => loans.id),
  fromStatus: text('from_status', { enum: LOAN_STATUSES }),
  toStatus: text('to_status', { enum: LOAN_STATUSES }).notNull(),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
  changedBy: text('changed_by'), // User identifier or 'system'
  reason: text('reason'), // Optional explanation
  metadata: jsonb('metadata'), // Additional context (payment ID, etc.)
});

export type LoanStatusHistory = typeof loanStatusHistory.$inferSelect;

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
