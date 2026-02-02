import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { eq, sum } from 'drizzle-orm';
import { db } from '../db/index.js';
import { loans, borrowers, payments, type LoanStatus } from '../db/schema.js';
import {
  transitionLoanStatus,
  VALID_TRANSITIONS,
  getValidNextStatuses,
  checkTransitionGuard,
} from '../lib/state-machine/index.js';
import { uuidParamSchema } from '../lib/schemas.js';

const router = Router();

/**
 * Validation schema for status transition
 */
const loanStatusEnum = z.enum([
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'INFO_REQUESTED',
  'APPROVED',
  'DENIED',
  'WITHDRAWN',
  'EXPIRED',
  'ACTIVE',
  'DELINQUENT',
  'DEFAULT',
  'CHARGED_OFF',
  'PAID_OFF',
  'REFINANCED',
]);

const transitionSchema = z.object({
  toStatus: loanStatusEnum,
  reason: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /loans/:loanId/status/transition
 * Transition a loan to a new status
 */
router.post(
  '/:loanId/status/transition',
  async (req: Request<{ loanId: string }>, res: Response, next: NextFunction) => {
    try {
      // Validate loan ID
      const idResult = uuidParamSchema.safeParse(req.params.loanId);
      if (!idResult.success) {
        return res.status(400).json({ error: { message: 'Invalid loan ID format' } });
      }

      // Validate body
      const bodyResult = transitionSchema.safeParse(req.body);
      if (!bodyResult.success) {
        return res.status(400).json({
          error: {
            message: 'Validation failed',
            details: bodyResult.error.flatten(),
          },
        });
      }

      const { toStatus, reason, metadata } = bodyResult.data;

      // Perform the transition
      const result = await transitionLoanStatus({
        loanId: req.params.loanId,
        toStatus,
        changedBy: 'user', // In a real app, this would be the authenticated user
        reason,
        metadata,
      });

      if (!result.success) {
        return res.status(400).json({
          error: { message: result.error },
        });
      }

      res.json({ data: result.loan });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /loans/:loanId/status/available-transitions
 * Get all possible transitions for a loan with guard check results
 */
router.get(
  '/:loanId/status/available-transitions',
  async (req: Request<{ loanId: string }>, res: Response, next: NextFunction) => {
    try {
      // Validate loan ID
      const idResult = uuidParamSchema.safeParse(req.params.loanId);
      if (!idResult.success) {
        return res.status(400).json({ error: { message: 'Invalid loan ID format' } });
      }

      const loanId = req.params.loanId;

      // Fetch the loan
      const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));
      if (!loan) {
        return res.status(404).json({ error: { message: 'Loan not found' } });
      }

      // Fetch borrower
      const [borrower] = await db.select().from(borrowers).where(eq(borrowers.id, loan.borrowerId));
      if (!borrower) {
        return res.status(404).json({ error: { message: 'Borrower not found' } });
      }

      // Calculate remaining balance
      const [paymentSum] = await db
        .select({ total: sum(payments.amountMicros) })
        .from(payments)
        .where(eq(payments.loanId, loanId));
      const totalPayments = Number(paymentSum?.total || 0);
      const remainingBalanceMicros = loan.principalAmountMicros - totalPayments;

      // Get valid transitions for current status
      const possibleTransitions = getValidNextStatuses(loan.status as LoanStatus);

      // Check guards for each possible transition
      const transitions = possibleTransitions.map((toStatus) => {
        const guardResult = checkTransitionGuard(
          loan.status as LoanStatus,
          toStatus,
          { loan, borrower, remainingBalanceMicros }
        );
        return {
          toStatus,
          allowed: guardResult.allowed,
          reason: guardResult.reason || null,
        };
      });

      res.json({
        data: {
          currentStatus: loan.status,
          transitions,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /loans/status/transitions
 * Get the full transition map (for frontend reference)
 */
router.get('/status/transitions', (_req: Request, res: Response) => {
  res.json({ data: VALID_TRANSITIONS });
});

export { router as loanStatusRoutes };
