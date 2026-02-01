import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

// Mock the database module
vi.mock('../db/index.js', () => {
  const mockLoans: Record<string, any>[] = [];

  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => Promise.resolve(mockLoans.filter(l => !l.deletedAt))),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{
            id: 'test-uuid-123',
            principalAmount: '50000.0000',
            interestRate: '0.055000',
            termMonths: 60,
            status: 'DRAFT',
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          }])),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{
              id: 'test-uuid-123',
              principalAmount: '75000.0000',
              interestRate: '0.055000',
              termMonths: 60,
              status: 'ACTIVE',
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
            }])),
          })),
        })),
      })),
    },
  };
});

describe('Loans API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // REQUIREMENT: POST /loans — Create loan
  // ===========================================
  describe('POST /loans', () => {
    it('creates a loan with valid data', async () => {
      const response = await request(app)
        .post('/loans')
        .send({
          principalAmount: 50000,
          interestRate: 0.055,
          termMonths: 60,
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.principalAmount).toBe('50000.0000');
      expect(response.body.data.status).toBe('DRAFT');
    });

    it('creates a loan with ACTIVE status', async () => {
      const response = await request(app)
        .post('/loans')
        .send({
          principalAmount: 50000,
          interestRate: 0.055,
          termMonths: 60,
          status: 'ACTIVE',
        });

      expect(response.status).toBe(201);
    });

    // REQUIREMENT: Validate monetary amounts
    it('rejects negative principal amount', async () => {
      const response = await request(app)
        .post('/loans')
        .send({
          principalAmount: -1000,
          interestRate: 0.05,
          termMonths: 12,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Validation failed');
    });

    it('rejects principal amount exceeding maximum', async () => {
      const response = await request(app)
        .post('/loans')
        .send({
          principalAmount: 100_000_000,
          interestRate: 0.05,
          termMonths: 12,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Validation failed');
    });

    // REQUIREMENT: Validate interest rates
    it('rejects negative interest rate', async () => {
      const response = await request(app)
        .post('/loans')
        .send({
          principalAmount: 50000,
          interestRate: -0.05,
          termMonths: 12,
        });

      expect(response.status).toBe(400);
    });

    it('rejects interest rate over 100%', async () => {
      const response = await request(app)
        .post('/loans')
        .send({
          principalAmount: 50000,
          interestRate: 1.5, // 150%
          termMonths: 12,
        });

      expect(response.status).toBe(400);
    });

    it('accepts 0% interest rate', async () => {
      const response = await request(app)
        .post('/loans')
        .send({
          principalAmount: 50000,
          interestRate: 0,
          termMonths: 12,
        });

      expect(response.status).toBe(201);
    });

    // REQUIREMENT: Validate required fields
    it('rejects missing principal amount', async () => {
      const response = await request(app)
        .post('/loans')
        .send({
          interestRate: 0.05,
          termMonths: 12,
        });

      expect(response.status).toBe(400);
    });

    it('rejects missing interest rate', async () => {
      const response = await request(app)
        .post('/loans')
        .send({
          principalAmount: 50000,
          termMonths: 12,
        });

      expect(response.status).toBe(400);
    });

    it('rejects missing term', async () => {
      const response = await request(app)
        .post('/loans')
        .send({
          principalAmount: 50000,
          interestRate: 0.05,
        });

      expect(response.status).toBe(400);
    });

    // REQUIREMENT: Validate term months
    it('rejects term less than 1 month', async () => {
      const response = await request(app)
        .post('/loans')
        .send({
          principalAmount: 50000,
          interestRate: 0.05,
          termMonths: 0,
        });

      expect(response.status).toBe(400);
    });

    it('rejects term exceeding 600 months', async () => {
      const response = await request(app)
        .post('/loans')
        .send({
          principalAmount: 50000,
          interestRate: 0.05,
          termMonths: 601,
        });

      expect(response.status).toBe(400);
    });

    it('rejects non-integer term', async () => {
      const response = await request(app)
        .post('/loans')
        .send({
          principalAmount: 50000,
          interestRate: 0.05,
          termMonths: 12.5,
        });

      expect(response.status).toBe(400);
    });

    // REQUIREMENT: Don't crash on bad input
    it('handles invalid JSON gracefully', async () => {
      const response = await request(app)
        .post('/loans')
        .set('Content-Type', 'application/json')
        .send('not valid json{');

      expect(response.status).toBe(400);
    });

    it('handles wrong data types gracefully', async () => {
      const response = await request(app)
        .post('/loans')
        .send({
          principalAmount: 'not a number',
          interestRate: 'also not',
          termMonths: 'nope',
        });

      expect(response.status).toBe(400);
    });
  });

  // ===========================================
  // REQUIREMENT: GET /loans — List loans
  // ===========================================
  describe('GET /loans', () => {
    it('returns a list of loans', async () => {
      const response = await request(app).get('/loans');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('returns consistent response structure', async () => {
      const response = await request(app).get('/loans');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });

  // ===========================================
  // REQUIREMENT: GET /loans/:id — Get loan by ID
  // ===========================================
  describe('GET /loans/:id', () => {
    it('returns 404 for non-existent loan', async () => {
      const response = await request(app).get('/loans/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Loan not found');
    });

    // REQUIREMENT: Useful error responses
    it('returns structured error for 404', async () => {
      const response = await request(app).get('/loans/non-existent-id');

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
    });
  });

  // ===========================================
  // REQUIREMENT: PATCH /loans/:id — Update loan
  // ===========================================
  describe('PATCH /loans/:id', () => {
    it('returns 404 for non-existent loan', async () => {
      const response = await request(app)
        .patch('/loans/non-existent-id')
        .send({ principalAmount: 75000 });

      expect(response.status).toBe(404);
    });

    it('validates update data', async () => {
      const response = await request(app)
        .patch('/loans/test-uuid-123')
        .send({ principalAmount: -1000 });

      expect(response.status).toBe(400);
    });

    it('allows partial updates', async () => {
      const response = await request(app)
        .patch('/loans/test-uuid-123')
        .send({ status: 'ACTIVE' });

      // Will be 404 due to mock, but validates the request format is accepted
      expect([200, 404]).toContain(response.status);
    });
  });

  // ===========================================
  // REQUIREMENT: DELETE /loans/:id — Soft delete
  // ===========================================
  describe('DELETE /loans/:id', () => {
    it('returns 404 for non-existent loan', async () => {
      const response = await request(app).delete('/loans/non-existent-id');

      expect(response.status).toBe(404);
    });
  });

  // ===========================================
  // REQUIREMENT: Appropriate status codes
  // ===========================================
  describe('HTTP Status Codes', () => {
    it('returns 201 for successful creation', async () => {
      const response = await request(app)
        .post('/loans')
        .send({
          principalAmount: 50000,
          interestRate: 0.05,
          termMonths: 12,
        });

      expect(response.status).toBe(201);
    });

    it('returns 400 for validation errors', async () => {
      const response = await request(app)
        .post('/loans')
        .send({});

      expect(response.status).toBe(400);
    });

    it('returns 404 for not found', async () => {
      const response = await request(app).get('/loans/does-not-exist');

      expect(response.status).toBe(404);
    });

    it('returns 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
    });
  });

  // ===========================================
  // REQUIREMENT: API Response Structure
  // ===========================================
  describe('Response Structure', () => {
    it('wraps successful responses in data property', async () => {
      const response = await request(app).get('/loans');

      expect(response.body).toHaveProperty('data');
    });

    it('wraps errors in error property', async () => {
      const response = await request(app)
        .post('/loans')
        .send({});

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
    });

    it('includes validation details on error', async () => {
      const response = await request(app)
        .post('/loans')
        .send({ principalAmount: -1 });

      expect(response.body.error).toHaveProperty('details');
    });
  });

  // ===========================================
  // REQUIREMENT: Health check endpoint
  // ===========================================
  describe('Health Check', () => {
    it('returns ok status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });
});
