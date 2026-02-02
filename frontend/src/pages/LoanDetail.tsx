import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { loansApi } from '../api/loans';
import { paymentsApi } from '../api/payments';
import { Card, CardHeader, CardBody, CardFooter, StatusBadge, Button, ButtonLink, PaymentForm } from '../components';
import { formatAmount, formatRate } from '../utils/format';

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const { data: loan, isLoading, error } = useQuery({
    queryKey: ['loans', id],
    queryFn: () => loansApi.getById(id!),
    enabled: !!id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', id],
    queryFn: () => paymentsApi.getByLoanId(id!),
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

      <Card>
        <CardHeader actions={<StatusBadge status={loan.status} size="md" />}>
          <h1 className="text-2xl font-bold text-gray-900">Loan Details</h1>
        </CardHeader>

        <CardBody>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg">
              <dt className="text-sm font-medium text-blue-700">Remaining Balance</dt>
              <dd className="mt-1 text-3xl font-bold text-blue-900">
                {formatAmount(loan.remainingBalanceMicros)}
              </dd>
              <p className="text-sm text-blue-600 mt-1">
                of {formatAmount(loan.principalAmountMicros)} principal
              </p>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Principal Amount</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {formatAmount(loan.principalAmountMicros)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Interest Rate (APR)</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {formatRate(loan.interestRateBps)}
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

            <div className="md:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Borrower</dt>
              <dd className="mt-1 text-lg text-gray-900">
                {loan.borrower ? (
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{loan.borrower.name}</span>
                    <span className="text-sm text-gray-600">{loan.borrower.email}</span>
                    {loan.borrower.phone && (
                      <span className="text-sm text-gray-600">{loan.borrower.phone}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400 italic">No borrower assigned</span>
                )}
              </dd>
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

          {/* Payment Section */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Payments</h2>
              {!showPaymentForm && (
                <Button onClick={() => setShowPaymentForm(true)}>
                  Record Payment
                </Button>
              )}
            </div>

            {showPaymentForm && (
              <div className="mb-6">
                <PaymentForm
                  loanId={loan.id}
                  onCancel={() => setShowPaymentForm(false)}
                  onSuccess={() => setShowPaymentForm(false)}
                />
              </div>
            )}

            {payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {new Date(payment.paidAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatAmount(payment.amountMicros)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No payments recorded yet.</p>
            )}
          </div>
        </CardBody>

        <CardFooter>
          <div className="flex gap-3">
            <ButtonLink to={`/loans/${loan.id}/edit`}>
              Edit Loan
            </ButtonLink>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteMutation.isPending}
              loadingText="Deleting..."
            >
              Delete Loan
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
