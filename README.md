# Loan Management Application

## Overview

A full-stack loan management system for tracking loans and borrowers. 

Built with React and TypeScript on the frontend, an Express backend, and a PostgreSQL database.

The application allows users to:
- Create and manage loans and the borrowers linked to them
- Track loan details: principal amount, interest rate, term, and status
- View loan lists with borrower information and navigate to details

## How to Run Locally

**Docker Compose**
```bash
docker compose up --build -d && docker exec loan-api npm run db:push && docker exec loan-api npm run db:seed
```

Access the app at http://localhost:5173 (API at http://localhost:3001)

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/loan_management` |
| `PORT` | API server port | `3001` |

Copy `backend/.env.example` to `backend/.env` for local development.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  pages/                    hooks/                   api/                    │
│  ├── LoanList.tsx         ├── useForm.ts           ├── client.ts           │
│  ├── LoanDetail.tsx       └── useResourceMutation  ├── loans.ts            │
│  ├── LoanForm.tsx              .ts                 └── borrowers.ts        │
│  ├── BorrowerList.tsx                                                       │
│  └── BorrowerForm.tsx     lib/                     components/              │
│                           ├── money.ts             └── StatusBadge.tsx      │
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
│  borrowers                              loans                               │
│  ├── id (uuid, PK)                     ├── id (uuid, PK)                   │
│  ├── name                              ├── borrower_id (FK → borrowers)    │
│  ├── email                             ├── principal_amount_micros         │
│  ├── phone                             ├── interest_rate_bps               │
│  ├── created_at                        ├── term_months                     │
│  ├── updated_at                        ├── status (DRAFT | ACTIVE)         │
│  └── deleted_at                        ├── created_at                      │
│                                        ├── updated_at                      │
│                                        └── deleted_at                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Responsibility |
|-------|----------------|
| **Pages** | Route components, form handling, data fetching via React Query |
| **Hooks** | Reusable form state (`useForm`) and mutation logic (`useResourceMutation`) |
| **API Client** | HTTP fetch wrapper, response parsing, type-safe API calls |
| **Lib** | Shared utilities: money conversion, validation constants, Zod schemas |
| **Routes** | Express handlers: validation, delegation, response formatting |
| **State Machine** | Loan status transitions with guards and validation |
| **Events** | Unified audit trail for loan activities |
| **DB** | Drizzle schema, migrations, seed data |

### Data Flow

1. **User Action** → Page component handles event
2. **Mutation/Query** → Custom hook triggers API call via React Query
3. **HTTP Request** → API client sends typed request to backend
4. **Validation** → Zod schema validates request body (shared constants)
5. **Database** → Drizzle ORM executes query
6. **Response** → Consistent `{ data }` or `{ error }` format returned
7. **Cache Update** → React Query invalidates relevant queries

## Key Technical Decisions

### Schema Design

| Decision | Rationale |
|----------|-----------|
| **Integer currency (micro-units)** | Store amounts as integers in micro-units (1 dollar = 10,000 micros) to avoid floating-point precision errors in financial calculations |
| **Integer rates (basis points)** | Store interest rates as basis points (5.5% = 550 bps) for precision without decimals |
| **Borrower as required** | Every loan must have a borrower; supports inline creation for convenience |
| **Soft delete** | `deletedAt` timestamp preserves audit trails instead of permanent deletion |
| **UUID primary keys** | Prevents enumeration attacks and simplifies distributed systems |

### Libraries

| Library | Why |
|---------|-----|
| **Drizzle ORM** | Type-safe SQL queries with excellent TypeScript inference |
| **Zod** | Runtime validation that generates TypeScript types |
| **TanStack Query** | Handles caching, background refetching, and server state |
| **Tailwind CSS** | Utility-first CSS for rapid, consistent styling |

### API Design

- Standard RESTful endpoints with consistent response format: `{ data: ... }` or `{ error: { message, details } }`
- Validation errors return 400 with Zod error details
- All list endpoints exclude soft-deleted records

### Transaction Consistency

Operations that modify multiple tables use database transactions to ensure atomicity. For example, when creating a loan:

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

This ensures that if any step fails, the entire operation rolls back—no orphaned records or inconsistent state. The event recording functions accept an optional transaction context (`tx`) parameter to participate in the same transaction.

### Input Validation & Error Handling

All API inputs are validated server-side with Zod schemas. The API returns appropriate status codes and clear error messages:

| Input | Validation | Error Response |
|-------|------------|----------------|
| **Principal amount** | Integer, $1 - $10,000,000 | 400: "Amount must be at least $1" / "Amount cannot exceed $10,000,000" |
| **Interest rate** | Integer, 0% - 50% (bps) | 400: "Rate cannot be negative" / "Rate cannot exceed 50%" |
| **Term** | Integer, 1 - 600 months | 400: "Term must be at least 1 month" / "Term cannot exceed 600 months" |
| **Borrower** | Required on create | 400: "Either borrowerId or newBorrower is required" |
| **Email** | Valid format, max 255 chars | 400: "Invalid email address" |
| **UUID params** | Valid UUID format | 400: "Invalid loan ID format" / "Invalid borrower ID format" |
| **Foreign keys** | Must reference existing record | 400: "Borrower not found" |

**Edge cases handled:**
- Invalid JSON body → 400 with parse error
- Wrong data types (string instead of number) → 400 with type error
- Non-existent resources → 404
- Invalid UUID in URL params → 400 (prevents DB errors)
- Updating loan with non-existent borrowerId → 400
- All unhandled errors → 500 with generic message (details hidden in production)

## Assumptions Made

1. **Single currency (USD)** — All monetary amounts are in US dollars
2. **Simple interest** — No compound interest calculations; rate stored for display/reference
3. **No authentication** — Single-user context; production would add JWT/session auth
4. **Term in months** — Industry standard granularity for loan terms

## What I'd Improve

Given more time I would implement:

1. **Authentication & authorization** — JWT auth with role-based access control
2. **Pagination & filtering** — Handle large datasets with cursor pagination, filter by status/date/amount
3. **Amortization schedules** — Generate payment schedules based on loan terms
4. **Background jobs** — Automated status transitions (e.g., mark loans delinquent after 30 days)
5. **Service layer** — As the application grows, extract business logic into a dedicated service layer for better testability, reusability across entry points (API, CLI, background jobs), and clearer separation of concerns

## Testing

```bash
# Backend (53 tests)
cd backend && npm test

