import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, HelpCircle, X } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'primary', // 'primary' | 'danger' | 'success'
  requiresReason = false,
  reasonPlaceholder = 'Please enter reason...',
  onConfirm,
  onClose,
  loading = false
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requiresReason) {
      if (!reason.trim() || reason.trim().length < 5) {
        setError('Reason is required and must be at least 5 characters long');
        return;
      }
    }
    onConfirm(reason.trim());
  };

  const typeConfig = {
    danger: {
      btnClass: 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20',
      iconClass: 'text-red-400 bg-red-500/10 border-red-500/20',
      Icon: AlertCircle
    },
    success: {
      btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20',
      iconClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      Icon: CheckCircle
    },
    primary: {
      btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20',
      iconClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      Icon: HelpCircle
    }
  };

  const config = typeConfig[type] || typeConfig.primary;
  const DialogIcon = config.Icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${config.iconClass}`}>
              <DialogIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {message && <p className="text-sm text-slate-300 leading-relaxed">{message}</p>}

        {requiresReason && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Rejection Reason</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder={reasonPlaceholder}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500"
            />
            {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-md transition-all flex items-center gap-2 ${config.btnClass}`}
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
