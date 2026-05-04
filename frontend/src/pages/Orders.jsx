import { useState, useEffect, useCallback } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import api from '../utils/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import { DateInput, FilterBar, SelectInput } from '../components/FormControls';
import Pagination from '../components/Pagination';
import { format } from 'date-fns';

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
const CHANNELS = ['Website', 'WhatsApp'];
const SOURCES  = ['Ads', 'Organic', 'Referral', 'Direct'];
const PAYMENT  = ['Paid', 'COD', 'Pending'];
const STATUS   = ['Processing', 'Shipped', 'Delivered', 'Cancelled', 'RTO'];

const STATUS_CHIP = { Delivered:'chip-ok', Cancelled:'chip-danger', RTO:'chip-warn', Shipped:'chip-info', Processing:'chip-muted' };
const PAY_CHIP    = { Paid:'chip-ok', COD:'chip-warn', Pending:'chip-danger' };
const CHAN_CHIP   = { Website:'chip-info', WhatsApp:'chip-ok' };
const TYPE_CHIP   = { New:'chip-info', Repeat:'chip-ok' };

const COLS = ['','ORDER ID','DATE','CUSTOMER','MOBILE','PRODUCT','QTY','VALUE','CHANNEL','PAYMENT','STATUS','TYPE',''];
const ITEM_GRID = 'minmax(170px,1fr) 62px 48px 76px 56px 68px 82px 20px';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const emptyForm = {
  orderDate: new Date().toISOString().split('T')[0],
  customerName:'', mobile:'', city:'',
  productName: PRODUCTS[0].name, quantity:1, orderValue: PRODUCTS[0].price,
  salesChannel:'WhatsApp', leadSource:'Organic',
  paymentStatus:'Paid', orderStatus:'Processing',
  followUpDone:false, upsellDone:false, notes:''
};

const makeLineItem = (name = PRODUCTS[0].name, quantity = 1) => {
  const incl = PRODUCT_PRICE_MAP[name] || 0;
  const qty = Number(quantity || 1);
  const discountPct = 0;
  const discountedIncl = incl * (1 - discountPct / 100);
  const lineIncl = discountedIncl * qty;
  const base = lineIncl / 1.05;
  return {
    name,
    sku: '',
    price: parseFloat(incl.toFixed(2)),
    discountPct,
    quantity: qty,
    total: parseFloat(base.toFixed(2)),
    gst: parseFloat((lineIncl - base).toFixed(2))
  };
};

const summarizeItems = (items) => {
  const safeItems = items?.length ? items : [makeLineItem()];
  const orderValue = parseFloat(safeItems.reduce((s,it)=>s+(Number(it.total)||0)+(Number(it.gst)||0),0).toFixed(2));
  return {
    lineItems: safeItems,
    orderValue,
    productName: safeItems.map(i => i.name).filter(Boolean).join(', ') || PRODUCTS[0].name,
    quantity: safeItems.reduce((s,it)=>s+(Number(it.quantity)||0),0) || 1
  };
};

function Av({ name }) {
  const i = (name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  return <span className="avatar avatar-md">{i}</span>;
}

function IconBtn({ onClick, title, bg, color, children }) {
  return (
    <button onClick={onClick} title={title}
      style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:7, border:'none', cursor:'pointer', background:bg, color, flexShrink:0, transition:'opacity 0.15s' }}
      onMouseEnter={e=>e.currentTarget.style.opacity='0.75'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
      {children}
    </button>
  );
}

