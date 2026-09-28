import React from 'react';

export default function StatCard({ title, amount, count, icon: Icon, color = 'indigo', subtitle }) {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-400',
      border: 'border-indigo-500/20'
    },
    amber: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20'
    },
    blue: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/20'
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20'
    },
    rose: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20'
    }
  };

  const currentTheme = colorMap[color] || colorMap.indigo;

  return (
    <div className="bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-xl p-5 shadow-sm hover:border-slate-600 transition-colors">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        {Icon && (
          <div className={`p-2 rounded-lg border ${currentTheme.bg} ${currentTheme.border}`}>
            <Icon className={`w-5 h-5 ${currentTheme.text}`} />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight">
            ₹{Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          {subtitle ? (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          ) : count !== undefined ? (
            <p className="text-xs text-slate-400 mt-1">
              <span className="font-semibold text-slate-200">{count}</span> total claim{count === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
