import { Router, Request, Response, NextFunction } from 'express';
import { eq, isNull, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { payments, loans } from '../db/schema.js';
import {
  uuidParamSchema,
  createPaymentSchema,
  updatePaymentSchema,
} from '../lib/schemas.js';
import { recordPaymentReceived } from '../lib/events/index.js';

interface LoanIdParams {
  loanId: string;
}

interface PaymentParams extends LoanIdParams {
  id: string;
}

const router = Router({ mergeParams: true });

// Middleware to validate loanId and ensure loan exists
async function validateLoan(req: Request<LoanIdParams>, res: Response, next: NextFunction) {
  const idResult = uuidParamSchema.safeParse(req.params.loanId);
  if (!idResult.success) {
    return res.status(400).json({ error: { message: 'Invalid loan ID format' } });
  }

  const loan = await db
    .select()
    .from(loans)
    .where(and(eq(loans.id, req.params.loanId), isNull(loans.deletedAt)));

  if (!loan.length) {
    return res.status(404).json({ error: { message: 'Loan not found' } });
  }

  next();
}

router.use(validateLoan);

// GET /loans/:loanId/payments - List all payments for a loan
router.get('/', async (req: Request<LoanIdParams>, res: Response, next: NextFunction) => {
  try {
    const result = await db
      .select()
      .from(payments)
      .where(and(eq(payments.loanId, req.params.loanId), isNull(payments.deletedAt)))
      .orderBy(payments.paidAt);

    res.json({ data: result });
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

    const result = await db
      .select()
      .from(payments)
      .where(and(
        eq(payments.id, req.params.id),
        eq(payments.loanId, req.params.loanId),
        isNull(payments.deletedAt)
      ));

    if (!result.length) {
      return res.status(404).json({ error: { message: 'Payment not found' } });
    }

    res.json({ data: result[0] });
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

    // Wrap payment creation + event recording in transaction
    const payment = await db.transaction(async (tx) => {
      const [payment] = await tx
        .insert(payments)
        .values({
          loanId: req.params.loanId,
          amountMicros: parsed.data.amountMicros,
          paidAt: new Date(parsed.data.paidAt),
        })
        .returning();

      // Record payment event in same transaction
      await recordPaymentReceived(
        req.params.loanId,
        payment.id,
        payment.amountMicros,
        'user',
        tx
      );

      return payment;
    });

    res.status(201).json({ data: payment });
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

    // Check if payment exists
    const existing = await db
      .select()
      .from(payments)
      .where(and(
        eq(payments.id, req.params.id),
        eq(payments.loanId, req.params.loanId),
        isNull(payments.deletedAt)
      ));

    if (!existing.length) {
      return res.status(404).json({ error: { message: 'Payment not found' } });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (parsed.data.amountMicros !== undefined) {
      updates.amountMicros = parsed.data.amountMicros;
    }
    if (parsed.data.paidAt !== undefined) {
      updates.paidAt = new Date(parsed.data.paidAt);
    }

    const result = await db
      .update(payments)
      .set(updates)
      .where(eq(payments.id, req.params.id))
      .returning();

    res.json({ data: result[0] });
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

    // Check if payment exists
    const existing = await db
      .select()
      .from(payments)
      .where(and(
        eq(payments.id, req.params.id),
        eq(payments.loanId, req.params.loanId),
        isNull(payments.deletedAt)
      ));

    if (!existing.length) {
      return res.status(404).json({ error: { message: 'Payment not found' } });
    }

    const result = await db
      .update(payments)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(payments.id, req.params.id))
      .returning();

    res.json({ data: result[0] });
  } catch (err) {
    next(err);
  }
});

export { router as paymentRoutes };
