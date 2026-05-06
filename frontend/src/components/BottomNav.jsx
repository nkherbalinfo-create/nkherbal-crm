import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Dashboard', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/></svg>
  )},
  { to: '/orders', label: 'Orders', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>
  ), badge: 'orders'},
  { to: '/leads', label: 'Leads', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>
  ), badge: 'leads'},
  { to: '/whatsapp', label: 'WhatsApp', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3 21l1.65-4.5A8 8 0 1112 20a8 8 0 01-3.4-.8L3 21z"/></svg>
  )},
  { to: '/settings', label: 'Settings', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
  )},
];

export default function BottomNav({ badges = {} }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      background: 'var(--card)', borderTop: '1px solid var(--rule)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '6px 0 10px',
      boxShadow: '0 -4px 16px rgba(37,35,32,.06)',
    }}>
      {TABS.map(({ to, label, icon, badge }) => (
        <NavLink key={to} to={to} end={to === '/'}
          style={{ textDecoration: 'none', flex: 1, display: 'flex', justifyContent: 'center' }}>
          {({ isActive }) => (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              color: isActive ? 'var(--accent)' : 'var(--faint)',
              position: 'relative', padding: '2px 8px',
            }}>
              {/* Badge */}
              {badge && badges[badge] > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: 2,
                  width: 16, height: 16, borderRadius: '50%',
                  background: 'var(--accent)', color: '#fff',
                  fontSize: 9, fontWeight: 700, display: 'grid', placeItems: 'center',
                }}>
                  {badges[badge] > 9 ? '9+' : badges[badge]}
                </span>
              )}
              {icon}
              <span style={{ fontSize: 9.5, fontWeight: isActive ? 600 : 400, letterSpacing: 0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:52 }}>{label}</span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
