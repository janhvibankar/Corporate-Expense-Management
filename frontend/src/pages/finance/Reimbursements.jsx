import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import ExpenseTable from '../../components/ExpenseTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Banknote, Search, RefreshCw, DollarSign, CheckCircle2 } from 'lucide-react';

export default function FinanceReimbursements() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [reimbursingExpense, setReimbursingExpense] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  const fetchApproved = useCallback(async () => {
    try {
      setLoading(true);
      let queryParams = ['status=APPROVED'];
      if (categoryFilter !== 'All') queryParams.push(`category=${categoryFilter}`);

      const res = await api.get(`/expenses?${queryParams.join('&')}`);
      if (res.data.success) {
        setExpenses(res.data.expenses);
      }
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'Failed to load reimbursements' });
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    fetchApproved();
  }, [fetchApproved]);

  const handleReimburse = async (note) => {
    if (!reimbursingExpense) return;
    try {
      setActionLoading(true);
      await api.put(`/expenses/${reimbursingExpense._id}/reimburse`, {
        note: note || 'Disbursed via direct corporate bank transfer'
      });
      setAlertMsg({ type: 'success', text: `Reimbursement processed for '${reimbursingExpense.title}'.` });
      setReimbursingExpense(null);
      fetchApproved();
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'Reimbursement failed' });
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

  const totalPayable = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Approved Reimbursements Queue</h2>
          <p className="text-xs text-slate-400 mt-1">
            Execute corporate payouts for manager-approved expense claims
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">Total Payable:</span>
          <span className="text-base font-bold text-emerald-400">
            ₹{totalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
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

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, employee, or description..."
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
            onClick={fetchApproved}
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
        role="finance"
        onReimburse={(exp) => setReimbursingExpense(exp)}
        emptyMessage="No approved claims currently awaiting payout."
      />

      {/* Disbursal Modal */}
      <ConfirmDialog
        isOpen={!!reimbursingExpense}
        title="Execute Payment Disbursal"
        message={`Authorize payment of ₹${Number(reimbursingExpense?.amount).toFixed(2)} for '${reimbursingExpense?.title}' to employee ${reimbursingExpense?.employeeId?.name}?`}
        confirmText="Execute Payout"
        type="primary"
        requiresReason={true}
        reasonPlaceholder="Enter transaction ID, check number, or bank transfer reference..."
        loading={actionLoading}
        onConfirm={handleReimburse}
        onClose={() => setReimbursingExpense(null)}
      />
    </div>
  );
}
