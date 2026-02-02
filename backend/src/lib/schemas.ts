/**
 * Shared Zod Schemas
 *
 * Common validation schemas used across routes.
 */

import { z } from 'zod';
import { MICROS_PER_DOLLAR } from './money.js';
import {
  PRINCIPAL_MIN_MICROS,
  PRINCIPAL_MAX_MICROS,
  RATE_MIN_BPS,
  RATE_MAX_BPS,
  TERM_MIN_MONTHS,
  TERM_MAX_MONTHS,
  NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  CREDIT_SCORE_MIN,
  CREDIT_SCORE_MAX,
  ANNUAL_INCOME_MAX_DOLLARS,
  MONTHLY_DEBT_MAX_DOLLARS,
  LOAN_STATUSES,
} from './validation.js';

// UUID validation for route params
export const uuidParamSchema = z.string().uuid('Invalid ID format');

// Borrower schemas
export const createBorrowerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(NAME_MAX_LENGTH),
  email: z.string().email('Invalid email address').max(EMAIL_MAX_LENGTH),
  phone: z.string().max(PHONE_MAX_LENGTH).optional(),
  // Credit profile fields (optional for initial creation)
  creditScore: z.number()
    .int('Credit score must be a whole number')
    .min(CREDIT_SCORE_MIN, `Credit score must be at least ${CREDIT_SCORE_MIN}`)
    .max(CREDIT_SCORE_MAX, `Credit score cannot exceed ${CREDIT_SCORE_MAX}`)
    .optional()
    .nullable(),
  annualIncomeMicros: z.number()
    .int('Income must be a whole number')
    .min(0, 'Income cannot be negative')
    .max(ANNUAL_INCOME_MAX_DOLLARS * MICROS_PER_DOLLAR, 'Income exceeds maximum')
    .optional()
    .nullable(),
  monthlyDebtMicros: z.number()
    .int('Debt must be a whole number')
    .min(0, 'Debt cannot be negative')
    .max(MONTHLY_DEBT_MAX_DOLLARS * MICROS_PER_DOLLAR, 'Debt exceeds maximum')
    .optional()
    .nullable(),
});

export const updateBorrowerSchema = createBorrowerSchema.partial();

// Loan schemas
const baseLoanSchema = z.object({
  principalAmountMicros: z.number()
    .int('Amount must be an integer')
    .min(PRINCIPAL_MIN_MICROS, 'Amount must be at least $1')
    .max(PRINCIPAL_MAX_MICROS, 'Amount cannot exceed $10,000,000'),
  interestRateBps: z.number()
    .int('Rate must be an integer')
    .min(RATE_MIN_BPS, 'Rate cannot be negative')
    .max(RATE_MAX_BPS, 'Rate cannot exceed 50%'),
  termMonths: z.number()
    .int('Term must be a whole number')
    .min(TERM_MIN_MONTHS, 'Term must be at least 1 month')
    .max(TERM_MAX_MONTHS, 'Term cannot exceed 600 months'),
  status: z.enum(LOAN_STATUSES).optional(),
});

export const createLoanSchema = baseLoanSchema.extend({
  borrowerId: z.string().uuid().optional(),
  newBorrower: createBorrowerSchema.optional(),
}).refine(
  (data) => data.borrowerId || data.newBorrower,
  { message: 'Either borrowerId or newBorrower is required' }
);

export const updateLoanSchema = baseLoanSchema.partial().extend({
  borrowerId: z.string().uuid().optional(),
  newBorrower: createBorrowerSchema.optional(),
});

// Payment schemas
export const createPaymentSchema = z.object({
  amountMicros: z.number()
    .int('Amount must be an integer')
    .min(1, 'Amount must be at least 1 micro-unit'),
  paidAt: z.string().datetime({ offset: true }).or(z.string().date()),
});

export const updatePaymentSchema = createPaymentSchema.partial();
