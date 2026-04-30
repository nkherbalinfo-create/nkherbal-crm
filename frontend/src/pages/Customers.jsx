import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { FilterBar, SelectInput } from '../components/FormControls';
import { format } from 'date-fns';

const TYPE_CHIP = { Repeat:'chip-ok', New:'chip-info' };
const STATUS_CHIP = { Delivered:'chip-ok', Cancelled:'chip-danger', RTO:'chip-warn', Shipped:'chip-info', Processing:'chip-muted' };
const PAY_CHIP   = { Paid:'chip-ok', COD:'chip-warn', Pending:'chip-danger' };

function Av({ name, size = 'md' }) {
  const i = (name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const hue = [...(name||'U')].reduce((a,c)=>a+c.charCodeAt(0),0) % 360;
  return (
    <span className={`avatar avatar-${size}`} style={{ background:`hsl(${hue},45%,88%)`, color:`hsl(${hue},45%,35%)` }}>
      {i}
    </span>
  );
}

const inr = (n) => '₹' + Number(n||0).toLocaleString('en-IN');
const COLS = ['','NAME','MOBILE','CITY','TYPE','ORDERS','REVENUE','LAST ORDER',''];

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [meta, setMeta] = useState({ total:0, pages:1, page:1 });
  const [listKey, setListKey] = useState(0);
  const [filters, setFilters] = useState({ type:'', search:'' });
  const [page, setPage] = useState(1);
  const [profileModal, setProfileModal] = useState(false);
  const [profile, setProfile] = useState(null);
  const [recalculating, setRecalculating] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [exitMobile, setExitMobile] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);

  const toggleSelect = (mobile) => setSelected(s => { const n = new Set(s); n.has(mobile) ? n.delete(mobile) : n.add(mobile); return n; });
  const toggleAll = () => setSelected(s => s.size === customers.length ? new Set() : new Set(customers.map(c => c.mobile)));

  const bulkDelete = async () => {
    setBulkWorking(true);
    try {
      await Promise.all([...selected].map(mobile => api.delete(`/customers/${mobile}`)));
      setCustomers(prev => prev.filter(c => !selected.has(c.mobile)));
      setMeta(m => ({ ...m, total: Math.max(0, m.total - selected.size) }));
      addToast(`${selected.size} customers deleted`);
      setSelected(new Set());
    } catch { addToast('Bulk delete failed', 'error'); }
    finally { setBulkWorking(false); }
  };
  const { addToast } = useToast();

  const load = useCallback(async () => {
    try {
      const params = { page, limit:8, ...Object.fromEntries(Object.entries(filters).filter(([,v])=>v)) };
      const { data } = await api.get('/customers', { params });
      setCustomers(data.customers);
      setMeta({ total:data.total, page:data.page, pages:data.pages });
      setListKey(k => k + 1);
    } catch {}
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const viewProfile = async (mobile) => {
    try { const { data } = await api.get(`/customers/${mobile}/orders`); setProfile(data); setProfileModal(true); } catch {}
  };

  const deleteCustomer = async () => {
    if (!confirmTarget) return;
    const target = confirmTarget;
    setConfirmTarget(null);
    setExitMobile(target.mobile);
    await new Promise(r => setTimeout(r, 460));
    const row = document.querySelector(`tr[data-row-id="${target.mobile}"]`);
    if (row) {
      const h = row.offsetHeight;
      row.style.height = h + 'px';
      row.style.overflow = 'hidden';
      row.style.transition = 'height 0.24s ease-out';
      void row.offsetHeight;
      row.style.height = '0';
      await new Promise(r => setTimeout(r, 260));
    }
    setCustomers(prev => prev.filter(c => c.mobile !== target.mobile));
    setMeta(m => ({ ...m, total: Math.max(0, m.total - 1) }));
    setExitMobile(null);
    try { await api.delete(`/customers/${target.mobile}`); addToast(`${target.name} deleted`,'success'); }
    catch { addToast('Delete failed','error'); load(); }
  };

  const recalculate = async () => {
    setRecalculating(true);
    try { const { data } = await api.post('/sync/recalculate',{}); addToast(data.message,'success'); load(); }
    catch { addToast('Recalculate failed','error'); }
    finally { setRecalculating(false); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.02em', color:'var(--fg)' }}>Customers</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:3, fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>
            {meta.total} total · {customers.filter(c=>c.isRepeat).length} repeat
          </div>
        </div>
        <button className="btn-secondary" onClick={recalculate} disabled={recalculating} style={{ display:'flex', alignItems:'center', gap:6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ animation:recalculating?'spin 0.7s linear infinite':'' }}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          {recalculating?'Recalculating…':'Recalculate stats'}
        </button>
      </div>

      {/* Filter bar */}
      <FilterBar>
          <input className="input" placeholder="Search name or mobile…" value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))} />
          <SelectInput value={filters.type} onChange={e=>setFilters(f=>({...f,type:e.target.value}))}>
            <option value="">All types</option>
            <option value="new">New</option>
            <option value="repeat">Repeat</option>
          </SelectInput>
          <button className="btn-primary" style={{ fontSize:12 }} onClick={()=>{setPage(1);load();}}>Filter</button>
          <button className="btn-secondary" style={{ fontSize:12 }} onClick={()=>setFilters({type:'',search:''})}>Clear</button>
      </FilterBar>

      {/* Table */}
      <div key={listKey} className="fade-in">
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--rule)' }}>
                <th style={{ padding:'11px 14px', width:36, background:'var(--card)' }}>
                  <input type="checkbox" checked={customers.length > 0 && selected.size === customers.length} onChange={toggleAll} style={{ accentColor:'var(--accent)', cursor:'pointer' }} />
                </th>
                {COLS.slice(1).map(h=>(
                  <th key={h} style={{ textAlign:h==='ORDERS'||h==='REVENUE'?'right':'left', padding:'11px 16px', fontSize:11, fontWeight:500, letterSpacing:'0.04em', textTransform:'uppercase', color:'var(--muted)', whiteSpace:'nowrap', background:'var(--card)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map(c=>(
                <tr key={c._id} data-row-id={c.mobile} className={`tr-hover${exitMobile===c.mobile?' row-deleting':''}`}
                  style={{ borderBottom:'1px solid var(--rule)', background: selected.has(c.mobile) ? 'var(--accent-bg)' : '' }}
                  onMouseEnter={e=>{ if (!selected.has(c.mobile)) e.currentTarget.style.background='var(--hover)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background = selected.has(c.mobile) ? 'var(--accent-bg)' : 'transparent'; }}>
                  <td style={{ padding:'11px 14px', width:36 }} onClick={e=>e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(c.mobile)} onChange={()=>toggleSelect(c.mobile)} style={{ accentColor:'var(--accent)', cursor:'pointer' }} />
                  </td>
                  <td style={{ padding:'11px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <Av name={c.name} />
                      <div style={{ fontSize:12.5, fontWeight:500, color:'var(--fg)' }}>{c.name}</div>
                    </div>
                  </td>
                  <td style={{ padding:'11px 16px', fontFamily:'Inter', fontSize:11.5, color:'var(--muted)', fontVariantNumeric:'tabular-nums' }}>{c.mobile}</td>
                  <td style={{ padding:'11px 16px', fontSize:12.5, color:'var(--muted)' }}>{c.city||'—'}</td>
                  <td style={{ padding:'11px 16px' }}><span className={`chip ${c.isRepeat?'chip-ok':'chip-info'}`}>{c.isRepeat?'Repeat':'New'}</span></td>
                  <td style={{ padding:'11px 16px', textAlign:'right', fontFamily:'Inter', fontSize:12.5, fontWeight:600, color:'var(--fg)', fontVariantNumeric:'tabular-nums' }}>{c.totalOrders}</td>
                  <td style={{ padding:'11px 16px', textAlign:'right', fontFamily:'Inter', fontSize:12.5, fontWeight:600, color:'var(--accent)', fontVariantNumeric:'tabular-nums' }}>{inr(c.totalRevenue)}</td>
                  <td style={{ padding:'11px 16px', fontFamily:'Inter', fontSize:11.5, color:'var(--faint)', fontVariantNumeric:'tabular-nums' }}>{c.lastOrderDate?format(new Date(c.lastOrderDate),'dd MMM yyyy'):'—'}</td>
                  <td style={{ padding:'11px 16px' }}>
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={()=>viewProfile(c.mobile)} style={{ padding:'4px 10px', borderRadius:7, border:'none', cursor:'pointer', background:'var(--accent-bg)', color:'var(--accent)', fontSize:12, fontWeight:500 }}>View</button>
                      <button onClick={()=>setConfirmTarget({mobile:c.mobile,name:c.name})} style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:7, border:'none', cursor:'pointer', background:'var(--danger-bg)', color:'var(--danger)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!customers.length&&<tr><td colSpan={8} style={{ padding:'48px 16px', textAlign:'center', color:'var(--faint)', fontSize:13 }}>No customers found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      </div>

      <Pagination page={page} pages={meta.pages} total={meta.total} limit={8} onPage={p=>{setPage(p);window.scrollTo({top:0,behavior:'smooth'});}} />

      {/* Customer Profile Modal */}
      <Modal open={profileModal} onClose={()=>setProfileModal(false)} title="Customer profile" size="lg">
        {profile && (() => {
          const email = profile.orders?.find(o=>o.email)?.email||'';
          const billingAddress = profile.orders?.find(o=>o.billingAddress)?.billingAddress||'';
          return (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {/* Info grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {[
                  {l:'Name',          v:profile.customer?.name},
                  {l:'Mobile',        v:profile.customer?.mobile},
                  {l:'City',          v:profile.customer?.city||'—'},
                  {l:'Total Orders',  v:profile.customer?.totalOrders},
                  {l:'Total Revenue', v:inr(profile.customer?.totalRevenue)},
                  {l:'Type',          v:profile.customer?.isRepeat?'Repeat Customer':'New Customer'},
                ].map(({l,v})=>(
                  <div key={l} style={{ background:'var(--bg)', borderRadius:9, padding:'10px 14px' }}>
                    <div style={{ fontSize:11, color:'var(--faint)', marginBottom:4 }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:500, color:'var(--fg)' }}>{v}</div>
                  </div>
                ))}
              </div>

              {(email||billingAddress) && (
                <div style={{ background:'var(--bg)', borderRadius:9, padding:'12px 14px', display:'flex', flexDirection:'column', gap:3 }}>
                  <div style={{ fontSize:11, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--faint)', marginBottom:6 }}>Billing Details</div>
                  {billingAddress&&<div style={{ fontSize:12.5, color:'var(--muted)' }}>{billingAddress}</div>}
                  {email&&<div style={{ fontSize:12.5, color:'var(--accent)' }}>{email}</div>}
                </div>
              )}

              <div>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--fg)', marginBottom:10 }}>Order History</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:280, overflowY:'auto' }}>
                  {profile.orders?.map(o => {
                    const items = o.lineItems?.length ? o.lineItems : [{name:o.productName, quantity:o.quantity, gst:o.orderValue-o.orderValue/1.05}];
                    const totalGst = items.reduce((s,i)=>s+(i.gst||0),0);
                    return (
                      <div key={o._id} style={{ background:'var(--bg)', borderRadius:10, padding:'12px 14px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            {items.map((item,idx)=>(
                              <div key={idx} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12.5 }}>
                                <span style={{ fontWeight:500, color:'var(--fg)' }}>{item.name}</span>
                                <span style={{ color:'var(--faint)', fontSize:11 }}>×{item.quantity}</span>
                              </div>
                            ))}
                            <div style={{ fontSize:11, color:'var(--faint)', marginTop:4, fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>
                              {o.orderId} · {format(new Date(o.orderDate),'dd MMM yyyy')} · {o.salesChannel}
                            </div>
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:'var(--accent)', fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>{inr(o.orderValue)}</div>
                            <div style={{ fontSize:11, color:'var(--faint)', fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>GST {inr(totalGst)}</div>
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                          <span className={`chip ${STATUS_CHIP[o.orderStatus]||'chip-muted'}`}>{o.orderStatus}</span>
                          <span className={`chip ${PAY_CHIP[o.paymentStatus]||'chip-muted'}`}>{o.paymentStatus}</span>
                          {o.paymentMethod&&<span className="chip chip-muted">{o.paymentMethod}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
      <ConfirmModal
        open={!!confirmTarget}
        onClose={() => { if (!deleting) setConfirmTarget(null); }}
        onConfirm={deleteCustomer}
        title={`Delete "${confirmTarget?.name}"?`}
        message="This will permanently remove the customer and all their orders. This cannot be undone."
        loading={deleting}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {selected.size > 0 && (
        <div className="bulk-bar fade-in" style={{
          zIndex:500, display:'flex', alignItems:'center', gap:10,
          background:'var(--fg)', color:'var(--bg)',
          borderRadius:14, padding:'10px 16px',
          boxShadow:'0 8px 32px rgba(37,35,32,.3)',
          fontSize:12, fontWeight:500, whiteSpace:'nowrap',
        }}>
          <span style={{ paddingRight:10, borderRight:'1px solid rgba(255,255,255,.15)', color:'rgba(255,255,255,.7)' }}>
            {selected.size} customer{selected.size > 1 ? 's' : ''} selected
          </span>
          <button onClick={bulkDelete} disabled={bulkWorking}
            style={{ padding:'5px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11.5, fontWeight:500, background:'rgba(176,70,56,.25)', color:'#ff9086' }}>
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
