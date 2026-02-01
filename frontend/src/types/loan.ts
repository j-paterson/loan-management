/**
 * Loan types
 *
 * All monetary values are integers:
 * - principalAmountMicros: Amount in micro-units (10,000ths of a dollar)
 * - interestRateBps: Interest rate in basis points (1 bp = 0.01%)
 */

export interface Loan {
  id: string;
  principalAmountMicros: number;
  interestRateBps: number;
  termMonths: number;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateLoanInput {
  principalAmountMicros: number;
  interestRateBps: number;
  termMonths: number;
  status?: 'DRAFT' | 'ACTIVE';
}

export interface UpdateLoanInput extends Partial<CreateLoanInput> {}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: {
    message: string;
    details?: unknown;
  };
}
