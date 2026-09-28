import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-lg">
          ₹
        </div>
        <div>
          <h1 className="text-lg font-bold text-white leading-none">ExpensifyPro</h1>
          <p className="text-xs text-slate-400 mt-1">Corporate Expense Management</p>
        </div>
      </div>

      {user && (
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{user.name}</p>
            <span className="inline-block text-xs uppercase px-2 py-0.5 rounded bg-slate-700 text-indigo-400 font-medium">
              {user.role}
            </span>
          </div>
          <button
            onClick={logout}
            className="px-3 py-1.5 text-xs font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
