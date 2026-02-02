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
- `GET /loans/:id/status/available-transitions` — Get possible transitions with guard results
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
4. **Timed Background jobs** — Automated status transitions (e.g., mark loans delinquent after 30 days)

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
