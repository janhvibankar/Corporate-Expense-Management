import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Receipt,
  PlusCircle,
  CheckSquare,
  History,
  Banknote,
  Users,
  FileSpreadsheet
} from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();

  if (!user) return null;

  const roleNavItems = {
    employee: [
      { to: '/employee/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/employee/expenses', label: 'My Expenses', icon: Receipt },
      { to: '/employee/submit', label: 'Submit Expense', icon: PlusCircle }
    ],
    manager: [
      { to: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/manager/approvals', label: 'Pending Approvals', icon: CheckSquare },
      { to: '/manager/history', label: 'Team History', icon: History }
    ],
    finance: [
      { to: '/finance/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/finance/reimbursements', label: 'Reimbursements', icon: Banknote }
    ],
    admin: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admin/expenses', label: 'All Expenses', icon: FileSpreadsheet },
      { to: '/admin/users', label: 'User Directory', icon: Users }
    ]
  };

  const navItems = roleNavItems[user.role] || [];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0 min-h-[calc(100vh-61px)] p-4 flex flex-col justify-between">
      <div>
        <div className="px-3 py-2 mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {user.role} Navigation
          </p>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl mt-auto">
        <p className="text-xs font-semibold text-slate-300">Expensify Policy</p>
        <p className="text-[11px] text-slate-400 mt-1">
          Claims older than 60 days cannot be processed as per corporate compliance guidelines.
        </p>
      </div>
    </aside>
  );
}
