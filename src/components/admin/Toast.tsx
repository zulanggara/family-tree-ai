'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const success = useCallback((m: string) => toast('success', m), [toast]);
  const error = useCallback((m: string) => toast('error', m), [toast]);
  const warning = useCallback((m: string) => toast('warning', m), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const colors: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
    success: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', icon: '#22c55e', text: '#22c55e' },
    error:   { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', icon: '#ef4444', text: '#ef4444' },
    warning: { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)', icon: '#fbbf24', text: '#fbbf24' },
    info:    { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)', icon: '#3b82f6', text: '#3b82f6' },
  };

  const c = colors[t.type];

  const icons: Record<ToastType, React.ReactNode> = {
    success: <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />,
    error:   <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
    warning: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />,
    info:    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />,
  };

  return (
    <div
      className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg min-w-[280px] max-w-[360px]"
      style={{
        background: 'var(--card)',
        border: `1px solid ${c.border}`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={c.icon} strokeWidth={2.5}
        style={{ marginTop: 1, flexShrink: 0 }}>
        {icons[t.type]}
      </svg>
      <p className="text-sm flex-1 leading-snug" style={{ color: 'var(--text)' }}>
        {t.message}
      </p>
      <button onClick={onDismiss} style={{ color: 'var(--text-subtle)', marginTop: 1 }}
        className="hover:opacity-70 transition-opacity">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
