import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

// Mock the events module
vi.mock('../lib/events/index.js', () => ({
  getLoanEvents: vi.fn(),
  recordLoanCreated: vi.fn(),
  recordStatusChange: vi.fn(),
  recordLoanEdited: vi.fn(),
  recordPaymentReceived: vi.fn(),
}));

import { getLoanEvents } from '../lib/events/index.js';

// Mock the database module
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'test-event-123' }])),
      })),
    })),
    transaction: vi.fn(async (callback: (tx: any) => Promise<any>) => {
      return callback({
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([])),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ id: 'test-123' }])),
          })),
        })),
      });
    }),
  },
}));

describe('Events API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /loans/:loanId/events', () => {
    it('returns events for a loan', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          loanId: 'loan-123',
          eventType: 'LOAN_CREATED',
          occurredAt: new Date('2024-01-01'),
          actorId: 'user',
          description: 'Loan created',
        },
        {
          id: 'event-2',
          loanId: 'loan-123',
          eventType: 'STATUS_CHANGE',
          occurredAt: new Date('2024-01-02'),
          actorId: 'user',
          fromStatus: 'DRAFT',
          toStatus: 'SUBMITTED',
          description: 'Status changed from Draft to Submitted',
        },
      ];

      vi.mocked(getLoanEvents).mockResolvedValue(mockEvents);

      const loanId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const response = await request(app).get(`/loans/${loanId}/events`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].id).toBe('event-1');
      expect(response.body.data[0].eventType).toBe('LOAN_CREATED');
      expect(response.body.data[1].eventType).toBe('STATUS_CHANGE');
      expect(getLoanEvents).toHaveBeenCalledWith(loanId);
    });

    it('returns empty array when no events exist', async () => {
      vi.mocked(getLoanEvents).mockResolvedValue([]);

      const loanId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const response = await request(app).get(`/loans/${loanId}/events`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('returns 400 for invalid loan ID format', async () => {
      const response = await request(app).get('/loans/not-a-uuid/events');

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Invalid loan ID format');
    });
  });
});
