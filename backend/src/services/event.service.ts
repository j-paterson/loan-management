/**
 * Event Service
 *
 * Handles loan event recording with transaction support.
 * Re-exports from lib/events for convenience.
 */

export {
  recordEvent,
  recordLoanCreated,
  recordLoanEdited,
  recordStatusChange,
  recordPaymentReceived,
  getLoanEvents,
  type RecordEventParams,
  type TxContext,
} from '../lib/events/index.js';
