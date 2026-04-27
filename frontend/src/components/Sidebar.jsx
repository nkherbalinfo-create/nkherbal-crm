import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, ShoppingCart, Users, UserCheck,
  BarChart3, Settings, LogOut, Sun, Moon, Search, X, Bell
} from 'lucide-react';
import api from '../utils/api';

const NAV = [
  { to: '/',           label: 'Dashboard', icon: LayoutDashboard },
  { to: '/orders',     label: 'Orders',    icon: ShoppingCart },
  { to: '/leads',      label: 'Leads',     icon: UserCheck },
  { to: '/customers',  label: 'Customers', icon: Users },
  { to: '/followups',  label: 'Follow-ups',icon: Bell, badge: true },
  { to: '/reports',    label: 'Reports',   icon: BarChart3 },
  { to: '/settings',   label: 'Settings',  icon: Settings },
];

export default function Sidebar({ open, onClose, onSearchOpen }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [followUpCount, setFollowUpCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { data } = await api.get('/followups/count');
        setFollowUpCount(data.count || 0);
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60 * 1000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const initials = (user?.name || user?.email || 'U').slice(0, 2).toUpperCase();
  const handleLogout = () => { logout(); navigate('/login'); };

  const Content = () => (
    <div className="flex flex-col h-full" style={{ background: '#0f1117', borderRight: '1px solid #1e2130' }}>
      {/* Brand */}
      <div className="px-5 py-5 border-b flex items-center justify-between" style={{ borderColor: '#1e2130' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, var(--accent), #8b5cf6)' }}>
            C
          </div>
          <div>
            <p className="font-bold text-sm leading-tight" style={{ color: '#f1f5f9' }}>CRM Pro</p>
            <p className="text-xs leading-tight" style={{ color: '#64748b' }}>Sales Dashboard</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg"
          style={{ color: 'var(--text-muted)' }}>
          <X size={18} />
        </button>
      </div>

      {/* Search shortcut */}
      <div className="px-3 pt-3">
        <button onClick={() => { onSearchOpen?.(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors border"
          style={{ background: '#1a1f2e', borderColor: '#2a3040', color: '#64748b' }}>
          <Search size={14} />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="text-xs px-1.5 py-0.5 rounded-md font-mono hidden sm:block"
            style={{ background: '#2a3040', color: '#64748b' }}>⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, badge }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={({ isActive }) => ({
              background: isActive ? '#6366f1' : 'transparent',
              color: isActive ? '#fff' : '#8896b0',
              boxShadow: isActive ? '0 0 16px rgba(99,102,241,0.35)' : 'none',
            })}>
            <Icon size={17} />
            <span className="flex-1">{label}</span>
            {badge && followUpCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full text-xs font-bold flex items-center justify-center"
                style={{ background: '#ef4444', color: '#fff' }}>
                {followUpCount > 99 ? '99+' : followUpCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className="px-3 py-3 border-t space-y-1" style={{ borderColor: '#1e2130' }}>
        <button onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 hover:opacity-80"
          style={{ color: '#8896b0' }}>
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: '#1a1f2e' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: '#e2e8f0' }}>{user?.name || 'User'}</p>
            <p className="text-xs truncate" style={{ color: '#64748b' }}>{user?.email}</p>
          </div>
          <button onClick={handleLogout} title="Sign out"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: '#64748b' }}>
            <LogOut size={14} />
          </button>
        </div>
        <div className="border-t mt-1 pt-1" style={{ borderColor: '#1e2130' }} />
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 z-30">
        <Content />
      </aside>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <aside className="relative w-64 flex flex-col z-50 animate-slideIn">
            <Content />
          </aside>
        </div>
      )}
    </>
  );
}
