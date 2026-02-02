import { Router, Request, Response, NextFunction } from 'express';
import { borrowerService, httpStatus } from '../services/index.js';
import {
  uuidParamSchema,
  createBorrowerSchema,
  updateBorrowerSchema,
} from '../lib/schemas.js';

interface IdParams {
  id: string;
}

const router = Router();

// GET /borrowers - List all borrowers
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await borrowerService.list();

    if (!result.success) {
      return res.status(500).json({ error: { message: result.error } });
    }

    res.json({ data: result.data });
  } catch (err) {
    next(err);
  }
});

// GET /borrowers/:id - Get single borrower
router.get('/:id', async (req: Request<IdParams>, res: Response, next: NextFunction) => {
  try {
    const idResult = uuidParamSchema.safeParse(req.params.id);
    if (!idResult.success) {
      return res.status(400).json({ error: { message: 'Invalid borrower ID format' } });
    }

    const result = await borrowerService.getById(req.params.id);

    if (!result.success) {
      return res.status(httpStatus(result.code)).json({ error: { message: result.error } });
    }

    res.json({ data: result.data });
  } catch (err) {
    next(err);
  }
});

// POST /borrowers - Create new borrower
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createBorrowerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(422).json({
        error: {
          message: 'Validation failed',
          details: parsed.error.flatten(),
        },
      });
    }

    const result = await borrowerService.create(parsed.data);

    if (!result.success) {
      return res.status(httpStatus(result.code)).json({ error: { message: result.error } });
    }

    res.status(201).json({ data: result.data });
  } catch (err) {
    next(err);
  }
});

// PATCH /borrowers/:id - Update borrower
router.patch('/:id', async (req: Request<IdParams>, res: Response, next: NextFunction) => {
  try {
    const idResult = uuidParamSchema.safeParse(req.params.id);
    if (!idResult.success) {
      return res.status(400).json({ error: { message: 'Invalid borrower ID format' } });
    }

    const parsed = updateBorrowerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(422).json({
        error: {
          message: 'Validation failed',
          details: parsed.error.flatten(),
        },
      });
    }

    const result = await borrowerService.update(req.params.id, parsed.data);

    if (!result.success) {
      return res.status(httpStatus(result.code)).json({ error: { message: result.error } });
    }

    res.json({ data: result.data });
  } catch (err) {
    next(err);
  }
});

// DELETE /borrowers/:id - Soft delete borrower
router.delete('/:id', async (req: Request<IdParams>, res: Response, next: NextFunction) => {
  try {
    const idResult = uuidParamSchema.safeParse(req.params.id);
    if (!idResult.success) {
      return res.status(400).json({ error: { message: 'Invalid borrower ID format' } });
    }

    const result = await borrowerService.remove(req.params.id);

    if (!result.success) {
      return res.status(httpStatus(result.code)).json({ error: { message: result.error } });
    }

    res.json({ data: result.data });
  } catch (err) {
    next(err);
  }
});

export { router as borrowerRoutes };
