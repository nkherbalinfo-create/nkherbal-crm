import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import NotificationCenter from './NotificationCenter';
import {
  LayoutDashboard, Package, Crosshair, Users, Bell,
  MessageCircle, BarChart2, Settings2, Search,
  Sun, Moon, Leaf, LogOut, Plus, Zap
} from 'lucide-react';

const ICON_MAP = {
  grid:     LayoutDashboard,
  box:      Package,
  target:   Crosshair,
  users:    Users,
  bell:     Bell,
  message:  MessageCircle,
  whatsapp: MessageCircle,
  chart:    BarChart2,
  gear:     Settings2,
  search:   Search,
  sun:      Sun,
  moon:     Moon,
  leaf:     Leaf,
  logout:   LogOut,
};

const Icon = ({ name, size = 16, color = 'currentColor' }) => {
  const Comp = ICON_MAP[name];
  if (!Comp) return null;
  return <Comp size={size} color={color} strokeWidth={1.8} style={{ display:'block', flexShrink:0 }} />;
};

const NAV = [
  { to: '/',           id:'dashboard',  label: 'Dashboard',  icon: 'grid'    },
  { to: '/orders',     id:'orders',     label: 'Orders',     icon: 'box',     badge: 'orders' },
  { to: '/leads',      id:'leads',      label: 'Leads',      icon: 'target',  badge: 'leads'  },
  { to: '/customers',  id:'customers',  label: 'Customers',  icon: 'users'   },
  { to: '/followups',  id:'followups',  label: 'Follow-ups', icon: 'bell',    badge: 'followups' },
  { to: '/whatsapp',   id:'whatsapp',   label: 'WhatsApp',   icon: 'whatsapp', badge: 'whatsapp' },
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
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const toggleCollapse = () => {
    setCollapsed(c => {
      const n = !c;
      try { localStorage.setItem('sidebar_collapsed', String(n)); } catch {}
      return n;
    });
  };
  useEffect(() => {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    return () => document.body.classList.remove('sidebar-collapsed');
  }, [collapsed]);

  const loadWaBadge = async () => {
    try {
      const { data } = await api.get('/wa');
      const seenCounts = JSON.parse(localStorage.getItem('wa_seen_v2') || '{}');
      const waUnread = (data || []).reduce((total, c) =>
        total + Math.max(0, (c.messageCount || 0) - (seenCounts[c.phone] || 0)), 0
      );
      setBadges(b => ({ ...b, whatsapp: waUnread }));
    } catch {}
  };

  // Poll WA unread badge every 5s — always live on any page
  useEffect(() => {
    loadWaBadge();
    const t = setInterval(loadWaBadge, 5000);
    return () => clearInterval(t);
  }, []);

  // Also update immediately when WhatsApp page marks messages as seen
  useEffect(() => {
    window.addEventListener('wa-unread-changed', loadWaBadge);
    return () => window.removeEventListener('wa-unread-changed', loadWaBadge);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [fu, dash, wa] = await Promise.all([
          api.get('/followups/count'),
          api.get('/dashboard/stats'),
          api.get('/wa'),
        ]);
        setBadges(b => ({ ...b, followups: fu.data.count || 0 }));
        // Count WA conversations with unread messages using seenCounts from localStorage
        try {
          const seenCounts = JSON.parse(localStorage.getItem('wa_seen_v2') || '{}');
          const waUnread = (wa.data || []).filter(c =>
            Math.max(0, (c.messageCount || 0) - (seenCounts[c.phone] || 0)) > 0
          ).length;
          setBadges(b => ({ ...b, whatsapp: waUnread }));
        } catch {}
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

  const Content = ({ forceExpanded = false }) => {
    const c = collapsed && !forceExpanded;
    return (
      <aside style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: 'var(--sidebar-bg)', borderRight: '1px solid var(--rule)',
        padding: '16px 8px 12px',
        overflowY: 'auto', overflowX: 'hidden',
        transition: 'padding 0.35s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: c ? 0 : 10, padding: '4px 0 18px', justifyContent: c ? 'center' : 'flex-start', transition: 'gap 0.35s, justify-content 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
          <div
            onClick={c ? toggleCollapse : undefined}
            title={c ? 'Expand sidebar' : undefined}
            style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 2px 10px rgba(61,138,92,.35)', cursor: c ? 'pointer' : 'default', transition: 'transform 0.15s' }}
            onMouseEnter={e => { if (c) e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { if (c) e.currentTarget.style.transform = 'scale(1)'; }}>
            <Icon name="leaf" size={18} stroke={2} color="white" />
          </div>
          <div style={{ display: c ? 'none' : 'flex', flex: 1, gap: 10, alignItems: 'center', minWidth: 0 }}>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.01em' }}>NK Herbal</div>
              <div style={{ fontSize: 10.5, color: 'var(--faint)', letterSpacing: '0.02em' }}>Sales workspace</div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              <button onClick={onQuickAdd}
                title="Quick add (N)"
                style={{ width:26, height:26, borderRadius:8, border:'none', background:'var(--accent)', color:'#fff', cursor:'pointer', display:'grid', placeItems:'center', flexShrink:0, opacity:0.9, transition:'opacity 0.15s, transform 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='scale(1.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity='0.9'; e.currentTarget.style.transform='scale(1)'; }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <button onClick={toggleCollapse}
                title="Collapse sidebar"
                style={{ width:26, height:26, borderRadius:8, border:'none', background:'var(--hover)', color:'var(--muted)', cursor:'pointer', display:'grid', placeItems:'center', flexShrink:0, opacity:0.8, transition:'opacity 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.opacity='1'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity='0.8'; }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Search — hidden when collapsed */}
        <div onClick={() => { onSearchOpen?.(); onClose?.(); }}
          style={{ background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 10, padding: '8px 11px', display: c ? 'none' : 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', marginBottom: 14, cursor: 'pointer', boxShadow: '0 1px 3px rgba(37,35,32,.05)', opacity: 1, transition: 'opacity 0.35s 50ms cubic-bezier(0.4,0,0.2,1)' }}
          onMouseEnter={e => { if (!c) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(61,138,92,.1)'; } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--rule)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(37,35,32,.05)'; }}>
          <Icon name="search" size={13} />
          <span style={{ fontSize: 12, flex: 1, color: 'var(--faint)' }}>Search…</span>
          <kbd style={{ fontFamily: 'Inter', fontSize: 9.5, color: 'var(--faint)', background: 'var(--chip)', padding: '1px 5px', borderRadius: 4, border: '1px solid var(--rule)' }}>⌘K</kbd>
        </div>

        {/* Navigation */}
        {NAV_SECTIONS.map(({ label, items }, si) => (
          <div key={si} style={{ marginTop: label ? 14 : 0, transition: 'margin-top 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
            {label && (
              <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--faint)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 11px 8px', userSelect: 'none', display: c ? 'none' : 'block', opacity: 1, transition: `opacity 0.35s ${si === 0 ? 100 : 200}ms cubic-bezier(0.4,0,0.2,1)` }}>
                {label}
              </div>
            )}
            {items.map(({ to, label: navLabel, icon, badge }, itemIdx) => (
              <NavLink key={to} to={to} end={to === '/'} onClick={onClose}
                className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
                title={c ? navLabel : undefined}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', justifyContent: c ? 'center' : 'flex-start', gap: c ? 0 : 10,
                  width: c ? 40 : 'auto', height: c ? 40 : 'auto',
                  padding: c ? 0 : '9px 11px', borderRadius: 10, cursor: 'pointer', textDecoration: 'none',
                  color: isActive ? 'var(--accent-ink)' : 'var(--muted)',
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  marginBottom: 1,
                  marginLeft: c ? 'auto' : 'unset', marginRight: c ? 'auto' : 'unset',
                  transition: 'gap 0.35s, padding 0.35s, width 0.35s, height 0.35s, justify-content 0.35s cubic-bezier(0.4,0,0.2,1)',
                })}>
                {({ isActive }) => (
                  <>
                    <Icon name={icon} size={16} stroke={isActive ? 2 : 1.6} color={isActive ? 'var(--accent-ink)' : 'var(--faint)'} />
                    <span style={{ flex: 1, minWidth: 0, display: c ? 'none' : 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 1, transition: `opacity 0.35s ${100 + itemIdx * 25}ms cubic-bezier(0.4,0,0.2,1)` }}>{navLabel}</span>
                    {badge && badges[badge] > 0 && (
                      <span style={{
                        fontFamily: 'Inter', fontSize: 10, padding: '2px 7px', borderRadius: 999,
                        background: isActive ? 'rgba(255,255,255,0.95)' : 'var(--accent-bg)',
                        color: 'var(--accent)', fontWeight: 700,
                        minWidth: 18, textAlign: 'center',
                        display: c ? 'none' : 'block', opacity: 1, transition: `opacity 0.35s ${100 + itemIdx * 25}ms cubic-bezier(0.4,0,0.2,1)`
                      }}>
                        {badges[badge] > 50 ? '50+' : badges[badge]}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}

        {/* Monthly target — hidden when collapsed */}
        {target && (
          <div style={{ margin: 'auto 0 0', padding: '12px 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--rule)', boxShadow: 'var(--shadow-card)', display: c ? 'none' : 'block', opacity: 1, transition: 'opacity 0.35s 250ms cubic-bezier(0.4,0,0.2,1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)' }}>Monthly target</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', fontFamily: 'Inter', fontVariantNumeric: 'tabular-nums' }}>{target.pct}%</div>
            </div>
            <div style={{ width: '100%', height: 5, background: 'var(--rule)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ width: `${target.pct}%`, height: '100%', background: `linear-gradient(90deg, var(--accent), ${target.pct > 80 ? '#2ecc71' : 'var(--accent)'})`, borderRadius: 3, transition: 'width .4s cubic-bezier(.16,1,.3,1)' }} />
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--faint)', fontFamily: 'Inter', fontVariantNumeric: 'tabular-nums' }}>
              {target.current} of {target.max}
            </div>
          </div>
        )}
        {c && <div style={{ marginTop: 'auto' }} />}

        {/* Bottom: theme + notifications + user */}
        <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 8, marginTop: c ? 0 : 10, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {c ? (
            /* Collapsed: icon-only column */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '4px 0' }}>
              <button onClick={toggle} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', display: 'grid', placeItems: 'center', transition: 'background 0.15s, color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--fg)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}>
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <NotificationCenter />
              </div>
              <div title={user?.name || 'User'}
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, boxShadow: '0 2px 6px rgba(61,138,92,.3)', cursor: 'default' }}>
                {initials}
              </div>
              <button onClick={handleLogout} title="Sign out"
                style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: 'transparent', color: 'var(--faint)', cursor: 'pointer', display: 'grid', placeItems: 'center', transition: 'background 0.15s, color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--faint)'; }}>
                <Icon name="logout" size={14} />
              </button>
            </div>
          ) : (
            /* Expanded: full layout */
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 4px', height: 38 }}>
                <button onClick={toggle}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 9, border: 'none', background: 'transparent', color: 'var(--muted)', fontSize: 12.5, cursor: 'pointer', flex: 1, fontFamily: 'inherit', transition: 'background 0.15s ease, color 0.15s ease', lineHeight: 1, height: 38, whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--fg)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}>
                  <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} stroke={1.6} />
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <NotificationCenter />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 11px 4px', borderRadius: 9, marginTop: 2 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, boxShadow: '0 2px 6px rgba(61,138,92,.3)' }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
                </div>
                <button onClick={handleLogout} title="Sign out"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--faint)', display: 'flex', padding: 6, borderRadius: 7, transition: 'background 0.15s, color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--faint)'; }}>
                  <Icon name="logout" size={14} stroke={1.6} />
                </button>
              </div>
            </>
          )}

        </div>
      </aside>
    );
  };

  return (
    <>
      <div className={`lg-sidebar${collapsed ? ' lg-sidebar--collapsed' : ''}`}>
        <Content />
      </div>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(37,35,32,.4)' }} onClick={onClose} />
          <div style={{ position: 'relative', zIndex: 50 }}>
            <Content forceExpanded />
          </div>
        </div>
      )}
      <style>{`
        .lg-sidebar {
          display: none;
          position: fixed;
          inset: 0 auto 0 0;
          width: 248px;
          z-index: 30;
          transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .lg-sidebar--collapsed {
          width: 88px;
        }
        @media (min-width: 1024px) { .lg-sidebar { display: flex; flex-direction: column; } }
      `}</style>
    </>
  );
}
