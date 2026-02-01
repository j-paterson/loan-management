import type { Loan } from '../types/loan';

export const mockLoans: Loan[] = [
  {
    id: '1',
    principalAmountMicros: 500000000,  // $50,000
    interestRateBps: 550,              // 5.50%
    termMonths: 60,
    status: 'ACTIVE',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    deletedAt: null,
  },
  {
    id: '2',
    principalAmountMicros: 250000000,  // $25,000
    interestRateBps: 450,              // 4.50%
    termMonths: 36,
    status: 'DRAFT',
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
    deletedAt: null,
  },
];

export const mockLoan = mockLoans[0];
