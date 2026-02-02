import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import LoanList from './pages/LoanList';
import LoanDetail from './pages/LoanDetail';
import LoanForm from './pages/LoanForm';
import BorrowerList from './pages/BorrowerList';
import BorrowerForm from './pages/BorrowerForm';

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Loan Management</h1>
          <div className="flex gap-2">
            <NavLink to="/loans">Loans</NavLink>
            <NavLink to="/borrowers">Borrowers</NavLink>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/loans" replace />} />
          <Route path="/loans" element={<LoanList />} />
          <Route path="/loans/new" element={<LoanForm />} />
          <Route path="/loans/:id" element={<LoanDetail />} />
          <Route path="/loans/:id/edit" element={<LoanForm />} />
          <Route path="/borrowers" element={<BorrowerList />} />
          <Route path="/borrowers/new" element={<BorrowerForm />} />
          <Route path="/borrowers/:id/edit" element={<BorrowerForm />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
