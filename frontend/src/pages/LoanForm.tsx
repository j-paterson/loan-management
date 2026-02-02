import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { loansApi } from '../api/loans';
import { borrowersApi } from '../api/borrowers';
import { parseAmount, parseRate, MICROS_PER_DOLLAR } from '../lib/money';
import {
  PRINCIPAL_MAX_DOLLARS,
  RATE_MIN_PERCENT,
  RATE_MAX_PERCENT,
  RATE_WARNING_PERCENT,
  TERM_MIN_MONTHS,
  TERM_MAX_MONTHS,
} from '../lib/validation';
import { Card, CardHeader, CardBody, FormField, inputStyles, Button, ButtonLink, BorrowerSearch } from '../components';
import type { CreateLoanInput, UpdateLoanInput } from '../types/loan';

interface FormData {
  principalAmount: string;
  interestRate: string;
  termMonths: string;
  borrowerId: string;
}

interface NewBorrowerData {
  name: string;
  email: string;
  phone: string;
}

interface FormErrors {
  principalAmount?: string;
  interestRate?: string;
  termMonths?: string;
  borrower?: string;
}

export default function LoanForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [form, setForm] = useState<FormData>({
    principalAmount: '',
    interestRate: '',
    termMonths: '',
    borrowerId: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [newBorrower, setNewBorrower] = useState<NewBorrowerData | null>(null);

  const { data: existingLoan, isLoading: isLoadingLoan } = useQuery({
    queryKey: ['loans', id],
    queryFn: () => loansApi.getById(id!),
    enabled: isEditing,
  });

  const { data: borrowers = [] } = useQuery({
    queryKey: ['borrowers'],
    queryFn: borrowersApi.getAll,
  });

  useEffect(() => {
    if (existingLoan) {
      setForm({
        principalAmount: (existingLoan.principalAmountMicros / MICROS_PER_DOLLAR).toString(),
        interestRate: (existingLoan.interestRateBps / 100).toString(),
        termMonths: existingLoan.termMonths.toString(),
        borrowerId: existingLoan.borrowerId,
      });
    }
  }, [existingLoan]);

  const createMutation = useMutation({
    mutationFn: loansApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['borrowers'] });
      navigate('/loans');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateLoanInput) => loansApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['events', id] });
      navigate(`/loans/${id}`);
    },
  });

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    const principal = parseFloat(form.principalAmount);
    if (!form.principalAmount || isNaN(principal) || principal <= 0) {
      newErrors.principalAmount = 'Principal amount must be a positive number';
    } else if (principal > PRINCIPAL_MAX_DOLLARS) {
      newErrors.principalAmount = `Principal amount cannot exceed $${PRINCIPAL_MAX_DOLLARS.toLocaleString()}`;
    }

    const rate = parseFloat(form.interestRate);
    if (!form.interestRate || isNaN(rate) || rate < RATE_MIN_PERCENT) {
      newErrors.interestRate = 'Interest rate must be 0 or greater';
    } else if (rate > RATE_MAX_PERCENT) {
      newErrors.interestRate = `Interest rate cannot exceed ${RATE_MAX_PERCENT}%`;
    }

    const term = parseInt(form.termMonths);
    if (!form.termMonths || isNaN(term) || term < TERM_MIN_MONTHS) {
      newErrors.termMonths = `Term must be at least ${TERM_MIN_MONTHS} month`;
    } else if (term > TERM_MAX_MONTHS) {
      newErrors.termMonths = `Term cannot exceed ${TERM_MAX_MONTHS} months`;
    }

    if (!form.borrowerId && !newBorrower) {
      newErrors.borrower = 'Please select a borrower or create a new one';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (isEditing) {
      const updateData: UpdateLoanInput = {
        principalAmountMicros: parseAmount(form.principalAmount),
        interestRateBps: parseRate(form.interestRate),
        termMonths: parseInt(form.termMonths),
      };

      if (newBorrower) {
        updateData.newBorrower = {
          name: newBorrower.name,
          email: newBorrower.email,
          phone: newBorrower.phone || undefined,
        };
      } else {
        updateData.borrowerId = form.borrowerId;
      }

      updateMutation.mutate(updateData);
    } else {
      // New loans always start as DRAFT - use state machine to transition
      const data: CreateLoanInput = {
        principalAmountMicros: parseAmount(form.principalAmount),
        interestRateBps: parseRate(form.interestRate),
        termMonths: parseInt(form.termMonths),
      };

      if (newBorrower) {
        data.newBorrower = {
          name: newBorrower.name,
          email: newBorrower.email,
          phone: newBorrower.phone || undefined,
        };
      } else {
        data.borrowerId = form.borrowerId;
      }

      createMutation.mutate(data);
    }
  };

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field as keyof FormErrors]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const mutation = isEditing ? updateMutation : createMutation;

  if (isEditing && isLoadingLoan) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading loan...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/loans" className="text-blue-600 hover:underline text-sm">
          &larr; Back to loans
        </Link>
      </div>

      <Card className="max-w-4xl">
        <CardHeader>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Loan' : 'Create New Loan'}
          </h1>
        </CardHeader>

        <CardBody>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column - Loan Details */}
              <div className="space-y-6">
                <FormField label="Principal Amount ($)" htmlFor="principalAmount" error={errors.principalAmount}>
                  <input
                    type="number"
                    id="principalAmount"
                    value={form.principalAmount}
                    onChange={handleChange('principalAmount')}
                    className={inputStyles(!!errors.principalAmount)}
                    placeholder="50000"
                    step="0.01"
                    min="0"
                  />
                </FormField>

                <FormField label="Interest Rate (% APR)" htmlFor="interestRate" error={errors.interestRate}>
                  <input
                    type="number"
                    id="interestRate"
                    value={form.interestRate}
                    onChange={handleChange('interestRate')}
                    className={inputStyles(!!errors.interestRate)}
                    placeholder="5.25"
                    step="0.01"
                    min={RATE_MIN_PERCENT}
                    max={RATE_MAX_PERCENT}
                  />
                  {!errors.interestRate && parseFloat(form.interestRate) > RATE_WARNING_PERCENT && (
                    <p className="mt-1 text-sm text-amber-600">
                      Interest rates above {RATE_WARNING_PERCENT}% are unusually high. Please verify this is correct.
                    </p>
                  )}
                </FormField>

                <FormField label="Term (months)" htmlFor="termMonths" error={errors.termMonths}>
                  <input
                    type="number"
                    id="termMonths"
                    value={form.termMonths}
                    onChange={handleChange('termMonths')}
                    className={inputStyles(!!errors.termMonths)}
                    placeholder="60"
                    min={TERM_MIN_MONTHS}
                    max={TERM_MAX_MONTHS}
                  />
                </FormField>
              </div>

              {/* Right Column - Borrower */}
              <div className="space-y-6">
                {/* Borrower Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Borrower <span className="text-red-500">*</span>
                  </label>
                  <BorrowerSearch
                    borrowers={borrowers}
                    selectedBorrowerId={form.borrowerId}
                    onSelectBorrower={(borrowerId) => {
                      setForm({ ...form, borrowerId });
                      setNewBorrower(null);
                      if (errors.borrower) {
                        setErrors({ ...errors, borrower: undefined });
                      }
                    }}
                    onCreateBorrower={(data) => {
                      setNewBorrower(data);
                      setForm({ ...form, borrowerId: '' });
                      if (errors.borrower) {
                        setErrors({ ...errors, borrower: undefined });
                      }
                    }}
                    error={errors.borrower}
                  />
                  {newBorrower && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        New borrower will be created: <strong>{newBorrower.name}</strong> ({newBorrower.email})
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {mutation.error && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{mutation.error.message}</p>
              </div>
            )}

            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
              <Button
                type="submit"
                isLoading={mutation.isPending}
                loadingText={isEditing ? 'Saving...' : 'Creating...'}
              >
                {isEditing ? 'Save Changes' : 'Create Loan'}
              </Button>
              <ButtonLink to="/loans" variant="secondary">
                Cancel
              </ButtonLink>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
