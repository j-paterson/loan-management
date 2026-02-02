import { Router, Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/index.js';
import {
  uuidParamSchema,
  createPaymentSchema,
  updatePaymentSchema,
} from '../lib/schemas.js';

interface LoanIdParams {
  loanId: string;
}

interface PaymentParams extends LoanIdParams {
  id: string;
}

const router = Router({ mergeParams: true });

// Middleware to validate loanId format
function validateLoanId(req: Request<LoanIdParams>, res: Response, next: NextFunction) {
  const idResult = uuidParamSchema.safeParse(req.params.loanId);
  if (!idResult.success) {
    return res.status(400).json({ error: { message: 'Invalid loan ID format' } });
  }
  next();
}

router.use(validateLoanId);

// GET /loans/:loanId/payments - List all payments for a loan
router.get('/', async (req: Request<LoanIdParams>, res: Response, next: NextFunction) => {
  try {
    const result = await paymentService.listByLoan(req.params.loanId);

    if (!result.success) {
      const status = result.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ error: { message: result.error } });
    }

    res.json({ data: result.data });
  } catch (err) {
    next(err);
  }
});

// GET /loans/:loanId/payments/:id - Get single payment
router.get('/:id', async (req: Request<PaymentParams>, res: Response, next: NextFunction) => {
  try {
    const idResult = uuidParamSchema.safeParse(req.params.id);
    if (!idResult.success) {
      return res.status(400).json({ error: { message: 'Invalid payment ID format' } });
    }

    const result = await paymentService.getById(req.params.loanId, req.params.id);

    if (!result.success) {
      const status = result.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ error: { message: result.error } });
    }

    res.json({ data: result.data });
  } catch (err) {
    next(err);
  }
});

// POST /loans/:loanId/payments - Create payment
router.post('/', async (req: Request<LoanIdParams>, res: Response, next: NextFunction) => {
  try {
    const parsed = createPaymentSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: parsed.error.flatten(),
        },
      });
    }

    const result = await paymentService.create(req.params.loanId, parsed.data, { actorId: 'user' });

    if (!result.success) {
      const status = result.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ error: { message: result.error } });
    }

    res.status(201).json({ data: result.data });
  } catch (err) {
    next(err);
  }
});

// PATCH /loans/:loanId/payments/:id - Update payment
router.patch('/:id', async (req: Request<PaymentParams>, res: Response, next: NextFunction) => {
  try {
    const idResult = uuidParamSchema.safeParse(req.params.id);
    if (!idResult.success) {
      return res.status(400).json({ error: { message: 'Invalid payment ID format' } });
    }

    const parsed = updatePaymentSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: parsed.error.flatten(),
        },
      });
    }

    const result = await paymentService.update(req.params.loanId, req.params.id, parsed.data);

    if (!result.success) {
      const status = result.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ error: { message: result.error } });
    }

    res.json({ data: result.data });
  } catch (err) {
    next(err);
  }
});

// DELETE /loans/:loanId/payments/:id - Soft delete payment
router.delete('/:id', async (req: Request<PaymentParams>, res: Response, next: NextFunction) => {
  try {
    const idResult = uuidParamSchema.safeParse(req.params.id);
    if (!idResult.success) {
      return res.status(400).json({ error: { message: 'Invalid payment ID format' } });
    }

    const result = await paymentService.remove(req.params.loanId, req.params.id);

    if (!result.success) {
      const status = result.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ error: { message: result.error } });
    }

    res.json({ data: result.data });
  } catch (err) {
    next(err);
  }
});

export { router as paymentRoutes };
