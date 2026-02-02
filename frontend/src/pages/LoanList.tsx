import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { loansApi } from '../api/loans';
import { StatusBadge } from '../components/StatusBadge';
import { formatAmount, formatRate } from '../utils/format';
import type { Loan } from '../types/loan';

type SortField = 'borrower' | 'principal' | 'rate' | 'term' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

function SortableHeader({
  field,
  currentField,
  direction,
  onSort,
  children,
}: {
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
}) {
  const isActive = field === currentField;
  return (
    <th
      onClick={() => onSort(field)}
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
    >
      <div className="flex items-center gap-1">
        {children}
        <span className="text-gray-400">
          {isActive ? (direction === 'asc' ? '▲' : '▼') : '▲▼'}
        </span>
      </div>
    </th>
  );
}

export default function LoanList() {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: loans, isLoading, error } = useQuery({
    queryKey: ['loans'],
    queryFn: loansApi.getAll,
  });

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedLoans = useMemo(() => {
    if (!loans) return [];

    return [...loans].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'borrower':
          aVal = (a.borrower?.name || '').toLowerCase();
          bVal = (b.borrower?.name || '').toLowerCase();
          break;
        case 'principal':
          aVal = a.principalAmountMicros;
          bVal = b.principalAmountMicros;
          break;
        case 'rate':
          aVal = a.interestRateBps;
          bVal = b.interestRateBps;
          break;
        case 'term':
          aVal = a.termMonths;
          bVal = b.termMonths;
          break;
        case 'status':
          aVal = a.status.toLowerCase();
          bVal = b.status.toLowerCase();
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [loans, sortField, sortDirection]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading loans...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading loans: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Loans</h1>
        <Link
          to="/loans/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          New Loan
        </Link>
      </div>

      {sortedLoans.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No loans found. Create your first loan!</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader
                  field="borrower"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Borrower
                </SortableHeader>
                <SortableHeader
                  field="principal"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Principal
                </SortableHeader>
                <SortableHeader
                  field="rate"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Interest Rate
                </SortableHeader>
                <SortableHeader
                  field="term"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Term
                </SortableHeader>
                <SortableHeader
                  field="status"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Status
                </SortableHeader>
                <SortableHeader
                  field="createdAt"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Created
                </SortableHeader>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedLoans.map((loan) => (
                <tr
                  key={loan.id}
                  onClick={() => navigate(`/loans/${loan.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {loan.borrower?.name ?? 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {loan.borrower?.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatAmount(loan.principalAmountMicros)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatRate(loan.interestRateBps)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {loan.termMonths} months
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={loan.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(loan.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