# Frontend
cd frontend && npm test
```

### Test Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Unit** | Pure functions with no dependencies | `money.test.ts` - parse/format, arithmetic |
| **API** | HTTP request/response validation | `loans.test.ts` - endpoints, status codes, validation |
| **Component** | React component rendering and state | `LoanList.test.tsx` - display, loading, error states |
| **Integration** | User interactions and form flows | `LoanForm.test.tsx` - validation, submission |

### Backend Test Structure

```
describe('Resource API')
  describe('POST /resource')     → Create operations + validation
  describe('GET /resource')      → List operations
  describe('GET /resource/:id')  → Single resource + 404/400 handling
  describe('PATCH /resource/:id') → Update operations + validation
  describe('DELETE /resource/:id') → Soft delete + 404/400 handling
  describe('Response Format')    → Consistent { data } / { error } structure
```

### What We Test

**Backend:**
- Input validation (required fields, types, ranges, formats)
- Error responses (400 validation, 404 not found, invalid UUID)
- Response structure consistency
- Edge cases (zero values, max limits, empty payloads)

**Frontend:**
- Component rendering with mock data
- Loading, error, and empty states
- Form validation feedback
- User interactions (submit, cancel, field changes)
- API integration (correct payload transformation)

### Test Principles

1. **One assertion focus** — Each test verifies one behavior
2. **Descriptive names** — Test names describe the expected behavior
3. **Mock at boundaries** — Mock APIs and DB, not internal functions
4. **No redundancy** — Each scenario tested once in the most appropriate place

## AI Tool Usage

Built with extensive use of Claude Code for:
- Project scaffolding and configuration
- Writing comprehensive test suites
- Debugging and code review
- Documentation

I initially laid out the architecture, broke down the project down into pieces and then wrote implementation directives for Claude. 
