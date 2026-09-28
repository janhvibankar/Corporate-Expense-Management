import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import ExpenseTable from '../../components/ExpenseTable';
import ExpenseForm from '../../components/ExpenseForm';
import ConfirmDialog from '../../components/ConfirmDialog';
import { PlusCircle, Filter, Search, RefreshCw } from 'lucide-react';

const CATEGORIES = ['All', 'Travel', 'Food', 'Accommodation', 'Office', 'Other'];
const STATUSES = ['All', 'PENDING', 'APPROVED', 'REJECTED', 'REIMBURSED'];

export default function EmployeeExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Dialogs state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isResubmission, setIsResubmission] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [deletingExpense, setDeletingExpense] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [alertMsg, setAlertMsg] = useState(null);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      let queryParams = [];
      if (statusFilter !== 'All') queryParams.push(`status=${statusFilter}`);
      if (categoryFilter !== 'All') queryParams.push(`category=${categoryFilter}`);

      const queryString = queryParams.length ? `?${queryParams.join('&')}` : '';
      const res = await api.get(`/expenses/my${queryString}`);

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

  // Handle Create / Edit / Resubmit submit
  const handleFormSubmit = async (formData) => {
    try {
      setFormLoading(true);
      if (isResubmission && editingExpense) {
        await api.put(`/expenses/${editingExpense._id}/resubmit`, formData);
        setAlertMsg({ type: 'success', text: 'Expense claim resubmitted successfully for review.' });
      } else if (editingExpense) {
        await api.put(`/expenses/${editingExpense._id}`, formData);
        setAlertMsg({ type: 'success', text: 'Expense updated successfully.' });
      } else {
        await api.post('/expenses', formData);
        setAlertMsg({ type: 'success', text: 'New expense claim submitted successfully.' });
      }

      setIsFormOpen(false);
      setEditingExpense(null);
      setIsResubmission(false);
      fetchExpenses();
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'Operation failed' });
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deletingExpense) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/expenses/${deletingExpense._id}`);
      setAlertMsg({ type: 'success', text: 'Expense claim deleted successfully.' });
      setDeletingExpense(null);
      fetchExpenses();
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'Delete failed' });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered expenses based on search term
  const filteredExpenses = expenses.filter((exp) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      exp.title.toLowerCase().includes(term) ||
      (exp.description && exp.description.toLowerCase().includes(term)) ||
      exp.category.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">My Expense Claims</h2>
          <p className="text-xs text-slate-400 mt-1">
            Track, edit, and resubmit your corporate expense reimbursements
          </p>
        </div>
        <button
          onClick={() => {
            setEditingExpense(null);
            setIsResubmission(false);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Submit Claim
        </button>
      </div>

      {/* Alert Banner */}
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

      {/* Filter & Search Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search claims..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchExpenses}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Refresh List"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expense Table */}
      <ExpenseTable
        expenses={filteredExpenses}
        loading={loading}
        role="employee"
        onEdit={(exp) => {
          setEditingExpense(exp);
          setIsResubmission(false);
          setIsFormOpen(true);
        }}
        onDelete={(exp) => setDeletingExpense(exp)}
        onResubmit={(exp) => {
          setEditingExpense(exp);
          setIsResubmission(true);
          setIsFormOpen(true);
        }}
        emptyMessage="No matching expense claims found."
      />

      {/* Submit / Edit / Resubmit Form Modal */}
      <ExpenseForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingExpense(null);
          setIsResubmission(false);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingExpense}
        isResubmission={isResubmission}
        loading={formLoading}
        title={
          isResubmission
            ? 'Resubmit Rejected Expense'
            : editingExpense
            ? 'Edit Pending Expense'
            : 'Submit New Expense Claim'
        }
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deletingExpense}
        title="Delete Expense Claim"
        message={`Are you sure you want to delete '${deletingExpense?.title}' (₹${Number(deletingExpense?.amount).toFixed(2)})? This action cannot be undone.`}
        confirmText="Delete Claim"
        type="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingExpense(null)}
      />
    </div>
  );
}
