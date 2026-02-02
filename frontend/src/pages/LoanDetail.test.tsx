import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoanDetail from './LoanDetail';
import { mockLoan } from '../test/mocks';

// Mock the API module
vi.mock('../api/loans', () => ({
  loansApi: {
    getById: vi.fn(),
    delete: vi.fn(),
  },
}));

import { loansApi } from '../api/loans';

// Helper to render with route
const renderWithRoute = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  window.history.pushState({}, '', '/loans/1');

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/loans/:id" element={<LoanDetail />} />
          <Route path="/loans" element={<div>Loan List</div>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('LoanDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/loans/1');
  });

  // ===========================================
  // REQUIREMENT: Loan Detail Page - Shows all details for a single loan
  // ===========================================
  it('displays loan principal amount', async () => {
    vi.mocked(loansApi.getById).mockResolvedValue(mockLoan);

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('$50,000.00')).toBeInTheDocument();
    });
  });

  it('displays loan interest rate as percentage', async () => {
    vi.mocked(loansApi.getById).mockResolvedValue(mockLoan);

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('5.50%')).toBeInTheDocument();
    });
  });

  it('displays loan term', async () => {
    vi.mocked(loansApi.getById).mockResolvedValue(mockLoan);

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('60 months')).toBeInTheDocument();
    });
  });

  it('displays loan status', async () => {
    vi.mocked(loansApi.getById).mockResolvedValue(mockLoan);

    renderWithRoute();

    await waitFor(() => {
      // Status appears in both the badge and the details section
      const statusElements = screen.getAllByText('ACTIVE');
      expect(statusElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================
  // REQUIREMENT: Handle loading states cleanly
  // ===========================================
  it('shows loading state', async () => {
    vi.mocked(loansApi.getById).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithRoute();

    expect(screen.getByText('Loading loan...')).toBeInTheDocument();
  });

  // ===========================================
  // REQUIREMENT: Handle error states cleanly
  // ===========================================
  it('shows error state', async () => {
    vi.mocked(loansApi.getById).mockRejectedValue(new Error('Loan not found'));

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText(/Error loading loan/)).toBeInTheDocument();
    });
  });

  // ===========================================
  // REQUIREMENT: UI/UX - User-friendly actions
  // ===========================================
  it('has edit loan button', async () => {
    vi.mocked(loansApi.getById).mockResolvedValue(mockLoan);

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Edit Loan/i })).toBeInTheDocument();
    });
  });

  it('has delete loan button', async () => {
    vi.mocked(loansApi.getById).mockResolvedValue(mockLoan);

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Delete Loan/i })).toBeInTheDocument();
    });
  });

  it('has breadcrumb navigation to loans list', async () => {
    vi.mocked(loansApi.getById).mockResolvedValue(mockLoan);

    renderWithRoute();

    await waitFor(() => {
      // Breadcrumb has "Loans" link back to the list
      expect(screen.getByRole('link', { name: /Loans/i })).toBeInTheDocument();
    });
  });
});
