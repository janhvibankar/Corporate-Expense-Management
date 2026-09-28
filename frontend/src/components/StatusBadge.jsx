import React from 'react';
import { Clock, CheckCircle2, XCircle, DollarSign } from 'lucide-react';

const statusConfig = {
  PENDING: {
    label: 'Pending Review',
    bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: Clock
  },
  APPROVED: {
    label: 'Approved',
    bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon: CheckCircle2
  },
  REJECTED: {
    label: 'Rejected',
    bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    icon: XCircle
  },
  REIMBURSED: {
    label: 'Reimbursed',
    bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: DollarSign
  }
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || {
    label: status || 'Unknown',
    bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    icon: Clock
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
