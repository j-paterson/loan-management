/**
 * Shared Validation Constants
 *
 * These values must match backend/src/lib/validation.ts
 * Single source of truth for validation limits.
 */

import { MICROS_PER_DOLLAR } from './money';

// Principal amount limits
export const PRINCIPAL_MIN_DOLLARS = 1;
export const PRINCIPAL_MAX_DOLLARS = 10_000_000;
export const PRINCIPAL_MIN_MICROS = PRINCIPAL_MIN_DOLLARS * MICROS_PER_DOLLAR;
export const PRINCIPAL_MAX_MICROS = PRINCIPAL_MAX_DOLLARS * MICROS_PER_DOLLAR;

// Interest rate limits (in basis points, 100 bps = 1%)
export const RATE_MIN_BPS = 0;
export const RATE_MAX_BPS = 5_000; // 50% hard cap
export const RATE_WARNING_BPS = 2_000; // 20% soft cap (warning threshold)
export const RATE_MIN_PERCENT = 0;
export const RATE_MAX_PERCENT = 50;
export const RATE_WARNING_PERCENT = 20;

// Term limits (in months)
export const TERM_MIN_MONTHS = 1;
export const TERM_MAX_MONTHS = 600; // 50 years

// Borrower field limits
export const NAME_MAX_LENGTH = 255;
export const EMAIL_MAX_LENGTH = 255;
export const PHONE_MAX_LENGTH = 50;

// Credit profile limits
export const CREDIT_SCORE_MIN = 300;
export const CREDIT_SCORE_MAX = 850;
export const ANNUAL_INCOME_MAX_DOLLARS = 100_000_000;
export const MONTHLY_DEBT_MAX_DOLLARS = 10_000_000;

// Loan statuses
export const LOAN_STATUSES = ['DRAFT', 'ACTIVE'] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];
