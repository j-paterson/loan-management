# Loan Management Application

A full-stack loan management application built with React, TypeScript, Express, and PostgreSQL.

## Quick Start

```bash
# Start PostgreSQL
docker compose up -d

# Backend
cd backend
cp .env.example .env
npm install
npm run db:push
npm run db:seed
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/loan_management` |
| `PORT` | API server port | `3001` |

## Project Structure

```
loan-management/
├── backend/                 # Express API
│   ├── src/
│   │   ├── db/             # Database schema, migrations, seed
│   │   ├── routes/         # API routes
│   │   ├── app.ts          # Express app configuration
│   │   └── index.ts        # Server entry point
│   └── package.json
├── frontend/               # React application
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── pages/         # Page components
│   │   ├── types/         # TypeScript types
│   │   └── App.tsx        # Routes configuration
│   └── package.json
├── docker-compose.yml      # PostgreSQL container
└── README.md
```

## Database Setup

The application uses PostgreSQL. The easiest way to run it locally is with Docker:

```bash
docker compose up -d
```

Then push the schema and seed data:

```bash
cd backend
npm run db:push    # Create tables
npm run db:seed    # Insert sample data
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/loans` | List all loans |
| `GET` | `/loans/:id` | Get loan by ID |
| `POST` | `/loans` | Create new loan |
| `PATCH` | `/loans/:id` | Update loan |
| `DELETE` | `/loans/:id` | Soft delete loan |
| `GET` | `/health` | Health check |

### Request/Response Format

All responses are wrapped in a consistent format:

```json
// Success
{ "data": { ... } }

// Error
{ "error": { "message": "...", "details": { ... } } }
```

## Key Technical Decisions

### Database Schema

- **DECIMAL precision**: Used `DECIMAL(19,4)` for monetary amounts and `DECIMAL(7,6)` for interest rates to avoid floating-point precision issues
- **Soft delete**: Loans have a `deletedAt` timestamp rather than being permanently deleted, preserving audit trails
- **Interest rate storage**: Stored as a decimal (0.055 = 5.5%) rather than percentage to simplify calculations
- **Term**: Used months as the unit for loan terms (more granular than years, industry standard)

### Backend

- **Express**: Chosen for simplicity and widespread familiarity
- **Drizzle ORM**: Type-safe query builder with excellent TypeScript support
- **Zod**: Runtime validation that integrates well with TypeScript types
- **Soft delete by default**: DELETE operations set `deletedAt` rather than removing records

### Frontend

- **TanStack Query**: Handles server state, caching, and automatic refetching
- **Native fetch**: Used instead of Axios to minimize dependencies and demonstrate platform knowledge
- **React Router**: Standard routing solution for React applications
- **Tailwind CSS**: Utility-first CSS for rapid UI development

### Validation Rules

| Field | Rules |
|-------|-------|
| Principal Amount | Required, positive, max $10,000,000 |
| Interest Rate | Required, 0-100% (stored as decimal 0-1) |
| Term | Required, 1-600 months, integer only |
| Status | DRAFT or ACTIVE (CLOSED/ARCHIVED reserved for future use) |

## Assumptions Made

1. **Single currency**: All amounts are in USD
2. **Simple interest**: No compound interest calculations in this version
3. **No authentication**: The app assumes a single-user context for this exercise
4. **Status transitions**: Currently allows any status change; a production app would enforce valid transitions
5. **No borrower association**: Loans exist independently; a production system would link to borrower records

## Testing

```bash
# Backend tests (31 tests)
cd backend && npm test

# Frontend tests (39 tests)
cd frontend && npm test
```

Tests cover:
- All API endpoints and validation rules
- Component rendering and user interactions
- Loading and error states
- Form validation feedback

## What I'd Improve

Given more time, I would add:

1. **Borrower entity**: Link loans to borrower records with contact information
2. **Payment tracking**: Record payments and calculate remaining balance
3. **Activity log**: Track all changes to loans for audit purposes
4. **Authentication**: Protect endpoints with JWT or session-based auth
5. **Pagination**: Add pagination for the loans list endpoint
6. **Advanced filtering**: Filter loans by status, amount range, date range
7. **E2E tests**: Add Playwright or Cypress tests for full user flows

## AI Tool Usage

This project was built with assistance from Claude (Anthropic). AI was used for:
- Initial project scaffolding and boilerplate
- Writing test suites
- Debugging configuration issues
- Code review and suggestions

All code was reviewed and understood before committing.
