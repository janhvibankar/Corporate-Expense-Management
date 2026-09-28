import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import FinanceDashboard from './pages/finance/FinanceDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/employee" element={<EmployeeDashboard />} />
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/finance" element={<FinanceDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route
            path="*"
            element={
              <div className="p-8 text-center">
                <h1 className="text-3xl font-extrabold text-white mb-2">Corporate Expense Management</h1>
                <p className="text-slate-400">Welcome to the Expense Management System. Backend is fully configured.</p>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
