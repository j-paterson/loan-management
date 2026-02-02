import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../db/schema.js';

/**
 * Transaction context for passing db client within transactions
 */
export type TxContext = Parameters<Parameters<PostgresJsDatabase<typeof schema>['transaction']>[0]>[0];

/**
 * Result type for service operations
 */
export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: ServiceErrorCode };

export type ServiceErrorCode = 'NOT_FOUND' | 'VALIDATION' | 'INVALID_TRANSITION' | 'FORBIDDEN';

/**
 * Actor context for audit trail
 */
export interface ActorContext {
  actorId: string;
}

/**
 * Helper to create success result
 */
export function success<T>(data: T): ServiceResult<T> {
  return { success: true, data };
}

/**
 * Helper to create error result
 */
export function fail<T>(error: string, code?: ServiceErrorCode): ServiceResult<T> {
  return { success: false, error, code };
}
