import type { Loan } from '../types/loan';

export const mockLoans: Loan[] = [
  {
    id: '1',
    principalAmount: '50000.0000',
    interestRate: '0.055000',
    termMonths: 60,
    status: 'ACTIVE',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    principalAmount: '25000.0000',
    interestRate: '0.045000',
    termMonths: 36,
    status: 'DRAFT',
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
  },
];

export const mockLoan = mockLoans[0];
