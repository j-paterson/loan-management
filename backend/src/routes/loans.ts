import { Router, Request, Response, NextFunction } from 'express';
import { eq, isNull, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { loans, borrowers, payments } from '../db/schema.js';
import {
  uuidParamSchema,
  createLoanSchema,
  updateLoanSchema,
} from '../lib/schemas.js';
import { money, micros, subtractMoney } from '../lib/money.js';

// Type for routes with :id parameter
interface IdParams {
  id: string;
}

const router = Router();

// Helper to calculate remaining balance using dinero.js
function calculateRemainingBalance(principalMicros: number, paymentAmounts: number[]): number {
  let balance = money(principalMicros);
  for (const amount of paymentAmounts) {
    balance = subtractMoney(balance, money(amount));
  }
  return micros(balance);
}

// GET /loans - List all loans with borrower data
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db
      .select()
      .from(loans)
      .where(isNull(loans.deletedAt))
      .orderBy(loans.createdAt);

    // Get unique borrower IDs and fetch all borrowers in one query
    const borrowerIds = [...new Set(result.map(l => l.borrowerId))];
    const borrowerList = borrowerIds.length > 0
      ? await db.select().from(borrowers).where(isNull(borrowers.deletedAt))
      : [];

    // Create borrower lookup map
    const borrowerMap = new Map(borrowerList.map(b => [b.id, b]));

    // Get payment totals for all loans
    const loanIds = result.map(l => l.id);
    const paymentsList = loanIds.length > 0
      ? await db
          .select({ loanId: payments.loanId, amountMicros: payments.amountMicros })
          .from(payments)
          .where(isNull(payments.deletedAt))
      : [];

    // Group payments by loan ID
    const paymentsByLoan = new Map<string, number[]>();
    for (const p of paymentsList) {
      const existing = paymentsByLoan.get(p.loanId) || [];
      existing.push(p.amountMicros);
      paymentsByLoan.set(p.loanId, existing);
    }

    // Attach borrower and remaining balance to each loan
    const data = result.map(loan => ({
      ...loan,
      borrower: borrowerMap.get(loan.borrowerId) ?? null,
      remainingBalanceMicros: calculateRemainingBalance(
        loan.principalAmountMicros,
        paymentsByLoan.get(loan.id) || []
      ),
    }));

    res.json({ data });
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

    // Calculate remaining balance
    const loanPayments = await db
      .select({ amountMicros: payments.amountMicros })
      .from(payments)
      .where(and(eq(payments.loanId, loan.id), isNull(payments.deletedAt)));

    const remainingBalanceMicros = calculateRemainingBalance(
      loan.principalAmountMicros,
      loanPayments.map(p => p.amountMicros)
    );

    res.json({ data: { ...loan, borrower, remainingBalanceMicros } });
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
      // Fetch existing borrower (must not be deleted)
      const borrowerResult = await db
        .select()
        .from(borrowers)
        .where(and(eq(borrowers.id, borrowerId), isNull(borrowers.deletedAt)));
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

    // Check if loan exists
    const existing = await db
      .select()
      .from(loans)
      .where(and(eq(loans.id, req.params.id), isNull(loans.deletedAt)));

    if (!existing.length) {
      return res.status(404).json({ error: { message: 'Loan not found' } });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    let borrower = null;

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

    // Handle borrower assignment - either new borrower creation or existing borrower selection
    if (parsed.data.newBorrower) {
      // Create new borrower inline
      const borrowerResult = await db
        .insert(borrowers)
        .values({
          name: parsed.data.newBorrower.name,
          email: parsed.data.newBorrower.email,
          phone: parsed.data.newBorrower.phone,
        })
        .returning();
      borrower = borrowerResult[0];
      updates.borrowerId = borrower.id;
    } else if (parsed.data.borrowerId !== undefined) {
      // Verify existing borrower exists
      const borrowerExists = await db
        .select()
        .from(borrowers)
        .where(and(eq(borrowers.id, parsed.data.borrowerId), isNull(borrowers.deletedAt)));
      if (!borrowerExists.length) {
        return res.status(400).json({ error: { message: 'Borrower not found' } });
      }
      updates.borrowerId = parsed.data.borrowerId;
    }

    const result = await db
      .update(loans)
      .set(updates)
      .where(eq(loans.id, req.params.id))
      .returning();

    // Fetch borrower data if not already loaded from inline creation
    if (!borrower && result[0].borrowerId) {
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
    const idResult = uuidParamSchema.safeParse(req.params.id);
    if (!idResult.success) {
      return res.status(400).json({ error: { message: 'Invalid loan ID format' } });
    }

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
