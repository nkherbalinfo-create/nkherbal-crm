import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  const maxW = { sm: 440, md: 620, lg: 780 }[size] || 620;

  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}>
      <div style={{ position:'absolute', inset:0, background:'rgba(37,35,32,.45)', backdropFilter:'blur(4px)' }} />
      <div className="modal-enter modal-content" style={{ position:'relative', width:'100%', maxWidth:maxW, maxHeight:'90vh', display:'flex', flexDirection:'column', background:'var(--card)', border:'1px solid var(--rule)', borderRadius:14, boxShadow:'0 8px 40px rgba(37,35,32,.14)', overflow:'hidden' }}
        onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--rule)', flexShrink:0 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--fg)' }}>{title}</div>
          <button onClick={onClose} style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:7, border:'none', background:'var(--chip)', color:'var(--muted)', cursor:'pointer' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {/* Body */}
        <div style={{ overflowY:'auto', flex:1, padding:'18px 20px', color:'var(--fg)' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
