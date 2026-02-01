import { pgTable, uuid, decimal, integer, timestamp, text } from 'drizzle-orm/pg-core';

export const loans = pgTable('loans', {
  id: uuid('id').defaultRandom().primaryKey(),
  principalAmount: decimal('principal_amount', { precision: 19, scale: 4 }).notNull(),
  interestRate: decimal('interest_rate', { precision: 7, scale: 6 }).notNull(),
  termMonths: integer('term_months').notNull(),
  status: text('status', { enum: ['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED'] }).default('DRAFT').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export type Loan = typeof loans.$inferSelect;
