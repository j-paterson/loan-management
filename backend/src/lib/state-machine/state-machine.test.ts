import { describe, it, expect } from 'vitest';
import { isValidTransition, getValidNextStatuses, isTerminalStatus } from './transitions.js';
import { checkTransitionGuard } from './guards.js';
import type { Loan, Borrower } from '../../db/schema.js';

// Helper to create a mock loan
function createMockLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 'loan-123',
    borrowerId: 'borrower-123',
    principalAmountMicros: 500000000, // $50,000
    interestRateBps: 550, // 5.50%
    termMonths: 60,
    status: 'DRAFT',
    statusChangedAt: new Date(),
    submittedAt: null,
    approvedAt: null,
    disbursedAt: null,
    refinancedToLoanId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as Loan;
}

// Helper to create a mock borrower
function createMockBorrower(overrides: Partial<Borrower> = {}): Borrower {
  return {
    id: 'borrower-123',
    name: 'Test Borrower',
    email: 'test@example.com',
    phone: '555-1234',
    creditScore: 720,
    annualIncomeMicros: 800000000, // $80,000
    monthlyDebtMicros: 10000000, // $1,000
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as Borrower;
}

describe('State Machine Transitions', () => {
  it('allows valid transitions', () => {
    expect(isValidTransition('DRAFT', 'SUBMITTED')).toBe(true);
    expect(isValidTransition('UNDER_REVIEW', 'APPROVED')).toBe(true);
    expect(isValidTransition('APPROVED', 'ACTIVE')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(isValidTransition('DRAFT', 'ACTIVE')).toBe(false);
    expect(isValidTransition('DRAFT', 'APPROVED')).toBe(false);
  });

  it('rejects transitions from terminal states', () => {
    expect(isValidTransition('PAID_OFF', 'ACTIVE')).toBe(false);
    expect(isValidTransition('DENIED', 'APPROVED')).toBe(false);
    expect(isTerminalStatus('PAID_OFF')).toBe(true);
    expect(isTerminalStatus('ACTIVE')).toBe(false);
  });

  it('returns valid next statuses', () => {
    expect(getValidNextStatuses('DRAFT')).toEqual(['SUBMITTED', 'WITHDRAWN']);
    expect(getValidNextStatuses('PAID_OFF')).toEqual([]);
  });
});

describe('State Machine Guards', () => {
  describe('DRAFT -> SUBMITTED', () => {
    it('requires complete loan data', () => {
      const loan = createMockLoan();
      const borrower = createMockBorrower();
      expect(checkTransitionGuard('DRAFT', 'SUBMITTED', { loan, borrower }).allowed).toBe(true);
    });

    it('rejects when principal is zero', () => {
      const loan = createMockLoan({ principalAmountMicros: 0 });
      const borrower = createMockBorrower();
      const result = checkTransitionGuard('DRAFT', 'SUBMITTED', { loan, borrower });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Principal');
    });
  });

  describe('UNDER_REVIEW -> APPROVED (credit score)', () => {
    it('requires credit score >= 620', () => {
      const loan = createMockLoan();

      // Below minimum - rejected
      const lowCredit = createMockBorrower({ creditScore: 590 });
      const lowResult = checkTransitionGuard('UNDER_REVIEW', 'APPROVED', { loan, borrower: lowCredit });
      expect(lowResult.allowed).toBe(false);
      expect(lowResult.reason).toContain('590');

      // At minimum - allowed
      const minCredit = createMockBorrower({ creditScore: 620 });
      expect(checkTransitionGuard('UNDER_REVIEW', 'APPROVED', { loan, borrower: minCredit }).allowed).toBe(true);

      // Missing credit score - rejected
      const noCredit = createMockBorrower({ creditScore: null });
      expect(checkTransitionGuard('UNDER_REVIEW', 'APPROVED', { loan, borrower: noCredit }).allowed).toBe(false);
    });
  });

  describe('UNDER_REVIEW -> APPROVED (DTI)', () => {
    it('rejects when DTI exceeds 43%', () => {
      const loan = createMockLoan({
        principalAmountMicros: 1000000000, // $100,000 loan
        interestRateBps: 600,
        termMonths: 60,
      });
      const borrower = createMockBorrower({
        creditScore: 720,
        annualIncomeMicros: 500000000, // $50,000/year
        monthlyDebtMicros: 30000000, // $3,000/month existing debt
      });
      const result = checkTransitionGuard('UNDER_REVIEW', 'APPROVED', { loan, borrower });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Debt-to-income');
    });

    it('skips DTI check when income not available', () => {
      const loan = createMockLoan();
      const borrower = createMockBorrower({ creditScore: 720, annualIncomeMicros: null });
      expect(checkTransitionGuard('UNDER_REVIEW', 'APPROVED', { loan, borrower }).allowed).toBe(true);
    });
  });

  describe('ACTIVE -> PAID_OFF', () => {
    it('validates payment balance', () => {
      const loan = createMockLoan({ principalAmountMicros: 500000000 });
      const borrower = createMockBorrower();

      // Fully paid - allowed
      expect(checkTransitionGuard('ACTIVE', 'PAID_OFF', {
        loan, borrower, totalPaymentsMicros: 550000000
      }).allowed).toBe(true);

      // Balance remaining - rejected
      const result = checkTransitionGuard('ACTIVE', 'PAID_OFF', {
        loan, borrower, totalPaymentsMicros: 300000000
      });
      expect(result.allowed).toBe(false);

      // Manual override (no payment data) - allowed
      expect(checkTransitionGuard('ACTIVE', 'PAID_OFF', { loan, borrower }).allowed).toBe(true);
    });
  });
});
