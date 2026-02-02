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

## Loan Status State Machine

Loans progress through a defined lifecycle with guard conditions enforcing business rules:

```
                            ORIGINATION
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │   DRAFT ──→ SUBMITTED ──→ UNDER_REVIEW ──→ APPROVED    │
    │     │          │              │    │          │   │     │
    │     ↓          ↓              ↓    │          ↓   ↓     │
    │  WITHDRAWN  WITHDRAWN    DENIED  INFO_REQ  ACTIVE EXPIRED
    │                            │        │               │
    │                            │        ↓               │
    │                            │    UNDER_REVIEW ───────┘
    │                            ↓
    └────────────────────────── (terminal)

                              SERVICING
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │   ACTIVE ──→ DELINQUENT ──→ DEFAULT ──→ CHARGED_OFF    │
    │     │  │         │   │         │   │         │         │
    │     │  │         ↓   │         ↓   │         ↓         │
    │     │  │      ACTIVE │      ACTIVE │      PAID_OFF     │
    │     │  │             │             │                    │
    │     ↓  ↓             ↓             ↓                    │
    │  PAID_OFF      (continues)    (continues)              │
    │  REFINANCED                                             │
    └─────────────────────────────────────────────────────────┘
```

### Guard Conditions

Every status transition is validated server-side. If conditions aren't met, the operation fails with a descriptive error.

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

#### Terminal States (no outbound transitions)
- DENIED, WITHDRAWN, EXPIRED, PAID_OFF, REFINANCED

#### Payment Validation

Payments have their own guards, separate from status transitions:

| Rule | Requirement |
|------|-------------|
| Status check | Loan must be ACTIVE, DELINQUENT, or DEFAULT |
| Amount check | Payment cannot exceed remaining balance |

#### DTI Calculation

The debt-to-income ratio for approval is calculated as:

```
Monthly Payment = amortized payment for (principal, rate, term)
Total Monthly Debt = borrower.monthlyDebt + Monthly Payment
DTI = Total Monthly Debt / (borrower.annualIncome / 12)
```

If the borrower has no income data on file, the DTI check is skipped.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  pages/                    api/                     types/                  │
│  ├── LoanList.tsx         ├── client.ts            ├── loan.ts             │
│  ├── LoanDetail.tsx       ├── loans.ts             │   └── VALID_TRANSITIONS│
│  ├── LoanForm.tsx         ├── borrowers.ts         └── borrower.ts         │
│  ├── BorrowerList.tsx     └── events.ts                                     │
│  └── BorrowerForm.tsx                              components/              │
│                           lib/                     └── StatusBadge.tsx      │
│                           ├── money.ts                                      │
│                           └── validation.ts                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP (REST)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             BACKEND (Express)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  routes/                   lib/                     db/                     │
│  ├── loans.ts             ├── money.ts             ├── schema.ts           │
│  ├── borrowers.ts         ├── schemas.ts           ├── index.ts            │
│  ├── payments.ts          ├── state-machine/       └── seed.ts             │
│  ├── loan-status.ts       │   ├── transitions.ts                           │
│  └── events.ts            │   └── guards.ts                                │
│                           └── events/                                       │
│                               └── index.ts                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Drizzle ORM
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE (PostgreSQL)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  borrowers                    loans                     loan_events         │
│  ├── id (uuid, PK)           ├── id (uuid, PK)         ├── id (uuid, PK)   │
│  ├── name                    ├── borrower_id (FK)      ├── loan_id (FK)    │
│  ├── email                   ├── principal_micros      ├── event_type      │
│  ├── phone                   ├── interest_rate_bps     ├── occurred_at     │
│  ├── credit_score            ├── term_months           ├── actor_id        │
│  ├── annual_income_micros    ├── status                ├── from_status     │
│  ├── monthly_debt_micros     ├── status_changed_at     ├── to_status       │
│  ├── created_at              ├── created_at            ├── changes (jsonb) │
│  ├── updated_at              ├── updated_at            ├── payment_id (FK) │
│  └── deleted_at              └── deleted_at            └── description     │
│                                                                             │
│  payments                                                                   │
│  ├── id (uuid, PK)                                                         │
│  ├── loan_id (FK)                                                          │
│  ├── amount_micros                                                         │
│  ├── paid_at                                                               │
│  └── created_at                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Responsibility |
|-------|----------------|
| **Pages** | Route components, status transitions, data fetching via React Query |
| **API Client** | HTTP fetch wrapper, response parsing, type-safe API calls |
| **Lib** | Shared utilities: money conversion, validation constants, Zod schemas |
| **Routes** | Express handlers: validation, delegation, response formatting |
| **State Machine** | Loan status transitions with guards and validation |
| **Events** | Unified audit trail for loan activities |
| **DB** | Drizzle schema, migrations, seed data |

