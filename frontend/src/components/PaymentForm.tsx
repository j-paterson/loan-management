import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../api/payments';
import { parseAmount } from '../lib/money';
import { FormField, inputStyles, Button } from './index';
import type { CreatePaymentInput } from '../types/payment';

interface PaymentFormProps {
  loanId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

interface FormData {
  amount: string;
  paidAt: string;
}

interface FormErrors {
  amount?: string;
  paidAt?: string;
}

export function PaymentForm({ loanId, onCancel, onSuccess }: PaymentFormProps) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<FormData>({
    amount: '',
    paidAt: today,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const createMutation = useMutation({
    mutationFn: (data: CreatePaymentInput) => paymentsApi.create(loanId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['payments', loanId] });
      queryClient.invalidateQueries({ queryKey: ['events', loanId] });
      onSuccess();
    },
  });

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }

    if (!form.paidAt) {
      newErrors.paidAt = 'Payment date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    createMutation.mutate({
      amountMicros: parseAmount(form.amount),
      paidAt: form.paidAt,
    });
  };

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg space-y-4">
      <h3 className="font-medium text-gray-900">Record Payment</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Amount ($)" htmlFor="paymentAmount" error={errors.amount} required>
          <input
            type="number"
            id="paymentAmount"
            value={form.amount}
            onChange={handleChange('amount')}
            className={inputStyles(!!errors.amount)}
            placeholder="2500.00"
            step="0.01"
            min="0.01"
          />
        </FormField>

        <FormField label="Payment Date" htmlFor="paidAt" error={errors.paidAt} required>
          <input
            type="date"
            id="paidAt"
            value={form.paidAt}
            onChange={handleChange('paidAt')}
            className={inputStyles(!!errors.paidAt)}
          />
        </FormField>
      </div>

      {createMutation.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{createMutation.error.message}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          isLoading={createMutation.isPending}
          loadingText="Recording..."
        >
          Record Payment
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
