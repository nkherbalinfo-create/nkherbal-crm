import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../utils/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import { DateInput, FilterBar, SelectInput } from '../components/FormControls';
import Pagination from '../components/Pagination';
import { format } from 'date-fns';

const SOURCES  = ['Ads', 'WhatsApp', 'Website', 'Referral', 'Direct'];
const STATUSES = ['Interested', 'Not Interested', 'Converted', 'Follow Up'];
const PRODUCTS = [
  'Muejaza For Men (300g)', 'Shahi Kalp For Men & Women (300g)',
  'Testo – Vardhak For Men (300g)', 'Kashmiri Shilajit 25g',
  'Kashmiri Shilajit 50g', 'Muejaza & Shahi Kalp Combo (300g)',
  'Muejaza Plus For Men (300g)', 'Other / Not Sure'
];

const STATUS_CHIP = { Interested:'chip-info', 'Not Interested':'chip-danger', Converted:'chip-ok', 'Follow Up':'chip-warn' };
const SOURCE_CHIP = { Ads:'chip-info', WhatsApp:'chip-ok', Website:'chip-info', Referral:'chip-muted', Direct:'chip-muted' };

const STAT_CARDS = [
  { key:'Interested',      label:'Interested',      cls:'chip-info'   },
  { key:'Not Interested',  label:'Not Interested',  cls:'chip-danger' },
  { key:'Converted',       label:'Converted',       cls:'chip-ok'     },
  { key:'Follow Up',       label:'Follow Up',       cls:'chip-warn'   },
];

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  name:'', mobile:'', source:'Ads',
  interestedProduct: PRODUCTS[0], status:'Interested', notes:''
};

