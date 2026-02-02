import { Router, Request, Response, NextFunction } from 'express';
import { loanService } from '../services/index.js';
import {
  uuidParamSchema,
  createLoanSchema,
  updateLoanSchema,
} from '../lib/schemas.js';

interface IdParams {
  id: string;
}

const router = Router();

// GET /loans - List all loans with borrower data
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await loanService.list();

    if (!result.success) {
      return res.status(500).json({ error: { message: result.error } });
    }

    res.json({ data: result.data });
  } catch (err) {
    next(err);
  }
});

// GET /loans/:id - Get single loan
router.get('/:id', async (req: Request<IdParams>, res: Response, next: NextFunction) => {
  try {
    const idResult = uuidParamSchema.safeParse(req.params.id);
    if (!idResult.success) {
      return res.status(400).json({ error: { message: 'Invalid loan ID format' } });
    }

    const result = await loanService.getById(req.params.id);

    if (!result.success) {
      const status = result.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ error: { message: result.error } });
    }

    res.json({ data: result.data });
  } catch (err) {
    next(err);
  }
});

// POST /loans - Create new loan (with optional inline borrower creation)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createLoanSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: parsed.error.flatten(),
        },
      });
    }

    const result = await loanService.create(parsed.data, { actorId: 'user' });

    if (!result.success) {
      const status = result.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ error: { message: result.error } });
    }

    res.status(201).json({ data: result.data });
  } catch (err) {
    next(err);
  }
});

// PATCH /loans/:id - Update loan
router.patch('/:id', async (req: Request<IdParams>, res: Response, next: NextFunction) => {
  try {
    const idResult = uuidParamSchema.safeParse(req.params.id);
    if (!idResult.success) {
      return res.status(400).json({ error: { message: 'Invalid loan ID format' } });
    }

    const parsed = updateLoanSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: parsed.error.flatten(),
        },
      });
    }

    const result = await loanService.update(req.params.id, parsed.data, { actorId: 'user' });

    if (!result.success) {
      const status = result.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ error: { message: result.error } });
    }

    res.json({ data: result.data });
  } catch (err) {
    next(err);
  }
});

// DELETE /loans/:id - Soft delete loan
router.delete('/:id', async (req: Request<IdParams>, res: Response, next: NextFunction) => {
  try {
    const idResult = uuidParamSchema.safeParse(req.params.id);
    if (!idResult.success) {
      return res.status(400).json({ error: { message: 'Invalid loan ID format' } });
    }

    const result = await loanService.remove(req.params.id);

    if (!result.success) {
      const status = result.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ error: { message: result.error } });
    }

    res.json({ data: result.data });
  } catch (err) {
    next(err);
  }
});

export { router as loanRoutes };
