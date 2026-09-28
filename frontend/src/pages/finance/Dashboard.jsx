import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import ExpenseTable from '../../components/ExpenseTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  Banknote,
  DollarSign,
  Clock,
  CheckCircle2,
  TrendingUp,
  PieChart as PieIcon
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

export default function FinanceDashboard() {
  const [stats, setStats] = useState(null);
  const [approvedExpenses, setApprovedExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reimbursingExpense, setReimbursingExpense] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, approvedRes] = await Promise.all([
        api.get('/expenses/stats'),
        api.get('/expenses?status=APPROVED')
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }
      if (approvedRes.data.success) {
        setApprovedExpenses(approvedRes.data.expenses);
      }
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'Failed to load finance overview' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReimburse = async (note) => {
    if (!reimbursingExpense) return;
    try {
      setActionLoading(true);
      await api.put(`/expenses/${reimbursingExpense._id}/reimburse`, {
        note: note || 'Disbursed via bank transfer'
      });
      setAlertMsg({ type: 'success', text: `Reimbursement processed for '${reimbursingExpense.title}'.` });
      setReimbursingExpense(null);
      loadData();
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'Reimbursement failed' });
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
          <h2 className="text-2xl font-bold text-white tracking-tight">Finance & Disbursal Hub</h2>
          <p className="text-xs text-slate-400 mt-1">
            Audit approved reimbursement claims and execute disbursements
          </p>
        </div>
        <button
          onClick={() => navigate('/finance/reimbursements')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 transition-all"
        >
          <Banknote className="w-4 h-4" />
          Pending Disbursals ({approvedExpenses.length})
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
          title="Awaiting Disbursal"
          amount={summary.approvedAmount}
          count={summary.approvedCount}
          icon={Banknote}
          color="amber"
        />
        <StatCard
          title="Total Reimbursed"
          amount={summary.reimbursedAmount}
          count={summary.reimbursedCount}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Pending Manager Review"
          amount={summary.pendingAmount}
          count={summary.pendingCount}
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Total Corporate Claims"
          amount={summary.totalAmount}
          count={summary.totalCount}
          icon={DollarSign}
          color="indigo"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Organization Category Spend</h3>
              <p className="text-xs text-slate-400 mt-0.5">Distribution across cost categories</p>
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
              <p className="text-xs text-slate-500">No category records available</p>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Organization Monthly Disbursals</h3>
              <p className="text-xs text-slate-400 mt-0.5">Corporate reimbursement trajectory</p>
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
                  <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No monthly records</p>
            )}
          </div>
        </div>
      </div>

      {/* Disbursal Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Approved Claims Ready for Payout</h3>
            <p className="text-xs text-slate-400 mt-0.5">Claims approved by managers ready for payment disbursement</p>
          </div>
          <button
            onClick={() => navigate('/finance/reimbursements')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            Full Disbursal View →
          </button>
        </div>

        <ExpenseTable
          expenses={approvedExpenses.slice(0, 5)}
          loading={loading}
          showEmployee={true}
          role="finance"
          onReimburse={(exp) => setReimbursingExpense(exp)}
          emptyMessage="No approved claims awaiting reimbursement disbursal."
        />
      </div>

      {/* Reimburse Modal with optional reference note */}
      <ConfirmDialog
        isOpen={!!reimbursingExpense}
        title="Disburse Reimbursement"
        message={`Confirm payout of ₹${Number(reimbursingExpense?.amount).toFixed(2)} for '${reimbursingExpense?.title}' to ${reimbursingExpense?.employeeId?.name}?`}
        confirmText="Confirm Disbursal"
        type="primary"
        requiresReason={true}
        reasonPlaceholder="Optional bank reference or NEFT transaction ID..."
        loading={actionLoading}
        onConfirm={handleReimburse}
        onClose={() => setReimbursingExpense(null)}
      />
    </div>
  );
}
