import { api } from './client';
import type { Payment, CreatePaymentInput, UpdatePaymentInput } from '../types/payment';
import type { ApiResponse } from '../types/loan';

export const paymentsApi = {
  getByLoanId: async (loanId: string): Promise<Payment[]> => {
    const response = await api.get<ApiResponse<Payment[]>>(`/loans/${loanId}/payments`);
    return response.data;
  },

  getById: async (loanId: string, id: string): Promise<Payment> => {
    const response = await api.get<ApiResponse<Payment>>(`/loans/${loanId}/payments/${id}`);
    return response.data;
  },

  create: async (loanId: string, input: CreatePaymentInput): Promise<Payment> => {
    const response = await api.post<ApiResponse<Payment>>(`/loans/${loanId}/payments`, input);
    return response.data;
  },

  update: async (loanId: string, id: string, input: UpdatePaymentInput): Promise<Payment> => {
    const response = await api.patch<ApiResponse<Payment>>(`/loans/${loanId}/payments/${id}`, input);
    return response.data;
  },

  delete: async (loanId: string, id: string): Promise<void> => {
    await api.delete(`/loans/${loanId}/payments/${id}`);
  },
};
