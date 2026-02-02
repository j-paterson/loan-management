# Loan Management Application

## Overview

A full-stack loan management system for tracking loans and borrowers through the complete loan lifecycle.

Built with React and TypeScript on the frontend, an Express backend, and a PostgreSQL database.

**Key Features:**
- **Loan lifecycle management** — Full state machine supporting origination through servicing
- **Audit trail** — Every loan action (creation, edits, status changes, payments) is recorded
- **Underwriting support** — Borrower credit profiles with automated guard conditions
- **Payment tracking** — Record payments and track remaining balances
- **Transaction consistency** — Atomic operations ensure data integrity

## How to Run Locally

**Docker Compose**
```bash
docker compose up --build -d && docker exec loan-api npm run db:push && docker exec loan-api npm run db:seed
```

Access the app at http://localhost:5173 (API at http://localhost:3001)

## Key Technical Decisions

### Schema Design

| Decision | Rationale |
|----------|-----------|
| **Integer currency (micro-units)** | Store amounts as integers (1 dollar = 10,000 micros) to avoid floating-point precision errors |
| **Integer rates (basis points)** | Store interest rates as basis points (5.5% = 550 bps) for precision |
| **Borrower credit profile** | Credit score, income, and debt fields enable automated underwriting guards |
| **Soft delete** | `deletedAt` timestamp preserves audit trails |
| **UUID primary keys** | Prevents enumeration attacks |

### Normalization Tradeoffs

The schema is normalized to 3NF with a few intentional denormalizations for practicality:

**Normalized (separate tables):**
- `borrowers` → `loans` → `payments` — proper 1:many relationships
- `loan_events` as append-only audit log — doesn't bloat main tables

**Intentional denormalization:**

| Field | Why Duplicated |
|-------|----------------|
| `loan_events.payment_amount_micros` | The loan_events table stores payment_amount_micros alongside payment_id even though we could join to the payments table to get the amount. This is intentional for audit trail integrity |

**Calculated at runtime (not stored):**

| Value | Tradeoff |
|-------|----------|
| `remainingBalanceMicros` | Computed by summing payments on each request. Always accurate, no sync issues. For high-volume production, would denormalize onto `loans` table and update atomically with payments. |
| DTI ratio | Calculated from borrower income/debt at transition time. Credit profiles are point-in-time; a production system might store historical snapshots. |

### Service Layer + Transaction Consistency                                            
                                                                                
Zod validates at the route layer, before data reaches services. Business logic is handled by services. Operations that touch multiple tables (loan + event) happen in a single transaction — either both succeed or both roll back.

All operations that modify multiple tables use database transactions:

```typescript
await db.transaction(async (tx) => {
  // 1. Create borrower if inline
  const [borrower] = await tx.insert(borrowers).values({...}).returning();

  // 2. Insert loan
  const [loan] = await tx.insert(loans).values({...}).returning();

  // 3. Record event in same transaction
  await recordLoanCreated(loan.id, loan.status, 'user', tx);

  return { loan, borrower };
});
```

If any step fails, the entire operation rolls back—no orphaned records or inconsistent state.

### Libraries

