import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', loading = false }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && !loading) onClose(); };
    if (open) document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose, loading]);

  if (!open) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={() => { if (!loading) onClose(); }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(37,35,32,.45)', backdropFilter: 'blur(4px)' }} />
      <div className="modal-enter"
        style={{ position: 'relative', width: '100%', maxWidth: 400, background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 16, boxShadow: '0 12px 48px rgba(37,35,32,.18)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* Icon + content */}
        <div style={{ padding: '28px 24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
          {/* Danger icon */}
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--danger-bg)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>{title}</div>
            {message && <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>{message}</div>}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, padding: '0 24px 24px' }}>
          <button onClick={onClose} disabled={loading}
            className="btn-secondary"
            style={{ flex: 1, justifyContent: 'center', height: 38 }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            style={{
              flex: 1, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 9,
              fontSize: 13, fontWeight: 500, cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s, transform 0.12s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.88'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = loading ? '0.7' : '1'; }}
            onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
            {loading && (
              <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
            )}
            {loading ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>,
    document.body
  );
}
