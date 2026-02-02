import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { borrowersApi } from '../api/borrowers';
import { Card, CardHeader, CardBody, FormField, inputStyles, Button, ButtonLink } from '../components';
import type { CreateBorrowerInput } from '../types/borrower';

interface FormData {
  name: string;
  email: string;
  phone: string;
}

interface FormErrors {
  name?: string;
  email?: string;
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
      navigate('/borrowers');
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    mutation.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
    });
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
