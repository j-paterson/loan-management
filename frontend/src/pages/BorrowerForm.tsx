import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { borrowersApi } from '../api/borrowers';
import { Card, CardHeader, CardBody, FormField, inputStyles, Button, ButtonLink } from '../components';
import { parseAmount, MICROS_PER_DOLLAR } from '../lib/money';
import { CREDIT_SCORE_MIN, CREDIT_SCORE_MAX } from '../lib/validation';
import type { CreateBorrowerInput } from '../types/borrower';

interface FormData {
  name: string;
  email: string;
  phone: string;
  creditScore: string;
  annualIncome: string;
  monthlyDebt: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  creditScore?: string;
  annualIncome?: string;
  monthlyDebt?: string;
}

export default function BorrowerForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    creditScore: '',
    annualIncome: '',
    monthlyDebt: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const { data: existingBorrower, isLoading: isLoadingBorrower } = useQuery({
    queryKey: ['borrowers', id],
    queryFn: () => borrowersApi.getById(id!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingBorrower) {
      setForm({
        name: existingBorrower.name,
        email: existingBorrower.email,
        phone: existingBorrower.phone ?? '',
        creditScore: existingBorrower.creditScore?.toString() ?? '',
        annualIncome: existingBorrower.annualIncomeMicros
          ? (existingBorrower.annualIncomeMicros / MICROS_PER_DOLLAR).toString()
          : '',
        monthlyDebt: existingBorrower.monthlyDebtMicros
          ? (existingBorrower.monthlyDebtMicros / MICROS_PER_DOLLAR).toString()
          : '',
      });
    }
  }, [existingBorrower]);

  const createMutation = useMutation({
    mutationFn: borrowersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowers'] });
      navigate('/borrowers');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateBorrowerInput) => borrowersApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowers'] });
      // Invalidate all transitions since borrower changes affect guard conditions
      queryClient.invalidateQueries({ queryKey: ['transitions'] });
      navigate(`/borrowers/${id}`);
    },
  });

  const mutation = isEditing ? updateMutation : createMutation;

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (form.creditScore) {
      const score = parseInt(form.creditScore);
      if (isNaN(score) || score < CREDIT_SCORE_MIN || score > CREDIT_SCORE_MAX) {
        newErrors.creditScore = `Credit score must be between ${CREDIT_SCORE_MIN} and ${CREDIT_SCORE_MAX}`;
      }
    }

    if (form.annualIncome) {
      const income = parseFloat(form.annualIncome);
      if (isNaN(income) || income < 0) {
        newErrors.annualIncome = 'Annual income must be a positive number';
      }
    }

    if (form.monthlyDebt) {
      const debt = parseFloat(form.monthlyDebt);
      if (isNaN(debt) || debt < 0) {
        newErrors.monthlyDebt = 'Monthly debt must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const data: CreateBorrowerInput = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      creditScore: form.creditScore ? parseInt(form.creditScore) : null,
      annualIncomeMicros: form.annualIncome ? parseAmount(form.annualIncome) : null,
      monthlyDebtMicros: form.monthlyDebt ? parseAmount(form.monthlyDebt) : null,
    };

    mutation.mutate(data);
  };

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field as keyof FormErrors]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  if (isEditing && isLoadingBorrower) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading borrower...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/borrowers" className="text-blue-600 hover:underline text-sm">
          &larr; Back to borrowers
        </Link>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Borrower' : 'Create New Borrower'}
          </h1>
        </CardHeader>

        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField label="Name" htmlFor="name" error={errors.name}>
              <input
                type="text"
                id="name"
                value={form.name}
                onChange={handleChange('name')}
                className={inputStyles(!!errors.name)}
                placeholder="John Doe"
              />
            </FormField>

            <FormField label="Email" htmlFor="email" error={errors.email}>
              <input
                type="email"
                id="email"
                value={form.email}
                onChange={handleChange('email')}
                className={inputStyles(!!errors.email)}
                placeholder="john@example.com"
              />
            </FormField>

            <FormField label="Phone (optional)" htmlFor="phone">
              <input
                type="tel"
                id="phone"
                value={form.phone}
                onChange={handleChange('phone')}
                className={inputStyles(false)}
                placeholder="(555) 123-4567"
              />
            </FormField>

            {/* Credit Profile Section */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">
                Credit Profile <span className="text-gray-400 font-normal">(for underwriting)</span>
              </h3>

              <div className="space-y-4">
                <FormField label="Credit Score (optional)" htmlFor="creditScore" error={errors.creditScore}>
                  <input
                    type="number"
                    id="creditScore"
                    value={form.creditScore}
                    onChange={handleChange('creditScore')}
                    className={inputStyles(!!errors.creditScore)}
                    placeholder="720"
                    min={CREDIT_SCORE_MIN}
                    max={CREDIT_SCORE_MAX}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Score between {CREDIT_SCORE_MIN}-{CREDIT_SCORE_MAX}. Minimum {620} required for loan approval.
                  </p>
                </FormField>

                <FormField label="Annual Income (optional)" htmlFor="annualIncome" error={errors.annualIncome}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      id="annualIncome"
                      value={form.annualIncome}
                      onChange={handleChange('annualIncome')}
                      className={`${inputStyles(!!errors.annualIncome)} pl-7`}
                      placeholder="85000"
                      min="0"
                      step="1000"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Used to calculate debt-to-income ratio.</p>
                </FormField>

                <FormField label="Monthly Debt (optional)" htmlFor="monthlyDebt" error={errors.monthlyDebt}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      id="monthlyDebt"
                      value={form.monthlyDebt}
                      onChange={handleChange('monthlyDebt')}
                      className={`${inputStyles(!!errors.monthlyDebt)} pl-7`}
                      placeholder="1500"
                      min="0"
                      step="100"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Existing monthly debt payments (excluding this loan).</p>
                </FormField>
              </div>
            </div>

            {mutation.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{mutation.error.message}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="submit"
                isLoading={mutation.isPending}
                loadingText={isEditing ? 'Saving...' : 'Creating...'}
              >
                {isEditing ? 'Save Changes' : 'Create Borrower'}
              </Button>
              <ButtonLink to="/borrowers" variant="secondary">
                Cancel
              </ButtonLink>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
