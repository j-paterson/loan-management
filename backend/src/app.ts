import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { loanRoutes } from './routes/loans.js';
import { borrowerRoutes } from './routes/borrowers.js';
import { paymentRoutes } from './routes/payments.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/loans', loanRoutes);
app.use('/loans/:loanId/payments', paymentRoutes);
app.use('/borrowers', borrowerRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Global error handler
app.use((err: Error & { status?: number; statusCode?: number }, req: Request, res: Response, next: NextFunction) => {
  // Handle JSON parsing errors and other client errors
  const statusCode = err.status || err.statusCode || 500;
  const isClientError = statusCode >= 400 && statusCode < 500;

  if (!isClientError) {
    console.error('Error:', err);
  }

  res.status(statusCode).json({
    error: {
      message: isClientError ? err.message : (process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message),
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: { message: 'Not found' } });
});

export { app };
