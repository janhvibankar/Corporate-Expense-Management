import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import ExpenseTable from '../../components/ExpenseTable';
import { History, Search, RefreshCw } from 'lucide-react';

export default function ManagerHistory() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [alertMsg, setAlertMsg] = useState(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      let queryParams = [];
      if (statusFilter !== 'All') queryParams.push(`status=${statusFilter}`);
      if (categoryFilter !== 'All') queryParams.push(`category=${categoryFilter}`);

      const queryString = queryParams.length ? `?${queryParams.join('&')}` : '';
      const res = await api.get(`/expenses/team${queryString}`);

      if (res.data.success) {
        setExpenses(res.data.expenses);
      }
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'Failed to fetch team history' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

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
        <h2 className="text-2xl font-bold text-white tracking-tight">Team Expense History</h2>
        <p className="text-xs text-slate-400 mt-1">
          Historical record of all approved, rejected, and reimbursed claims processed for your team
        </p>
      </div>

      {alertMsg && (
        <div className="p-4 rounded-xl text-sm bg-rose-500/10 border border-rose-500/20 text-rose-300">
          {alertMsg.text}
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
              {['All', 'APPROVED', 'REJECTED', 'REIMBURSED'].map((s) => (
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
            onClick={fetchHistory}
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
        role="manager"
        emptyMessage="No team history records found."
      />
    </div>
  );
}