### Data Flow

1. **User Action** → Page component handles event (e.g., click "Submit" on loan)
2. **Mutation** → React Query triggers API call
3. **HTTP Request** → API client sends typed request to backend
4. **Validation** → Zod schema validates request body
5. **State Machine** → Guards check if transition is allowed
6. **Transaction** → Atomic database operation (update + event recording)
7. **Response** → Consistent `{ data }` or `{ error }` format returned
8. **Cache Update** → React Query invalidates relevant queries

## Activity Trail

Every significant loan action is recorded in `loan_events`:

| Event Type | Recorded When | Data Captured |
|------------|---------------|---------------|
| `LOAN_CREATED` | New loan created | Initial status |
| `STATUS_CHANGE` | Status transition | From/to status, reason |
| `LOAN_EDITED` | Loan details modified | Changed fields with before/after values |
| `PAYMENT_RECEIVED` | Payment recorded | Payment ID, amount |

Events are recorded **atomically** within the same transaction as the operation, ensuring consistency.

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
| `loan_events.payment_amount_micros` | Preserves amount at time of event; if payment is later edited, audit trail remains accurate |
| `loans.submitted_at/approved_at/disbursed_at` | Could derive from events, but direct storage enables fast queries without scanning event history |

**Calculated at runtime (not stored):**

| Value | Tradeoff |
|-------|----------|
| `remainingBalanceMicros` | Computed by summing payments on each request. Always accurate, no sync issues. For high-volume production, would denormalize onto `loans` table and update atomically with payments. |
| DTI ratio | Calculated from borrower income/debt at transition time. Credit profiles are point-in-time; a production system might store historical snapshots. |

**What would change at scale:**

| Change | When Needed |
|--------|-------------|
| Store `remaining_balance_micros` on loans | High read volume (avoid repeated aggregation) |
| Credit history table | Track score changes over time for audit/compliance |
| Partition `loan_events` by date | Event volume exceeds millions of rows |
| Separate principal vs interest tracking | Real amortization schedules |

### Transaction Consistency

Operations that modify multiple tables use database transactions:

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
| **Drizzle ORM** | Type-safe SQL queries with excellent TypeScript inference |
| **Zod** | Runtime validation that generates TypeScript types |
| **TanStack Query** | Handles caching, background refetching, and server state |
| **Tailwind CSS** | Utility-first CSS for rapid, consistent styling |
| **dinero.js** | Precise monetary calculations |

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
- `POST /loans` — Create loan (starts as DRAFT)
- `PATCH /loans/:id` — Update loan details
- `DELETE /loans/:id` — Soft delete loan
- `POST /loans/:id/status/transition` — Transition loan status
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
2. **Simple interest** — No compound interest calculations
3. **No authentication** — Single-user context; production would add JWT/session auth
4. **Term in months** — Industry standard granularity for loan terms

## What I'd Improve

Given more time I would implement:

1. **Authentication & authorization** — JWT auth with role-based access control
2. **Pagination & filtering** — Handle large datasets with cursor pagination
3. **Amortization schedules** — Generate payment schedules based on loan terms
4. **Background jobs** — Automated status transitions (e.g., mark loans delinquent after 30 days)
5. **Service layer** — As the application grows, extract business logic into a dedicated service layer for better testability and reusability

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
