import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import {
  ShieldAlert,
  Users,
  FileSpreadsheet,
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

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, usersRes] = await Promise.all([
          api.get('/expenses/stats'),
          api.get('/users')
        ]);

        if (statsRes.data.success) {
          setStats(statsRes.data.stats);
        }
        if (usersRes.data.success) {
          setUserCount(usersRes.data.count || usersRes.data.users?.length || 0);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load system dashboard');
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
          <h2 className="text-2xl font-bold text-white tracking-tight">System Administration</h2>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise overview, user directory administration, and organizational compliance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/users')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 transition-all"
          >
            <Users className="w-4 h-4" />
            Manage Users
          </button>
          <button
            onClick={() => navigate('/admin/expenses')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            All Expenses
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Organization Spend"
          amount={summary.totalAmount}
          count={summary.totalCount}
          icon={DollarSign}
          color="indigo"
        />
        <StatCard
          title="Active Directory Users"
          amount={userCount}
          subtitle={`${userCount} corporate accounts`}
          icon={Users}
          color="emerald"
        />
        <StatCard
          title="Pending Approvals"
          amount={summary.pendingAmount}
          count={summary.pendingCount}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Total Reimbursed"
          amount={summary.reimbursedAmount}
          count={summary.reimbursedCount}
          icon={CheckCircle2}
          color="blue"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Enterprise Category Spending</h3>
              <p className="text-xs text-slate-400 mt-0.5">Budget consumption by category</p>
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
              <p className="text-xs text-slate-500">No data</p>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Monthly Financial Flow</h3>
              <p className="text-xs text-slate-400 mt-0.5">Disbursement volume by month</p>
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
              <p className="text-xs text-slate-500">No monthly data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
