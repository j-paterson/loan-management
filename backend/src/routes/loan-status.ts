import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  transitionLoanStatus,
  getLoanStatusHistory,
  getValidNextStatuses,
  VALID_TRANSITIONS,
} from '../lib/state-machine/index.js';
import { LOAN_STATUSES, type LoanStatus } from '../db/schema.js';
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
 * GET /loans/:loanId/status/history
 * Get the status history for a loan
 */
router.get(
  '/:loanId/status/history',
  async (req: Request<{ loanId: string }>, res: Response, next: NextFunction) => {
    try {
      // Validate loan ID
      const idResult = uuidParamSchema.safeParse(req.params.loanId);
      if (!idResult.success) {
        return res.status(400).json({ error: { message: 'Invalid loan ID format' } });
      }

      const history = await getLoanStatusHistory(req.params.loanId);
      res.json({ data: history });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /loans/:loanId/status/available-transitions
 * Get valid next statuses for a loan
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

      // We need to get the current status first
      // For now, return all transitions - the actual loan fetch would happen in a real implementation
      // This endpoint is mainly for the frontend to know what buttons to show

      res.json({
        data: {
          message: 'Use GET /loans/:id to get current status, then check VALID_TRANSITIONS',
          allTransitions: VALID_TRANSITIONS,
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
