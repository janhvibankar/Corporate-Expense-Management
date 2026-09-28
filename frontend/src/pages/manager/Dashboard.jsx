import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import ExpenseTable from '../../components/ExpenseTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  PieChart as PieIcon,
  Users
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

export default function ManagerDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alertMsg, setAlertMsg] = useState(null);

  // Actions dialogs
  const [approvingExpense, setApprovingExpense] = useState(null);
  const [rejectingExpense, setRejectingExpense] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, pendingRes] = await Promise.all([
        api.get('/expenses/stats'),
        api.get('/expenses/pending')
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }
      if (pendingRes.data.success) {
        setPendingExpenses(pendingRes.data.expenses);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load manager dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async () => {
    if (!approvingExpense) return;
    try {
      setActionLoading(true);
      await api.put(`/expenses/${approvingExpense._id}/approve`, {
        note: 'Approved from manager dashboard'
      });
      setAlertMsg({ type: 'success', text: `Approved expense '${approvingExpense.title}' successfully.` });
      setApprovingExpense(null);
      loadData();
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
        reason: reason
      });
      setAlertMsg({ type: 'success', text: `Rejected expense '${rejectingExpense.title}'.` });
      setRejectingExpense(null);
      loadData();
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'Rejection failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const summary = stats?.summary || {
    totalAmount: 0,
    pendingAmount: 0,
    approvedAmount: 0,
    reimbursedAmount: 0,
    totalCount: 0,
    pendingCount: 0,
    approvedCount: 0,
    reimbursedCount: 0
  };

  const categoryData = stats?.byCategory?.map((item) => ({
    name: item._id,
    value: item.totalAmount
  })) || [];

  const monthlyData = stats?.monthlyTotals?.map((item) => ({
    name: `${item.month}/${item.year}`,
    amount: item.totalAmount
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Manager Review Hub</h2>
          <p className="text-xs text-slate-400 mt-1">
            Review and approve pending team reimbursements and audit direct report expenditures
          </p>
        </div>
        <button
          onClick={() => navigate('/manager/approvals')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 transition-all"
        >
          <Clock className="w-4 h-4" />
          Pending Approvals ({pendingExpenses.length})
        </button>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Team Pending Action"
          amount={summary.pendingAmount}
          count={summary.pendingCount}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Team Approved"
          amount={summary.approvedAmount}
          count={summary.approvedCount}
          icon={CheckCircle2}
          color="blue"
        />
        <StatCard
          title="Team Reimbursed"
          amount={summary.reimbursedAmount}
          count={summary.reimbursedCount}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Total Team Claims"
          amount={summary.totalAmount}
          count={summary.totalCount}
          icon={Users}
          color="indigo"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Team Category Distribution</h3>
              <p className="text-xs text-slate-400 mt-0.5">Expenditure breakdown by category</p>
            </div>
            <PieIcon className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 flex items-center justify-center">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No team category data</p>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Team Monthly Volume</h3>
              <p className="text-xs text-slate-400 mt-0.5">Historical team spending trends</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 flex items-center justify-center">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No monthly trends recorded</p>
            )}
          </div>
        </div>
      </div>

      {/* Pending Queue Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Pending Approval Queue</h3>
            <p className="text-xs text-slate-400 mt-0.5">Direct reports awaiting your sign-off</p>
          </div>
          <button
            onClick={() => navigate('/manager/approvals')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            Manage Queue →
          </button>
        </div>

        <ExpenseTable
          expenses={pendingExpenses.slice(0, 5)}
          loading={loading}
          showEmployee={true}
          role="manager"
          onApprove={(exp) => setApprovingExpense(exp)}
          onReject={(exp) => setRejectingExpense(exp)}
          emptyMessage="All caught up! No pending team expenses awaiting review."
        />
      </div>

      {/* Approve Confirm Dialog */}
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

      {/* Reject Dialog with required reason */}
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
