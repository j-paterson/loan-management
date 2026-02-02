import { api } from './client';
import type { LoanEvent, ApiResponse } from '../types/loan';

export const eventsApi = {
  getByLoanId: async (loanId: string): Promise<LoanEvent[]> => {
    const response = await api.get<ApiResponse<LoanEvent[]>>(`/loans/${loanId}/events`);
    return response.data;
  },
};
