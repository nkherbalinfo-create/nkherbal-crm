import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { format } from 'date-fns';
import { RefreshCw, Trash2 } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1, page: 1 });
  const [filters, setFilters] = useState({ type: '', search: '' });
  const [page, setPage] = useState(1);
  const [profileModal, setProfileModal] = useState(false);
  const [profile, setProfile] = useState(null);
  const [recalculating, setRecalculating] = useState(false);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    try {
      const params = { page, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) };
      const { data } = await api.get('/customers', { params });
      setCustomers(data.customers);
      setMeta({ total: data.total, page: data.page, pages: data.pages });
    } catch {}
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const viewProfile = async (mobile) => {
    try {
      const { data } = await api.get(`/customers/${mobile}/orders`);
      setProfile(data);
      setProfileModal(true);
    } catch {}
  };

  const recalculate = async () => {
    setRecalculating(true);
    try {
      const { data } = await api.post('/sync/recalculate', {});
      addToast(data.message, 'success');
      load();
    } catch { addToast('Recalculate failed', 'error'); }
    finally { setRecalculating(false); }
  };

  const deleteCustomer = async (mobile, name) => {
    if (!confirm(`Delete "${name}" and all their orders? This cannot be undone.`)) return;
    try {
      await api.delete(`/customers/${mobile}`);
      addToast(`${name} deleted`, 'success');
      load();
    } catch { addToast('Delete failed', 'error'); }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Customers</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{meta.total} total customers</p>
        </div>
        <button onClick={recalculate} disabled={recalculating} className="btn-secondary flex items-center gap-1.5 disabled:opacity-50 text-sm">
          <RefreshCw size={14} className={recalculating ? 'animate-spin' : ''} />
          {recalculating ? 'Recalculating…' : 'Recalculate Stats'}
        </button>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-2">
          <input className="input flex-1 min-w-[180px] text-sm" placeholder="Search name or mobile..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
          <select className="input w-auto text-sm" value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
            <option value="">All Types</option>
            <option value="new">New</option>
            <option value="repeat">Repeat</option>
          </select>
          <button onClick={() => { setPage(1); load(); }} className="btn-primary text-sm">Filter</button>
          <button onClick={() => { setFilters({type:'',search:''}); setPage(1); }} className="btn-secondary text-sm">Clear</button>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
            <tr>
              {['Name','Mobile','City','Type','Total Orders','Total Revenue','Last Order','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: 'var(--text-faint)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c._id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: `hsl(${(c.name.charCodeAt(0) * 37) % 360}, 65%, 50%)` }}>
                      {c.name.slice(0,2).toUpperCase()}
                    </div>
                    <span className="font-semibold" style={{ color: 'var(--text)' }}>{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{c.mobile}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{c.city || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${c.isRepeat ? 'badge-purple' : 'badge-cyan'}`}>
                    {c.isRepeat ? 'Repeat' : 'New'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center font-bold" style={{ color: 'var(--text)' }}>{c.totalOrders}</td>
                <td className="px-4 py-3 font-bold" style={{ color: 'var(--success)' }}>₹{c.totalRevenue?.toLocaleString()}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-faint)' }}>
                  {c.lastOrderDate ? format(new Date(c.lastOrderDate), 'dd MMM yyyy') : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => viewProfile(c.mobile)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                      style={{ background: '#6366f115', color: 'var(--accent)' }}>View</button>
                    <button onClick={() => deleteCustomer(c.mobile, c.name)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                      style={{ background: '#ef444415', color: 'var(--danger)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!customers.length && <tr><td colSpan={8} className="text-center py-12" style={{ color: 'var(--text-faint)' }}>No customers found</td></tr>}
          </tbody>
        </table>
      </div>

      {meta.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Page {meta.page} of {meta.pages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p-1)} className="btn-secondary disabled:opacity-50">← Prev</button>
            <button disabled={page >= meta.pages} onClick={() => setPage(p => p+1)} className="btn-secondary disabled:opacity-50">Next →</button>
          </div>
        </div>
      )}

      <Modal open={profileModal} onClose={() => setProfileModal(false)} title="Customer Profile" size="lg">
        {profile && (() => {
          const email = profile.orders?.find(o => o.email)?.email || '';
          const billingAddress = profile.orders?.find(o => o.billingAddress)?.billingAddress || '';
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Name', value: profile.customer?.name },
                  { label: 'Mobile', value: profile.customer?.mobile },
                  { label: 'City', value: profile.customer?.city || '—' },
                  { label: 'Total Orders', value: profile.customer?.totalOrders },
                  { label: 'Total Revenue', value: `₹${profile.customer?.totalRevenue?.toLocaleString()}` },
                  { label: 'Type', value: profile.customer?.isRepeat ? 'Repeat Customer' : 'New Customer' }
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl p-3" style={{ background: 'var(--bg-subtle)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{label}</p>
                    <p className="font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{value}</p>
                  </div>
                ))}
              </div>

              {(email || billingAddress) && (
                <div className="rounded-xl p-3 text-sm space-y-0.5" style={{ background: 'var(--bg-subtle)' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-faint)' }}>Billing Details</p>
                  {billingAddress && <p style={{ color: 'var(--text-muted)' }}>{billingAddress}</p>}
                  {email && <p style={{ color: 'var(--accent)' }}>{email}</p>}
                </div>
              )}

              <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Order History</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {profile.orders?.map(o => {
                  const items = o.lineItems?.length
                    ? o.lineItems
                    : [{ name: o.productName, quantity: o.quantity, gst: o.orderValue - o.orderValue / 1.05 }];
                  const totalGst = items.reduce((s, i) => s + (i.gst || 0), 0);
                  const statusStyle = o.orderStatus === 'Delivered' ? { bg: '#10b98120', color: '#34d399' }
                    : o.orderStatus === 'Cancelled' ? { bg: '#ef444420', color: '#f87171' }
                    : { bg: '#6366f115', color: '#818cf8' };
                  const payStyle = o.paymentStatus === 'Paid' ? { bg: '#10b98120', color: '#34d399' }
                    : o.paymentStatus === 'COD' ? { bg: '#f59e0b20', color: '#fbbf24' }
                    : { bg: '#ef444420', color: '#f87171' };
                  return (
                    <div key={o._id} className="p-3 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-sm">
                              <span className="font-semibold" style={{ color: 'var(--text)' }}>{item.name}</span>
                              <span className="text-xs" style={{ color: 'var(--text-faint)' }}>× {item.quantity}</span>
                            </div>
                          ))}
                          <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                            {o.orderId} · {format(new Date(o.orderDate), 'dd MMM yyyy')} · {o.salesChannel}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold" style={{ color: 'var(--success)' }}>₹{o.orderValue?.toLocaleString()}</p>
                          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>GST ₹{Number(totalGst).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-1.5 flex-wrap">
                        <span className={`badge text-xs ${o.orderStatus==='Delivered'?'badge-success':o.orderStatus==='Cancelled'?'badge-danger':'badge-purple'}`}>{o.orderStatus}</span>
                        <span className={`badge text-xs ${o.paymentStatus==='Paid'?'badge-success':o.paymentStatus==='COD'?'badge-warning':'badge-danger'}`}>{o.paymentStatus}</span>
                        {o.paymentMethod && <span className="badge text-xs badge-accent">{o.paymentMethod}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
