import { api } from './client';
import type { Loan, CreateLoanInput, UpdateLoanInput, LoanStatus, ApiResponse } from '../types/loan';

export interface TransitionInput {
  toStatus: LoanStatus;
  reason?: string;
}

export interface TransitionOption {
  toStatus: LoanStatus;
  allowed: boolean;
  reason: string | null;
}

export interface AvailableTransitionsResponse {
  currentStatus: LoanStatus;
  transitions: TransitionOption[];
}

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

  transition: async (id: string, input: TransitionInput): Promise<Loan> => {
    const response = await api.post<ApiResponse<Loan>>(`/loans/${id}/status/transition`, input);
    return response.data;
  },

  getAvailableTransitions: async (id: string): Promise<AvailableTransitionsResponse> => {
    const response = await api.get<ApiResponse<AvailableTransitionsResponse>>(`/loans/${id}/status/available-transitions`);
    return response.data;
  },
};
