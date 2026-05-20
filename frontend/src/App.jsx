import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './components/Toast';
import Modal from './components/Modal';
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
  const [results, setResults] = useState({ orders: [], customers: [], leads: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  useEffect(() => {
    if (open) { setQ(''); setResults({ orders: [], customers: [] }); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  useEffect(() => {
    if (!q.trim()) { setResults({ orders: [], customers: [], leads: [] }); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const [o, c, l] = await Promise.all([
          api.get('/orders', { params: { search: q, limit: 5 } }),
          api.get('/customers', { params: { search: q, limit: 5 } }),
          api.get('/leads', { params: { search: q, limit: 5 } }),
        ]);
        setResults({ orders: o.data.orders || [], customers: c.data.customers || [], leads: l.data.leads || [] });
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
            <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search orders, customers, leads…"
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
            {results.leads.length > 0 && <>
              <div style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--faint)', padding: '6px 10px', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>Leads</div>
              {results.leads.map(l => (
                <button key={l._id} onClick={() => go('/leads')} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'var(--fg)', fontSize: 12 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 999, background: 'var(--info-bg)', color: 'var(--info)', fontWeight: 500 }}>{l.source}</span>
                    <span style={{ fontWeight: 500 }}>{l.name}</span>
                  </div>
                  <span style={{ color: 'var(--faint)', fontFamily: 'Inter', fontSize: 11 }}>{l.status}</span>
                </button>
              ))}
            </>}
            {!q && <div style={{ padding: '16px 10px', color: 'var(--faint)', fontSize: 12, textAlign: 'center' }}>Type to search orders, customers and leads</div>}
            {q && !loading && !results.orders.length && !results.customers.length && !results.leads.length && (
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
  const [quickAdd, setQuickAdd] = useState(null); // null | 'menu' | 'lead' | 'order'
  const [quickForm, setQuickForm] = useState({});
  const [quickSaving, setQuickSaving] = useState(false);
  const { addToast } = useToast();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [badges] = useState({ orders: 0, leads: 0 });

  const PRODUCTS = ['Muejaza For Men (300g)', 'Muejaza Plus For Men (300g)', 'Testo – Vardhak For Men (300g)', 'Shahi Kalp For Men & Women (300g)', 'Kashmiri Shilajit 25g', 'Kashmiri Shilajit 50g', 'Muejaza & Shahi Kalp Combo (300g)'];

  const QUICK_LEAD_EMPTY = {
    date: new Date().toISOString().split('T')[0],
    name: '', mobile: '', source: 'WhatsApp',
    interestedProduct: 'Muejaza For Men (300g)',
    status: 'Interested', notes: ''
  };
  const QUICK_ORDER_EMPTY = {
    orderDate: new Date().toISOString().split('T')[0],
    customerName: '', mobile: '', city: '',
    productName: 'Muejaza For Men (300g)',
    quantity: 1, orderValue: 4499,
    salesChannel: 'WhatsApp', leadSource: 'Organic',
    paymentStatus: 'Paid', orderStatus: 'Processing',
    customerType: 'New'
  };

  const saveQuickLead = async (e) => {
    e.preventDefault(); setQuickSaving(true);
    try {
      await api.post('/leads', quickForm);
      addToast('Lead added successfully');
      setQuickAdd(null);
    } catch (err) { addToast(err.response?.data?.message || 'Failed to save lead', 'error'); }
    finally { setQuickSaving(false); }
  };

  const saveQuickOrder = async (e) => {
    e.preventDefault(); setQuickSaving(true);
    try {
      await api.post('/orders', quickForm);
      addToast('Order added successfully');
      setQuickAdd(null);
    } catch (err) { addToast(err.response?.data?.message || 'Failed to save order', 'error'); }
    finally { setQuickSaving(false); }
  };

  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
      if (e.key === 'n' || e.key === 'N') {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (document.activeElement?.contentEditable === 'true') return;
        e.preventDefault();
        setQuickAdd('menu');
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="app-shell" style={{ display: 'flex' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onSearchOpen={() => setSearchOpen(true)} onQuickAdd={() => setQuickAdd('menu')} />
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
      {quickAdd === 'menu' && createPortal(
        <div style={{ position:'fixed', inset:0, zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setQuickAdd(null)}>
          <div style={{ position:'absolute', inset:0, background:'rgba(37,35,32,.5)', backdropFilter:'blur(4px)' }} />
          <div className="modal-enter" style={{ position:'relative', background:'var(--card)', border:'1px solid var(--rule)', borderRadius:16, padding:24, width:300, boxShadow:'0 8px 40px rgba(37,35,32,.18)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:15, fontWeight:600, color:'var(--fg)', marginBottom:4 }}>Quick add</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginBottom:18 }}>Press N to open · Esc to close</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { type:'lead', title:'Add Lead', desc:'Capture a new enquiry', icon:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
                { type:'order', title:'Add Order', desc:'Record a new sale', icon:'M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10' },
              ].map(({ type, title, desc, icon }) => (
                <button key={type}
                  onClick={() => { setQuickForm(type === 'lead' ? {...QUICK_LEAD_EMPTY} : {...QUICK_ORDER_EMPTY}); setQuickAdd(type); }}
                  style={{ padding:'14px 16px', borderRadius:12, border:'1px solid var(--rule)', background:'var(--bg)', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:12, transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.background='var(--accent-bg)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--rule)'; e.currentTarget.style.background='var(--bg)'; }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'var(--accent-bg)', display:'grid', placeItems:'center', flexShrink:0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--fg)' }}>{title}</div>
                    <div style={{ fontSize:11.5, color:'var(--muted)', marginTop:2 }}>{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
      {quickAdd === 'lead' && (
        <Modal open={true} onClose={() => setQuickAdd(null)} title="Quick add lead">
          <form onSubmit={saveQuickLead} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div>
              <label className="label">Full Name *</label>
              <input className="input" required value={quickForm.name||''} onChange={e=>setQuickForm(f=>({...f,name:e.target.value}))} placeholder="Customer name" />
            </div>
            <div>
              <label className="label">Mobile *</label>
              <input className="input" required value={quickForm.mobile||''} onChange={e=>setQuickForm(f=>({...f,mobile:e.target.value}))} placeholder="10-digit number" />
            </div>
            <div>
              <label className="label">Source</label>
              <select className="input" value={quickForm.source||'WhatsApp'} onChange={e=>setQuickForm(f=>({...f,source:e.target.value}))}>
                {['Ads','WhatsApp','Website','Referral','Direct'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={quickForm.status||'Interested'} onChange={e=>setQuickForm(f=>({...f,status:e.target.value}))}>
                {['Interested','Follow Up','Converted','Not Interested'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label className="label">Interested Product</label>
              <select className="input" value={quickForm.interestedProduct||PRODUCTS[0]} onChange={e=>setQuickForm(f=>({...f,interestedProduct:e.target.value}))}>
                {PRODUCTS.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:'1/-1', display:'flex', justifyContent:'flex-end', gap:8, borderTop:'1px solid var(--rule)', paddingTop:14 }}>
              <button type="button" className="btn-secondary" onClick={() => setQuickAdd(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={quickSaving}>{quickSaving?'Saving…':'Add Lead'}</button>
            </div>
          </form>
        </Modal>
      )}
      {quickAdd === 'order' && (
        <Modal open={true} onClose={() => setQuickAdd(null)} title="Quick add order">
          <form onSubmit={saveQuickOrder} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div>
              <label className="label">Customer Name *</label>
              <input className="input" required value={quickForm.customerName||''} onChange={e=>setQuickForm(f=>({...f,customerName:e.target.value}))} placeholder="Full name" />
            </div>
            <div>
              <label className="label">Mobile *</label>
              <input className="input" required value={quickForm.mobile||''} onChange={e=>setQuickForm(f=>({...f,mobile:e.target.value}))} placeholder="10-digit number" />
            </div>
            <div>
              <label className="label">Product *</label>
              <select className="input" value={quickForm.productName||PRODUCTS[0]} onChange={e=>setQuickForm(f=>({...f,productName:e.target.value}))}>
                {PRODUCTS.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Order Value (₹) *</label>
              <input type="number" className="input" required min="0" value={quickForm.orderValue||''} onChange={e=>setQuickForm(f=>({...f,orderValue:Number(e.target.value)}))} />
            </div>
            <div>
              <label className="label">Channel</label>
              <select className="input" value={quickForm.salesChannel||'WhatsApp'} onChange={e=>setQuickForm(f=>({...f,salesChannel:e.target.value}))}>
                {['WhatsApp','Website'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Payment</label>
              <select className="input" value={quickForm.paymentStatus||'Paid'} onChange={e=>setQuickForm(f=>({...f,paymentStatus:e.target.value}))}>
                {['Paid','COD','Pending'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:'1/-1', display:'flex', justifyContent:'flex-end', gap:8, borderTop:'1px solid var(--rule)', paddingTop:14 }}>
              <button type="button" className="btn-secondary" onClick={() => setQuickAdd(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={quickSaving}>{quickSaving?'Saving…':'Add Order'}</button>
            </div>
          </form>
        </Modal>
      )}
      {isMobile && <BottomNav badges={badges} />}
      <style>{`
        @media (min-width: 1024px) {
          .lg-main { margin-left: 72px; min-width: 0; overflow-x: hidden; }
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
