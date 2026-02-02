import { Router, Request, Response, NextFunction } from 'express';
import { getLoanEvents } from '../services/index.js';
import { uuidParamSchema } from '../lib/schemas.js';

const router = Router();

/**
 * GET /loans/:loanId/events
 * Get all events for a loan (newest first)
 */
router.get(
  '/:loanId/events',
  async (req: Request<{ loanId: string }>, res: Response, next: NextFunction) => {
    try {
      const idResult = uuidParamSchema.safeParse(req.params.loanId);
      if (!idResult.success) {
        return res.status(400).json({ error: { message: 'Invalid loan ID format' } });
      }

      const events = await getLoanEvents(req.params.loanId);
      res.json({ data: events });
    } catch (err) {
      next(err);
    }
  }
);

export { router as eventsRoutes };
