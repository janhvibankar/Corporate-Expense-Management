import React, { useState } from 'react';
import StatusBadge from './StatusBadge';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  RefreshCw,
  Eye,
  DollarSign,
  History,
  X
} from 'lucide-react';

export default function ExpenseTable({
  expenses = [],
  loading = false,
  showEmployee = false,
  role = 'employee',
  onApprove,
  onReject,
  onReimburse,
  onEdit,
  onDelete,
  onResubmit,
  emptyMessage = 'No expense claims found.'
}) {
  const [selectedExpense, setSelectedExpense] = useState(null);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-400 font-medium">Loading expense records...</p>
      </div>
    );
  }

  if (!expenses.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
        <p className="text-slate-400 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4 sm:px-6">Claim Details</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Date</th>
                {showEmployee && <th className="py-3.5 px-4">Employee</th>}
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {expenses.map((expense) => {
                const formattedDate = new Date(expense.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <tr
                    key={expense._id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Title & Description */}
                    <td className="py-4 px-4 sm:px-6">
                      <div>
                        <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                          {expense.title}
                        </p>
                        {expense.description && (
                          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 max-w-xs">
                            {expense.description}
                          </p>
                        )}
                        {expense.rejectionReason && (
                          <p className="text-xs text-rose-400 font-medium mt-1">
                            Reason: {expense.rejectionReason}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700/60">
                        {expense.category}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 text-slate-300 text-xs font-medium whitespace-nowrap">
                      {formattedDate}
                    </td>

                    {/* Employee */}
                    {showEmployee && (
                      <td className="py-4 px-4">
                        <div className="text-xs">
                          <p className="font-semibold text-slate-200">{expense.employeeId?.name || 'N/A'}</p>
                          <p className="text-slate-400 text-[11px]">{expense.employeeId?.email || ''}</p>
                        </div>
                      </td>
                    )}

                    {/* Amount */}
                    <td className="py-4 px-4 whitespace-nowrap font-bold text-white">
                      ₹{Number(expense.amount).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <StatusBadge status={expense.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Audit Details */}
                        <button
                          onClick={() => setSelectedExpense(expense)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="View Audit Trail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Employee Actions */}
                        {role === 'employee' && expense.status === 'PENDING' && onEdit && (
                          <button
                            onClick={() => onEdit(expense)}
                            className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                            title="Edit Claim"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {role === 'employee' && expense.status === 'PENDING' && onDelete && (
                          <button
                            onClick={() => onDelete(expense)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                            title="Delete Claim"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        {role === 'employee' && expense.status === 'REJECTED' && onResubmit && (
                          <button
                            onClick={() => onResubmit(expense)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
                            title="Resubmit Corrected Claim"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Resubmit
                          </button>
                        )}

                        {/* Manager Actions */}
                        {(role === 'manager' || role === 'admin') && expense.status === 'PENDING' && onApprove && (
                          <button
                            onClick={() => onApprove(expense)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                            title="Approve Expense"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </button>
                        )}

                        {(role === 'manager' || role === 'admin') && expense.status === 'PENDING' && onReject && (
                          <button
                            onClick={() => onReject(expense)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                            title="Reject Expense"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        )}

                        {/* Finance Actions */}
                        {(role === 'finance' || role === 'admin') && expense.status === 'APPROVED' && onReimburse && (
                          <button
                            onClick={() => onReimburse(expense)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-600/20 transition-all"
                            title="Mark as Reimbursed"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Disburse
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Detail & Audit History Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">{selectedExpense.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">{selectedExpense.category}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs text-slate-400">
                    {new Date(selectedExpense.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedExpense(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <p className="text-xs text-slate-400 font-semibold">Total Amount</p>
                <p className="text-xl font-bold text-white mt-0.5">
                  ₹{Number(selectedExpense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold mb-1">Current Status</p>
                <StatusBadge status={selectedExpense.status} />
              </div>

              {selectedExpense.employeeId && (
                <div>
                  <p className="text-xs text-slate-400 font-semibold">Claimed By</p>
                  <p className="text-sm font-semibold text-slate-200 mt-0.5">{selectedExpense.employeeId.name}</p>
                  <p className="text-xs text-slate-400">{selectedExpense.employeeId.email}</p>
                </div>
              )}

              {selectedExpense.reviewedBy && (
                <div>
                  <p className="text-xs text-slate-400 font-semibold">Reviewed By</p>
                  <p className="text-sm font-semibold text-slate-200 mt-0.5">{selectedExpense.reviewedBy.name}</p>
                  <p className="text-xs text-slate-400">
                    {selectedExpense.reviewedAt
                      ? new Date(selectedExpense.reviewedAt).toLocaleDateString()
                      : ''}
                  </p>
                </div>
              )}
            </div>

            {selectedExpense.description && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400">Claim Description</p>
                <p className="text-sm text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {selectedExpense.description}
                </p>
              </div>
            )}

            {selectedExpense.rejectionReason && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-rose-400">Rejection Reason</p>
                <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                  {selectedExpense.rejectionReason}
                </p>
              </div>
            )}

            {/* Audit Status History */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-bold text-white">Status & Audit History</h4>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedExpense.statusHistory && selectedExpense.statusHistory.length > 0 ? (
                  selectedExpense.statusHistory.map((h, index) => (
                    <div
                      key={index}
                      className="text-xs bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-start justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-indigo-400">{h.from}</span>
                          <span className="text-slate-500">→</span>
                          <span className="font-semibold text-emerald-400">{h.to}</span>
                        </div>
                        {h.note && <p className="text-slate-300 mt-1">{h.note}</p>}
                        <p className="text-[11px] text-slate-500 mt-1">
                          By: {h.by?.name || h.by || 'System'}
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(h.at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No status changes recorded.</p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedExpense(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
