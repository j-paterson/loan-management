import type { Loan } from '../types/loan';
import type { Borrower } from '../types/borrower';

export const mockBorrowers: Borrower[] = [
  {
    id: 'borrower-1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    phone: '555-0101',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    deletedAt: null,
  },
  {
    id: 'borrower-2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    phone: '555-0102',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    deletedAt: null,
  },
];

export const mockLoans: Loan[] = [
  {
    id: '1',
    borrowerId: 'borrower-1',
    borrower: mockBorrowers[0],
    principalAmountMicros: 500000000,  // $50,000
    interestRateBps: 550,              // 5.50%
    termMonths: 60,
    status: 'ACTIVE',
    remainingBalanceMicros: 350000000, // $35,000
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    deletedAt: null,
  },
  {
    id: '2',
    borrowerId: 'borrower-2',
    borrower: mockBorrowers[1],
    principalAmountMicros: 250000000,  // $25,000
    interestRateBps: 450,              // 4.50%
    termMonths: 36,
    status: 'DRAFT',
    remainingBalanceMicros: 250000000, // $25,000 (no payments yet)
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
    deletedAt: null,
  },
];

export const mockLoan = mockLoans[0];
