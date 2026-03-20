import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';

/**
 * ToastNotification system
 *
 * Provides app-wide notifications for:
 *   - New order alerts (admin)
 *   - Cart actions (customer)
 *   - Error messages
 *   - Success confirmations
 *
 * Usage:
 *   const { notify } = useNotifications();
 *   notify({ type: 'success', message: 'Order placed!' });
 */

const NotificationContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertCircle,
};

const COLORS = {
  success: { bg: 'var(--clr-success-bg)', border: '#c3e0c8', text: 'var(--clr-success)' },
  error: { bg: 'var(--clr-danger-bg)', border: '#f0c0c0', text: 'var(--clr-danger)' },
  info: { bg: '#eef3fb', border: '#c5d6ee', text: '#2563a8' },
  warning: { bg: 'var(--clr-warning-bg)', border: '#eedcb0', text: 'var(--clr-warning)' },
};

function Notification({ id, type = 'info', message, onDismiss }) {
  const Icon = ICONS[type] || ICONS.info;
  const colors = COLORS[type] || COLORS.info;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), 4000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        padding: '0.7rem 1rem',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        animation: 'slideIn 0.25s ease',
        maxWidth: 380,
        fontSize: '0.88rem',
      }}
    >
      <Icon size={18} color={colors.text} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, color: 'var(--clr-text)' }}>{message}</span>
      <button
        onClick={() => onDismiss(id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--clr-text-light)',
          padding: 2,
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const notify = useCallback(({ type = 'info', message }) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev.slice(-4), { id, type, message }]);
  }, []);

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}

      {/* Notification container */}
      {notifications.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {notifications.map((n) => (
            <Notification
              key={n.id}
              {...n}
              onDismiss={dismiss}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be inside NotificationProvider');
  return ctx;
};
