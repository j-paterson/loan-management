import { Router, Request, Response, NextFunction } from 'express';
import { eq, isNull, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { loans, borrowers } from '../db/schema.js';
import { MICROS_PER_DOLLAR } from '../lib/money.js';

// Type for routes with :id parameter
interface IdParams {
  id: string;
}

const router = Router();

// Max principal: $10,000,000 in micro-units
const MAX_PRINCIPAL_MICROS = 10_000_000 * MICROS_PER_DOLLAR;

// Borrower schema for inline creation
const newBorrowerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(50).optional(),
});

// Validation schemas - all integers
// Accepts either borrowerId (existing) or newBorrower (create inline)
const createLoanSchema = z.object({
  principalAmountMicros: z.number()
    .int('Amount must be an integer')
    .positive('Amount must be positive')
    .max(MAX_PRINCIPAL_MICROS, 'Amount too large'),
  interestRateBps: z.number()
    .int('Rate must be an integer')
    .min(0, 'Rate cannot be negative')
    .max(10000, 'Rate cannot exceed 100%'), // 10000 bps = 100%
  termMonths: z.number()
    .int('Term must be a whole number')
    .min(1, 'Term must be at least 1 month')
    .max(600, 'Term cannot exceed 600 months'),
  status: z.enum(['DRAFT', 'ACTIVE']).optional(),
  borrowerId: z.string().uuid().optional(),
  newBorrower: newBorrowerSchema.optional(),
}).refine(
  (data) => data.borrowerId || data.newBorrower,
  { message: 'Either borrowerId or newBorrower is required' }
);

const updateLoanSchema = z.object({
  principalAmountMicros: z.number()
    .int('Amount must be an integer')
    .positive('Amount must be positive')
    .max(MAX_PRINCIPAL_MICROS, 'Amount too large')
    .optional(),
  interestRateBps: z.number()
    .int('Rate must be an integer')
    .min(0, 'Rate cannot be negative')
    .max(10000, 'Rate cannot exceed 100%')
    .optional(),
  termMonths: z.number()
    .int('Term must be a whole number')
    .min(1, 'Term must be at least 1 month')
    .max(600, 'Term cannot exceed 600 months')
    .optional(),
  status: z.enum(['DRAFT', 'ACTIVE']).optional(),
  borrowerId: z.string().uuid().optional(),
});

// GET /loans - List all loans
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db
      .select()
      .from(loans)
      .where(isNull(loans.deletedAt))
      .orderBy(loans.createdAt);

    // Add borrower: null for each loan (fetched on detail view)
    const data = result.map(loan => ({
      ...loan,
      borrower: null,
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /loans/:id - Get single loan
router.get('/:id', async (req: Request<IdParams>, res: Response, next: NextFunction) => {
  try {
    const result = await db
      .select()
      .from(loans)
      .where(and(eq(loans.id, req.params.id), isNull(loans.deletedAt)));

    if (!result.length) {
      return res.status(404).json({ error: { message: 'Loan not found' } });
    }

    const loan = result[0];

    // Fetch borrower if assigned
    let borrower = null;
    if (loan.borrowerId) {
      const borrowerResult = await db
        .select()
        .from(borrowers)
        .where(eq(borrowers.id, loan.borrowerId));
      borrower = borrowerResult[0] ?? null;
    }

    res.json({ data: { ...loan, borrower } });
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

    let borrowerId = parsed.data.borrowerId;
    let borrower = null;

    // If newBorrower provided, create it first (atomic with loan creation)
    if (parsed.data.newBorrower) {
      const borrowerResult = await db
        .insert(borrowers)
        .values({
          name: parsed.data.newBorrower.name,
          email: parsed.data.newBorrower.email,
          phone: parsed.data.newBorrower.phone,
        })
        .returning();
      borrower = borrowerResult[0];
      borrowerId = borrower.id;
    } else if (borrowerId) {
      // Fetch existing borrower
      const borrowerResult = await db
        .select()
        .from(borrowers)
        .where(eq(borrowers.id, borrowerId));
      if (!borrowerResult.length) {
        return res.status(400).json({
          error: { message: 'Borrower not found' },
        });
      }
      borrower = borrowerResult[0];
    }

    const result = await db
      .insert(loans)
      .values({
        principalAmountMicros: parsed.data.principalAmountMicros,
        interestRateBps: parsed.data.interestRateBps,
        termMonths: parsed.data.termMonths,
        status: parsed.data.status ?? 'DRAFT',
        borrowerId: borrowerId!,
      })
      .returning();

    res.status(201).json({ data: { ...result[0], borrower } });
  } catch (err) {
    next(err);
  }
});

// PATCH /loans/:id - Update loan
router.patch('/:id', async (req: Request<IdParams>, res: Response, next: NextFunction) => {
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

    if (parsed.data.principalAmountMicros !== undefined) {
      updates.principalAmountMicros = parsed.data.principalAmountMicros;
    }
    if (parsed.data.interestRateBps !== undefined) {
      updates.interestRateBps = parsed.data.interestRateBps;
    }
    if (parsed.data.termMonths !== undefined) {
      updates.termMonths = parsed.data.termMonths;
    }
    if (parsed.data.status !== undefined) {
      updates.status = parsed.data.status;
    }
    if (parsed.data.borrowerId !== undefined) {
      updates.borrowerId = parsed.data.borrowerId;
    }

    const result = await db
      .update(loans)
      .set(updates)
      .where(eq(loans.id, req.params.id))
      .returning();

    // Fetch borrower data if assigned
    let borrower = null;
    if (result[0].borrowerId) {
      const borrowerResult = await db
        .select()
        .from(borrowers)
        .where(eq(borrowers.id, result[0].borrowerId));
      borrower = borrowerResult[0] ?? null;
    }

    res.json({ data: { ...result[0], borrower } });
  } catch (err) {
    next(err);
  }
});

// DELETE /loans/:id - Soft delete loan
router.delete('/:id', async (req: Request<IdParams>, res: Response, next: NextFunction) => {
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
