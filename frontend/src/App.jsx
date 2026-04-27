import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Leads from './pages/Leads';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import FollowUps from './pages/FollowUps';
import api from './utils/api';
import { Search, Menu, X } from 'lucide-react';

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
        const [ordRes, custRes] = await Promise.all([
          api.get('/orders', { params: { search: q, limit: 5 } }),
          api.get('/customers', { params: { search: q, limit: 5 } })
        ]);
        setResults({ orders: ordRes.data.orders || [], customers: custRes.data.customers || [] });
      } catch {}
      finally { setLoading(false); }
    }, 300);
  }, [q]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const go = (path) => { navigate(path); onClose(); };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-xl modal-enter" onClick={e => e.stopPropagation()}>
        <div className="rounded-2xl border shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <Search size={16} style={{ color: 'var(--text-faint)' }} />
            <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search orders, customers…" className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--text)' }} />
            {loading && <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />}
            <button onClick={onClose}><X size={16} style={{ color: 'var(--text-faint)' }} /></button>
          </div>
          {(results.orders.length > 0 || results.customers.length > 0) && (
            <div className="p-2 max-h-80 overflow-y-auto">
              {results.orders.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Orders</p>
                  {results.orders.map(o => (
                    <button key={o._id} onClick={() => go('/orders')} className="w-full text-left px-3 py-2 rounded-lg flex items-center justify-between hover:opacity-80 transition-opacity" style={{ background: 'var(--bg-subtle)' }}>
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{o.customerName}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{o.orderId} · ₹{o.orderValue?.toLocaleString()}</span>
                    </button>
                  ))}
                </>
              )}
              {results.customers.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-widest mt-2" style={{ color: 'var(--text-faint)' }}>Customers</p>
                  {results.customers.map(c => (
                    <button key={c._id} onClick={() => go('/customers')} className="w-full text-left px-3 py-2 rounded-lg flex items-center justify-between hover:opacity-80 transition-opacity" style={{ background: 'var(--bg-subtle)' }}>
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{c.name}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.mobile} · {c.city}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
          {q && !loading && results.orders.length === 0 && results.customers.length === 0 && (
            <p className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-faint)' }}>No results for "{q}"</p>
          )}
          {!q && (
            <p className="px-4 py-5 text-center text-sm" style={{ color: 'var(--text-faint)' }}>Type to search across orders and customers</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onSearchOpen={() => setSearchOpen(true)} />
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 backdrop-blur-md border-b px-4 py-3 flex items-center gap-3 lg:hidden"
          style={{ background: 'color-mix(in srgb, var(--bg-card) 85%, transparent)', borderColor: 'var(--border)' }}>
          <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            <Menu size={20} />
          </button>
          <span className="font-bold text-sm flex-1" style={{ color: 'var(--text)' }}>CRM Dashboard</span>
          <button onClick={() => setSearchOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            <Search size={18} />
          </button>
        </header>
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  );
  return user ? <Layout /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/followups" element={<FollowUps />} />
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
