import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import ExpenseTable from '../../components/ExpenseTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Clock, Search, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ManagerApprovals() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [approvingExpense, setApprovingExpense] = useState(null);
  const [rejectingExpense, setRejectingExpense] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/expenses/pending');
      if (res.data.success) {
        setExpenses(res.data.expenses);
      }
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'Failed to load pending approvals' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = async () => {
    if (!approvingExpense) return;
    try {
      setActionLoading(true);
      await api.put(`/expenses/${approvingExpense._id}/approve`, {
        note: 'Approved during manager review session'
      });
      setAlertMsg({ type: 'success', text: `Approved '${approvingExpense.title}' successfully.` });
      setApprovingExpense(null);
      fetchPending();
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
      fetchPending();
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'Rejection failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredExpenses = expenses.filter((exp) => {
    const matchesCategory = categoryFilter === 'All' || exp.category === categoryFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm.trim() ||
      exp.title.toLowerCase().includes(term) ||
      (exp.employeeId?.name && exp.employeeId.name.toLowerCase().includes(term)) ||
      (exp.description && exp.description.toLowerCase().includes(term));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Pending Expense Approvals</h2>
        <p className="text-xs text-slate-400 mt-1">
          Review, approve, or reject reimbursement claims submitted by your team members
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

      {/* Filter bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by employee, title, or keyword..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
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
            onClick={fetchPending}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Refresh List"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Approvals Table */}
      <ExpenseTable
        expenses={filteredExpenses}
        loading={loading}
        showEmployee={true}
        role="manager"
        onApprove={(exp) => setApprovingExpense(exp)}
        onReject={(exp) => setRejectingExpense(exp)}
        emptyMessage="No pending reimbursement requests require approval."
      />

      {/* Approve Dialog */}
      <ConfirmDialog
        isOpen={!!approvingExpense}
        title="Approve Team Expense"
        message={`Approve '${approvingExpense?.title}' for ₹${Number(approvingExpense?.amount).toFixed(2)} submitted by ${approvingExpense?.employeeId?.name}?`}
        confirmText="Approve Claim"
        type="success"
        loading={actionLoading}
        onConfirm={handleApprove}
        onClose={() => setApprovingExpense(null)}
      />

      {/* Reject Dialog */}
      <ConfirmDialog
        isOpen={!!rejectingExpense}
        title="Reject Team Expense"
        message={`Reject '${rejectingExpense?.title}' submitted by ${rejectingExpense?.employeeId?.name}?`}
        confirmText="Reject Claim"
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
