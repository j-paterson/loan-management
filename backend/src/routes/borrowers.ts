import { Router, Request, Response, NextFunction } from 'express';
import { eq, isNull, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { borrowers } from '../db/schema.js';
import { NAME_MAX_LENGTH, PHONE_MAX_LENGTH } from '../lib/validation.js';

interface IdParams {
  id: string;
}

const router = Router();

const createBorrowerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(NAME_MAX_LENGTH),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(PHONE_MAX_LENGTH).optional(),
});

const updateBorrowerSchema = createBorrowerSchema.partial();

// GET /borrowers - List all borrowers
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db
      .select()
      .from(borrowers)
      .where(isNull(borrowers.deletedAt))
      .orderBy(borrowers.name);

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// GET /borrowers/:id - Get single borrower
router.get('/:id', async (req: Request<IdParams>, res: Response, next: NextFunction) => {
  try {
    const result = await db
      .select()
      .from(borrowers)
      .where(and(eq(borrowers.id, req.params.id), isNull(borrowers.deletedAt)));

    if (!result.length) {
      return res.status(404).json({ error: { message: 'Borrower not found' } });
    }

    res.json({ data: result[0] });
  } catch (err) {
    next(err);
  }
});

// POST /borrowers - Create new borrower
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createBorrowerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: parsed.error.flatten(),
        },
      });
    }

    const result = await db
      .insert(borrowers)
      .values({
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
      })
      .returning();

    res.status(201).json({ data: result[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /borrowers/:id - Update borrower
router.patch('/:id', async (req: Request<IdParams>, res: Response, next: NextFunction) => {
  try {
    const parsed = updateBorrowerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: parsed.error.flatten(),
        },
      });
    }

    const existing = await db
      .select()
      .from(borrowers)
      .where(and(eq(borrowers.id, req.params.id), isNull(borrowers.deletedAt)));

    if (!existing.length) {
      return res.status(404).json({ error: { message: 'Borrower not found' } });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (parsed.data.name !== undefined) {
      updates.name = parsed.data.name;
    }
    if (parsed.data.email !== undefined) {
      updates.email = parsed.data.email;
    }
    if (parsed.data.phone !== undefined) {
      updates.phone = parsed.data.phone;
    }

    const result = await db
      .update(borrowers)
      .set(updates)
      .where(eq(borrowers.id, req.params.id))
      .returning();

    res.json({ data: result[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /borrowers/:id - Soft delete borrower
router.delete('/:id', async (req: Request<IdParams>, res: Response, next: NextFunction) => {
  try {
    const existing = await db
      .select()
      .from(borrowers)
      .where(and(eq(borrowers.id, req.params.id), isNull(borrowers.deletedAt)));

    if (!existing.length) {
      return res.status(404).json({ error: { message: 'Borrower not found' } });
    }

    const result = await db
      .update(borrowers)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(borrowers.id, req.params.id))
      .returning();

    res.json({ data: result[0] });
  } catch (err) {
    next(err);
  }
});

export { router as borrowerRoutes };
