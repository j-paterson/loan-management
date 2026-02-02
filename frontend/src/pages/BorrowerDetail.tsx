import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { borrowersApi } from '../api/borrowers';
import { loansApi } from '../api/loans';
import { Card, CardHeader, CardBody, CardFooter, Button, ButtonLink, StatusBadge, Breadcrumbs, ConfirmModal } from '../components';
import type { BreadcrumbItem } from '../components';
import { formatAmount, formatRate } from '../utils/format';

export default function BorrowerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: borrower, isLoading, error } = useQuery({
    queryKey: ['borrowers', id],
    queryFn: () => borrowersApi.getById(id!),
    enabled: !!id,
  });

  const { data: allLoans = [] } = useQuery({
    queryKey: ['loans'],
    queryFn: loansApi.getAll,
  });

  const borrowerLoans = useMemo(() => {
    return allLoans.filter(loan => loan.borrowerId === id);
  }, [allLoans, id]);

  const deleteMutation = useMutation({
    mutationFn: () => borrowersApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowers'] });
      navigate('/borrowers');
    },
  });

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate();
  };

  // Calculate DTI ratio if both income and debt are available
  const dtiRatio = useMemo(() => {
    if (!borrower?.annualIncomeMicros || !borrower?.monthlyDebtMicros) return null;
    const monthlyIncome = borrower.annualIncomeMicros / 12;
    if (monthlyIncome === 0) return null;
    return (borrower.monthlyDebtMicros / monthlyIncome) * 100;
  }, [borrower?.annualIncomeMicros, borrower?.monthlyDebtMicros]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading borrower...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading borrower: {error.message}</p>
        <Link to="/borrowers" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to borrowers
        </Link>
      </div>
    );
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Borrowers', to: '/borrowers' },
    { label: borrower?.name || 'Borrower' },
  ];

  if (!borrower) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Borrower not found</p>
        <Link to="/borrowers" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to borrowers
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />

      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold text-gray-900">Borrower Details</h1>
        </CardHeader>

        <CardBody>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {borrower.name}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-lg text-gray-900">
                <a href={`mailto:${borrower.email}`} className="text-blue-600 hover:underline">
                  {borrower.email}
                </a>
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="mt-1 text-lg text-gray-900">
                {borrower.phone ? (
                  <a href={`tel:${borrower.phone}`} className="text-blue-600 hover:underline">
                    {borrower.phone}
                  </a>
                ) : (
                  <span className="text-gray-400 italic">Not provided</span>
                )}
              </dd>
            </div>

            {/* Credit Profile Section */}
            {(borrower.creditScore !== null || borrower.annualIncomeMicros !== null || borrower.monthlyDebtMicros !== null) && (
              <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Credit Profile</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {borrower.creditScore !== null && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Credit Score</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        {borrower.creditScore}
                        {borrower.creditScore >= 620 ? (
                          <span className="ml-2 text-xs font-normal text-green-600">Meets threshold</span>
                        ) : (
                          <span className="ml-2 text-xs font-normal text-red-600">Below 620</span>
                        )}
                      </dd>
                    </div>
                  )}
                  {borrower.annualIncomeMicros !== null && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Annual Income</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        {formatAmount(borrower.annualIncomeMicros)}
                      </dd>
                    </div>
                  )}
                  {borrower.monthlyDebtMicros !== null && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Monthly Debt</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        {formatAmount(borrower.monthlyDebtMicros)}
                      </dd>
                    </div>
                  )}
                  {dtiRatio !== null && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500">DTI Ratio</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        {dtiRatio.toFixed(1)}%
                        {dtiRatio <= 43 ? (
                          <span className="ml-2 text-xs font-normal text-green-600">Meets threshold</span>
                        ) : (
                          <span className="ml-2 text-xs font-normal text-red-600">Above 43%</span>
                        )}
                      </dd>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-lg text-gray-900">
                {new Date(borrower.createdAt).toLocaleString()}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-lg text-gray-900">
                {new Date(borrower.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>

          {/* Loans Section */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Loans</h2>

            {borrowerLoans.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Principal
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Term
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {borrowerLoans.map((loan) => (
                      <tr
                        key={loan.id}
                        onClick={() => navigate(`/loans/${loan.id}?from=borrower&borrowerId=${id}`)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatAmount(loan.principalAmountMicros)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatRate(loan.interestRateBps)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {loan.termMonths} months
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={loan.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No loans for this borrower.</p>
            )}
          </div>
        </CardBody>

        <CardFooter>
          <div className="flex gap-3">
            <ButtonLink to={`/borrowers/${borrower.id}/edit`}>
              Edit Borrower
            </ButtonLink>
            <Button
              variant="danger"
              onClick={handleDeleteClick}
              isLoading={deleteMutation.isPending}
              loadingText="Deleting..."
            >
              Delete Borrower
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Borrower"
        message="Are you sure you want to delete this borrower? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteModal(false)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
