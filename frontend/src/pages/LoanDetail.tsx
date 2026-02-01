import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { loansApi } from '../api/loans';
import type { Loan } from '../types/loan';

function StatusBadge({ status }: { status: Loan['status'] }) {
  const colors = {
    DRAFT: 'bg-gray-100 text-gray-800',
    ACTIVE: 'bg-green-100 text-green-800',
    CLOSED: 'bg-blue-100 text-blue-800',
    ARCHIVED: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status]}`}>
      {status}
    </span>
  );
}

function formatCurrency(amount: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(parseFloat(amount));
}

function formatPercent(rate: string): string {
  return `${(parseFloat(rate) * 100).toFixed(2)}%`;
}

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: loan, isLoading, error } = useQuery({
    queryKey: ['loans', id],
    queryFn: () => loansApi.getById(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => loansApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      navigate('/loans');
    },
  });

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this loan?')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading loan...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading loan: {error.message}</p>
        <Link to="/loans" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to loans
        </Link>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loan not found</p>
        <Link to="/loans" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to loans
        </Link>
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Loan Details</h1>
          <StatusBadge status={loan.status} />
        </div>

        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Principal Amount</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {formatCurrency(loan.principalAmount)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Interest Rate (APR)</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {formatPercent(loan.interestRate)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Term</dt>
              <dd className="mt-1 text-lg text-gray-900">{loan.termMonths} months</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-lg text-gray-900">{loan.status}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-lg text-gray-900">
                {new Date(loan.createdAt).toLocaleString()}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-lg text-gray-900">
                {new Date(loan.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
          <Link
            to={`/loans/${loan.id}/edit`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Edit Loan
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Loan'}
          </button>
        </div>
      </div>
    </div>
  );
}
