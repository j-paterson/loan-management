import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { borrowersApi } from '../api/borrowers';
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

    const data: CreateBorrowerInput = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
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

      <div className="bg-white rounded-lg shadow overflow-hidden max-w-xl">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Borrower' : 'Create New Borrower'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={form.name}
              onChange={handleChange('name')}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2 border ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              } focus:ring-blue-500 focus:border-blue-500`}
              placeholder="John Doe"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={form.email}
              onChange={handleChange('email')}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2 border ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              } focus:ring-blue-500 focus:border-blue-500`}
              placeholder="john@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone (optional)
            </label>
            <input
              type="tel"
              id="phone"
              value={form.phone}
              onChange={handleChange('phone')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
              placeholder="(555) 123-4567"
            />
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
                : isEditing ? 'Save Changes' : 'Create Borrower'}
            </button>
            <Link
              to="/borrowers"
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
