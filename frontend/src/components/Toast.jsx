import { useState, createContext, useContext, useCallback } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const CONFIG = {
  success: { icon: CheckCircle2, color: 'var(--success)',  border: '#10b98130' },
  error:   { icon: XCircle,      color: 'var(--danger)',   border: '#ef444430' },
  info:    { icon: Info,         color: 'var(--accent)',   border: '#6366f130' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => {
          const { icon: Icon, color, border } = CONFIG[t.type] || CONFIG.info;
          return (
            <div key={t.id} className="toast-enter pointer-events-auto flex items-center gap-3 pl-4 pr-3 py-3 rounded-2xl shadow-xl border-l-4 text-sm font-medium min-w-[260px] max-w-sm"
              style={{
                background: 'var(--bg-card)',
                borderLeftColor: color,
                borderTop: `1px solid ${border}`,
                borderRight: `1px solid ${border}`,
                borderBottom: `1px solid ${border}`,
                color: 'var(--text)',
                boxShadow: 'var(--shadow-md)',
              }}>
              <Icon size={16} style={{ color, flexShrink: 0 }} />
              <span className="flex-1">{t.message}</span>
              <button onClick={() => remove(t.id)} className="opacity-40 hover:opacity-70 transition-opacity">
                <X size={14} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
