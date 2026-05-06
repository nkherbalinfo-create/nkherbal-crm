import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import { useIsMobile } from './hooks/useIsMobile';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Leads from './pages/Leads';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import FollowUps from './pages/FollowUps';
import WhatsApp from './pages/WhatsApp';
import api from './utils/api';

function MobileHeader({ className }) {
  const { user } = useAuth();
  const initials = (user?.name || user?.email || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <header className={className} style={{
      position: 'sticky', top: 0, zIndex: 20,
      background: 'var(--card)', borderBottom: '1px solid var(--rule)',
      padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(61,138,92,.3)' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21c0-9 7-16 18-16-1 11-7 18-18 16z"/>
            <path d="M3 21c4-4 8-7 14-10"/>
          </svg>
        </div>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.01em' }}>NK Herbal</span>
      </div>
      {/* Bell */}
      <button style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 6, display: 'flex', borderRadius: 8 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M6 8a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7z"/>
          <path d="M10 19a2 2 0 004 0"/>
        </svg>
      </button>
      {/* Avatar */}
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
        {initials}
      </div>
    </header>
  );
}

function SplashScreen({ onDone }) {
  return (
    <div className="splash-screen" onAnimationEnd={(e) => { if (e.animationName === 'splash-exit') onDone(); }}>
      <div className="splash-icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21c0-9 7-16 18-16-1 11-7 18-18 16z"/>
          <path d="M3 21c4-4 8-7 14-10"/>
        </svg>
      </div>
      <h1 className="splash-title">CRM Dashboard</h1>
      <p className="splash-brand">NK Herbal · Sales workspace</p>
      <p className="splash-by">by Jassim Sayed</p>
      <div className="splash-bar-wrap">
        <div className="splash-bar-fill" />
      </div>
    </div>
  );
}

function GlobalSearch({ open, onClose }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState({ orders: [], customers: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  useEffect(() => {
    if (open) { setQ(''); setResults({ orders: [], customers: [] }); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  useEffect(() => {
    if (!q.trim()) { setResults({ orders: [], customers: [] }); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const [o, c] = await Promise.all([
          api.get('/orders', { params: { search: q, limit: 5 } }),
          api.get('/customers', { params: { search: q, limit: 5 } }),
        ]);
        setResults({ orders: o.data.orders || [], customers: c.data.customers || [] });
      } catch {} finally { setLoading(false); }
    }, 300);
  }, [q]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;
  const go = (path) => { navigate(path); onClose(); };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80, padding: '80px 16px 16px' }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(37,35,32,.5)', backdropFilter: 'blur(4px)' }} />
      <div className="modal-enter" style={{ position: 'relative', width: '100%', maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 32px rgba(37,35,32,.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--rule)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--faint)', flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search orders, customers…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--fg)', fontFamily: 'inherit' }} />
            {loading && <div style={{ width: 14, height: 14, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
            <button onClick={onClose} style={{ color: 'var(--faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto', padding: 8 }}>
            {results.orders.length > 0 && <>
              <div style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--faint)', padding: '6px 10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Orders</div>
              {results.orders.map(o => (
                <button key={o._id} onClick={() => go('/orders')} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'var(--fg)', fontSize: 12 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ fontWeight: 500 }}>{o.customerName}</span>
                  <span style={{ color: 'var(--faint)', fontFamily: 'Inter', fontSize: 11 }}>{o.orderId} · ₹{o.orderValue?.toLocaleString('en-IN')}</span>
                </button>
              ))}
            </>}
            {results.customers.length > 0 && <>
              <div style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--faint)', padding: '6px 10px', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>Customers</div>
              {results.customers.map(c => (
                <button key={c._id} onClick={() => go('/customers')} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'var(--fg)', fontSize: 12 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ fontWeight: 500 }}>{c.name}</span>
                  <span style={{ color: 'var(--faint)', fontFamily: 'Inter', fontSize: 11 }}>{c.mobile}</span>
                </button>
              ))}
            </>}
            {!q && <div style={{ padding: '16px 10px', color: 'var(--faint)', fontSize: 12, textAlign: 'center' }}>Type to search orders and customers</div>}
            {q && !loading && !results.orders.length && !results.customers.length && (
              <div style={{ padding: '16px 10px', color: 'var(--faint)', fontSize: 12, textAlign: 'center' }}>No results for "{q}"</div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();
  const [badges] = useState({ orders: 0, leads: 0 });

  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="app-shell" style={{ display: 'flex' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onSearchOpen={() => setSearchOpen(true)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowX: 'hidden', minWidth: 0 }} className="lg-main">
        {/* Mobile header — no hamburger, bottom nav handles navigation */}
        <MobileHeader className="mobile-header" />
        <main className="content-shell" style={{ flex: 1 }}>
          <div key={location.key} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      {isMobile && <BottomNav badges={badges} />}
      <style>{`
        @media (min-width: 1024px) {
          .lg-main { margin-left: 232px; min-width: 0; overflow-x: hidden; }
          .mobile-header { display: none !important; }
        }
        @media (max-width: 767px) {
          .content-shell { padding-bottom: 80px !important; }
          .bulk-bar { bottom: 80px !important; }
        }
      `}</style>
    </div>
  );
}

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  return user ? <Layout /> : <Navigate to="/login" replace />;
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/followups" element={<FollowUps />} />
                <Route path="/whatsapp" element={<WhatsApp />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
