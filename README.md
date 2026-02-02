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
   
## Assumptions Made

1. **Single currency (USD)** — All monetary amounts are in US dollars
2. **Simple interest** — No compound interest calculations; rate stored for display/reference
3. **No authentication** — Single-user context; production would add JWT/session auth
4. **Flexible status transitions** — Any status change allowed; production would enforce valid state machine
5. **Term in months** — Industry standard granularity for loan terms

## What I'd Improve

Given more time I would implement:

1. **Payment tracking** — Record payments, calculate remaining balance, generate amortization schedules
2. **Activity log** — Audit trail for all loan/borrower changes
3. **Authentication & authorization** — JWT auth with role-based access control
4. **Pagination & filtering** — Handle large datasets with cursor pagination, filter by status/date/amount
5. **Borrower management UI** — Dedicated pages for borrowers to pay/access their loan information

## Testing

```bash
# Backend (42 tests)
cd backend && npm test

# Frontend (41 tests)
cd frontend && npm test
```

Tests cover API endpoints, validation rules, component rendering, form interactions, and error states.

## AI Tool Usage

Built with extensive use of Claude Code for:
- Project scaffolding and configuration
- Writing comprehensive test suites
- Debugging and code review
- Documentation

I initially laid out the architecture, broke down the project down into pieces and then wrote implementation directives for Claude. 
