import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Building2 } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const roleColors = {
    employee: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    manager: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    finance: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    admin: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  };

  const currentRoleStyle = roleColors[user.role] || 'bg-slate-700 text-slate-300 border-slate-600';

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 px-4 sm:px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-600/20">
          ₹
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white tracking-tight">ExpensifyPro</span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Enterprise
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">Corporate Expense Management</p>
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 font-semibold text-sm">
            {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <div className="text-left hidden md:block">
            <p className="text-sm font-semibold text-white leading-none">{user.name}</p>
            <p className="text-xs text-slate-400 mt-1">{user.email}</p>
          </div>
          <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${currentRoleStyle}`}>
            {user.role}
          </span>
        </div>

        <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

        <button
          onClick={logout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
          title="Sign out of account"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
