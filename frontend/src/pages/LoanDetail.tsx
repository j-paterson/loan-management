import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { loansApi } from '../api/loans';
import type { TransitionOption } from '../api/loans';
import { borrowersApi } from '../api/borrowers';
import { eventsApi } from '../api/events';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  ButtonLink,
  Breadcrumbs,
  ConfirmModal,
  LoanBalanceCard,
  LoanStatusTransition,
  BorrowerCard,
  ActivityTimeline,
} from '../components';
import type { BreadcrumbItem } from '../components';
import { formatAmount, formatRate } from '../utils/format';
import type { LoanStatus } from '@loan-management/shared';

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Check if we navigated from a borrower page
  const fromBorrower = searchParams.get('from') === 'borrower';
  const borrowerIdParam = searchParams.get('borrowerId');

  const { data: loan, isLoading, error } = useQuery({
    queryKey: ['loans', id],
    queryFn: () => loansApi.getById(id!),
    enabled: !!id,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsApi.getByLoanId(id!),
    enabled: !!id,
  });

  const { data: transitionsData } = useQuery({
    queryKey: ['transitions', id],
    queryFn: () => loansApi.getAvailableTransitions(id!),
    enabled: !!id,
  });

  // Fetch borrower data if we came from a borrower page
  const { data: sourceBorrower } = useQuery({
    queryKey: ['borrowers', borrowerIdParam],
    queryFn: () => borrowersApi.getById(borrowerIdParam!),
    enabled: fromBorrower && !!borrowerIdParam,
  });

  // Build breadcrumbs based on navigation context
  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    if (fromBorrower && sourceBorrower) {
      return [
        { label: 'Borrowers', to: '/borrowers' },
        { label: sourceBorrower.name, to: `/borrowers/${borrowerIdParam}` },
        { label: 'Loan Details' },
      ];
    }
    return [
      { label: 'Loans', to: '/loans' },
      { label: 'Loan Details' },
    ];
  }, [fromBorrower, sourceBorrower, borrowerIdParam]);

  const deleteMutation = useMutation({
    mutationFn: () => loansApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      navigate('/loans');
    },
  });

  // Get transitions from API (includes guard check results)
  const transitions: TransitionOption[] = transitionsData?.transitions || [];

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
      <Breadcrumbs items={breadcrumbs} />

      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold text-gray-900">Loan Details</h1>
        </CardHeader>

        <CardBody>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LoanBalanceCard
              loanId={loan.id}
              remainingBalanceMicros={loan.remainingBalanceMicros}
              principalAmountMicros={loan.principalAmountMicros}
              status={loan.status as LoanStatus}
            />

            <div>
              <dt className="text-sm font-medium text-gray-500">Principal Amount</dt>
              <dd className="mt-1 text-xl font-semibold text-gray-900">
                {formatAmount(loan.principalAmountMicros)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Interest Rate (APR)</dt>
              <dd className="mt-1 text-xl font-semibold text-gray-900">
                {formatRate(loan.interestRateBps)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Term</dt>
              <dd className="mt-1 text-base text-gray-900">{loan.termMonths} months</dd>
            </div>

            <LoanStatusTransition
              loanId={loan.id}
              currentStatus={loan.status as LoanStatus}
              transitions={transitions}
            />

            <BorrowerCard
              borrower={loan.borrower}
              borrowerId={loan.borrowerId}
            />
          </dl>

          <ActivityTimeline events={events} />
        </CardBody>

        <CardFooter>
          <div className="flex gap-3">
            <ButtonLink to={`/loans/${loan.id}/edit`}>
              Edit Loan
            </ButtonLink>
            <Button
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
              isLoading={deleteMutation.isPending}
              loadingText="Deleting..."
            >
              Delete Loan
            </Button>
          </div>
        </CardFooter>
      </Card>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Loan"
        message="Are you sure you want to delete this loan? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDeleteModal(false)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
