import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const TYPE_CONFIG = {
  error:   { Icon: AlertCircle,   color: 'var(--danger)',           bg: 'rgba(239, 68, 68, 0.08)'   },
  success: { Icon: CheckCircle,   color: 'var(--success)',          bg: 'rgba(16, 185, 129, 0.08)'  },
  info:    { Icon: Info,          color: 'var(--accent-secondary)', bg: 'rgba(59, 130, 246, 0.08)'  },
  warning: { Icon: AlertTriangle, color: '#f59e0b',                 bg: 'rgba(245, 158, 11, 0.08)'  },
};

/** Single toast notification. Auto-dismisses after `duration` ms. */
const Toast = ({ toast, onDismiss }) => {
  const { Icon, color, bg } = TYPE_CONFIG[toast.type] ?? TYPE_CONFIG.info;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? 5000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        background: bg,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${color}33`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        maxWidth: '380px',
        animation: 'toast-slide-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        cursor: 'default',
      }}
    >
      <Icon size={16} style={{ color, flexShrink: 0, marginTop: '2px' }} />
      <span style={{
        fontSize: 'var(--font-size-sm)',
        color: 'var(--text-primary)',
        flex: 1,
        lineHeight: 1.5,
      }}>
        {toast.message}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        title="Fermer"
        style={{
          background: 'transparent',
          padding: '2px',
          color: 'var(--text-muted)',
          flexShrink: 0,
          marginTop: '1px',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

/** Container that renders all active toasts in the bottom-right corner. */
export const ToastContainer = ({ toasts, onDismiss }) => (
  <div
    aria-live="polite"
    style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      zIndex: 9999,
      pointerEvents: 'none',
    }}
  >
    <style>{`
      @keyframes toast-slide-in {
        from { transform: translateX(24px) scale(0.97); opacity: 0; }
        to   { transform: translateX(0)    scale(1);    opacity: 1; }
      }
    `}</style>
    {toasts.map(toast => (
      <div key={toast.id} style={{ pointerEvents: 'auto' }}>
        <Toast toast={toast} onDismiss={onDismiss} />
      </div>
    ))}
  </div>
);

export default ToastContainer;
