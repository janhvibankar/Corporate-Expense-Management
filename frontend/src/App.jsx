import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';

// Employee
import EmployeeDashboard from './pages/employee/Dashboard';
import EmployeeExpenses from './pages/employee/Expenses';
import SubmitExpense from './pages/employee/SubmitExpense';

// Manager
import ManagerDashboard from './pages/manager/Dashboard';
import ManagerApprovals from './pages/manager/Approvals';
import ManagerHistory from './pages/manager/History';

// Finance
import FinanceDashboard from './pages/finance/Dashboard';
import FinanceReimbursements from './pages/finance/Reimbursements';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import AdminExpenses from './pages/admin/Expenses';
import AdminUsers from './pages/admin/Users';

function RootRedirect() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const roleDashboardMap = {
    employee: '/employee/dashboard',
    manager: '/manager/dashboard',
    finance: '/finance/dashboard',
    admin: '/admin/dashboard'
  };

  return <Navigate to={roleDashboardMap[user.role] || '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Employee Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
            <Route element={<Layout />}>
              <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
              <Route path="/employee/expenses" element={<EmployeeExpenses />} />
              <Route path="/employee/submit" element={<SubmitExpense />} />
            </Route>
          </Route>

          {/* Manager Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
            <Route element={<Layout />}>
              <Route path="/manager/dashboard" element={<ManagerDashboard />} />
              <Route path="/manager/approvals" element={<ManagerApprovals />} />
              <Route path="/manager/history" element={<ManagerHistory />} />
            </Route>
          </Route>

          {/* Finance Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['finance']} />}>
            <Route element={<Layout />}>
              <Route path="/finance/dashboard" element={<FinanceDashboard />} />
              <Route path="/finance/reimbursements" element={<FinanceReimbursements />} />
            </Route>
          </Route>

          {/* Admin Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<Layout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/expenses" element={<AdminExpenses />} />
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