| Library | Why |
|---------|-----|
| **Drizzle ORM** | Type-safe SQL queries |
| **Zod** | Runtime validation that generates TypeScript types - services can assume their input is well-formed |
| **TanStack Query** | Handles caching, background refetching, and server state |
| **Tailwind CSS** | Utility-first CSS for rapid, consistent styling |
| **dinero.js** | Precise monetary calculations using BigInt|

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/loan_management` |
| `PORT` | API server port | `3001` |

Copy `backend/.env.example` to `backend/.env` for local development.

## API Endpoints

### Loans
- `GET /loans` — List all loans with borrower and balance
- `GET /loans/:id` — Get loan details
- `POST /loans` — Create loan (starts with DRAFT status)
- `PATCH /loans/:id` — Update loan details
- `DELETE /loans/:id` — Soft delete loan
- `POST /loans/:id/status/transition` — Transition loan status
- `GET /loans/:id/status/available-transitions` — Get possible transitions with guarded results
- `GET /loans/:id/events` — Get loan activity trail

### Borrowers
- `GET /borrowers` — List all borrowers
- `GET /borrowers/:id` — Get borrower details
- `POST /borrowers` — Create borrower
- `PATCH /borrowers/:id` — Update borrower (including credit profile)
- `DELETE /borrowers/:id` — Soft delete borrower

### Payments
- `GET /loans/:loanId/payments` — List payments for loan
- `POST /loans/:loanId/payments` — Record payment

## Assumptions Made

1. **Single currency (USD)** — All monetary amounts are in US dollars
2. **Internal Usage** — No need for SEO considerations
3. **No authentication** — Single-user context; production would add JWT/session auth
4. **Term in months** — Industry standard granularity for loan terms
5. **The states and guards** - I'm making assumptions about what these business rules would be

#### Origination Phase

| Transition | Guard Conditions |
|------------|------------------|
| DRAFT → SUBMITTED | Borrower assigned, principal > 0, interest rate ≥ 0, term ≥ 1 month |
| DRAFT → WITHDRAWN | Always allowed |
| SUBMITTED → UNDER_REVIEW | Always allowed |
| SUBMITTED → WITHDRAWN | Always allowed |
| UNDER_REVIEW → APPROVED | Credit score ≥ 620, DTI ratio ≤ 43% (if income data available) |
| UNDER_REVIEW → DENIED | Always allowed (manual decision) |
| UNDER_REVIEW → INFO_REQUESTED | Always allowed |
| INFO_REQUESTED → UNDER_REVIEW | Always allowed (borrower provided info) |
| INFO_REQUESTED → WITHDRAWN | Always allowed |
| APPROVED → ACTIVE | Always allowed (funds disbursed) |
| APPROVED → EXPIRED | Always allowed (approval timeout) |
| APPROVED → WITHDRAWN | Always allowed |

#### Servicing Phase

| Transition | Guard Conditions |
|------------|------------------|
| ACTIVE → PAID_OFF | Remaining balance = 0 |
| ACTIVE → DELINQUENT | Always allowed (payment past due) |
| ACTIVE → REFINANCED | Always allowed (replaced by new loan) |
| DELINQUENT → ACTIVE | Always allowed (caught up on payments) |
| DELINQUENT → DEFAULT | Always allowed (90+ days delinquent) |
| DEFAULT → ACTIVE | Always allowed (full reinstatement) |
| DEFAULT → CHARGED_OFF | Always allowed (written off as loss) |
| CHARGED_OFF → PAID_OFF | Always allowed (recovery after charge-off) |

## What I'd Improve

Given more time I would implement:

1. **Authentication & authorization** — JWT auth with role-based access control
2. **Pagination & filtering** — Handle large datasets with cursor pagination
3. **Amortization schedules** — Generate payment schedules based on loan terms
5. **Timed background jobs** — Automated status transitions (e.g., mark loans delinquent after 30 days)
   
**A few things that would need to change at scale:**

| Change | When Needed |
|--------|-------------|
| Store `remaining_balance_micros` on loans | High read volume (avoid repeated aggregation) |
| Credit history table | Track score changes over time for audit/compliance |
| Partition `loan_events` by date | Event volume exceeds millions of rows |
| Separate principal vs interest tracking | Real amortization schedules |

## Testing

```bash
# Backend (72 tests)
cd backend && npm test

# Frontend (41 tests)
cd frontend && npm test
```

### Test Coverage

| Area | Tests | Coverage |
|------|-------|----------|
| Loans API | 31 | CRUD, validation, transactions |
| Borrowers API | 14 | CRUD, validation |
| Payments API | 5 | Create, list |
| Events API | 3 | List events |
| State Machine | 10 | Transitions, guards |
| Money Utils | 9 | Parse, format, arithmetic |
| Frontend | 41 | Components, forms, interactions |

### Test Principles

1. **One assertion focus** — Each test verifies one behavior
2. **Descriptive names** — Test names describe the expected behavior
3. **Mock at boundaries** — Mock APIs and DB, not internal functions
4. **Transaction rollback** — Verify atomic operations roll back on failure

## AI Tool Usage

Built with extensive use of Claude Code for:
- Project scaffolding and configuration
- Writing comprehensive test suites
- State machine design and implementation
- Debugging and code review
- Documentation
