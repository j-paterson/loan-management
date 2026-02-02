import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

// Mock the database module
vi.mock('../db/index.js', () => {
  const mockBorrowers = [
    {
      id: 'borrower-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      deletedAt: null,
    },
    {
      id: 'borrower-2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '555-5678',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      deletedAt: null,
    },
  ];

  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn((_condition) => ({
            orderBy: vi.fn(() => Promise.resolve(mockBorrowers.filter(b => !b.deletedAt))),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn((data) => ({
          returning: vi.fn(() => Promise.resolve([{
            id: 'new-borrower-123',
            name: data.name,
            email: data.email,
            phone: data.phone || null,
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
              id: 'borrower-1',
              name: 'Updated Name',
              email: 'updated@example.com',
              phone: '555-9999',
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

describe('Borrowers API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /borrowers', () => {
    it('returns a list of borrowers', async () => {
      const response = await request(app).get('/borrowers');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /borrowers/:id', () => {
    it('returns 400 for invalid UUID format', async () => {
      const response = await request(app).get('/borrowers/not-a-uuid');

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Invalid borrower ID format');
    });

    it('returns 404 for non-existent borrower', async () => {
      const response = await request(app).get('/borrowers/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Borrower not found');
    });
  });

  describe('POST /borrowers', () => {
    it('creates a borrower with valid data', async () => {
      const response = await request(app)
        .post('/borrowers')
        .send({
          name: 'New Borrower',
          email: 'new@example.com',
          phone: '555-0000',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('New Borrower');
      expect(response.body.data.email).toBe('new@example.com');
    });

    it('creates a borrower without phone', async () => {
      const response = await request(app)
        .post('/borrowers')
        .send({
          name: 'New Borrower',
          email: 'new@example.com',
        });

      expect(response.status).toBe(201);
    });

    it('rejects missing name', async () => {
      const response = await request(app)
        .post('/borrowers')
        .send({
          email: 'new@example.com',
        });

      expect(response.status).toBe(422);
      expect(response.body.error.message).toBe('Validation failed');
    });

    it('rejects missing email', async () => {
      const response = await request(app)
        .post('/borrowers')
        .send({
          name: 'New Borrower',
        });

      expect(response.status).toBe(422);
      expect(response.body.error.message).toBe('Validation failed');
    });

    it('rejects invalid email format', async () => {
      const response = await request(app)
        .post('/borrowers')
        .send({
          name: 'New Borrower',
          email: 'not-an-email',
        });

      expect(response.status).toBe(422);
    });

    it('rejects empty name', async () => {
      const response = await request(app)
        .post('/borrowers')
        .send({
          name: '',
          email: 'new@example.com',
        });

      expect(response.status).toBe(422);
    });
  });

  describe('PATCH /borrowers/:id', () => {
    it('returns 400 for invalid UUID format', async () => {
      const response = await request(app)
        .patch('/borrowers/not-a-uuid')
        .send({ name: 'Updated' });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Invalid borrower ID format');
    });

    it('returns 404 for non-existent borrower', async () => {
      const response = await request(app)
        .patch('/borrowers/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
    });

    it('validates update data', async () => {
      const response = await request(app)
        .patch('/borrowers/00000000-0000-0000-0000-000000000000')
        .send({ email: 'not-an-email' });

      expect(response.status).toBe(422);
    });
  });

  describe('DELETE /borrowers/:id', () => {
    it('returns 400 for invalid UUID format', async () => {
      const response = await request(app).delete('/borrowers/not-a-uuid');

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Invalid borrower ID format');
    });

    it('returns 404 for non-existent borrower', async () => {
      const response = await request(app).delete('/borrowers/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
    });
  });
});
