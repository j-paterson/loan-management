import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { loansApi } from '../api/loans';
import { parseAmount, parseRate, MICROS_PER_DOLLAR } from '../lib/money';
import type { CreateLoanInput } from '../types/loan';

interface FormData {
  principalAmount: string;  // User-friendly decimal input (e.g., "50000")
  interestRate: string;     // User-friendly percentage input (e.g., "5.5")
  termMonths: string;
  status: 'DRAFT' | 'ACTIVE';
}

interface FormErrors {
  principalAmount?: string;
  interestRate?: string;
  termMonths?: string;
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
    status: 'DRAFT',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Fetch existing loan for edit mode
  const { data: existingLoan, isLoading: isLoadingLoan } = useQuery({
    queryKey: ['loans', id],
    queryFn: () => loansApi.getById(id!),
    enabled: isEditing,
  });

  // Populate form when editing - convert from integers to display values
  useEffect(() => {
    if (existingLoan) {
      setForm({
        // Convert micro-units to dollars for display
        principalAmount: (existingLoan.principalAmountMicros / MICROS_PER_DOLLAR).toString(),
        // Convert basis points to percentage for display
        interestRate: (existingLoan.interestRateBps / 100).toString(),
        termMonths: existingLoan.termMonths.toString(),
        status: existingLoan.status === 'DRAFT' || existingLoan.status === 'ACTIVE'
          ? existingLoan.status
          : 'DRAFT',
      });
    }
  }, [existingLoan]);

  const createMutation = useMutation({
    mutationFn: loansApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      navigate('/loans');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateLoanInput) => loansApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      navigate(`/loans/${id}`);
    },
  });

  const mutation = isEditing ? updateMutation : createMutation;

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    const principal = parseFloat(form.principalAmount);
    if (!form.principalAmount || isNaN(principal) || principal <= 0) {
      newErrors.principalAmount = 'Principal amount must be a positive number';
    } else if (principal > 10_000_000) {
      newErrors.principalAmount = 'Principal amount cannot exceed $10,000,000';
    }

    const rate = parseFloat(form.interestRate);
    if (!form.interestRate || isNaN(rate) || rate < 0) {
      newErrors.interestRate = 'Interest rate must be 0 or greater';
    } else if (rate > 100) {
      newErrors.interestRate = 'Interest rate cannot exceed 100%';
    }

    const term = parseInt(form.termMonths);
    if (!form.termMonths || isNaN(term) || term < 1) {
      newErrors.termMonths = 'Term must be at least 1 month';
    } else if (term > 600) {
      newErrors.termMonths = 'Term cannot exceed 600 months';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // Convert user-friendly values to integers for the API
    const data: CreateLoanInput = {
      principalAmountMicros: parseAmount(form.principalAmount),
      interestRateBps: parseRate(form.interestRate),
      termMonths: parseInt(form.termMonths),
      status: form.status,
    };

    mutation.mutate(data);
  };

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [field]: e.target.value });
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

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

      <div className="bg-white rounded-lg shadow overflow-hidden max-w-xl">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Loan' : 'Create New Loan'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          <div>
            <label htmlFor="principalAmount" className="block text-sm font-medium text-gray-700">
              Principal Amount ($)
            </label>
            <input
              type="number"
              id="principalAmount"
              value={form.principalAmount}
              onChange={handleChange('principalAmount')}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2 border ${
                errors.principalAmount ? 'border-red-500' : 'border-gray-300'
              } focus:ring-blue-500 focus:border-blue-500`}
              placeholder="50000"
              step="0.01"
              min="0"
            />
            {errors.principalAmount && (
              <p className="mt-1 text-sm text-red-600">{errors.principalAmount}</p>
            )}
          </div>

          <div>
            <label htmlFor="interestRate" className="block text-sm font-medium text-gray-700">
              Interest Rate (% APR)
            </label>
            <input
              type="number"
              id="interestRate"
              value={form.interestRate}
              onChange={handleChange('interestRate')}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2 border ${
                errors.interestRate ? 'border-red-500' : 'border-gray-300'
              } focus:ring-blue-500 focus:border-blue-500`}
              placeholder="5.25"
              step="0.01"
              min="0"
              max="100"
            />
            {errors.interestRate && (
              <p className="mt-1 text-sm text-red-600">{errors.interestRate}</p>
            )}
          </div>

          <div>
            <label htmlFor="termMonths" className="block text-sm font-medium text-gray-700">
              Term (months)
            </label>
            <input
              type="number"
              id="termMonths"
              value={form.termMonths}
              onChange={handleChange('termMonths')}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2 border ${
                errors.termMonths ? 'border-red-500' : 'border-gray-300'
              } focus:ring-blue-500 focus:border-blue-500`}
              placeholder="60"
              min="1"
              max="600"
            />
            {errors.termMonths && (
              <p className="mt-1 text-sm text-red-600">{errors.termMonths}</p>
            )}
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              value={form.status}
              onChange={handleChange('status')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
            </select>
          </div>

          {mutation.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{mutation.error.message}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {mutation.isPending
                ? isEditing ? 'Saving...' : 'Creating...'
                : isEditing ? 'Save Changes' : 'Create Loan'}
            </button>
            <Link
              to="/loans"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
