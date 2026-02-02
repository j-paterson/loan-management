import { useState, useRef, useEffect } from 'react';
import { inputStyles } from './FormField';
import type { Borrower } from '../types/borrower';

interface NewBorrowerData {
  name: string;
  email: string;
  phone: string;
}

interface BorrowerSearchProps {
  borrowers: Borrower[];
  selectedBorrowerId?: string;
  onSelectBorrower: (borrowerId: string) => void;
  onCreateBorrower: (data: NewBorrowerData) => void;
  error?: string;
  disabled?: boolean;
  allowCreate?: boolean;
}

export function BorrowerSearch({
  borrowers,
  selectedBorrowerId,
  onSelectBorrower,
  onCreateBorrower,
  error,
  disabled = false,
  allowCreate = true,
}: BorrowerSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newBorrowerEmail, setNewBorrowerEmail] = useState('');
  const [newBorrowerPhone, setNewBorrowerPhone] = useState('');
  const [emailError, setEmailError] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedBorrower = borrowers.find(b => b.id === selectedBorrowerId);

  const filteredBorrowers = searchQuery.trim()
    ? borrowers.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : borrowers;

  const hasExactMatch = borrowers.some(
    b => b.name.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedBorrowerId && selectedBorrower) {
      setSearchQuery('');
      setIsCreatingNew(false);
    }
  }, [selectedBorrowerId, selectedBorrower]);

  const handleSelectBorrower = (borrower: Borrower) => {
    onSelectBorrower(borrower.id);
    setSearchQuery('');
    setIsOpen(false);
    setIsCreatingNew(false);
  };

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setIsOpen(false);
    setNewBorrowerEmail('');
    setNewBorrowerPhone('');
    setEmailError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && allowCreate && searchQuery.trim() && !hasExactMatch) {
      e.preventDefault();
      handleStartCreate();
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      if (isCreatingNew) {
        setIsCreatingNew(false);
        setSearchQuery('');
      }
    }
  };

  const handleCancelCreate = () => {
    setIsCreatingNew(false);
    setSearchQuery('');
    setNewBorrowerEmail('');
    setNewBorrowerPhone('');
    setEmailError('');
  };

  const handleClearSelection = () => {
    onSelectBorrower('');
    setSearchQuery('');
    inputRef.current?.focus();
  };

  // Show selected borrower if found
  if (selectedBorrowerId && selectedBorrower && !isCreatingNew) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">{selectedBorrower.name}</p>
            <p className="text-sm text-gray-600">{selectedBorrower.email}</p>
          </div>
          {!disabled && (
            <button type="button" onClick={handleClearSelection} className="text-sm text-blue-600 hover:text-blue-800">
              Change
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show warning for orphaned borrower (ID exists but borrower was deleted)
  if (selectedBorrowerId && !selectedBorrower && !isCreatingNew) {
    return (
      <div className="space-y-3">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="font-medium text-amber-800">Borrower no longer available</p>
          <p className="text-sm text-amber-700 mt-1">
            The borrower assigned to this loan has been deleted. Please select a new borrower.
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={handleClearSelection}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Select New Borrower
          </button>
        )}
      </div>
    );
  }

  if (isCreatingNew) {
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newBorrowerEmail);
    const isFormValid = searchQuery.trim() && isEmailValid;

    // Auto-stage the borrower data when form is valid
    const handleFieldChange = (field: 'name' | 'email' | 'phone', value: string) => {
      if (field === 'name') setSearchQuery(value);
      if (field === 'email') {
        setNewBorrowerEmail(value);
        if (emailError) setEmailError('');
      }
      if (field === 'phone') setNewBorrowerPhone(value);

      // Check if form will be valid after this change
      const newName = field === 'name' ? value : searchQuery;
      const newEmail = field === 'email' ? value : newBorrowerEmail;
      const newPhone = field === 'phone' ? value : newBorrowerPhone;
      const willBeValid = newName.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail);

      if (willBeValid) {
        onCreateBorrower({
          name: newName.trim(),
          email: newEmail.trim(),
          phone: newPhone.trim(),
        });
      }
    };

    return (
      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">New Borrower</p>
          <button type="button" onClick={handleCancelCreate} className="text-sm text-gray-500 hover:text-gray-700">
            Cancel
          </button>
        </div>
        <div>
          <label htmlFor="newBorrowerName" className="block text-sm font-medium text-gray-700">Name</label>
          <input type="text" id="newBorrowerName" value={searchQuery}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            className={inputStyles(false)} placeholder="John Doe" />
        </div>
        <div>
          <label htmlFor="newBorrowerEmail" className="block text-sm font-medium text-gray-700">
            Email <span className="text-red-500">*</span>
          </label>
          <input type="email" id="newBorrowerEmail" value={newBorrowerEmail}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            className={inputStyles(!!emailError)} placeholder="john@example.com" />
          {emailError && <p className="mt-1 text-sm text-red-600">{emailError}</p>}
        </div>
        <div>
          <label htmlFor="newBorrowerPhone" className="block text-sm font-medium text-gray-700">Phone (optional)</label>
          <input type="tel" id="newBorrowerPhone" value={newBorrowerPhone}
            onChange={(e) => handleFieldChange('phone', e.target.value)} className={inputStyles(false)} placeholder="(555) 123-4567" />
        </div>
        {isFormValid && (
          <p className="text-sm text-green-600">
            New borrower will be created when you save the loan.
          </p>
        )}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input ref={inputRef} type="text" value={searchQuery}
        onChange={(e) => { setSearchQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)} onKeyDown={handleKeyDown}
        className={inputStyles(!!error)} placeholder="Search borrowers by name or email..." disabled={disabled} />
      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
          {filteredBorrowers.map((borrower) => (
            <button key={borrower.id} type="button" onClick={() => handleSelectBorrower(borrower)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="font-medium text-gray-900 truncate">{borrower.name}</span>
              <span className="text-sm text-gray-500 truncate ml-2">{borrower.email}</span>
            </button>
          ))}
          {filteredBorrowers.length === 0 && !allowCreate && (
            <p className="px-3 py-2 text-gray-500 text-sm">
              {searchQuery.trim() ? 'No borrowers found' : 'Type to search'}
            </p>
          )}
          {allowCreate && !hasExactMatch && (
            <button type="button" onClick={handleStartCreate}
              className={`w-full px-3 py-2 text-left hover:bg-blue-50 text-blue-600 text-sm ${filteredBorrowers.length > 0 ? 'border-t border-gray-200' : ''}`}>
              + Create new borrower{searchQuery.trim() ? ` "${searchQuery.trim()}"` : ''}
            </button>
          )}
        </div>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
