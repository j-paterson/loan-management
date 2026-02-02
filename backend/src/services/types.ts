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

/**
 * Map service error codes to HTTP status codes
 *
 * - 400 Bad Request: Generic client error (malformed request)
 * - 403 Forbidden: Not authorized to perform action
 * - 404 Not Found: Resource doesn't exist
 * - 409 Conflict: State conflict (e.g., invalid transition)
 * - 422 Unprocessable Entity: Valid request but business rule violation
 */
export function httpStatus(code?: ServiceErrorCode): number {
  switch (code) {
    case 'NOT_FOUND':
      return 404;
    case 'VALIDATION':
      return 422;
    case 'INVALID_TRANSITION':
      return 409;
    case 'FORBIDDEN':
      return 403;
    default:
      return 400;
  }
}
