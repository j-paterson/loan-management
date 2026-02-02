/**
 * State Machine Library
 *
 * Core state machine logic for loan status transitions.
 * Business logic (transitions with events) is in the status service.
 */

export { isValidTransition, getValidNextStatuses, isTerminalStatus } from './transitions.js';
export { STATUS_CATEGORIES, VALID_TRANSITIONS } from './transitions.js';
export { checkTransitionGuard } from './guards.js';
export type { TransitionContext } from './guards.js';
