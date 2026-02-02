import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoanForm from './LoanForm';
import { mockLoan } from '../test/mocks';

// Mock the API modules
vi.mock('../api/loans', () => ({
  loansApi: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../api/borrowers', () => ({
  borrowersApi: {
    getAll: vi.fn(),
  },
}));

import { loansApi } from '../api/loans';
import { borrowersApi } from '../api/borrowers';

const mockBorrowers = [
  { id: 'borrower-1', name: 'John Doe', email: 'john@example.com', phone: '555-1234', createdAt: '2024-01-01', updatedAt: '2024-01-01', deletedAt: null },
  { id: 'borrower-2', name: 'Jane Smith', email: 'jane@example.com', phone: '555-5678', createdAt: '2024-01-01', updatedAt: '2024-01-01', deletedAt: null },
];

const renderCreateForm = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  window.history.pushState({}, '', '/loans/new');

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/loans/new" element={<LoanForm />} />
          <Route path="/loans" element={<div>Loan List</div>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const renderEditForm = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  window.history.pushState({}, '', '/loans/1/edit');

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/loans/:id/edit" element={<LoanForm />} />
          <Route path="/loans/:id" element={<div>Loan Detail</div>} />
          <Route path="/loans" element={<div>Loan List</div>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('LoanForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(borrowersApi.getAll).mockResolvedValue(mockBorrowers);
  });

  // ===========================================
  // REQUIREMENT: Create/Edit Loan Page - Form to create a new loan
  // ===========================================
  describe('Create Mode', () => {
    it('renders create form with empty fields', async () => {
      renderCreateForm();

      expect(screen.getByText('Create New Loan')).toBeInTheDocument();
      expect(screen.getByLabelText(/Principal Amount/i)).toHaveValue(null);
      expect(screen.getByLabelText(/Interest Rate/i)).toHaveValue(null);
      expect(screen.getByLabelText(/Term/i)).toHaveValue(null);
    });

    it('has all required form fields', async () => {
      renderCreateForm();

      expect(screen.getByLabelText(/Principal Amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Interest Rate/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Term/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
    });

    it('has submit button', async () => {
      renderCreateForm();

      expect(screen.getByRole('button', { name: /Create Loan/i })).toBeInTheDocument();
    });

    it('has cancel button', async () => {
      renderCreateForm();

      expect(screen.getByRole('link', { name: /Cancel/i })).toBeInTheDocument();
    });
  });

  // ===========================================
  // REQUIREMENT: Create/Edit Loan Page - Ability to edit an existing loan
  // ===========================================
  describe('Edit Mode', () => {
    it('renders edit form with pre-filled data', async () => {
      vi.mocked(loansApi.getById).mockResolvedValue(mockLoan);

      renderEditForm();

      await waitFor(() => {
        expect(screen.getByText('Edit Loan')).toBeInTheDocument();
      });
    });

    it('populates form with existing loan data', async () => {
      vi.mocked(loansApi.getById).mockResolvedValue(mockLoan);

      renderEditForm();

      await waitFor(() => {
        expect(screen.getByLabelText(/Principal Amount/i)).toHaveValue(50000);
      });
    });

    it('shows loading state while fetching loan', async () => {
      vi.mocked(loansApi.getById).mockImplementation(
        () => new Promise(() => {})
      );

      renderEditForm();

      expect(screen.getByText('Loading loan...')).toBeInTheDocument();
    });

    it('has save changes button in edit mode', async () => {
      vi.mocked(loansApi.getById).mockResolvedValue(mockLoan);

      renderEditForm();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
      });
    });
  });

  // ===========================================
  // REQUIREMENT: UI/UX - Clear form validation/errors
  // ===========================================
  describe('Form Validation', () => {
    it('shows error for empty principal amount', async () => {
      const user = userEvent.setup();
      renderCreateForm();

      await user.type(screen.getByLabelText(/Interest Rate/i), '5');
      await user.type(screen.getByLabelText(/Term/i), '12');
      await user.click(screen.getByRole('button', { name: /Create Loan/i }));

      await waitFor(() => {
        expect(screen.getByText(/Principal amount must be a positive number/i)).toBeInTheDocument();
      });
    });

    it('shows error for zero principal amount', async () => {
      const user = userEvent.setup();
      renderCreateForm();

      await user.type(screen.getByLabelText(/Principal Amount/i), '0');
      await user.type(screen.getByLabelText(/Interest Rate/i), '5');
      await user.type(screen.getByLabelText(/Term/i), '12');
      await user.click(screen.getByRole('button', { name: /Create Loan/i }));

      await waitFor(() => {
        expect(screen.getByText(/Principal amount must be a positive number/i)).toBeInTheDocument();
      });
    });

    it('shows error for principal amount exceeding maximum', async () => {
      const user = userEvent.setup();
      renderCreateForm();

      await user.type(screen.getByLabelText(/Principal Amount/i), '100000000');
      await user.type(screen.getByLabelText(/Interest Rate/i), '5');
      await user.type(screen.getByLabelText(/Term/i), '12');
      await user.click(screen.getByRole('button', { name: /Create Loan/i }));

      await waitFor(() => {
        expect(screen.getByText(/cannot exceed/i)).toBeInTheDocument();
      });
    });

    it('shows error for missing interest rate', async () => {
      const user = userEvent.setup();
      renderCreateForm();

      await user.type(screen.getByLabelText(/Principal Amount/i), '50000');
      await user.type(screen.getByLabelText(/Term/i), '12');
      await user.click(screen.getByRole('button', { name: /Create Loan/i }));

      await waitFor(() => {
        expect(screen.getByText(/Interest rate must be 0 or greater/i)).toBeInTheDocument();
      });
    });

    it('has max constraint on interest rate input', async () => {
      renderCreateForm();

      const input = screen.getByLabelText(/Interest Rate/i);
      expect(input).toHaveAttribute('max', '100');
    });

    it('shows error for missing term', async () => {
      const user = userEvent.setup();
      renderCreateForm();

      await user.type(screen.getByLabelText(/Principal Amount/i), '50000');
      await user.type(screen.getByLabelText(/Interest Rate/i), '5');
      await user.click(screen.getByRole('button', { name: /Create Loan/i }));

      await waitFor(() => {
        expect(screen.getByText(/Term must be at least 1 month/i)).toBeInTheDocument();
      });
    });

    it('has max constraint on term input', async () => {
      renderCreateForm();

      const input = screen.getByLabelText(/Term/i);
      expect(input).toHaveAttribute('max', '600');
    });

    it('clears error when user starts typing', async () => {
      const user = userEvent.setup();
      renderCreateForm();

      // Submit empty form to trigger error
      await user.click(screen.getByRole('button', { name: /Create Loan/i }));

      await waitFor(() => {
        expect(screen.getByText(/Principal amount must be a positive number/i)).toBeInTheDocument();
      });

      // Start typing to clear error
      await user.type(screen.getByLabelText(/Principal Amount/i), '5');

      await waitFor(() => {
        expect(screen.queryByText(/Principal amount must be a positive number/i)).not.toBeInTheDocument();
      });
    });
  });

  // ===========================================
  // REQUIREMENT: Form submission
  // ===========================================
  describe('Form Submission', () => {
    it('submits valid form data with existing borrower', async () => {
      vi.mocked(loansApi.create).mockResolvedValue({
        ...mockLoan,
        id: 'new-id',
      });

      const user = userEvent.setup();
      renderCreateForm();

      // Wait for borrowers to load
      await waitFor(() => {
        expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/Principal Amount/i), '50000');
      await user.type(screen.getByLabelText(/Interest Rate/i), '5.5');
      await user.type(screen.getByLabelText(/Term/i), '60');

      // Select a borrower
      await user.selectOptions(screen.getByRole('combobox', { name: '' }), 'borrower-1');

      await user.click(screen.getByRole('button', { name: /Create Loan/i }));

      await waitFor(() => {
        expect(loansApi.create).toHaveBeenCalled();
        const callArg = vi.mocked(loansApi.create).mock.calls[0][0];
        expect(callArg.principalAmountMicros).toBe(500000000); // $50,000 in micro-units
        expect(callArg.interestRateBps).toBe(550); // 5.5% in basis points
        expect(callArg.termMonths).toBe(60);
        expect(callArg.status).toBe('DRAFT');
        expect(callArg.borrowerId).toBe('borrower-1');
      });
    });

    it('submits form with new inline borrower', async () => {
      vi.mocked(loansApi.create).mockResolvedValue({
        ...mockLoan,
        id: 'new-id',
      });

      const user = userEvent.setup();
      renderCreateForm();

      await user.type(screen.getByLabelText(/Principal Amount/i), '50000');
      await user.type(screen.getByLabelText(/Interest Rate/i), '5.5');
      await user.type(screen.getByLabelText(/Term/i), '60');

      // Click to create new borrower
      await user.click(screen.getByText(/Create new borrower/i));

      // Fill in new borrower details
      await user.type(screen.getByLabelText(/^Name$/i), 'New Borrower');
      await user.type(screen.getByLabelText(/^Email$/i), 'new@example.com');
      await user.type(screen.getByLabelText(/Phone/i), '555-9999');

      await user.click(screen.getByRole('button', { name: /Create Loan/i }));

      await waitFor(() => {
        expect(loansApi.create).toHaveBeenCalled();
        const callArg = vi.mocked(loansApi.create).mock.calls[0][0];
        expect(callArg.newBorrower).toEqual({
          name: 'New Borrower',
          email: 'new@example.com',
          phone: '555-9999',
        });
        expect(callArg.borrowerId).toBeUndefined();
      });
    });

    it('shows loading state during submission', async () => {
      vi.mocked(loansApi.create).mockImplementation(
        () => new Promise(() => {})
      );

      const user = userEvent.setup();
      renderCreateForm();

      // Wait for borrowers to load
      await waitFor(() => {
        expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/Principal Amount/i), '50000');
      await user.type(screen.getByLabelText(/Interest Rate/i), '5.5');
      await user.type(screen.getByLabelText(/Term/i), '60');
      await user.selectOptions(screen.getByRole('combobox', { name: '' }), 'borrower-1');
      await user.click(screen.getByRole('button', { name: /Create Loan/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Creating.../i })).toBeInTheDocument();
      });
    });

    it('displays API error on submission failure', async () => {
      vi.mocked(loansApi.create).mockRejectedValue(new Error('Server error'));

      const user = userEvent.setup();
      renderCreateForm();

      // Wait for borrowers to load
      await waitFor(() => {
        expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/Principal Amount/i), '50000');
      await user.type(screen.getByLabelText(/Interest Rate/i), '5.5');
      await user.type(screen.getByLabelText(/Term/i), '60');
      await user.selectOptions(screen.getByRole('combobox', { name: '' }), 'borrower-1');
      await user.click(screen.getByRole('button', { name: /Create Loan/i }));

      await waitFor(() => {
        expect(screen.getByText(/Server error/i)).toBeInTheDocument();
      });
    });
  });
});
