import type { Loan, Borrower, LoanStatus } from '../../db/schema.js';
import { MIN_CREDIT_SCORE_FOR_APPROVAL, MAX_DTI_RATIO } from '@loan-management/shared';

/**
 * Guard result type
 */
export interface GuardResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Context passed to guard functions
 */
export interface TransitionContext {
  loan: Loan;
  borrower: Borrower;
  remainingBalanceMicros: number;
}

/**
 * Guard function type
 */
type GuardFn = (ctx: TransitionContext) => GuardResult;

/**
 * Calculate monthly payment for a loan (simple amortization)
 */
function calculateMonthlyPaymentMicros(principalMicros: number, rateBps: number, termMonths: number): number {
  if (rateBps === 0) {
    return Math.ceil(principalMicros / termMonths);
  }
  const monthlyRate = rateBps / 10000 / 12; // Convert bps to monthly decimal
  const payment = principalMicros * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.ceil(payment);
}

/**
 * Calculate debt-to-income ratio
 */
function calculateDTI(borrower: Borrower, loanMonthlyPaymentMicros: number): number | null {
  if (!borrower.annualIncomeMicros || borrower.annualIncomeMicros === 0) {
    return null;
  }
  const monthlyIncome = borrower.annualIncomeMicros / 12;
  const totalMonthlyDebt = (borrower.monthlyDebtMicros || 0) + loanMonthlyPaymentMicros;
  return totalMonthlyDebt / monthlyIncome;
}

/**
 * Guard functions for each transition
 *
 * Key format: "FROM_STATUS->TO_STATUS"
 */
const guards: Record<string, GuardFn> = {
  /**
   * DRAFT -> SUBMITTED
   * Requires: Basic loan data complete
   */
  'DRAFT->SUBMITTED': ({ loan, borrower: _borrower }) => {
    if (!loan.borrowerId) {
      return { allowed: false, reason: 'Borrower is required' };
    }
    if (loan.principalAmountMicros <= 0) {
      return { allowed: false, reason: 'Principal amount must be greater than 0' };
    }
    if (loan.interestRateBps < 0) {
      return { allowed: false, reason: 'Interest rate cannot be negative' };
    }
    if (loan.termMonths <= 0) {
      return { allowed: false, reason: 'Term must be at least 1 month' };
    }
    return { allowed: true };
  },

  /**
   * SUBMITTED -> UNDER_REVIEW
   * Auto-transition, no additional requirements
   */
  'SUBMITTED->UNDER_REVIEW': () => {
    return { allowed: true };
  },

  /**
   * UNDER_REVIEW -> APPROVED
   * Requires: Credit score and DTI checks
   */
  'UNDER_REVIEW->APPROVED': ({ loan, borrower }) => {
    // Check credit score
    if (!borrower.creditScore) {
      return { allowed: false, reason: 'Borrower credit score is required for approval' };
    }
    if (borrower.creditScore < MIN_CREDIT_SCORE_FOR_APPROVAL) {
      return { allowed: false, reason: `Credit score ${borrower.creditScore} is below minimum ${MIN_CREDIT_SCORE_FOR_APPROVAL}` };
    }

    // Check DTI if income data available
    const monthlyPayment = calculateMonthlyPaymentMicros(
      loan.principalAmountMicros,
      loan.interestRateBps,
      loan.termMonths
    );
    const dti = calculateDTI(borrower, monthlyPayment);

    if (dti !== null && dti > MAX_DTI_RATIO) {
      const dtiPercent = (dti * 100).toFixed(1);
      const maxPercent = (MAX_DTI_RATIO * 100).toFixed(0);
      return { allowed: false, reason: `Debt-to-income ratio ${dtiPercent}% exceeds maximum ${maxPercent}%` };
    }

    return { allowed: true };
  },

  /**
   * UNDER_REVIEW -> DENIED
   * Always allowed (manual decision)
   */
  'UNDER_REVIEW->DENIED': () => {
    return { allowed: true };
  },

  /**
   * UNDER_REVIEW -> INFO_REQUESTED
   * Always allowed
   */
  'UNDER_REVIEW->INFO_REQUESTED': () => {
    return { allowed: true };
  },

  /**
   * INFO_REQUESTED -> UNDER_REVIEW
   * Always allowed (borrower provided info)
   */
  'INFO_REQUESTED->UNDER_REVIEW': () => {
    return { allowed: true };
  },

  /**
   * APPROVED -> ACTIVE
   * Transition when funds are disbursed
   */
  'APPROVED->ACTIVE': () => {
    return { allowed: true };
  },

  /**
   * APPROVED -> EXPIRED
   * For when approval expires without disbursement
   */
  'APPROVED->EXPIRED': () => {
    return { allowed: true };
  },

  /**
   * ACTIVE -> DELINQUENT
   * When payments are past due
   */
  'ACTIVE->DELINQUENT': () => {
    return { allowed: true };
  },

  /**
   * DELINQUENT -> ACTIVE
   * When delinquency is cured (caught up on payments)
   */
  'DELINQUENT->ACTIVE': () => {
    return { allowed: true };
  },

  /**
   * DELINQUENT -> DEFAULT
   * Serious delinquency (90+ days)
   */
  'DELINQUENT->DEFAULT': () => {
    return { allowed: true };
  },

  /**
   * DEFAULT -> ACTIVE
   * Reinstatement (full catch-up payment)
   */
  'DEFAULT->ACTIVE': () => {
    return { allowed: true };
  },

  /**
   * DEFAULT -> CHARGED_OFF
   * Written off as loss
   */
  'DEFAULT->CHARGED_OFF': () => {
    return { allowed: true };
  },

  /**
   * ACTIVE -> PAID_OFF
   * Loan fully repaid - requires zero remaining balance
   */
  'ACTIVE->PAID_OFF': ({ remainingBalanceMicros }) => {
    if (remainingBalanceMicros > 0) {
      return { allowed: false, reason: 'Cannot mark as paid off while there is a remaining balance' };
    }
    return { allowed: true };
  },

  /**
   * CHARGED_OFF -> PAID_OFF
   * Recovery after charge-off
   */
  'CHARGED_OFF->PAID_OFF': () => {
    return { allowed: true };
  },

  /**
   * ACTIVE -> REFINANCED
   * Replaced by new loan
   */
  'ACTIVE->REFINANCED': () => {
    return { allowed: true };
  },

  /**
   * Withdrawal transitions (always allowed from eligible states)
   */
  'DRAFT->WITHDRAWN': () => ({ allowed: true }),
  'SUBMITTED->WITHDRAWN': () => ({ allowed: true }),
  'INFO_REQUESTED->WITHDRAWN': () => ({ allowed: true }),
  'APPROVED->WITHDRAWN': () => ({ allowed: true }),
};

/**
 * Check if a transition is allowed based on guard conditions
 */
export function checkTransitionGuard(
  from: LoanStatus,
  to: LoanStatus,
  context: TransitionContext
): GuardResult {
  const guardKey = `${from}->${to}`;
  const guard = guards[guardKey];

  if (!guard) {
    // No guard defined means transition is allowed if it's in VALID_TRANSITIONS
    return { allowed: true };
  }

  return guard(context);
}