const SVG = ({ d, size=13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);

export default function Orders() {
  const isMobile = useIsMobile();
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ total:0, page:1, pages:1 });
  const [listKey, setListKey] = useState(0);
  const [filters, setFilters] = useState({ channel:'', status:'', paymentStatus:'', search:'', startDate:'', endDate:'' });
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [exitId, setExitId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [leadResults, setLeadResults] = useState([]);
  const [leadSearchOpen, setLeadSearchOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const { addToast } = useToast();

  const toggleSelect = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(s => s.size === orders.length ? new Set() : new Set(orders.map(o => o._id)));

  const bulkUpdateStatus = async (status) => {
    setBulkWorking(true);
    try {
      await Promise.all([...selected].map(id => api.put(`/orders/${id}`, { orderStatus: status })));
      setOrders(prev => prev.map(o => selected.has(o._id) ? { ...o, orderStatus: status } : o));
      addToast(`${selected.size} orders updated to "${status}"`);
      setSelected(new Set());
    } catch { addToast('Bulk update failed', 'error'); }
    finally { setBulkWorking(false); }
  };

  const bulkDelete = async () => {
    setBulkWorking(true);
    try {
      await Promise.all([...selected].map(id => api.delete(`/orders/${id}`)));
      setOrders(prev => prev.filter(o => !selected.has(o._id)));
      setMeta(m => ({ ...m, total: Math.max(0, m.total - selected.size) }));
      addToast(`${selected.size} orders deleted`);
      setSelected(new Set());
    } catch { addToast('Bulk delete failed', 'error'); }
    finally { setBulkWorking(false); }
  };

  const load = useCallback(async () => {
    try {
      const params = { page, limit:8, ...Object.fromEntries(Object.entries(filters).filter(([,v])=>v)) };
      const { data } = await api.get('/orders', { params });
      setOrders(data.orders);
      setMeta({ total:data.total, page:data.page, pages:data.pages });
      setListKey(k => k + 1);
    } catch { addToast('Failed to load orders','error'); }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const initLineItems = (o) => {
    if (o.lineItems?.length) return o.lineItems.map(i => ({ ...i }));
    const base = (o.orderValue||0)/1.05, gst = (o.orderValue||0)-base;
    return [{ name:o.productName||PRODUCTS[0].name, sku:'', price:parseFloat((base/(o.quantity||1)).toFixed(2)), quantity:o.quantity||1, total:parseFloat(base.toFixed(2)), gst:parseFloat(gst.toFixed(2)) }];
  };

  const searchLeads = async (q) => {
    setLeadSearch(q);
    if (!q.trim()) { setLeadResults([]); return; }
    try {
      const { data } = await api.get('/leads', { params: { search: q, limit: 5 } });
      setLeadResults(data.leads || []);
      setLeadSearchOpen(true);
    } catch {}
  };

  const selectLead = (lead) => {
    setForm(f => ({ ...f, customerName: lead.name, mobile: lead.mobile, linkedLeadId: lead._id, salesChannel: lead.source === 'WhatsApp' ? 'WhatsApp' : 'Website' }));
    setLeadSearch(lead.name);
    setLeadSearchOpen(false);
    setLeadResults([]);
  };

  const openAdd  = () => {
    setEditing(null);
    setForm({...emptyForm, ...summarizeItems([makeLineItem()])});
    setLeadSearch(''); setLeadResults([]); setLeadSearchOpen(false);
    setModal(true);
  };
  const openEdit = (o) => { setEditing(o._id); setForm({...o, orderDate:o.orderDate?.split('T')[0]||'', lineItems:initLineItems(o)}); setModal(true); };
  const openView = (o) => { setViewOrder(o); setViewModal(true); };

  const updateLineItem = (i, field, value) => {
    setForm(f => {
      const items = f.lineItems.map((it,idx) => {
        if (idx!==i) return it;
        const u = {...it,[field]:value};
        if (field === 'name') {
          const next = makeLineItem(value, it.quantity || 1);
          const p = next.price, q = Number(it.quantity || 1), d = Number(it.discountPct || 0);
          const incl = (p * (1 - d / 100)) * q;
          const base = incl / 1.05;
          return { ...u, price: p, quantity: q, discountPct: d, total: parseFloat(base.toFixed(2)), gst: parseFloat((incl-base).toFixed(2)) };
        }
        if (field==='price'||field==='quantity'||field==='discountPct') {
          const p=field==='price'?Number(value):Number(it.price), q=field==='quantity'?Number(value):Number(it.quantity);
          const d=field==='discountPct'?Number(value):Number(it.discountPct||0);
          const incl = (p * (1 - d / 100)) * q;
          const base = incl / 1.05;
          u.price=p; u.quantity=q; u.discountPct=d; u.total=parseFloat(base.toFixed(2)); u.gst=parseFloat((incl-base).toFixed(2));
        }
        return u;
      });
      return {...f, ...summarizeItems(items)};
    });
  };

  const addLineItem = () => setForm(f=>{
    const items = [...(f.lineItems?.length ? f.lineItems : [makeLineItem()]), makeLineItem()];
    return {...f, ...summarizeItems(items)};
  });
  const removeLineItem = (i) => setForm(f => {
    const items = f.lineItems.filter((_,idx)=>idx!==i);
    return {...f, ...summarizeItems(items)};
  });

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, ...summarizeItems(form.lineItems) };
      if (editing) await api.put(`/orders/${editing}`, payload);
      else await api.post('/orders', payload);
      addToast(editing?'Order updated':'Order added'); setModal(false); load();
    } catch (err) { addToast(err.response?.data?.message||'Save failed','error'); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirmId) return;
    const id = confirmId;
    setConfirmId(null);
    setExitId(id);
    // Phase 1: fade animation
    await new Promise(r => setTimeout(r, 460));
    // Phase 2: collapse row height so rows below slide up smoothly
    const row = document.querySelector(`tr[data-row-id="${id}"]`);
    if (row) {
      const h = row.offsetHeight;
      row.style.height = h + 'px';
      row.style.overflow = 'hidden';
      row.style.transition = 'height 0.24s ease-out, padding 0.24s ease-out';
      void row.offsetHeight; // force reflow
      row.style.height = '0';
      await new Promise(r => setTimeout(r, 260));
    }
    setOrders(prev => prev.filter(o => o._id !== id));
    setMeta(m => ({ ...m, total: Math.max(0, m.total - 1) }));
    setExitId(null);
    try { await api.delete(`/orders/${id}`); addToast('Order deleted'); }
    catch { addToast('Delete failed','error'); load(); }
  };

  const syncWooCommerce = async () => {
    setSyncing(true);
    try { const {data}=await api.post('/sync/woocommerce',{}); addToast(data.message,'success'); load(); }
    catch (err) { addToast(err.response?.data?.message||'Sync failed','error'); }
    finally { setSyncing(false); }
  };

  const set = (field, value) => setForm(f=>({...f,[field]:value}));
  const onProductChange = (name) => { const price=PRODUCT_PRICE_MAP[name]||0; setForm(f=>({...f,productName:name,orderValue:price*(f.quantity||1)})); };
  const onQtyChange = (qty) => { const price=PRODUCT_PRICE_MAP[form.productName]||0; setForm(f=>({...f,quantity:Number(qty),orderValue:price*Number(qty)})); };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, paddingBottom: selected.size > 0 ? 80 : 0 }}>

      {/* Header */}
      {isMobile ? (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:24, fontWeight:700, letterSpacing:'-0.02em', color:'var(--fg)' }}>Orders</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
              {meta.total} total orders
            </div>
          </div>
          <button className="btn-primary" onClick={openAdd} style={{ display:'flex', alignItems:'center', gap:5, marginTop:4 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New
          </button>
        </div>
      ) : (
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.02em', color:'var(--fg)' }}>Orders</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>
            <span style={{ fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>{meta.total}</span> total orders
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-secondary" onClick={syncWooCommerce} disabled={syncing} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ animation:syncing?'spin 0.7s linear infinite':'' }}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            {syncing ? 'Syncing…' : 'Sync WooCommerce'}
          </button>
          <button className="btn-primary" onClick={openAdd} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New order
          </button>
        </div>
      </div>
      )}

      {/* Filter bar */}
      {isMobile ? (
        <div style={{ display:'flex', gap:8 }}>
          <input className="input" placeholder="Search orders…" value={filters.search}
            onChange={e=>setFilters(f=>({...f,search:e.target.value}))} style={{ flex:1 }} />
          {Object.values(filters).some(Boolean) && (
            <button className="btn-secondary" style={{ fontSize:12, flexShrink:0 }}
              onClick={()=>setFilters({channel:'',status:'',paymentStatus:'',search:'',startDate:'',endDate:''})}>Clear</button>
          )}
        </div>
      ) : (
      <FilterBar>
          <input className="input" placeholder="Search name, mobile, order ID…" value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))} />
          <DateInput value={filters.startDate} onChange={value=>setFilters(f=>({...f,startDate:value}))} />
          <DateInput value={filters.endDate} onChange={value=>setFilters(f=>({...f,endDate:value}))} />
          {[{k:'channel',opts:CHANNELS,label:'All channels'},{k:'status',opts:STATUS,label:'All status'},{k:'paymentStatus',opts:PAYMENT,label:'All payments'}].map(({k,opts,label})=>(
            <SelectInput key={k} value={filters[k]} onChange={e=>setFilters(f=>({...f,[k]:e.target.value}))}>
              <option value="">{label}</option>
              {opts.map(o=><option key={o}>{o}</option>)}
            </SelectInput>
          ))}
          <button className="btn-primary" style={{ fontSize:12 }} onClick={()=>{setPage(1);load();}}>Filter</button>
          <button className="btn-secondary" style={{ fontSize:12 }} onClick={()=>setFilters({channel:'',status:'',paymentStatus:'',search:'',startDate:'',endDate:''})}>Clear</button>
      </FilterBar>
      )}

      {/* Mobile card list */}
      {isMobile && (
        <div key={listKey} className="fade-in" style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {orders.map(o => (
            <div key={o._id} data-row-id={o._id}
              className={exitId===o._id ? 'row-deleting' : ''}
              onClick={()=>openView(o)}
              style={{ background:'var(--card)', border:'1px solid var(--rule)', borderRadius:12, padding:'12px 14px', cursor:'pointer' }}>

              {/* Row 1: avatar + name + price */}
              <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:6 }}>
                <input type="checkbox" checked={selected.has(o._id)}
                  onChange={e=>{e.stopPropagation();toggleSelect(o._id)}}
                  onClick={e=>e.stopPropagation()}
                  style={{ accentColor:'var(--accent)', flexShrink:0, marginTop:3, width:14, height:14 }} />
                <Av name={o.customerName} size={36} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--fg)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.customerName}</div>
                  <div style={{ fontSize:12, color:'var(--muted)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.productName}</div>
                </div>
                <div className="num" style={{ fontSize:14, fontWeight:700, color:'var(--fg)', flexShrink:0, paddingTop:1 }}>
                  ₹{o.orderValue?.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Row 2: ID·date·city LEFT  |  channel+payment RIGHT */}
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                <div style={{ flex:1, fontSize:11, color:'var(--faint)', fontFamily:'Inter', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {o.orderId} · {o.orderDate ? format(new Date(o.orderDate),'dd MMM yy') : ''}{o.city ? ` · ${o.city}` : ''}
                </div>
                <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                  <span className={`chip ${CHAN_CHIP[o.salesChannel]||'chip-muted'}`} style={{ fontSize:10 }}>{o.salesChannel}</span>
                  <span className={`chip ${PAY_CHIP[o.paymentStatus]||'chip-muted'}`} style={{ fontSize:10 }}>{o.paymentStatus}</span>
                </div>
              </div>

              {/* Row 3: status LEFT  |  edit+delete RIGHT */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span className={`chip ${STATUS_CHIP[o.orderStatus]||'chip-muted'}`} style={{ fontSize:10 }}>{o.orderStatus}</span>
                <div style={{ display:'flex', gap:5 }} onClick={e=>e.stopPropagation()}>
                  <button onClick={e=>{e.stopPropagation();openEdit(o)}} style={{ width:26, height:26, display:'grid', placeItems:'center', borderRadius:6, border:'none', background:'var(--chip)', color:'var(--muted)', cursor:'pointer' }}>
                    <SVG d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" size={11} />
                  </button>
                  <button onClick={e=>{e.stopPropagation();setConfirmId(o._id)}} style={{ width:26, height:26, display:'grid', placeItems:'center', borderRadius:6, border:'none', background:'var(--danger-bg)', color:'var(--danger)', cursor:'pointer' }}>
                    <SVG d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!orders.length && <div style={{ textAlign:'center', color:'var(--faint)', fontSize:13, padding:40 }}>No orders found</div>}
        </div>
      )}

      {/* Table (desktop only) */}
      {!isMobile && (
      <div key={listKey} className="fade-in">
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div className="tbl-scroll">
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--rule)' }}>
                <th style={{ padding:'11px 14px', width:36, background:'var(--card)' }}>
                  <input type="checkbox" checked={orders.length > 0 && selected.size === orders.length} onChange={toggleAll} style={{ accentColor:'var(--accent)', cursor:'pointer' }} />
                </th>
                {COLS.slice(1).map(h=>(
                  <th key={h} style={{ textAlign:'left', padding:'11px 16px', fontSize:11, fontWeight:500, letterSpacing:'0.04em', textTransform:'uppercase', color:'var(--muted)', whiteSpace:'nowrap', background:'var(--card)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o=>(
                <tr key={o._id} data-row-id={o._id} className={`tr-hover${exitId===o._id?' row-deleting':''}`}
                  style={{ borderBottom:'1px solid var(--rule)', background: selected.has(o._id) ? 'var(--accent-bg)' : '' }}
                  onMouseEnter={e=>{ if (!selected.has(o._id)) e.currentTarget.style.background='var(--hover)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background = selected.has(o._id) ? 'var(--accent-bg)' : 'transparent'; }}>
                  <td style={{ padding:'11px 14px', width:36 }} onClick={e=>e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(o._id)} onChange={()=>toggleSelect(o._id)} style={{ accentColor:'var(--accent)', cursor:'pointer' }} />
                  </td>
                  <td style={{ padding:'11px 16px', fontFamily:'Inter', fontSize:12, color:'var(--muted)', fontVariantNumeric:'tabular-nums' }}>{o.orderId}</td>
                  <td style={{ padding:'11px 16px', fontFamily:'Inter', fontSize:12.5, color:'var(--muted)', whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums' }}>{format(new Date(o.orderDate),'dd MMM yy')}</td>
                  <td style={{ padding:'10px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                      <Av name={o.customerName} />
                      <div>
                        <div style={{ fontSize:13, fontWeight:500, color:'var(--fg)', whiteSpace:'nowrap' }}>{o.customerName}</div>
                        <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{o.city}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'11px 16px', fontFamily:'Inter', fontSize:12.5, color:'var(--muted)', fontVariantNumeric:'tabular-nums' }}>{o.mobile}</td>
                  <td style={{ padding:'11px 16px', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:13, color:'var(--muted)' }}>{o.productName}</td>
                  <td style={{ padding:'11px 16px', fontFamily:'Inter', fontSize:13, color:'var(--fg)', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{o.quantity}</td>
                  <td style={{ padding:'11px 16px', fontFamily:'Inter', fontSize:13, fontWeight:600, color:'var(--fg)', fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>₹{o.orderValue?.toLocaleString('en-IN')}</td>
                  <td style={{ padding:'10px 16px' }}><span className={`chip ${CHAN_CHIP[o.salesChannel]||'chip-muted'}`}>{o.salesChannel}</span></td>
                  <td style={{ padding:'10px 16px' }}><span className={`chip ${PAY_CHIP[o.paymentStatus]||'chip-muted'}`}>{o.paymentStatus}</span></td>
                  <td style={{ padding:'10px 16px' }}><span className={`chip ${STATUS_CHIP[o.orderStatus]||'chip-muted'}`}>{o.orderStatus}</span></td>
                  <td style={{ padding:'10px 16px' }}><span className={`chip ${TYPE_CHIP[o.customerType]||'chip-muted'}`}>{o.customerType}</span></td>
                  <td style={{ padding:'10px 16px' }}>
                    <div style={{ display:'flex', gap:4 }}>
                      <IconBtn onClick={()=>openView(o)} title="View" bg="var(--accent-bg)" color="var(--accent)"><SVG d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></IconBtn>
                      <IconBtn onClick={()=>openEdit(o)} title="Edit" bg="var(--chip)" color="var(--muted)"><SVG d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></IconBtn>
                      <IconBtn onClick={()=>setConfirmId(o._id)} title="Delete" bg="var(--danger-bg)" color="var(--danger)"><SVG d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {!orders.length && (
                <tr><td colSpan={12} style={{ padding:'48px 16px', textAlign:'center', color:'var(--faint)', fontSize:13 }}>No orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      )}

      <Pagination page={page} pages={meta.pages} total={meta.total} limit={8} onPage={p=>{setPage(p);window.scrollTo({top:0,behavior:'smooth'});}} />

      {/* View Order Modal */}
      <Modal open={viewModal} onClose={()=>setViewModal(false)} title={`Order — ${viewOrder?.orderId}`} size="lg">
        {viewOrder && (() => {
          const hasLI = viewOrder.lineItems?.length > 0;
          const baseTotal = viewOrder.orderValue/1.05, gstTotal = viewOrder.orderValue-baseTotal;
          const items = hasLI ? viewOrder.lineItems : [{name:viewOrder.productName,sku:'',price:baseTotal/(viewOrder.quantity||1),quantity:viewOrder.quantity||1,total:baseTotal,gst:gstTotal}];
          const subtotal = items.reduce((s,i)=>s+(i.total||0),0), totalGst = items.reduce((s,i)=>s+(i.gst||0),0);
          return (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, paddingBottom:14, borderBottom:'1px solid var(--rule)', fontSize:12, color:'var(--muted)' }}>
                <span style={{ fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>{format(new Date(viewOrder.orderDate),'dd MMM yyyy')}</span>
                <span>·</span><span>{viewOrder.salesChannel}</span>
                {viewOrder.paymentMethod&&<><span>·</span><span>via {viewOrder.paymentMethod}</span></>}
                <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
                  <span className={`chip ${STATUS_CHIP[viewOrder.orderStatus]||'chip-muted'}`}>{viewOrder.orderStatus}</span>
                  <span className={`chip ${PAY_CHIP[viewOrder.paymentStatus]||'chip-muted'}`}>{viewOrder.paymentStatus}</span>
                </div>
              </div>

              <div style={{ border:'1px solid var(--rule)', borderRadius:10, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead style={{ borderBottom:'1px solid var(--rule)' }}>
                    <tr>
                      {['Item','Price','Qty','Total','GST'].map((h,i)=>(
                        <th key={h} style={{ padding:'8px 14px', fontSize:10.5, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--faint)', textAlign:i===0?'left':'right', background:'var(--card-soft)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item,i)=>(
                      <tr key={i} style={{ borderBottom:'1px solid var(--rule)' }}>
                        <td style={{ padding:'10px 14px' }}>
                          <div style={{ fontSize:13, fontWeight:500, color:'var(--fg)' }}>{item.name}</div>
                          {item.sku&&<div style={{ fontSize:11, color:'var(--faint)', marginTop:2 }}>SKU: {item.sku}</div>}
                        </td>
                        <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'Inter', fontSize:12, color:'var(--muted)', fontVariantNumeric:'tabular-nums' }}>{inr(item.price)}</td>
                        <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'Inter', fontSize:12, color:'var(--muted)', fontVariantNumeric:'tabular-nums' }}>×{item.quantity}</td>
                        <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'Inter', fontSize:12.5, fontWeight:500, color:'var(--fg)', fontVariantNumeric:'tabular-nums' }}>{inr(item.total)}</td>
                        <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'Inter', fontSize:12, color:'var(--faint)', fontVariantNumeric:'tabular-nums' }}>{inr(item.gst)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <div style={{ width:240, display:'flex', flexDirection:'column', gap:6, fontSize:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', color:'var(--muted)' }}>
                    <span>Items subtotal</span><span style={{ fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>{inr(subtotal)}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', color:'var(--muted)' }}>
                    <span>GST (5%)</span><span style={{ fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>{inr(totalGst)}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontWeight:600, color:'var(--fg)', paddingTop:8, borderTop:'1px solid var(--rule)' }}>
                    <span>Order total</span><span style={{ fontFamily:'Inter', fontVariantNumeric:'tabular-nums', color:'var(--accent)' }}>{inr(viewOrder.orderValue)}</span>
                  </div>
                </div>
              </div>

              {(viewOrder.billingAddress||viewOrder.email) && (
                <div style={{ borderTop:'1px solid var(--rule)', paddingTop:14 }}>
                  <div style={{ fontSize:10.5, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--faint)', marginBottom:8 }}>Billing</div>
                  <div style={{ background:'var(--bg)', borderRadius:9, padding:'10px 14px', fontSize:12.5, display:'flex', flexDirection:'column', gap:3 }}>
                    <div style={{ fontWeight:500, color:'var(--fg)' }}>{viewOrder.customerName}</div>
                    {viewOrder.billingAddress&&<div style={{ color:'var(--muted)' }}>{viewOrder.billingAddress}</div>}
                    {viewOrder.email&&<div style={{ color:'var(--accent)' }}>{viewOrder.email}</div>}
                    <div style={{ color:'var(--muted)', fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>{viewOrder.mobile}</div>
                  </div>
                </div>
              )}

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--rule)', paddingTop:12 }}>
                <span className={`chip ${TYPE_CHIP[viewOrder.customerType]||'chip-muted'}`}>{viewOrder.customerType} Customer</span>
                <div style={{ display:'flex', gap:6 }}>
                  {viewOrder.followUpDone&&<span className="chip chip-ok">Follow-up done</span>}
                  {viewOrder.upsellDone&&<span className="chip chip-warn">Upsell done</span>}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Add / Edit Order Modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title={editing?'Edit order':'Add new order'} size="lg">
        <form onSubmit={save} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

          {/* Lead link — only shown when adding new order */}
          {!editing && (
            <div style={{ gridColumn:'1/-1' }}>
              <label className="label">Link to lead <span style={{ color:'var(--faint)', fontWeight:400 }}>(optional — auto-fills customer info)</span></label>
              <div style={{ position:'relative' }}>
                <input className="input" placeholder="Search lead by name or mobile…" value={leadSearch}
                  onChange={e => searchLeads(e.target.value)}
                  onFocus={() => leadResults.length && setLeadSearchOpen(true)}
                  onBlur={() => setTimeout(() => setLeadSearchOpen(false), 150)} />
                {form.linkedLeadId && (
                  <span className="chip chip-ok" style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', fontSize:10 }}>✓ Linked</span>
                )}
                {leadSearchOpen && leadResults.length > 0 && (
                  <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:300, background:'var(--card)', border:'1px solid var(--rule)', borderRadius:10, overflow:'hidden', boxShadow:'0 8px 24px rgba(37,35,32,.12)' }}>
                    {leadResults.map(l => (
                      <button key={l._id} type="button" onMouseDown={() => selectLead(l)}
                        style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 14px', border:'none', background:'transparent', cursor:'pointer', fontSize:12, textAlign:'left' }}
                        onMouseEnter={e=>e.currentTarget.style.background='var(--hover)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <span style={{ fontWeight:500, color:'var(--fg)' }}>{l.name}</span>
                        <span style={{ color:'var(--faint)', fontSize:11 }}>{l.mobile} · <span className={`chip ${STATUS_CHIP[l.status]||'chip-muted'}`} style={{ fontSize:10 }}>{l.status}</span></span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {[
            {label:'Order Date', el:<DateInput value={form.orderDate} onChange={value=>set('orderDate',value)} required />},
            {label:'Customer Name', el:<input type="text" className="input" value={form.customerName} onChange={e=>set('customerName',e.target.value)} required />},
            {label:'Mobile', el:<input type="text" className="input" value={form.mobile} onChange={e=>set('mobile',e.target.value)} required />},
            {label:'City', el:<input type="text" className="input" value={form.city} onChange={e=>set('city',e.target.value)} />},
          ].map(({label,el})=>(
            <div key={label}><label className="label">{label}</label>{el}</div>
          ))}

          <div><label className="label">Sales Channel</label>
            <SelectInput value={form.salesChannel} onChange={e=>set('salesChannel',e.target.value)} required>
              {CHANNELS.map(o=><option key={o}>{o}</option>)}
            </SelectInput>
          </div>
          <div><label className="label">Lead Source</label>
            <SelectInput value={form.leadSource} onChange={e=>set('leadSource',e.target.value)}>
              {SOURCES.map(o=><option key={o}>{o}</option>)}
            </SelectInput>
          </div>
          <div><label className="label">Payment Status</label>
            <SelectInput value={form.paymentStatus} onChange={e=>set('paymentStatus',e.target.value)}>
              {PAYMENT.map(o=><option key={o}>{o}</option>)}
            </SelectInput>
          </div>
          <div><label className="label">Order Status</label>
            <SelectInput value={form.orderStatus} onChange={e=>set('orderStatus',e.target.value)}>
              {STATUS.map(o=><option key={o}>{o}</option>)}
            </SelectInput>
          </div>
          <div style={{ display:'flex', gap:20 }}>
            {[{id:'followUpDone',label:'Follow-up done'},{id:'upsellDone',label:'Upsell done'}].map(({id,label})=>(
              <label key={id} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12.5, color:'var(--muted)', cursor:'pointer' }}>
                <input type="checkbox" id={id} checked={!!form[id]} onChange={e=>set(id,e.target.checked)} style={{ accentColor:'var(--accent)' }} />
                {label}
              </label>
            ))}
          </div>
          <div style={{ gridColumn:'1/-1', borderTop:'1px solid var(--rule)', paddingTop:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:'var(--fg)' }}>Items in this order</div>
                  <div style={{ fontSize:11, color:'var(--faint)', marginTop:2 }}>Add one or more products. The order total updates automatically.</div>
                </div>
                <button type="button" onClick={addLineItem} className="btn-secondary" style={{ fontSize:12 }}>+ Add item</button>
              </div>
              <div style={{ border:'1px solid var(--rule)', borderRadius:9, overflow:'visible' }}>
                <div style={{ display:'grid', gridTemplateColumns:ITEM_GRID, gap:6, alignItems:'center', padding:'8px 8px', background:'var(--card-soft)', borderRadius:'9px 9px 0 0', borderBottom:'1px solid var(--rule)' }}>
                  {['Product','SKU','Qty','Price','Disc. %','GST','Total',''].map((h,i)=>(
                    <div key={i} style={{ fontSize:10, fontWeight:500, textTransform:'uppercase', color:'var(--faint)', textAlign:i<2?'left':i===2?'center':'right' }}>{h}</div>
                  ))}
                </div>
                {(form.lineItems||[]).map((item,i)=>(
                  <div key={i} style={{ display:'grid', gridTemplateColumns:ITEM_GRID, gap:6, alignItems:'center', padding:'6px 8px', borderBottom:i < (form.lineItems||[]).length-1 ? '1px solid var(--rule)' : 'none' }}>
                    <SelectInput style={{ minWidth: 0 }} value={item.name} onChange={e=>updateLineItem(i,'name',e.target.value)}>
                      {PRODUCT_NAMES.map(n=><option key={n}>{n}</option>)}
                    </SelectInput>
                    <input className="input" style={{ fontSize:11, padding:'4px 8px', width:'100%' }} placeholder="SKU" value={item.sku||''} onChange={e=>updateLineItem(i,'sku',e.target.value)} />
                    <input type="number" min="1" className="input" style={{ fontSize:11, padding:'4px 8px', width:'100%', textAlign:'center' }} value={item.quantity} onChange={e=>updateLineItem(i,'quantity',e.target.value)} />
                    <input type="number" min="0" step="0.01" className="input" style={{ fontSize:11, padding:'4px 8px', width:'100%', textAlign:'right' }} value={item.price} onChange={e=>updateLineItem(i,'price',e.target.value)} />
                    <input type="number" min="0" max="100" step="0.01" className="input" style={{ fontSize:11, padding:'4px 8px', width:'100%', textAlign:'right' }} value={item.discountPct || 0} onChange={e=>updateLineItem(i,'discountPct',e.target.value)} />
                    <div className="num" style={{ textAlign:'right', color:'var(--faint)', fontSize:11 }}>₹{Number(item.gst||0).toFixed(2)}</div>
                    <div className="num" style={{ textAlign:'right', fontWeight:600, color:'var(--fg)', fontSize:12 }}>₹{(Number(item.total||0)+Number(item.gst||0)).toFixed(2)}</div>
                    <div style={{ display:'grid', placeItems:'center' }}>
                      {(form.lineItems||[]).length>1&&(
                        <button type="button" onClick={()=>removeLineItem(i)} style={{ width:18, height:18, display:'grid', placeItems:'center', background:'none', border:'none', color:'var(--danger)', cursor:'pointer', fontWeight:600, fontSize:15, lineHeight:1, padding:0 }}>×</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:22, paddingTop:10, fontSize:12 }}>
                <span style={{ color:'var(--muted)' }}>Total qty <strong className="num" style={{ color:'var(--fg)', fontWeight:600 }}>{form.quantity}</strong></span>
                <span style={{ color:'var(--muted)' }}>Order value <strong className="num" style={{ color:'var(--fg)', fontWeight:600 }}>₹{Number(form.orderValue||0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
              </div>
            </div>

          <div style={{ gridColumn:'1/-1' }}>
            <label className="label">Notes</label>
            <textarea className="input" style={{ height:72, resize:'none' }} value={form.notes||''} onChange={e=>set('notes',e.target.value)} />
          </div>

          <div style={{ gridColumn:'1/-1', display:'flex', justifyContent:'flex-end', gap:8, borderTop:'1px solid var(--rule)', paddingTop:14 }}>
            <button type="button" className="btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving?'Saving…':editing?'Update order':'Add order'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!confirmId}
        onClose={() => { if (!deleting) setConfirmId(null); }}
        onConfirm={del}
        title="Delete this order?"
        message="This will permanently remove the order. This action cannot be undone."
        loading={deleting}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {selected.size > 0 && (
        <div className="bulk-bar fade-in" style={{
          zIndex:500, display:'flex', alignItems:'center', gap:8,
          
          borderRadius:14, padding:'10px 14px',
          boxShadow:'0 8px 32px rgba(37,35,32,.3)',
          fontSize:12, fontWeight:500, whiteSpace:'nowrap',
        }}>
          <span style={{ paddingRight:10, borderRight:'1px solid rgba(255,255,255,.15)', color:'rgba(255,255,255,.7)' }}>
            {selected.size} selected
          </span>
          {STATUS.map(s => (
            <button key={s} onClick={() => bulkUpdateStatus(s)} disabled={bulkWorking}
              style={{ padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11, fontWeight:500, background:'rgba(255,255,255,.1)', color:'rgba(255,255,255,.85)', transition:'background 0.12s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.2)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.1)'}>
              → {s}
            </button>
          ))}
          <div style={{ width:1, height:20, background:'rgba(255,255,255,.15)', margin:'0 2px' }} />
          <button onClick={bulkDelete} disabled={bulkWorking}
            style={{ padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11.5, fontWeight:500, background:'rgba(176,70,56,.25)', color:'#ff9086' }}>
            Delete {selected.size}
          </button>
          <button onClick={() => setSelected(new Set())}
            style={{ width:24, height:24, borderRadius:6, border:'none', cursor:'pointer', background:'rgba(255,255,255,.1)', color:'rgba(255,255,255,.6)', display:'grid', placeItems:'center', fontSize:14 }}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
