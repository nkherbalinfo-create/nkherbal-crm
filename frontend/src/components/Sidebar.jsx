import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import NotificationCenter from './NotificationCenter';

// Exact icon implementations from the design file primitives.jsx
const Icon = ({ name, size = 16, stroke = 1.6, color = 'currentColor' }) => {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color, strokeWidth: stroke,
    strokeLinecap: 'round', strokeLinejoin: 'round',
    style: { display: 'block', flexShrink: 0 }
  };
  switch (name) {
    case 'grid':    return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/></svg>;
    case 'box':     return <svg {...p}><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>;
    case 'target':  return <svg {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill={color} stroke="none"/></svg>;
    case 'users':   return <svg {...p}><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3.5 3.5 0 010 7"/><path d="M21 20c0-2.5-1.6-4.6-4-5.5"/></svg>;
    case 'bell':    return <svg {...p}><path d="M6 8a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7z"/><path d="M10 19a2 2 0 004 0"/></svg>;
    case 'message': return <svg {...p}><path d="M4 12a8 8 0 1116 0c0 4.4-3.6 8-8 8H4l1.6-3.5A8 8 0 014 12z"/></svg>;
    case 'chart':   return <svg {...p}><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>;
    case 'gear':    return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>;
    case 'search':  return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>;
    case 'sun':     return <svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>;
    case 'moon':    return <svg {...p}><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>;
    case 'leaf':    return <svg {...p}><path d="M3 21c0-9 7-16 18-16-1 11-7 18-18 16z"/><path d="M3 21c4-4 8-7 14-10"/></svg>;
    case 'logout':  return <svg {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
    case 'whatsapp':return <svg {...p}><path d="M3 21l1.65-4.5A8 8 0 1112 20a8 8 0 01-3.4-.8L3 21z"/></svg>;
    default:        return null;
  }
};

const NAV = [
  { to: '/',           id:'dashboard',  label: 'Dashboard',  icon: 'grid'    },
  { to: '/orders',     id:'orders',     label: 'Orders',     icon: 'box',     badge: 'orders' },
  { to: '/leads',      id:'leads',      label: 'Leads',      icon: 'target',  badge: 'leads'  },
  { to: '/customers',  id:'customers',  label: 'Customers',  icon: 'users'   },
  { to: '/followups',  id:'followups',  label: 'Follow-ups', icon: 'bell',    badge: 'followups' },
  { to: '/whatsapp',   id:'whatsapp',   label: 'WhatsApp',   icon: 'whatsapp'},
  { to: '/reports',    id:'reports',    label: 'Reports',    icon: 'chart'   },
  { to: '/settings',   id:'settings',   label: 'Settings',   icon: 'gear'    },
];

const NAV_SECTIONS = [
  { items: NAV.slice(0, 4) },
  { label: 'ENGAGE', items: NAV.slice(4, 6) },
  { label: 'TOOLS',  items: NAV.slice(6, 8) },
];

export default function Sidebar({ open, onClose, onSearchOpen, onQuickAdd }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [badges, setBadges] = useState({ followups: 0 });
  const [target, setTarget] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [fu, dash] = await Promise.all([
          api.get('/followups/count'),
          api.get('/dashboard/stats'),
        ]);
        setBadges(b => ({ ...b, followups: fu.data.count || 0 }));
        const ov = dash.data?.overview;
        if (ov) {
          const pct = Math.min(100, Math.round(((ov.totalRevenue || 0) / 500000) * 100));
          const fmt = (n) => {
            const v = Number(n || 0);
            if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
            if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
            if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
            return `₹${v}`;
          };
          setTarget({ pct, current: fmt(ov.totalRevenue||0), max: fmt(500000) });
        }
      } catch {}
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = (user?.name || user?.email || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const Content = () => (
    <aside className="sidebar-shell" style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--rule)',
      padding: '16px 10px 12px',
      boxShadow: '1px 0 0 var(--rule)',
      overflowY: 'visible', overflowX: 'hidden',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 4px 20px', minWidth: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(61,138,92,.3)' }}>
          <Icon name="leaf" size={17} stroke={2} color="white" />
        </div>
        <div className="sidebar-brand-text" style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>NK Herbal</div>
          <div style={{ fontSize: 10, color: 'var(--faint)', letterSpacing: '0.02em', marginTop: 1 }}>Sales workspace</div>
        </div>
        <button onClick={onQuickAdd} title="Quick add (N)"
          className="sidebar-label"
          style={{ marginLeft: 'auto', width: 26, height: 26, borderRadius: 7, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0, transition: 'opacity 0.15s, transform 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>

      {/* Search */}
      <div onClick={() => { onSearchOpen?.(); onClose?.(); }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 9px', borderRadius: 9, border: '1.5px solid var(--rule-strong)', background: 'var(--bg)', marginBottom: 16, cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s', boxShadow: 'var(--shadow-soft)' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-bg)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--rule-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-soft)'; }}>
        <Icon name="search" size={14} color="var(--faint)" />
        <span className="sidebar-label" style={{ fontSize: 12, color: 'var(--faint)', flex: 1 }}>Search…</span>
        <kbd className="sidebar-label" style={{ fontFamily: 'Inter', fontSize: 9, color: 'var(--faint)', background: 'var(--chip)', padding: '1px 5px', borderRadius: 4, border: '1px solid var(--rule)' }}>⌘K</kbd>
      </div>

      {/* Navigation — sectioned */}
      {NAV_SECTIONS.map(({ label, items }, si) => (
        <div key={si} style={{ marginBottom: 4 }}>
          {label && (
            <div className="sidebar-label" style={{ fontSize: 9, fontWeight: 700, color: 'var(--faint)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '12px 9px 4px', userSelect: 'none' }}>
              {label}
            </div>
          )}
          {!label && si > 0 && <div style={{ height: 8 }} />}
          {items.map(({ to, label: navLabel, icon, badge }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={onClose}
              className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 9px', borderRadius: 9, cursor: 'pointer', textDecoration: 'none',
                color: isActive ? 'var(--accent-ink)' : 'var(--muted)',
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                marginBottom: 2, minWidth: 0,
              })}>
              {({ isActive }) => (
                <>
                  <div style={{ flexShrink: 0, display: 'flex' }}>
                    <Icon name={icon} size={17} stroke={isActive ? 2 : 1.6} color={isActive ? 'var(--accent-ink)' : 'var(--faint)'} />
                  </div>
                  <span className="sidebar-label" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{navLabel}</span>
                  {badge && badges[badge] > 0 && (
                    <span className="sidebar-label" style={{
                      fontFamily: 'Inter', fontSize: 10, padding: '2px 7px', borderRadius: 999,
                      background: isActive ? 'rgba(255,255,255,.22)' : 'var(--chip)',
                      color: isActive ? '#fff' : 'var(--faint)',
                      fontWeight: 700, flexShrink: 0,
                    }}>
                      {badges[badge] > 99 ? '99+' : badges[badge]}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      ))}

      {/* Monthly target */}
      {target && (
        <div className="sidebar-label" style={{ marginTop: 'auto', padding: '12px 12px', borderRadius: 12, background: 'var(--bg)', border: '1.5px solid var(--rule-strong)', boxShadow: 'var(--shadow-soft)', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.02em' }}>Monthly target</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg)', fontFamily: 'Inter', fontVariantNumeric: 'tabular-nums' }}>{target.pct}%</div>
          </div>
          <div style={{ width: '100%', height: 5, background: 'var(--rule-strong)', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
            <div style={{ width: `${target.pct}%`, height: '100%', background: `linear-gradient(90deg, var(--accent), ${target.pct > 80 ? '#22c55e' : 'var(--accent)'})`, borderRadius: 3, transition: 'width .5s cubic-bezier(.16,1,.3,1)' }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--faint)', fontFamily: 'Inter', fontVariantNumeric: 'tabular-nums' }}>{target.current} of {target.max}</div>
        </div>
      )}

      {/* Bottom: theme + notifications + user */}
      <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 8, marginTop: target ? 8 : 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={toggle}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 9px', borderRadius: 9, border: 'none', background: 'transparent', color: 'var(--muted)', fontSize: 12.5, cursor: 'pointer', flex: 1, fontFamily: 'inherit', transition: 'background 0.15s, color 0.15s', minWidth: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--fg)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}>
            <div style={{ flexShrink: 0 }}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} stroke={1.6} /></div>
            <span className="sidebar-label">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <NotificationCenter />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px 2px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, boxShadow: '0 2px 6px rgba(61,138,92,.28)' }}>
            {initials}
          </div>
          <div className="sidebar-label" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</div>
            <div style={{ fontSize: 10.5, color: 'var(--faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
          <button onClick={handleLogout} title="Sign out" className="sidebar-label"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--faint)', display: 'flex', padding: 5, borderRadius: 7, flexShrink: 0, transition: 'background 0.15s, color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--faint)'; }}>
            <Icon name="logout" size={14} stroke={1.6} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="lg-sidebar">
        <Content />
      </div>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(37,35,32,.4)' }} onClick={onClose} />
          <div style={{ position: 'relative', zIndex: 50 }}>
            <Content />
          </div>
        </div>
      )}
      <style>{`
        .lg-sidebar {
          display: none;
          position: fixed;
          inset: 0 auto 0 0;
          z-index: 30;
        }
        @media (min-width: 1024px) { .lg-sidebar { display: flex; flex-direction: column; } }
      `}</style>
    </>
  );
}
