import { Router, Request, Response, NextFunction } from 'express';
import { eq, isNull, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { loans } from '../db/schema.js';

const router = Router();

// Validation schemas
const createLoanSchema = z.object({
  principalAmount: z.number().positive('Principal amount must be positive').max(10_000_000, 'Principal amount too large'),
  interestRate: z.number().min(0, 'Interest rate cannot be negative').max(1, 'Interest rate cannot exceed 100%'),
  termMonths: z.number().int('Term must be a whole number').min(1, 'Term must be at least 1 month').max(600, 'Term cannot exceed 600 months'),
  status: z.enum(['DRAFT', 'ACTIVE']).optional(),
});

const updateLoanSchema = createLoanSchema.partial();

// GET /loans - List all loans
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db
      .select()
      .from(loans)
      .where(isNull(loans.deletedAt))
      .orderBy(loans.createdAt);

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// GET /loans/:id - Get single loan
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db
      .select()
      .from(loans)
      .where(and(eq(loans.id, req.params.id), isNull(loans.deletedAt)));

    if (!result.length) {
      return res.status(404).json({ error: { message: 'Loan not found' } });
    }

    res.json({ data: result[0] });
  } catch (err) {
    next(err);
  }
});

// POST /loans - Create new loan
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

    const result = await db
      .insert(loans)
      .values({
        principalAmount: parsed.data.principalAmount.toString(),
        interestRate: parsed.data.interestRate.toString(),
        termMonths: parsed.data.termMonths,
        status: parsed.data.status ?? 'DRAFT',
      })
      .returning();

    res.status(201).json({ data: result[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /loans/:id - Update loan
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateLoanSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: parsed.error.flatten(),
        },
      });
    }

    // Check if loan exists
    const existing = await db
      .select()
      .from(loans)
      .where(and(eq(loans.id, req.params.id), isNull(loans.deletedAt)));

    if (!existing.length) {
      return res.status(404).json({ error: { message: 'Loan not found' } });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (parsed.data.principalAmount !== undefined) {
      updates.principalAmount = parsed.data.principalAmount.toString();
    }
    if (parsed.data.interestRate !== undefined) {
      updates.interestRate = parsed.data.interestRate.toString();
    }
    if (parsed.data.termMonths !== undefined) {
      updates.termMonths = parsed.data.termMonths;
    }
    if (parsed.data.status !== undefined) {
      updates.status = parsed.data.status;
    }

    const result = await db
      .update(loans)
      .set(updates)
      .where(eq(loans.id, req.params.id))
      .returning();

    res.json({ data: result[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /loans/:id - Soft delete loan
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if loan exists
    const existing = await db
      .select()
      .from(loans)
      .where(and(eq(loans.id, req.params.id), isNull(loans.deletedAt)));

    if (!existing.length) {
      return res.status(404).json({ error: { message: 'Loan not found' } });
    }

    const result = await db
      .update(loans)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(loans.id, req.params.id))
      .returning();

    res.json({ data: result[0] });
  } catch (err) {
    next(err);
  }
});

export { router as loanRoutes };
