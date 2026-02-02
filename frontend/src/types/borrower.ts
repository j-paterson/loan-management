export interface Borrower {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  // Credit profile for underwriting
  creditScore: number | null;
  annualIncomeMicros: number | null;
  monthlyDebtMicros: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

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
