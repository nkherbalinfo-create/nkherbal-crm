import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className={`w-full ${sizes[size]} max-h-[90vh] flex flex-col rounded-2xl shadow-2xl modal-enter border`}
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>{title}</h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:opacity-70"
            style={{ color: 'var(--text-faint)', background: 'var(--bg-subtle)' }}>
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6" style={{ color: 'var(--text)' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
