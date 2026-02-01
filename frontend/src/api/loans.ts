import { api } from './client';
import type { Loan, CreateLoanInput, UpdateLoanInput, ApiResponse } from '../types/loan';

export const loansApi = {
  getAll: async (): Promise<Loan[]> => {
    const response = await api.get<ApiResponse<Loan[]>>('/loans');
    return response.data;
  },

  getById: async (id: string): Promise<Loan> => {
    const response = await api.get<ApiResponse<Loan>>(`/loans/${id}`);
    return response.data;
  },

  create: async (input: CreateLoanInput): Promise<Loan> => {
    const response = await api.post<ApiResponse<Loan>>('/loans', input);
    return response.data;
  },

  update: async (id: string, input: UpdateLoanInput): Promise<Loan> => {
    const response = await api.patch<ApiResponse<Loan>>(`/loans/${id}`, input);
    return response.data;
  },

  delete: async (id: string): Promise<Loan> => {
    const response = await api.delete<ApiResponse<Loan>>(`/loans/${id}`);
    return response.data;
  },
};
