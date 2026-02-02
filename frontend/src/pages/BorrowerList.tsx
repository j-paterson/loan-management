import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { borrowersApi } from '../api/borrowers';
import type { Borrower } from '../types/borrower';

type SortField = 'name' | 'email' | 'phone' | 'createdAt';
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
      className={`px-6 py-3 text-left text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${
        isActive ? 'font-bold text-gray-900' : 'font-medium text-gray-500'
      }`}
    >
      <div className="flex items-center gap-2">
        {children}
        <div className="flex flex-col text-[10px] leading-none">
          <span className={isActive && direction === 'asc' ? 'text-gray-900' : 'text-gray-300'}>
            ▲
          </span>
          <span className={isActive && direction === 'desc' ? 'text-gray-900' : 'text-gray-300'}>
            ▼
          </span>
        </div>
      </div>
    </th>
  );
}

export default function BorrowerList() {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data: borrowers, isLoading, error } = useQuery({
    queryKey: ['borrowers'],
    queryFn: borrowersApi.getAll,
  });

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedBorrowers = useMemo(() => {
    if (!borrowers) return [];

    return [...borrowers].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'email':
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case 'phone':
          aVal = (a.phone || '').toLowerCase();
          bVal = (b.phone || '').toLowerCase();
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
  }, [borrowers, sortField, sortDirection]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading borrowers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading borrowers: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Borrowers</h1>
        <Link
          to="/borrowers/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          New Borrower
        </Link>
      </div>

      {sortedBorrowers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No borrowers found. Create your first borrower!</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader
                  field="name"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Name
                </SortableHeader>
                <SortableHeader
                  field="email"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Email
                </SortableHeader>
                <SortableHeader
                  field="phone"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  Phone
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
              {sortedBorrowers.map((borrower) => (
                <tr
                  key={borrower.id}
                  onClick={() => navigate(`/borrowers/${borrower.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {borrower.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {borrower.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {borrower.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(borrower.createdAt).toLocaleDateString()}
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
