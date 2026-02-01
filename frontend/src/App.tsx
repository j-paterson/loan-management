import { Routes, Route, Navigate } from 'react-router-dom';
import LoanList from './pages/LoanList';
import LoanDetail from './pages/LoanDetail';
import LoanForm from './pages/LoanForm';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Loan Management</h1>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/loans" replace />} />
          <Route path="/loans" element={<LoanList />} />
          <Route path="/loans/new" element={<LoanForm />} />
          <Route path="/loans/:id" element={<LoanDetail />} />
          <Route path="/loans/:id/edit" element={<LoanForm />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
