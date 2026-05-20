import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

// Module-level 60-second cache
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 60000;

function calcScore(lead) {
  if (lead.status === 'Not Interested') return 0;
  let score = 0;
  score += ({ WhatsApp:30, Ads:20, Website:20, Referral:15, Direct:10 }[lead.source] || 10);
  score += ({ Interested:40, 'Follow Up':25, Converted:50 }[lead.status] || 0);
  const days = Math.floor((Date.now() - new Date(lead.date)) / 86400000);
  if (days <= 7) score += 30; else if (days <= 30) score += 20; else if (days <= 60) score += 10;
  return Math.min(100, score);
}

const TONE = {
  warn:   { color:'var(--warn)',   bg:'var(--warn-bg)'   },
  danger: { color:'var(--danger)', bg:'var(--danger-bg)' },
  info:   { color:'var(--info)',   bg:'var(--info-bg)'   },
  ok:     { color:'var(--accent)', bg:'var(--accent-bg)' },
};

function NotifIcon({ type }) {
  const c = TONE[type]?.color || 'var(--muted)';
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {type === 'warn'   && <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>}
      {type === 'danger' && <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>}
      {type === 'info'   && <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
      {type === 'ok'     && <polyline points="20 6 9 17 4 12"/>}
    </svg>
  );
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastRead, setLastRead] = useState(() => Number(localStorage.getItem('notif_lastRead') || 0));
  const panelRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const fetchNotifications = async (force = false) => {
    const now = Date.now();
    if (!force && _cache && now - _cacheTime < CACHE_TTL) {
      setNotifications(_cache);
      return;
    }
    setLoading(true);
    try {
      const [fuRes, leadsRes, dashRes, waRes] = await Promise.all([
        api.get('/followups', { params: { status: 'pending', limit: 200 } }),
        api.get('/leads', { params: { limit: 200 } }),
        api.get('/dashboard/stats'),
        api.get('/wa'),
      ]);

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const overdueFu = (fuRes.data.followups || []).filter(f => f.dueDate && new Date(f.dueDate) < today);
      const hotLeads = (leadsRes.data.leads || []).filter(l => calcScore(l) >= 65);
      const dormant = dashRes.data?.overview?.dormantCustomers || 0;
      const stored = Number(localStorage.getItem('notif_lastRead') || 0);
      const unreadWa = (waRes.data || []).filter(c => c.lastMessageAt && new Date(c.lastMessageAt).getTime() > stored).length;

      const notifs = [];
      if (overdueFu.length) notifs.push({
        id: 'overdue_fu', type: 'warn',
        title: `${overdueFu.length} overdue follow-up${overdueFu.length > 1 ? 's' : ''}`,
        desc: 'Customers waiting for their follow-up emails',
        link: '/followups', linkLabel: 'View follow-ups',
      });
      if (hotLeads.length) notifs.push({
        id: 'hot_leads', type: 'danger',
        title: `${hotLeads.length} hot lead${hotLeads.length > 1 ? 's' : ''} need attention`,
        desc: 'High-score leads may go cold — follow up now',
        link: '/leads', linkLabel: 'View leads',
      });
      if (dormant > 0) notifs.push({
        id: 'dormant', type: 'info',
        title: `${dormant} dormant customer${dormant > 1 ? 's' : ''}`,
        desc: 'No orders in 90+ days — time to re-engage',
        link: '/customers', linkLabel: 'View customers',
      });
      if (unreadWa > 0) notifs.push({
        id: 'wa_unread', type: 'ok',
        title: `${unreadWa} new WhatsApp conversation${unreadWa > 1 ? 's' : ''}`,
        desc: 'Recent activity since last check',
        link: '/whatsapp', linkLabel: 'Open WhatsApp',
      });

      _cache = notifs;
      _cacheTime = now;
      setNotifications(notifs);
    } catch {}
    finally { setLoading(false); }
  };

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchNotifications();
  };

  const markAllRead = () => {
    const now = Date.now();
    localStorage.setItem('notif_lastRead', String(now));
    setLastRead(now);
    _cache = null;
    setNotifications([]);
    setOpen(false);
  };

  const hasNew = notifications.length > 0;

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Compact bell icon button */}
      <button
        onClick={handleOpen}
        title="Notifications"
        style={{
          position: 'relative', width: 32, height: 32, borderRadius: 8, border: 'none',
          background: open ? 'var(--hover)' : 'transparent',
          color: 'var(--muted)', cursor: 'pointer', display: 'grid', placeItems: 'center',
          flexShrink: 0, transition: 'background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--fg)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = open ? 'var(--hover)' : 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {hasNew && (
          <span style={{
            position: 'absolute', top: 3, right: 3,
            minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 999, background: '#e53935', color: '#fff',
            fontSize: 9.5, fontWeight: 800, display: 'grid', placeItems: 'center',
            boxShadow: '0 0 0 2px var(--sidebar-bg)',
            fontFamily: 'Inter', fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          }}>
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="modal-enter" style={{
          position: 'fixed', left: 262, bottom: 60,
          width: 304, maxHeight: 420,
          background: 'var(--card)', border: '1px solid var(--rule)',
          borderRadius: 14, boxShadow: '0 8px 32px rgba(37,35,32,.14)',
          zIndex: 9990, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>Notifications</div>
            {hasNew && (
              <button onClick={markAllRead}
                style={{ fontSize: 11.5, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px', borderRadius: 6, fontFamily: 'inherit', fontWeight: 500 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && (
              <div style={{ padding: 28, display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 20, height: 20, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 4 }}>All caught up!</div>
                <div style={{ fontSize: 12, color: 'var(--faint)' }}>No alerts right now.</div>
              </div>
            )}
            {!loading && notifications.map((n, idx) => {
              const t = TONE[n.type] || TONE.info;
              return (
                <div key={n.id} style={{ padding: '12px 14px', borderBottom: idx < notifications.length - 1 ? '1px solid var(--rule)' : 'none', display: 'flex', gap: 11 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: t.bg, display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1 }}>
                    <NotifIcon type={n.type} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.3 }}>{n.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.4 }}>{n.desc}</div>
                    <button
                      onClick={() => { navigate(n.link); setOpen(false); }}
                      style={{ marginTop: 7, fontSize: 11.5, color: t.color, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500, fontFamily: 'inherit' }}>
                      {n.linkLabel} →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
