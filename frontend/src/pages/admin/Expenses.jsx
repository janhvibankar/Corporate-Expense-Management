import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import ExpenseTable from '../../components/ExpenseTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import { FileSpreadsheet, Search, RefreshCw, Filter } from 'lucide-react';

export default function AdminExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [approvingExpense, setApprovingExpense] = useState(null);
  const [rejectingExpense, setRejectingExpense] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      let queryParams = [];
      if (statusFilter !== 'All') queryParams.push(`status=${statusFilter}`);
      if (categoryFilter !== 'All') queryParams.push(`category=${categoryFilter}`);

      const queryString = queryParams.length ? `?${queryParams.join('&')}` : '';
      const res = await api.get(`/expenses${queryString}`);

      if (res.data.success) {
        setExpenses(res.data.expenses);
      }
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'Failed to fetch expenses' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleApprove = async () => {
    if (!approvingExpense) return;
    try {
      setActionLoading(true);
      await api.put(`/expenses/${approvingExpense._id}/approve`, {
        note: 'Admin escalation approval'
      });
      setAlertMsg({ type: 'success', text: `Approved '${approvingExpense.title}' successfully.` });
      setApprovingExpense(null);
      fetchExpenses();
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'Approval failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reason) => {
    if (!rejectingExpense) return;
    try {
      setActionLoading(true);
      await api.put(`/expenses/${rejectingExpense._id}/reject`, {
        reason
      });
      setAlertMsg({ type: 'success', text: `Rejected '${rejectingExpense.title}'.` });
      setRejectingExpense(null);
      fetchExpenses();
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'Rejection failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredExpenses = expenses.filter((exp) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      exp.title.toLowerCase().includes(term) ||
      (exp.employeeId?.name && exp.employeeId.name.toLowerCase().includes(term)) ||
      (exp.description && exp.description.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Organization Master Expense Records</h2>
        <p className="text-xs text-slate-400 mt-1">
          Complete centralized ledger of all corporate claims across all departments and statuses
        </p>
      </div>

      {alertMsg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between animate-fade-in ${
            alertMsg.type === 'error'
              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
          }`}
        >
          <span>{alertMsg.text}</span>
          <button onClick={() => setAlertMsg(null)} className="text-xs font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, employee, notes..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {['All', 'PENDING', 'APPROVED', 'REJECTED', 'REIMBURSED'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {['All', 'Travel', 'Food', 'Accommodation', 'Office', 'Other'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchExpenses}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <ExpenseTable
        expenses={filteredExpenses}
        loading={loading}
        showEmployee={true}
        role="admin"
        onApprove={(exp) => setApprovingExpense(exp)}
        onReject={(exp) => setRejectingExpense(exp)}
        emptyMessage="No corporate expense records match the query."
      />

      {/* Admin Approve Dialog */}
      <ConfirmDialog
        isOpen={!!approvingExpense}
        title="Admin Escalation Approval"
        message={`Approve '${approvingExpense?.title}' for ₹${Number(approvingExpense?.amount).toFixed(2)} submitted by ${approvingExpense?.employeeId?.name}?`}
        confirmText="Approve"
        type="success"
        loading={actionLoading}
        onConfirm={handleApprove}
        onClose={() => setApprovingExpense(null)}
      />

      {/* Admin Reject Dialog */}
      <ConfirmDialog
        isOpen={!!rejectingExpense}
        title="Admin Escalation Rejection"
        message={`Reject '${rejectingExpense?.title}' submitted by ${rejectingExpense?.employeeId?.name}?`}
        confirmText="Reject"
        type="danger"
        requiresReason={true}
        reasonPlaceholder="Specify rejection policy reason (min 5 characters)..."
        loading={actionLoading}
        onConfirm={handleReject}
        onClose={() => setRejectingExpense(null)}
      />
    </div>
  );
}
