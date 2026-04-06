'use client';

import { useEffect } from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  danger = false,
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  // close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(251,191,36,0.12)',
              border: `1px solid ${danger ? 'rgba(239,68,68,0.25)' : 'rgba(251,191,36,0.25)'}`,
            }}
          >
            {danger ? (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                style={{ color: '#ef4444' }}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            ) : (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                style={{ color: '#fbbf24' }}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text)] text-base">{title}</h3>
          </div>
        </div>

        {/* Message */}
        <div className="text-sm text-[var(--text-muted)] mb-6 pl-13">
          {message}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{
              background: danger
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, var(--accent), var(--blue))',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
