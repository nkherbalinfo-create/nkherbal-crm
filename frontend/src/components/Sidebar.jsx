import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';

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

export default function Sidebar({ open, onClose, onSearchOpen }) {
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
    <aside style={{
      width: 232, height: '100%', display: 'flex', flexDirection: 'column',
      background: 'var(--card)', borderRight: '1px solid var(--rule)',
      padding: '20px 10px', gap: 2, overflowY: 'auto'
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px 20px' }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name="leaf" size={17} stroke={2} color="currentColor" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>NK Herbal</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Sales workspace</div>
        </div>
      </div>

      {/* Search */}
      <div onClick={() => { onSearchOpen?.(); onClose?.(); }}
        style={{ background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 10, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', marginBottom: 8, cursor: 'pointer' }}>
        <Icon name="search" size={14} />
        <span style={{ fontSize: 12, flex: 1 }}>Search…</span>
        <span style={{ fontFamily: 'Inter', fontSize: 9.5, color: 'var(--faint)' }}>⌘K</span>
      </div>

      {/* Navigation */}
      {NAV.map(({ to, id, label, icon, badge }) => (
        <NavLink key={to} to={to} end={to === '/'} onClick={onClose} className="nav-link"
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 11,
            padding: '9px 12px', borderRadius: 9, cursor: 'pointer', textDecoration: 'none',
            background: isActive ? 'var(--card)' : 'transparent',
            boxShadow: isActive ? '0 1px 0 var(--rule), 0 0 0 1px var(--rule)' : 'none',
            color: isActive ? 'var(--fg)' : 'var(--muted)',
            fontSize: 13, fontWeight: isActive ? 500 : 400,
          })}>
          {({ isActive }) => (
            <>
              <Icon name={icon} size={15} stroke={1.6} color={isActive ? 'var(--accent)' : 'var(--faint)'} />
              <span style={{ flex: 1 }}>{label}</span>
              {badge && badges[badge] > 0 && (
                <span style={{
                  fontFamily: 'Inter', fontVariantNumeric: 'tabular-nums',
                  fontSize: 10, padding: '1px 7px', borderRadius: 999,
                  background: isActive ? 'var(--accent-bg)' : 'var(--chip)',
                  color: isActive ? 'var(--accent)' : 'var(--faint)',
                  transition: 'background 0.2s ease, color 0.2s ease',
                }}>
                  {badges[badge] > 99 ? '99+' : badges[badge]}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}

      {/* Monthly target */}
      {target && (
        <div style={{ marginTop: 'auto', padding: 14, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--rule)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Monthly target</div>
          <div style={{ fontFamily: 'Inter', fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 600, color: 'var(--fg)' }}>{target.pct}%</div>
          <div style={{ width: '100%', height: 6, background: 'var(--rule)', borderRadius: 3, overflow: 'hidden', margin: '8px 0' }}>
            <div style={{ width: `${target.pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 3, transition: 'width .3s' }} />
          </div>
          <div style={{ fontFamily: 'Inter', fontVariantNumeric: 'tabular-nums', fontSize: 10.5, color: 'var(--muted)' }}>
            {target.current} of {target.max}
          </div>
        </div>
      )}

      {/* Bottom: theme + user */}
      <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 8, marginTop: target ? 8 : 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 9, border: 'none', background: 'transparent', color: 'var(--muted)', fontSize: 13, cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} stroke={1.6} />
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</div>
            <div style={{ fontSize: 10.5, color: 'var(--faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
          <button onClick={handleLogout} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--faint)', display: 'flex', padding: 2, borderRadius: 4 }}>
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
          width: 232px;
          z-index: 30;
        }
        @media (min-width: 1024px) { .lg-sidebar { display: flex; flex-direction: column; } }
      `}</style>
    </>
  );
}
