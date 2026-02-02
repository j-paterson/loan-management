export interface Payment {
  id: string;
  loanId: string;
  amountMicros: number;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentInput {
  amountMicros: number;
  paidAt: string;
}

export interface UpdatePaymentInput {
  amountMicros?: number;
  paidAt?: string;
}
