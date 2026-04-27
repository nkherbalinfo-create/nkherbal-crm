import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { format } from 'date-fns';
import { Eye, Pencil, Trash2, RefreshCw, Copy, CheckCheck } from 'lucide-react';

const PRODUCTS = [
  { name: 'Muejaza For Men (300g)', price: 4499 },
  { name: 'Shahi Kalp For Men & Women (300g)', price: 4499 },
  { name: 'Testo – Vardhak For Men (300g)', price: 4199 },
  { name: 'Kashmiri Shilajit 25g', price: 1499 },
  { name: 'Kashmiri Shilajit 50g', price: 2499 },
  { name: 'Muejaza & Shahi Kalp Combo (300g)', price: 8999 },
  { name: 'Muejaza Plus For Men (300g)', price: 15000 },
  { name: 'Custom Product', price: 0 }
];
const PRODUCT_NAMES = PRODUCTS.map(p => p.name);
const PRODUCT_PRICE_MAP = Object.fromEntries(PRODUCTS.map(p => [p.name, p.price]));
const CHANNELS = ['Amazon', 'Website', 'WhatsApp', 'Offline'];
const SOURCES = ['Ads', 'Organic', 'Referral', 'Direct'];
const PAYMENT = ['Paid', 'COD', 'Pending'];
const STATUS = ['Processing', 'Shipped', 'Delivered', 'Cancelled', 'RTO'];

const STATUS_CLASS = {
  Delivered: 'badge-success', Cancelled: 'badge-danger',
  RTO: 'badge-warning', Shipped: 'badge-info', Processing: 'badge-purple',
};
const PAY_CLASS = { Paid: 'badge-success', COD: 'badge-warning', Pending: 'badge-danger' };

