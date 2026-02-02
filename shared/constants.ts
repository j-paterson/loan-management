/**
 * Shared Constants
 *
 * Single source of truth for constants used across frontend and backend.
 */

import type { LoanStatus } from './types';

/**
 * Valid loan status transitions
 *
 * Maps each status to an array of statuses it can transition to.
 * Empty array = terminal state (no further transitions allowed)
 */
export const VALID_TRANSITIONS: Record<LoanStatus, readonly LoanStatus[]> = {
  // Pre-disbursement (origination)
  DRAFT: ['SUBMITTED', 'WITHDRAWN'],
  SUBMITTED: ['UNDER_REVIEW', 'WITHDRAWN'],
  UNDER_REVIEW: ['APPROVED', 'DENIED', 'INFO_REQUESTED'],
  INFO_REQUESTED: ['UNDER_REVIEW', 'WITHDRAWN'],
  APPROVED: ['ACTIVE', 'EXPIRED', 'WITHDRAWN'],
  DENIED: [], // terminal
  WITHDRAWN: [], // terminal
  EXPIRED: [], // terminal

  // Post-disbursement (servicing)
  ACTIVE: ['DELINQUENT', 'PAID_OFF', 'REFINANCED'],
  DELINQUENT: ['ACTIVE', 'DEFAULT'],
  DEFAULT: ['ACTIVE', 'CHARGED_OFF'],
  CHARGED_OFF: ['PAID_OFF'], // Can still be paid off after charge-off
  PAID_OFF: [], // terminal
  REFINANCED: [], // terminal
} as const;

/**
 * Human-readable status labels
 */
export const STATUS_LABELS: Record<LoanStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  INFO_REQUESTED: 'Info Requested',
  APPROVED: 'Approved',
  DENIED: 'Denied',
  WITHDRAWN: 'Withdrawn',
  EXPIRED: 'Expired',
  ACTIVE: 'Active',
  DELINQUENT: 'Delinquent',
  DEFAULT: 'Default',
  CHARGED_OFF: 'Charged Off',
  PAID_OFF: 'Paid Off',
  REFINANCED: 'Refinanced',
};

/**
 * Status categories for UI/logic grouping
 */
export const STATUS_CATEGORIES = {
  ORIGINATION: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'APPROVED', 'DENIED', 'WITHDRAWN', 'EXPIRED'],
  SERVICING: ['ACTIVE', 'DELINQUENT', 'DEFAULT', 'CHARGED_OFF', 'PAID_OFF', 'REFINANCED'],
  TERMINAL: ['DENIED', 'WITHDRAWN', 'EXPIRED', 'PAID_OFF', 'REFINANCED'],
  REQUIRES_ACTION: ['SUBMITTED', 'INFO_REQUESTED', 'DELINQUENT', 'DEFAULT'],
} as const;

/**
 * Statuses where payments can be recorded
 */
export const PAYMENT_ALLOWED_STATUSES: readonly LoanStatus[] = [
  'ACTIVE',
  'DELINQUENT',
  'DEFAULT',
  'CHARGED_OFF',
];

/**
 * Check if a transition from one status to another is valid
 */
export function isValidTransition(from: LoanStatus, to: LoanStatus): boolean {
  const allowedTransitions = VALID_TRANSITIONS[from];
  return allowedTransitions.includes(to);
}

/**
 * Get all valid next statuses for a given status
 */
export function getValidNextStatuses(status: LoanStatus): readonly LoanStatus[] {
  return VALID_TRANSITIONS[status];
}

/**
 * Check if a status is terminal (no further transitions)
 */
export function isTerminalStatus(status: LoanStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}
