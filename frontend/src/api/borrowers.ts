import { api } from './client';
import type { Borrower, CreateBorrowerInput, UpdateBorrowerInput } from '../types/borrower';
import type { ApiResponse } from '../types/loan';

export const borrowersApi = {
  getAll: async (): Promise<Borrower[]> => {
    const response = await api.get<ApiResponse<Borrower[]>>('/borrowers');
    return response.data;
  },

  getById: async (id: string): Promise<Borrower> => {
    const response = await api.get<ApiResponse<Borrower>>(`/borrowers/${id}`);
    return response.data;
  },

  create: async (input: CreateBorrowerInput): Promise<Borrower> => {
    const response = await api.post<ApiResponse<Borrower>>('/borrowers', input);
    return response.data;
  },

  update: async (id: string, input: UpdateBorrowerInput): Promise<Borrower> => {
    const response = await api.patch<ApiResponse<Borrower>>(`/borrowers/${id}`, input);
    return response.data;
  },

  delete: async (id: string): Promise<Borrower> => {
    const response = await api.delete<ApiResponse<Borrower>>(`/borrowers/${id}`);
    return response.data;
  },
};
