export interface Loan {
  id: string;
  principalAmount: string;
  interestRate: string;
  termMonths: number;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateLoanInput {
  principalAmount: number;
  interestRate: number;
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
