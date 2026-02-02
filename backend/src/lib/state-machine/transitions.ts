/**
 * State Machine Transitions
 *
 * Re-exports transition logic from shared package.
 * Backend-specific extensions can be added here if needed.
 */

export {
  VALID_TRANSITIONS,
  STATUS_CATEGORIES,
  isValidTransition,
  getValidNextStatuses,
  isTerminalStatus,
} from '@loan-management/shared';
