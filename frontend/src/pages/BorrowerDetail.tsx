import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { borrowersApi } from '../api/borrowers';
import { loansApi } from '../api/loans';
import { Card, CardHeader, CardBody, CardFooter, Button, ButtonLink, StatusBadge, Breadcrumbs } from '../components';
import type { BreadcrumbItem } from '../components';
import { formatAmount, formatRate } from '../utils/format';

export default function BorrowerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this borrower?')) {
      deleteMutation.mutate();
    }
  };

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
              onClick={handleDelete}
              isLoading={deleteMutation.isPending}
              loadingText="Deleting..."
            >
              Delete Borrower
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
