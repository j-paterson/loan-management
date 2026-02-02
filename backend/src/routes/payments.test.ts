import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

// Mock the database module to avoid DATABASE_URL requirement
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
        orderBy: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
  },
}));

describe('Payments API', () => {
  // ===========================================
  // Validation tests (don't require database)
  // ===========================================
  describe('Validation', () => {
    it('returns 400 for invalid loan ID format on POST', async () => {
      const response = await request(app)
        .post('/loans/not-a-uuid/payments')
        .send({
          amountMicros: 100000000,
          paidAt: '2024-01-20',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Invalid loan ID format');
    });

    it('returns 400 for invalid loan ID format on GET list', async () => {
      const response = await request(app).get('/loans/not-a-uuid/payments');

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Invalid loan ID format');
    });

    it('returns 400 for invalid loan ID format on GET single', async () => {
      const response = await request(app).get('/loans/not-a-uuid/payments/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Invalid loan ID format');
    });

    it('returns 400 for invalid loan ID format on PATCH', async () => {
      const response = await request(app)
        .patch('/loans/not-a-uuid/payments/00000000-0000-0000-0000-000000000000')
        .send({ amountMicros: 200000000 });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Invalid loan ID format');
    });

    it('returns 400 for invalid loan ID format on DELETE', async () => {
      const response = await request(app).delete('/loans/not-a-uuid/payments/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Invalid loan ID format');
    });
  });
});
