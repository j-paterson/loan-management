import { Link } from 'react-router-dom';
import type { Borrower } from '@loan-management/shared';

interface BorrowerCardProps {
  borrower: Borrower | null;
  borrowerId: string;
}

export function BorrowerCard({ borrower, borrowerId }: BorrowerCardProps) {
  return (
    <div className="md:col-span-2">
      <dt className="text-sm font-medium text-gray-500">Borrower</dt>
      <dd className="mt-1 text-base text-gray-900">
        {borrower ? (
          <Link
            to={`/borrowers/${borrowerId}`}
            className="block p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-gray-900">{borrower.name}</span>
                <span className="text-sm text-gray-600">{borrower.email}</span>
                {borrower.phone && (
                  <span className="text-sm text-gray-600">{borrower.phone}</span>
                )}
              </div>
              <span className="text-blue-600 text-sm font-medium">View Profile →</span>
            </div>
          </Link>
        ) : (
          <span className="text-gray-400 italic">No borrower assigned</span>
        )}
      </dd>
    </div>
  );
}
