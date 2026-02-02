import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { db } from '../../db/index.js';
import { loanEvents, type LoanStatus, type EventType } from '../../db/schema.js';
import type * as schema from '../../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { formatAmount } from '../money.js';

/**
 * Transaction context type for passing db client within transactions
 */
export type TxContext = Parameters<Parameters<PostgresJsDatabase<typeof schema>['transaction']>[0]>[0];

export interface RecordEventParams {
  loanId: string;
  eventType: EventType;
  actorId?: string;
  fromStatus?: LoanStatus | null;
  toStatus?: LoanStatus;
  changes?: Record<string, { from: unknown; to: unknown }>;
  paymentId?: string;
  paymentAmountMicros?: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Record a loan event (transaction-aware)
 */
export async function recordEvent(params: RecordEventParams, tx?: TxContext) {
  const {
    loanId,
    eventType,
    actorId = 'user',
    fromStatus,
    toStatus,
    changes,
    paymentId,
    paymentAmountMicros,
    description,
    metadata,
  } = params;

  // Generate description if not provided
  const eventDescription = description ?? generateDescription(eventType, {
    fromStatus,
    toStatus,
    changes,
    paymentAmountMicros,
  });

  const client = tx ?? db;
  const [event] = await client
    .insert(loanEvents)
    .values({
      loanId,
      eventType,
      actorId,
      fromStatus,
      toStatus,
      changes,
      paymentId,
      paymentAmountMicros,
      description: eventDescription,
      metadata,
    })
    .returning();

  return event;
}

/**
 * Generate a human-readable description for an event
 */
function generateDescription(
  eventType: EventType,
  context: {
    fromStatus?: LoanStatus | null;
    toStatus?: LoanStatus;
    changes?: Record<string, { from: unknown; to: unknown }>;
    paymentAmountMicros?: number;
  }
): string {
  switch (eventType) {
    case 'LOAN_CREATED':
      return 'Loan created';

    case 'STATUS_CHANGE':
      if (context.fromStatus && context.toStatus) {
        return `Status changed from ${formatStatus(context.fromStatus)} to ${formatStatus(context.toStatus)}`;
      }
      if (context.toStatus) {
        return `Status set to ${formatStatus(context.toStatus)}`;
      }
      return 'Status changed';

    case 'LOAN_EDITED': {
      if (!context.changes) return 'Loan updated';
      const fields = Object.keys(context.changes);
      if (fields.length === 1) {
        return `Updated ${formatFieldName(fields[0])}`;
      }
      return `Updated ${fields.map(formatFieldName).join(', ')}`;
    }

    case 'PAYMENT_RECEIVED':
      if (context.paymentAmountMicros) {
        return `Payment of ${formatAmount(context.paymentAmountMicros)} received`;
      }
      return 'Payment received';

    default:
      return 'Event occurred';
  }
}

/**
 * Format status for display
 */
function formatStatus(status: LoanStatus): string {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Format field name for display
 */
function formatFieldName(field: string): string {
  const fieldMap: Record<string, string> = {
    principalAmountMicros: 'principal amount',
    interestRateBps: 'interest rate',
    termMonths: 'term',
    borrowerId: 'borrower',
    status: 'status',
  };
  return fieldMap[field] || field.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
}

/**
 * Get all events for a loan
 */
export async function getLoanEvents(loanId: string) {
  return db
    .select()
    .from(loanEvents)
    .where(eq(loanEvents.loanId, loanId))
    .orderBy(desc(loanEvents.occurredAt));
}

/**
 * Record loan creation event
 */
export async function recordLoanCreated(loanId: string, initialStatus: LoanStatus, actorId: string = 'user', tx?: TxContext) {
  return recordEvent({
    loanId,
    eventType: 'LOAN_CREATED',
    actorId,
    toStatus: initialStatus,
    description: `Loan created with status ${formatStatus(initialStatus)}`,
  }, tx);
}

/**
 * Record status change event
 */
export async function recordStatusChange(
  loanId: string,
  fromStatus: LoanStatus | null,
  toStatus: LoanStatus,
  actorId: string = 'user',
  reason?: string,
  tx?: TxContext
) {
  return recordEvent({
    loanId,
    eventType: 'STATUS_CHANGE',
    actorId,
    fromStatus,
    toStatus,
    metadata: reason ? { reason } : undefined,
  }, tx);
}

/**
 * Record loan edit event
 */
export async function recordLoanEdited(
  loanId: string,
  changes: Record<string, { from: unknown; to: unknown }>,
  actorId: string = 'user',
  tx?: TxContext
) {
  // Don't record if no actual changes
  if (Object.keys(changes).length === 0) return null;

  return recordEvent({
    loanId,
    eventType: 'LOAN_EDITED',
    actorId,
    changes,
  }, tx);
}

/**
 * Record payment event
 */
export async function recordPaymentReceived(
  loanId: string,
  paymentId: string,
  amountMicros: number,
  actorId: string = 'user',
  tx?: TxContext
) {
  return recordEvent({
    loanId,
    eventType: 'PAYMENT_RECEIVED',
    actorId,
    paymentId,
    paymentAmountMicros: amountMicros,
  }, tx);
}
