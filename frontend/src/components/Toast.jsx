import { useState, createContext, useContext, useCallback } from 'react';

const ToastContext = createContext(null);

const ICONS = {
  success: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  error:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  info:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
};

const BORDER = { success:'var(--accent)', error:'var(--danger)', info:'var(--info)' };
const ICON_COLOR = { success:'var(--accent)', error:'var(--danger)', info:'var(--info)' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  const remove = (id) => setToasts(p => p.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{ position:'fixed', bottom:20, right:20, zIndex:99999, display:'flex', flexDirection:'column', gap:8, pointerEvents:'none' }}>
        {toasts.map(t => (
          <div key={t.id} className="toast-enter" style={{ pointerEvents:'auto', display:'flex', alignItems:'center', gap:10, padding:'10px 14px 10px 12px', background:'var(--card)', border:'1px solid var(--rule)', borderLeft:`3px solid ${BORDER[t.type]||BORDER.info}`, borderRadius:10, boxShadow:'0 4px 16px rgba(37,35,32,.10)', minWidth:240, maxWidth:360, fontSize:13, color:'var(--fg)' }}>
            <span style={{ color:ICON_COLOR[t.type]||ICON_COLOR.info, display:'flex', flexShrink:0 }}>{ICONS[t.type]||ICONS.info}</span>
            <span style={{ flex:1 }}>{t.message}</span>
            <button onClick={()=>remove(t.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--faint)', display:'flex', padding:0, flexShrink:0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