function Av({ name }) {
  const i = (name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  return <span className="avatar avatar-md">{i}</span>;
}

const COLS = ['','LEAD ID','DATE','NAME','MOBILE','SOURCE','PRODUCT','STATUS','NOTES',''];

const STATUS_META = {
  'Interested':     { dot:'var(--info)',   text:'var(--info)',   bg:'var(--info-bg)'   },
  'Not Interested': { dot:'var(--danger)', text:'var(--danger)', bg:'var(--danger-bg)' },
  'Converted':      { dot:'var(--accent)', text:'var(--accent)', bg:'var(--accent-bg)' },
  'Follow Up':      { dot:'var(--warn)',   text:'var(--warn)',   bg:'var(--warn-bg)'   },
};

function StatusDropdown({ leadId, current, onUpdate, disabled }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const meta = STATUS_META[current] || { dot:'var(--faint)', text:'var(--muted)', bg:'var(--chip)' };

  const toggle = () => {
    if (disabled) return;
    if (!open) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (triggerRef.current && !triggerRef.current.contains(e.target)) setOpen(false); };
    const s = () => setOpen(false);
    document.addEventListener('mousedown', h);
    window.addEventListener('scroll', s, true);
    return () => { document.removeEventListener('mousedown', h); window.removeEventListener('scroll', s, true); };
  }, [open]);

  return (
    <>
      <button ref={triggerRef} onClick={toggle}
        style={{
          display:'inline-flex', alignItems:'center', gap:6,
          padding:'4px 10px', borderRadius:999,
          border: `1px solid ${meta.text}33`,
          cursor: disabled ? 'default' : 'pointer',
          background: meta.bg, color: meta.text,
          fontSize:11, fontWeight:500,
          opacity: disabled ? 0.6 : 1,
          transition:'filter 0.15s',
        }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter='brightness(0.92)'; }}
        onMouseLeave={e => { e.currentTarget.style.filter=''; }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background: meta.dot, flexShrink:0 }} />
        {current}
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {open && createPortal(
        <div className="modal-enter"
          onMouseDown={e => e.stopPropagation()}
          style={{
            position:'fixed', top: pos.top, left: pos.left, zIndex:9999,
            background:'var(--card)', border:'1px solid var(--rule)', borderRadius:12,
            padding:6, boxShadow:'0 8px 32px rgba(37,35,32,.16)', minWidth:170,
          }}>
          {STATUSES.map(s => {
            const m = STATUS_META[s];
            const active = s === current;
            return (
              <button key={s} onClick={() => { onUpdate(leadId, s); setOpen(false); }}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:9,
                  padding:'8px 10px', border:'none', borderRadius:8, cursor:'pointer',
                  background: active ? m.bg : 'transparent',
                  color: active ? m.text : 'var(--fg)',
                  fontSize:12.5, fontWeight: active ? 600 : 400,
                  transition:'background 0.12s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background='var(--hover)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background='transparent'; }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background: m.dot, flexShrink:0 }} />
                {s}
                {active && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginLeft:'auto' }}><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [meta, setMeta] = useState({ total:0, pages:1, page:1 });
  const [listKey, setListKey] = useState(0);
  const [statusCounts, setStatusCounts] = useState({});
  const [filters, setFilters] = useState({ status:'', source:'', search:'' });
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [exitId, setExitId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const { addToast } = useToast();

  const toggleSelect = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(s => s.size === leads.length ? new Set() : new Set(leads.map(l => l._id)));

  const bulkUpdateStatus = async (status) => {
    setBulkWorking(true);
    try {
      await Promise.all([...selected].map(id => api.put(`/leads/${id}`, { status })));
      setLeads(prev => prev.map(l => selected.has(l._id) ? { ...l, status } : l));
      addToast(`${selected.size} leads updated to "${status}"`);
      setSelected(new Set());
    } catch { addToast('Bulk update failed', 'error'); }
    finally { setBulkWorking(false); }
  };

  const bulkDelete = async () => {
    setBulkWorking(true);
    try {
      await Promise.all([...selected].map(id => api.delete(`/leads/${id}`)));
      setLeads(prev => prev.filter(l => !selected.has(l._id)));
      setMeta(m => ({ ...m, total: Math.max(0, m.total - selected.size) }));
      addToast(`${selected.size} leads deleted`);
      setSelected(new Set());
    } catch { addToast('Bulk delete failed', 'error'); }
    finally { setBulkWorking(false); }
  };

  const load = useCallback(async () => {
    try {
      const params = { page, limit:8, ...Object.fromEntries(Object.entries(filters).filter(([,v])=>v)) };
      const { data } = await api.get('/leads', { params });
      setLeads(data.leads);
      setMeta({ total:data.total, page:data.page, pages:data.pages });
      if (data.statusCounts) setStatusCounts(data.statusCounts);
      setListKey(k => k + 1);
    } catch { addToast('Failed to load leads','error'); }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 8s — picks up WhatsApp bot status changes
  useEffect(() => { const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  const updateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      await api.put(`/leads/${id}`, { status: newStatus });
      setLeads(prev => prev.map(l => l._id === id ? { ...l, status: newStatus } : l));
      setStatusCounts(prev => {
        const updated = { ...prev };
        const old = leads.find(l => l._id === id)?.status;
        if (old) updated[old] = Math.max(0, (updated[old] || 1) - 1);
        updated[newStatus] = (updated[newStatus] || 0) + 1;
        return updated;
      });
    } catch { addToast('Update failed','error'); }
    finally { setUpdatingId(null); }
  };

  const set = (f,v) => setForm(p=>({...p,[f]:v}));
  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await api.put(`/leads/${editing}`, form);
      else await api.post('/leads', form);
      addToast(editing?'Lead updated':'Lead added'); setModal(false); load();
    } catch (err) { addToast(err.response?.data?.message||'Save failed','error'); }
    finally { setSaving(false); }
  };
  const del = async () => {
    if (!confirmId) return;
    const id = confirmId;
    setConfirmId(null);
    setExitId(id);
    await new Promise(r => setTimeout(r, 460));
    const row = document.querySelector(`tr[data-row-id="${id}"]`);
    if (row) {
      const h = row.offsetHeight;
      row.style.height = h + 'px';
      row.style.overflow = 'hidden';
      row.style.transition = 'height 0.24s ease-out';
      void row.offsetHeight;
      row.style.height = '0';
      await new Promise(r => setTimeout(r, 260));
    }
    setLeads(prev => prev.filter(l => l._id !== id));
    setMeta(m => ({ ...m, total: Math.max(0, m.total - 1) }));
    setExitId(null);
    try { await api.delete(`/leads/${id}`); addToast('Lead deleted'); }
    catch { addToast('Delete failed','error'); load(); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, paddingBottom: selected.size > 0 ? 80 : 0 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.02em', color:'var(--fg)' }}>Leads</div>
            <span style={{ display:'flex', alignItems:'center', gap:5, padding:'2px 8px', borderRadius:999, background:'var(--accent-bg)', fontSize:10.5, fontWeight:500, color:'var(--accent)' }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', display:'inline-block', animation:'pulse-dot 2s ease-in-out infinite' }} />
              Live
            </span>
          </div>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>auto-captured from WhatsApp · status syncs every 8s</div>
        </div>
        <button className="btn-primary" onClick={()=>{setEditing(null);setForm(emptyForm);setModal(true);}} style={{ display:'flex', alignItems:'center', gap:5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add lead
        </button>
      </div>

      {/* Stat cards */}
      <div className="stat-grid-4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {STAT_CARDS.map(({key,label,cls}) => (
          <div key={key} className="card" style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }} className={cls}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                {cls==='chip-ok'&&<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"/>}
                {cls==='chip-danger'&&<><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>}
                {cls==='chip-info'&&<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
                {cls==='chip-warn'&&<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>}
              </svg>
            </div>
            <div>
              <div style={{ fontSize:11, color:'var(--faint)' }}>{label}</div>
              <div style={{ fontSize:22, fontWeight:600, color:'var(--fg)', fontFamily:'Inter', fontVariantNumeric:'tabular-nums', lineHeight:1.2 }}>{statusCounts[key]||0}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <FilterBar>
          <input className="input" placeholder="Search name, mobile…" value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))} />
          <SelectInput value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}>
            <option value="">All status</option>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </SelectInput>
          <SelectInput value={filters.source} onChange={e=>setFilters(f=>({...f,source:e.target.value}))}>
            <option value="">All sources</option>
            {SOURCES.map(s=><option key={s}>{s}</option>)}
          </SelectInput>
          <button className="btn-primary" style={{ fontSize:12 }} onClick={()=>{setPage(1);load();}}>Filter</button>
          <button className="btn-secondary" style={{ fontSize:12 }} onClick={()=>setFilters({status:'',source:'',search:''})}>Clear</button>
      </FilterBar>

      {/* Table */}
      <div key={listKey} className="fade-in">
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div className="tbl-scroll">
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--rule)' }}>
                <th style={{ padding:'11px 14px', width:36, background:'var(--card)' }}>
                  <input type="checkbox" checked={leads.length > 0 && selected.size === leads.length} onChange={toggleAll} style={{ accentColor:'var(--accent)', cursor:'pointer' }} />
                </th>
                {COLS.slice(1).map(h=>(
                  <th key={h} style={{ textAlign:'left', padding:'11px 16px', fontSize:11, fontWeight:500, letterSpacing:'0.04em', textTransform:'uppercase', color:'var(--muted)', whiteSpace:'nowrap', background:'var(--card)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map(l=>(
                <tr key={l._id} data-row-id={l._id} className={`tr-hover${exitId===l._id?' row-deleting':''}`}
                  style={{ borderBottom:'1px solid var(--rule)', background: selected.has(l._id) ? 'var(--accent-bg)' : '' }}
                  onMouseEnter={e=>{ if (!selected.has(l._id)) e.currentTarget.style.background='var(--hover)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background = selected.has(l._id) ? 'var(--accent-bg)' : 'transparent'; }}>
                  <td style={{ padding:'11px 14px', width:36 }} onClick={e=>e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(l._id)} onChange={()=>toggleSelect(l._id)} style={{ accentColor:'var(--accent)', cursor:'pointer' }} />
                  </td>
                  <td style={{ padding:'11px 16px', fontFamily:'Inter', fontSize:11, color:'var(--faint)', fontVariantNumeric:'tabular-nums' }}>{l.leadId}</td>
                  <td style={{ padding:'11px 16px', fontFamily:'Inter', fontSize:13, color:'var(--muted)', whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums' }}>{format(new Date(l.date),'dd MMM yy')}</td>
                  <td style={{ padding:'11px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                      <Av name={l.name} />
                      <div style={{ fontSize:12.5, fontWeight:500, color:'var(--fg)' }}>{l.name}</div>
                    </div>
                  </td>
                  <td style={{ padding:'11px 16px', fontFamily:'Inter', fontSize:11.5, color:'var(--muted)', fontVariantNumeric:'tabular-nums' }}>{l.mobile}</td>
                  <td style={{ padding:'11px 16px' }}><span className={`chip ${SOURCE_CHIP[l.source]||'chip-muted'}`}>{l.source}</span></td>
                  <td style={{ padding:'11px 16px', maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12, color:'var(--muted)' }}>{l.interestedProduct}</td>
                  <td style={{ padding:'10px 16px' }}>
                    <StatusDropdown
                      leadId={l._id}
                      current={l.status}
                      onUpdate={updateStatus}
                      disabled={updatingId === l._id}
                    />
                  </td>
                  <td style={{ padding:'11px 16px', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:11.5, color:'var(--faint)' }}>
                    {l.convertedOrderId
                      ? <span className="chip chip-ok" style={{ fontSize:10 }}>→ Order placed</span>
                      : l.notes}
                  </td>
                  <td style={{ padding:'11px 16px' }}>
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={()=>{setEditing(l._id);setForm({...l,date:l.date?.split('T')[0]});setModal(true);}}
                        style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:7, border:'none', cursor:'pointer', background:'var(--chip)', color:'var(--muted)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={()=>setConfirmId(l._id)}
                        style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:7, border:'none', cursor:'pointer', background:'var(--danger-bg)', color:'var(--danger)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!leads.length&&<tr><td colSpan={9} style={{ padding:'48px 16px', textAlign:'center', color:'var(--faint)', fontSize:13 }}>No leads found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      </div>

      <Pagination page={page} pages={meta.pages} total={meta.total} limit={8} onPage={p=>{setPage(p);window.scrollTo({top:0,behavior:'smooth'});}} />

      <Modal open={modal} onClose={()=>setModal(false)} title={editing?'Edit lead':'Add new lead'}>
        <form onSubmit={save} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div><label className="label">Date</label><DateInput value={form.date} onChange={value=>set('date',value)} required /></div>
          <div><label className="label">Full Name</label><input type="text" className="input" value={form.name} onChange={e=>set('name',e.target.value)} required /></div>
          <div><label className="label">Mobile</label><input type="text" className="input" value={form.mobile} onChange={e=>set('mobile',e.target.value)} required /></div>
          <div><label className="label">Source</label><SelectInput value={form.source} onChange={e=>set('source',e.target.value)}>{SOURCES.map(o=><option key={o}>{o}</option>)}</SelectInput></div>
          <div><label className="label">Interested Product</label><SelectInput value={form.interestedProduct} onChange={e=>set('interestedProduct',e.target.value)}>{PRODUCTS.map(o=><option key={o}>{o}</option>)}</SelectInput></div>
          <div><label className="label">Status</label><SelectInput value={form.status} onChange={e=>set('status',e.target.value)}>{STATUSES.map(o=><option key={o}>{o}</option>)}</SelectInput></div>
          <div style={{ gridColumn:'1/-1' }}><label className="label">Notes</label><textarea className="input" style={{ height:72, resize:'none' }} value={form.notes||''} onChange={e=>set('notes',e.target.value)} /></div>
          <div style={{ gridColumn:'1/-1', display:'flex', justifyContent:'flex-end', gap:8, borderTop:'1px solid var(--rule)', paddingTop:14 }}>
            <button type="button" className="btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving?'Saving…':editing?'Update':'Add lead'}</button>
          </div>
        </form>
      </Modal>
      <ConfirmModal
        open={!!confirmId}
        onClose={() => { if (!deleting) setConfirmId(null); }}
        onConfirm={del}
        title="Delete this lead?"
        message="This will permanently remove the lead. This action cannot be undone."
        loading={deleting}
      />

      {/* Floating bulk action bar */}
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
          {/* Status submenu */}
          {STATUSES.map(s => {
            const m = STATUS_META[s];
            return (
              <button key={s} onClick={() => bulkUpdateStatus(s)} disabled={bulkWorking}
                style={{ padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11.5, fontWeight:500, background:m.bg, color:m.text, transition:'opacity 0.15s', opacity:bulkWorking?0.6:1 }}>
                {s}
              </button>
            );
          })}
          <div style={{ width:1, height:20, background:'rgba(255,255,255,.15)', margin:'0 2px' }} />
          <button onClick={bulkDelete} disabled={bulkWorking}
            style={{ padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11.5, fontWeight:500, background:'rgba(176,70,56,.25)', color:'#ff9086', opacity:bulkWorking?0.6:1 }}>
            Delete {selected.size}
          </button>
          <button onClick={() => setSelected(new Set())}
            style={{ width:24, height:24, borderRadius:6, border:'none', cursor:'pointer', background:'rgba(255,255,255,.1)', color:'rgba(255,255,255,.6)', display:'grid', placeItems:'center', fontSize:14, lineHeight:1 }}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
