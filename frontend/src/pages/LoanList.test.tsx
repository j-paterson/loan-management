import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import LoanList from './LoanList';
import { mockLoans } from '../test/mocks';

// Mock the API module
vi.mock('../api/loans', () => ({
  loansApi: {
    getAll: vi.fn(),
  },
}));

import { loansApi } from '../api/loans';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('LoanList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // REQUIREMENT: Loan List Page - Displays a list of loans
  // ===========================================
  it('displays a list of loans', async () => {
    vi.mocked(loansApi.getAll).mockResolvedValue(mockLoans);

    render(<LoanList />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Principal amounts may appear multiple times (once for principal, once for balance if equal)
      expect(screen.getAllByText('$50,000.00').length).toBeGreaterThan(0);
      expect(screen.getAllByText('$25,000.00').length).toBeGreaterThan(0);
    });
  });

  it('displays loan details in table format', async () => {
    vi.mocked(loansApi.getAll).mockResolvedValue(mockLoans);

    render(<LoanList />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Check table headers exist
      expect(screen.getByText('Principal')).toBeInTheDocument();
      expect(screen.getByText('Interest Rate')).toBeInTheDocument();
      expect(screen.getByText('Term')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
  });

  it('displays interest rate as percentage', async () => {
    vi.mocked(loansApi.getAll).mockResolvedValue(mockLoans);

    render(<LoanList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('5.50%')).toBeInTheDocument();
      expect(screen.getByText('4.50%')).toBeInTheDocument();
    });
  });

  it('displays term in months', async () => {
    vi.mocked(loansApi.getAll).mockResolvedValue(mockLoans);

    render(<LoanList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('60 months')).toBeInTheDocument();
      expect(screen.getByText('36 months')).toBeInTheDocument();
    });
  });

  it('displays status badges', async () => {
    vi.mocked(loansApi.getAll).mockResolvedValue(mockLoans);

    render(<LoanList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
      expect(screen.getByText('DRAFT')).toBeInTheDocument();
    });
  });

  it('displays borrower information', async () => {
    vi.mocked(loansApi.getAll).mockResolvedValue(mockLoans);

    render(<LoanList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });
  });

  // ===========================================
  // REQUIREMENT: Handle loading states cleanly
  // ===========================================
  it('shows loading state', async () => {
    vi.mocked(loansApi.getAll).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<LoanList />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading loans...')).toBeInTheDocument();
  });

  // ===========================================
  // REQUIREMENT: Handle error states cleanly
  // ===========================================
  it('shows error state', async () => {
    vi.mocked(loansApi.getAll).mockRejectedValue(new Error('Network error'));

    render(<LoanList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Error loading loans/)).toBeInTheDocument();
    });
  });

  // ===========================================
  // REQUIREMENT: UI/UX - User-friendly
  // ===========================================
  it('shows empty state when no loans', async () => {
    vi.mocked(loansApi.getAll).mockResolvedValue([]);

    render(<LoanList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/No loans found/)).toBeInTheDocument();
    });
  });

  it('has a link to create new loan', async () => {
    vi.mocked(loansApi.getAll).mockResolvedValue([]);

    render(<LoanList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /New Loan/i })).toBeInTheDocument();
    });
  });

  it('renders clickable rows for each loan', async () => {
    vi.mocked(loansApi.getAll).mockResolvedValue(mockLoans);

    render(<LoanList />, { wrapper: createWrapper() });

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      // Header row + 2 data rows
      expect(rows.length).toBeGreaterThanOrEqual(3);
    });
  });
});
