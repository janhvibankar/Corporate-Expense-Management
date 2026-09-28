import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import ExpenseTable from '../../components/ExpenseTable';
import {
  Clock,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  PlusCircle,
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

export default function EmployeeDashboard() {
  const [stats, setStats] = useState(null);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, expensesRes] = await Promise.all([
          api.get('/expenses/stats'),
          api.get('/expenses/my')
        ]);

        if (statsRes.data.success) {
          setStats(statsRes.data.stats);
        }
        if (expensesRes.data.success) {
          setRecentExpenses(expensesRes.data.expenses.slice(0, 5));
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
          <h2 className="text-2xl font-bold text-white tracking-tight">Employee Dashboard</h2>
          <p className="text-xs text-slate-400 mt-1">
            Overview of your reimbursement claims and processing progress
          </p>
        </div>
        <button
          onClick={() => navigate('/employee/submit')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Submit Expense
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Claims"
          amount={summary.totalAmount}
          count={summary.totalCount}
          icon={DollarSign}
          color="indigo"
        />
        <StatCard
          title="Pending Approval"
          amount={summary.pendingAmount}
          count={summary.pendingCount}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Approved (Awaiting Payout)"
          amount={summary.approvedAmount}
          count={summary.approvedCount}
          icon={CheckCircle2}
          color="blue"
        />
        <StatCard
          title="Reimbursed"
          amount={summary.reimbursedAmount}
          count={summary.reimbursedCount}
          icon={DollarSign}
          color="emerald"
        />
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Spending by Category</h3>
              <p className="text-xs text-slate-400 mt-0.5">Distribution across expense categories</p>
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
              <p className="text-xs text-slate-500">No category data recorded yet</p>
            )}
          </div>
        </div>

        {/* Monthly Expense Trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Monthly Claim Trends</h3>
              <p className="text-xs text-slate-400 mt-0.5">Total reimbursement volume over time</p>
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
                  <Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No monthly data available yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Claims */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white tracking-tight">Recent Claims</h3>
          <button
            onClick={() => navigate('/employee/expenses')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            View All →
          </button>
        </div>

        <ExpenseTable
          expenses={recentExpenses}
          loading={loading}
          role="employee"
          emptyMessage="No recent expense claims found. Click 'Submit Expense' to create one."
        />
      </div>
    </div>
  );
}
