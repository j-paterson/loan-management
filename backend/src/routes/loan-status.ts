import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { statusService } from '../services/index.js';
import { VALID_TRANSITIONS } from '../lib/state-machine/index.js';
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
      const result = await statusService.transition(
        req.params.loanId,
        { toStatus, reason, metadata },
        { actorId: 'user' }
      );

      if (!result.success) {
        const status = result.code === 'NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ error: { message: result.error } });
      }

      res.json({ data: result.data });
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

      const result = await statusService.getAvailableTransitions(req.params.loanId);

      if (!result.success) {
        const status = result.code === 'NOT_FOUND' ? 404 : 400;
        return res.status(status).json({ error: { message: result.error } });
      }

      res.json({ data: result.data });
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