const emptyForm = {
  orderDate: new Date().toISOString().split('T')[0],
  customerName: '', mobile: '', city: '',
  productName: PRODUCTS[0].name, quantity: 1, orderValue: PRODUCTS[0].price,
  salesChannel: 'WhatsApp', leadSource: 'Organic',
  paymentStatus: 'Paid', orderStatus: 'Processing',
  followUpDone: false, upsellDone: false, notes: ''
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [filters, setFilters] = useState({ channel: '', status: '', paymentStatus: '', search: '', startDate: '', endDate: '' });
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    try {
      const params = { page, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) };
      const { data } = await api.get('/orders', { params });
      setOrders(data.orders);
      setMeta({ total: data.total, page: data.page, pages: data.pages });
    } catch { addToast('Failed to load orders', 'error'); }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const initLineItems = (o) => {
    if (o.lineItems?.length) return o.lineItems.map(i => ({ ...i }));
    const base = (o.orderValue || 0) / 1.05;
    const gst = (o.orderValue || 0) - base;
    return [{ name: o.productName || PRODUCTS[0].name, sku: '', price: parseFloat((base / (o.quantity || 1)).toFixed(2)), quantity: o.quantity || 1, total: parseFloat(base.toFixed(2)), gst: parseFloat(gst.toFixed(2)) }];
  };

  const openAdd = () => { setEditing(null); setForm({ ...emptyForm, lineItems: [] }); setModal(true); };
  const openEdit = (o) => { setEditing(o._id); setForm({ ...o, orderDate: o.orderDate?.split('T')[0] || '', lineItems: initLineItems(o) }); setModal(true); };
  const openView = (o) => { setViewOrder(o); setViewModal(true); };

  const updateLineItem = (i, field, value) => {
    setForm(f => {
      const items = f.lineItems.map((it, idx) => {
        if (idx !== i) return it;
        const updated = { ...it, [field]: value };
        if (field === 'price' || field === 'quantity') {
          const p = field === 'price' ? Number(value) : Number(it.price);
          const q = field === 'quantity' ? Number(value) : Number(it.quantity);
          updated.price = p; updated.quantity = q;
          updated.total = parseFloat((p * q).toFixed(2));
          updated.gst = parseFloat((p * q * 0.05).toFixed(2));
        }
        return updated;
      });
      const orderValue = parseFloat(items.reduce((s, it) => s + (it.total || 0) + (it.gst || 0), 0).toFixed(2));
      return { ...f, lineItems: items, orderValue, productName: items[0]?.name || f.productName, quantity: items.reduce((s, it) => s + (it.quantity || 0), 0) };
    });
  };

  const addLineItem = () => setForm(f => ({ ...f, lineItems: [...(f.lineItems || []), { name: PRODUCTS[0].name, sku: '', price: 0, quantity: 1, total: 0, gst: 0 }] }));

  const removeLineItem = (i) => setForm(f => {
    const items = f.lineItems.filter((_, idx) => idx !== i);
    const orderValue = parseFloat(items.reduce((s, it) => s + (it.total || 0) + (it.gst || 0), 0).toFixed(2));
    return { ...f, lineItems: items, orderValue, productName: items[0]?.name || f.productName, quantity: items.reduce((s, it) => s + (it.quantity || 0), 0) };
  });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.put(`/orders/${editing}`, form);
      else await api.post('/orders', form);
      addToast(editing ? 'Order updated' : 'Order added');
      setModal(false);
      load();
    } catch (err) { addToast(err.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this order?')) return;
    try { await api.delete(`/orders/${id}`); addToast('Order deleted'); load(); }
    catch { addToast('Delete failed', 'error'); }
  };

  const syncWooCommerce = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post('/sync/woocommerce', {});
      addToast(data.message, 'success');
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Sync failed', 'error');
    } finally { setSyncing(false); }
  };

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const onProductChange = (name) => {
    const price = PRODUCT_PRICE_MAP[name] || 0;
    setForm(f => ({ ...f, productName: name, orderValue: price * (f.quantity || 1) }));
  };

  const onQtyChange = (qty) => {
    const price = PRODUCT_PRICE_MAP[form.productName] || 0;
    setForm(f => ({ ...f, quantity: Number(qty), orderValue: price * Number(qty) }));
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Orders</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{meta.total} total orders</p>
        </div>
        <div className="flex gap-2">
          <button onClick={syncWooCommerce} disabled={syncing} className="btn-secondary flex items-center gap-1.5 disabled:opacity-50">
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync WooCommerce'}
          </button>
          <button onClick={openAdd} className="btn-primary">+ Add Order</button>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-2">
          <input className="input w-auto flex-1 min-w-[180px] text-sm" placeholder="Search name, mobile, order ID..." value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} />
          <input type="date" className="input w-auto text-sm" value={filters.startDate} onChange={e => setFilters(f => ({...f, startDate: e.target.value}))} />
          <input type="date" className="input w-auto text-sm" value={filters.endDate} onChange={e => setFilters(f => ({...f, endDate: e.target.value}))} />
          {[{k:'channel',opts:CHANNELS},{k:'status',opts:STATUS},{k:'paymentStatus',opts:PAYMENT}].map(({k,opts}) => (
            <select key={k} className="input w-auto text-sm capitalize" value={filters[k]} onChange={e => setFilters(f => ({...f, [k]: e.target.value}))}>
              <option value="">All {k}</option>
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          ))}
          <button onClick={() => { setPage(1); load(); }} className="btn-primary text-sm">Filter</button>
          <button onClick={() => setFilters({channel:'',status:'',paymentStatus:'',search:'',startDate:'',endDate:''})} className="btn-secondary text-sm">Clear</button>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
            <tr>
              {['Order ID','Date','Customer','Mobile','Product','Qty','Value','Channel','Payment','Status','Type','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: 'var(--text-faint)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o._id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-faint)' }}>{o.orderId}</td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{format(new Date(o.orderDate), 'dd MMM yy')}</td>
                <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text)' }}>{o.customerName}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{o.mobile}</td>
                <td className="px-4 py-3 max-w-[140px] truncate" style={{ color: 'var(--text-muted)' }}>{o.productName}</td>
                <td className="px-4 py-3 text-center" style={{ color: 'var(--text-muted)' }}>{o.quantity}</td>
                <td className="px-4 py-3 font-bold" style={{ color: 'var(--success)' }}>₹{o.orderValue?.toLocaleString()}</td>
                <td className="px-4 py-3"><span className="badge badge-accent">{o.salesChannel}</span></td>
                <td className="px-4 py-3"><span className={`badge ${PAY_CLASS[o.paymentStatus] || 'badge-neutral'}`}>{o.paymentStatus}</span></td>
                <td className="px-4 py-3"><span className={`badge ${STATUS_CLASS[o.orderStatus] || 'badge-neutral'}`}>{o.orderStatus}</span></td>
                <td className="px-4 py-3">
                  <span className={`badge ${o.customerType === 'Repeat' ? 'badge-purple' : 'badge-cyan'}`}>{o.customerType}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openView(o)} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}><Eye size={13} /></button>
                    <button onClick={() => openEdit(o)} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}><Pencil size={13} /></button>
                    <button onClick={() => del(o._id)} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors" style={{ background: '#fee2e2', color: '#dc2626' }}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!orders.length && (
              <tr><td colSpan={12} className="text-center py-12" style={{ color: 'var(--text-faint)' }}>No orders found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {meta.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Page {meta.page} of {meta.pages} · {meta.total} records</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p-1)} className="btn-secondary disabled:opacity-50">← Prev</button>
            <button disabled={page >= meta.pages} onClick={() => setPage(p => p+1)} className="btn-secondary disabled:opacity-50">Next →</button>
          </div>
        </div>
      )}

      <Modal open={viewModal} onClose={() => setViewModal(false)} title={`Order Details — ${viewOrder?.orderId}`} size="lg">
        {viewOrder && (() => {
          const hasLineItems = viewOrder.lineItems?.length > 0;
          const baseTotal = viewOrder.orderValue / 1.05;
          const gstTotal = viewOrder.orderValue - baseTotal;
          const displayItems = hasLineItems
            ? viewOrder.lineItems
            : [{ name: viewOrder.productName, sku: '', price: baseTotal / (viewOrder.quantity || 1), quantity: viewOrder.quantity || 1, total: baseTotal, gst: gstTotal }];
          const itemsSubtotal = displayItems.reduce((s, i) => s + (i.total || 0), 0);
          const totalGst = displayItems.reduce((s, i) => s + (i.gst || 0), 0);
          const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

          return (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm pb-3 border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                <span>{format(new Date(viewOrder.orderDate), 'dd MMM yyyy')}</span>
                <span>·</span>
                <span>{viewOrder.salesChannel}</span>
                {viewOrder.paymentMethod && <><span>·</span><span>via {viewOrder.paymentMethod}</span></>}
                <span className="ml-auto">
                  <span className={`badge ${STATUS_CLASS[viewOrder.orderStatus]||'badge-neutral'}`}>{viewOrder.orderStatus}</span>
                  <span className={`badge ml-1 ${PAY_CLASS[viewOrder.paymentStatus]||'badge-neutral'}`}>{viewOrder.paymentStatus}</span>
                </span>
              </div>

              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-sm">
                  <thead style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                    <tr>
                      {['Item','Price','Qty','Total','GST'].map((h,i) => (
                        <th key={h} className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide ${i===0?'text-left':'text-right'} ${i===2?'text-center':''}`} style={{ color: 'var(--text-faint)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="px-4 py-3">
                          <p className="font-medium" style={{ color: 'var(--text)' }}>{item.name}</p>
                          {item.sku && <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>SKU: {item.sku}</p>}
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: 'var(--text-muted)' }}>₹{fmt(item.price)}</td>
                        <td className="px-4 py-3 text-center" style={{ color: 'var(--text-muted)' }}>×{item.quantity}</td>
                        <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text)' }}>₹{fmt(item.total)}</td>
                        <td className="px-4 py-3 text-right" style={{ color: 'var(--text-faint)' }}>₹{fmt(item.gst)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-sm">
                  <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                    <span>Items Subtotal</span><span>₹{fmt(itemsSubtotal)}</span>
                  </div>
                  <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                    <span>GST (5%)</span><span>₹{fmt(totalGst)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1.5 border-t" style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>
                    <span>Order Total</span>
                    <span style={{ color: 'var(--success)' }}>₹{fmt(viewOrder.orderValue)}</span>
                  </div>
                  {viewOrder.paymentStatus === 'Paid' && (
                    <div className="flex justify-between text-xs pt-0.5" style={{ color: 'var(--text-faint)' }}>
                      <span>Paid{viewOrder.paymentMethod ? ` via ${viewOrder.paymentMethod}` : ''}</span>
                      <span>₹{fmt(viewOrder.orderValue)}</span>
                    </div>
                  )}
                </div>
              </div>

              {(viewOrder.billingAddress || viewOrder.email) && (
                <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-faint)' }}>Billing</p>
                  <div className="rounded-xl p-3 text-sm space-y-0.5" style={{ background: 'var(--bg-subtle)' }}>
                    <p className="font-semibold" style={{ color: 'var(--text)' }}>{viewOrder.customerName}</p>
                    {viewOrder.billingAddress && <p style={{ color: 'var(--text-muted)' }}>{viewOrder.billingAddress}</p>}
                    {viewOrder.email && <p style={{ color: 'var(--accent)' }}>{viewOrder.email}</p>}
                    <p style={{ color: 'var(--text-muted)' }}>{viewOrder.mobile}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                <span className={`badge ${viewOrder.customerType==='Repeat'?'badge-purple':'badge-cyan'}`}>{viewOrder.customerType} Customer</span>
                <div className="flex gap-2">
                  {viewOrder.followUpDone && <span className="badge badge-success">Follow-up Done</span>}
                  {viewOrder.upsellDone && <span className="badge badge-warning">Upsell Done</span>}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Order' : 'Add New Order'} size="lg">
        <form onSubmit={save} className="grid grid-cols-2 gap-4">

          <div>
            <label className="label">Order Date</label>
            <input type="date" className="input" value={form.orderDate} onChange={e => set('orderDate', e.target.value)} required />
          </div>

          <div>
            <label className="label">Customer Name</label>
            <input type="text" className="input" value={form.customerName} onChange={e => set('customerName', e.target.value)} required />
          </div>

          <div>
            <label className="label">Mobile Number</label>
            <input type="text" className="input" value={form.mobile} onChange={e => set('mobile', e.target.value)} required />
          </div>

          <div>
            <label className="label">City</label>
            <input type="text" className="input" value={form.city} onChange={e => set('city', e.target.value)} />
          </div>

          <div>
            <label className="label">Product</label>
            <select className="input" value={form.productName} onChange={e => onProductChange(e.target.value)} required>
              {PRODUCT_NAMES.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Quantity</label>
            <input type="number" className="input" min="1" value={form.quantity} onChange={e => onQtyChange(e.target.value)} required />
          </div>

          <div>
            <label className="label">Order Value (₹)</label>
            <input type="number" className="input" value={form.orderValue} onChange={e => set('orderValue', Number(e.target.value))} required />
          </div>

          <div>
            <label className="label">Sales Channel</label>
            <select className="input" value={form.salesChannel} onChange={e => set('salesChannel', e.target.value)} required>
              {CHANNELS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Lead Source</label>
            <select className="input" value={form.leadSource} onChange={e => set('leadSource', e.target.value)}>
              {SOURCES.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Payment Status</label>
            <select className="input" value={form.paymentStatus} onChange={e => set('paymentStatus', e.target.value)}>
              {PAYMENT.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Order Status</label>
            <select className="input" value={form.orderStatus} onChange={e => set('orderStatus', e.target.value)}>
              {STATUS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          <div className="flex gap-6 items-start pt-1">
            <div>
              <label className="label">Follow-up Done</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="checkbox" id="followUpDone" checked={!!form.followUpDone} onChange={e => set('followUpDone', e.target.checked)} className="w-4 h-4 accent-indigo-600" />
                <label htmlFor="followUpDone" className="text-sm" style={{ color: 'var(--text-muted)' }}>Yes</label>
              </div>
            </div>
            <div>
              <label className="label">Upsell Done</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="checkbox" id="upsellDone" checked={!!form.upsellDone} onChange={e => set('upsellDone', e.target.checked)} className="w-4 h-4 accent-indigo-600" />
                <label htmlFor="upsellDone" className="text-sm" style={{ color: 'var(--text-muted)' }}>Yes</label>
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <label className="label">Notes</label>
            <textarea className="input h-20 resize-none" value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
          </div>

          {editing && (
            <div className="col-span-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Line Items</p>
                  <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Set individual product prices for GST breakdown. Order value auto-updates.</p>
                </div>
                <button type="button" onClick={addLineItem} className="px-2 py-1 text-xs rounded transition-colors" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>+ Add Item</button>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border)' }}>
                    <tr>
                      {['Product','SKU','Qty','Price (ex-GST)','GST (5%)','Total (incl.)',''].map((h,i) => (
                        <th key={i} className={`px-3 py-2 text-xs font-semibold uppercase ${i===0||i===1?'text-left':i===2?'text-center':'text-right'}`}
                          style={{ color: 'var(--text-faint)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(form.lineItems || []).map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="px-2 py-1.5">
                          <select className="input text-xs py-1" value={item.name} onChange={e => updateLineItem(i, 'name', e.target.value)}>
                            {PRODUCT_NAMES.map(n => <option key={n}>{n}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input className="input text-xs py-1 w-full" placeholder="SKU" value={item.sku || ''} onChange={e => updateLineItem(i, 'sku', e.target.value)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" min="1" className="input text-xs py-1 w-full text-center" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', e.target.value)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" min="0" step="0.01" className="input text-xs py-1 w-full text-right" value={item.price} onChange={e => updateLineItem(i, 'price', e.target.value)} />
                        </td>
                        <td className="px-2 py-1.5 text-right" style={{ color: 'var(--text-faint)' }}>₹{Number(item.gst || 0).toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right font-semibold" style={{ color: 'var(--text)' }}>₹{(Number(item.total || 0) + Number(item.gst || 0)).toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-center">
                          {(form.lineItems || []).length > 1 && (
                            <button type="button" onClick={() => removeLineItem(i)} className="font-bold leading-none" style={{ color: 'var(--danger)' }}>×</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="col-span-2 flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : editing ? 'Update Order' : 'Add Order'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
