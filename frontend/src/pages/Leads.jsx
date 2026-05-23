import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '../hooks/useIsMobile';
import api from '../utils/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import { DateInput, FilterBar, SelectInput } from '../components/FormControls';
import Pagination from '../components/Pagination';
import { format } from 'date-fns';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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

function calcScore(lead) {
  if (lead.status === 'Not Interested') return 0;
  let score = 0;
  const src = { WhatsApp: 30, Ads: 20, Website: 20, Referral: 15, Direct: 10 };
  score += src[lead.source] || 10;
  const st = { Interested: 40, 'Follow Up': 25, Converted: 50, 'Not Interested': 0 };
  score += st[lead.status] || 0;
  const days = Math.floor((Date.now() - new Date(lead.date)) / 86400000);
  if (days <= 7) score += 30;
  else if (days <= 30) score += 20;
  else if (days <= 60) score += 10;
  return Math.min(100, score);
}

function ScoreBadge({ lead }) {
  if (lead.status === 'Not Interested') return null;
  const score = calcScore(lead);
  let label, color, bg;
  if (score >= 65) { label = '🔴 Hot'; color = '#e05c2d'; bg = 'rgba(224,92,45,.12)'; }
  else if (score >= 35) { label = '🟡 Warm'; color = '#c9960b'; bg = 'rgba(201,150,11,.12)'; }
  else { label = '🔵 Cold'; color = 'var(--muted)'; bg = 'var(--chip)'; }
  return (
    <span style={{ padding:'2px 8px', borderRadius:999, fontSize:10.5, fontWeight:600, color, background:bg, border:`1px solid ${color}33`, letterSpacing:'0.01em', whiteSpace:'nowrap' }}>
      {label}
    </span>
  );
}

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

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid var(--rule)' }}>
      {[36, 80, 80, 160, 110, 72, 140, 64, 96, 90, 56].map((w, i) => (
        <td key={i} style={{ padding: '13px 16px' }}>
          <div className="skeleton" style={{ width: w, height: 12, borderRadius: 4 }} />
        </td>
      ))}
    </tr>
  );
}

function Av({ name }) {
  const i = (name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  return <span className="avatar avatar-md">{i}</span>;
}

const COLS = ['','LEAD ID','DATE','NAME','MOBILE','SOURCE','PRODUCT','SCORE','STATUS','NOTES',''];

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
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState(null); // { id, field, value }
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('leads_view') || 'table');
  const [boardLeads, setBoardLeads] = useState([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const isMobile = useIsMobile(767);
  const [selected, setSelected] = useState(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const pressTimer = useRef(null);

  const SAVED_VIEWS_KEY = 'savedViews_leads';
  const [savedViews, setSavedViews] = useState(() => {
    try { return JSON.parse(localStorage.getItem('savedViews_leads')) || []; } catch { return []; }
  });
  const [savingView, setSavingView] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  const handlePressStart = (id) => {
    pressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(40);
      setSelected(s => { const n = new Set(s); n.add(id); return n; });
    }, 450);
  };
  const handlePressEnd = () => { clearTimeout(pressTimer.current); };
  const handlePressMove = () => { clearTimeout(pressTimer.current); };
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
    setLoading(true);
    try {
      const params = { page, limit:8, ...Object.fromEntries(Object.entries(filters).filter(([,v])=>v)) };
      const { data } = await api.get('/leads', { params });
      const sorted = [...(data.leads||[])].sort((a,b) => calcScore(b) - calcScore(a));
      setLeads(sorted);
      setMeta({ total:data.total, page:data.page, pages:data.pages });
      if (data.statusCounts) setStatusCounts(data.statusCounts);
      setListKey(k => k + 1);
    } catch { addToast('Failed to load leads','error'); }
    finally { setLoading(false); }
  }, [page, filters]);

  const saveInlineEdit = async (id, field, value) => {
    const trimmed = value.trim();
    setEditingCell(null);
    if (!trimmed) return;
    const original = leads.find(l => l._id === id)?.[field];
    if (trimmed === original) return;
    setLeads(prev => prev.map(l => l._id === id ? { ...l, [field]: trimmed } : l));
    try {
      await api.put(`/leads/${id}`, { [field]: trimmed });
    } catch {
      setLeads(prev => prev.map(l => l._id === id ? { ...l, [field]: original } : l));
      addToast('Update failed', 'error');
    }
  };

  const loadBoard = useCallback(async () => {
    setBoardLoading(true);
    try {
      const { data } = await api.get('/leads', { params: { limit: 200 } });
      const scored = (data.leads || []).map(l => ({ ...l, _score: calcScore(l) }));
      setBoardLeads(scored);
    } catch { addToast('Failed to load board', 'error'); }
    finally { setBoardLoading(false); }
  }, []);

  const switchView = (mode) => {
    setViewMode(mode);
    localStorage.setItem('leads_view', mode);
    if (mode === 'board') loadBoard();
  };

  useEffect(() => { load(); }, [load]);

  // Load board data on mount if board view is active
  useEffect(() => {
    if (viewMode === 'board' && boardLeads.length === 0) {
      loadBoard();
    }
  }, [viewMode, boardLeads.length, loadBoard]);

  // Auto-refresh every 8s — picks up WhatsApp bot status changes
  useEffect(() => {
    const t = setInterval(() => {
      if (viewMode === 'table') load();
      else loadBoard();
    }, 8000);
    return () => clearInterval(t);
  }, [load, loadBoard, viewMode]);

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

  const exportLeads = async () => {
    setExporting(true);
    try {
      const activeFilters = Object.fromEntries(Object.entries(filters).filter(([,v])=>v));
      const { data } = await api.get('/leads', { params: { limit:10000, ...activeFilters } });
      const rows = data.leads || [];
      const wb = new ExcelJS.Workbook();
      wb.creator = 'NK Herbal CRM';
      const ws = wb.addWorksheet('Leads');
      ws.columns = [
        { header:'Name',    key:'name',               width:22 },
        { header:'Mobile',  key:'mobile',             width:16 },
        { header:'Status',  key:'status',             width:14 },
        { header:'Source',  key:'source',             width:12 },
        { header:'Product', key:'interestedProduct',  width:28 },
        { header:'Date',    key:'date',               width:14 },
        { header:'Lead ID', key:'leadId',             width:22 },
        { header:'Notes',   key:'notes',              width:30 },
      ];
      ws.getRow(1).eachCell(c => {
        c.font = { bold:true, color:{ argb:'FFFFFFFF' } };
        c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF3d8a5c' } };
        c.alignment = { vertical:'middle' };
      });
      rows.forEach(l => ws.addRow({ ...l, date: l.date ? format(new Date(l.date),'dd/MM/yyyy') : '' }));
      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf]), `nkherbal_leads_${format(new Date(),'yyyy-MM-dd')}.xlsx`);
      addToast(`${rows.length} leads exported`);
    } catch { addToast('Export failed','error'); }
    finally { setExporting(false); }
  };

  const persistViews = (views) => {
    setSavedViews(views);
    localStorage.setItem('savedViews_leads', JSON.stringify(views));
  };
  const saveCurrentView = () => {
    if (!newViewName.trim()) return;
    if (savedViews.length >= 5) { addToast('Maximum 5 saved views', 'error'); return; }
    persistViews([...savedViews, { name: newViewName.trim(), filters: { ...filters } }]);
    setNewViewName(''); setSavingView(false);
    addToast('View saved');
  };
  const applyView = (view) => {
    setFilters({ status:'', source:'', search:'', ...view.filters });
    setPage(1);
  };
  const deleteSavedView = (idx) => persistViews(savedViews.filter((_, i) => i !== idx));

  const handleDragStart = (e, leadId) => {
    setDraggedId(leadId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragOver = (e, colStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colStatus);
  };

  const handleDrop = async (e, colStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggedId) return;
    const lead = boardLeads.find(l => l._id === draggedId);
    setDraggedId(null);
    if (!lead || lead.status === colStatus) return;
    // Optimistic update
    setBoardLeads(prev => prev.map(l => l._id === lead._id ? { ...l, status: colStatus } : l));
    try {
      await api.put(`/leads/${lead._id}`, { status: colStatus });
      addToast(`Moved to ${colStatus}`);
    } catch {
      addToast('Update failed', 'error');
      loadBoard();
    }
  };

  const handleDragEnd = () => { setDraggedId(null); setDragOverCol(null); };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, paddingBottom: selected.size > 0 ? 80 : 0, overflow:'hidden', maxWidth:'100%' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
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
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {/* View toggle — desktop only */}
          {!isMobile && (
            <div style={{ display:'flex', borderRadius:9, border:'1px solid var(--rule)', overflow:'hidden', background:'var(--card)' }}>
              {[
                { mode:'table', label:'Table', path:'M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z' },
                { mode:'board', label:'Board', path:'M3 3h7v18H3zM14 3h7v18h-7z' },
              ].map(({ mode, label, path }) => (
                <button key={mode} onClick={() => switchView(mode)}
                  style={{
                    display:'flex', alignItems:'center', gap:5,
                    padding:'6px 12px', border:'none', cursor:'pointer', fontSize:12, fontWeight:500,
                    background: viewMode === mode ? 'var(--accent)' : 'transparent',
                    color: viewMode === mode ? 'var(--accent-ink)' : 'var(--muted)',
                    transition:'background 0.15s, color 0.15s',
                  }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={path}/></svg>
                  {label}
                </button>
              ))}
            </div>
          )}
          <button className="btn-secondary" onClick={exportLeads} disabled={exporting} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
            {exporting
              ? <><span style={{ width:11, height:11, border:'2px solid var(--muted)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.6s linear infinite', display:'inline-block' }} /> Exporting…</>
              : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Export Excel</>}
          </button>
          <button className="btn-primary" onClick={()=>{setEditing(null);setForm(emptyForm);setModal(true);}} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add lead
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 8 : 12 }}>
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

      {/* Saved views — desktop only */}
      {!isMobile && (savedViews.length > 0 || true) && (
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', minHeight: 32 }}>
          {savedViews.map((v, i) => (
            <div key={i} style={{ display:'inline-flex', alignItems:'center', background:'var(--card)', border:'1px solid var(--rule)', borderRadius:999, overflow:'hidden', boxShadow:'var(--shadow-card)' }}>
              <button onClick={() => applyView(v)}
                style={{ padding:'5px 12px', border:'none', background:'transparent', cursor:'pointer', fontSize:12, fontWeight:500, color:'var(--fg)', whiteSpace:'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.background='var(--hover)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                {v.name}
              </button>
              <button onClick={() => deleteSavedView(i)}
                style={{ padding:'4px 8px 4px 2px', border:'none', background:'transparent', cursor:'pointer', color:'var(--faint)', fontSize:13, lineHeight:1, display:'flex', alignItems:'center' }}
                onMouseEnter={e => e.currentTarget.style.color='var(--danger)'}
                onMouseLeave={e => e.currentTarget.style.color='var(--faint)'}>
                ✕
              </button>
            </div>
          ))}
          {savingView ? (
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <input autoFocus className="input" style={{ width:150, padding:'5px 10px', fontSize:12 }}
                placeholder="View name…" value={newViewName}
                onChange={e => setNewViewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveCurrentView(); if (e.key === 'Escape') setSavingView(false); }} />
              <button className="btn-primary" style={{ padding:'5px 10px', fontSize:12 }} onClick={saveCurrentView}>Save</button>
              <button className="btn-secondary" style={{ padding:'5px 10px', fontSize:12 }} onClick={() => setSavingView(false)}>Cancel</button>
            </div>
          ) : savedViews.length < 5 && (
            <button className="btn-secondary"
              style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', fontSize:12 }}
              onClick={() => { setSavingView(true); setNewViewName(''); }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              Save view
            </button>
          )}
        </div>
      )}

      {/* Mobile inline bulk bar — replaces search when items selected */}
      {isMobile && selected.size > 0 && (
        <div className="fade-in" style={{ background:'rgba(20,18,15,0.96)', backdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:14, boxShadow:'0 4px 20px rgba(0,0,0,.35)', width:'100%', boxSizing:'border-box', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px 6px', gap:8 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,.9)' }}>{selected.size} lead{selected.size > 1 ? 's' : ''} selected</span>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <button onClick={toggleAll} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid rgba(255,255,255,.2)', cursor:'pointer', background:'transparent', color:'rgba(255,255,255,.7)', fontSize:11.5, fontWeight:500, whiteSpace:'nowrap' }}>
                {selected.size === leads.length ? 'Deselect all' : 'Select all'}
              </button>
              <button onClick={() => setSelected(new Set())} style={{ width:24, height:24, borderRadius:6, border:'none', cursor:'pointer', background:'rgba(255,255,255,.1)', color:'rgba(255,255,255,.6)', display:'grid', placeItems:'center', fontSize:14 }}>✕</button>
            </div>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:'4px 14px 10px' }}>
            {STATUSES.map(s => (
              <button key={s} onClick={() => bulkUpdateStatus(s)} disabled={bulkWorking}
                style={{ padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:500, background:'rgba(255,255,255,.1)', color:'rgba(255,255,255,.85)', whiteSpace:'nowrap' }}>
                {s}
              </button>
            ))}
            <button onClick={bulkDelete} disabled={bulkWorking}
              style={{ padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:'rgba(176,70,56,.3)', color:'#ff9086', whiteSpace:'nowrap' }}>
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      {isMobile ? (
        !selected.size && <div style={{ display:'flex', gap:8 }}>
          <input className="input" placeholder="Search name, mobile…" value={filters.search}
            onChange={e=>{setFilters(f=>({...f,search:e.target.value}));setPage(1);}} style={{ flex:1 }} />
          {(filters.status||filters.source) && (
            <button className="btn-secondary" style={{ fontSize:12, flexShrink:0 }} onClick={()=>setFilters({status:'',source:'',search:''})}>Clear</button>
          )}
        </div>
      ) : (
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
      )}

      {/* Kanban board — desktop only, shown when viewMode === 'board' */}
      {viewMode === 'board' && !isMobile && (
        <div key={listKey} className="fade-in" style={{ overflow:'hidden' }}>
          {boardLoading ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'var(--faint)', fontSize:13 }}>Loading board…</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, height:'calc(100vh - 280px)', overflow:'hidden' }}>
              {[
                { status:'Interested',     cls:'chip-info'   },
                { status:'Follow Up',      cls:'chip-warn'   },
                { status:'Not Interested', cls:'chip-danger' },
                { status:'Converted',      cls:'chip-ok'     },
              ].map(col => {
                const colLeads = boardLeads
                  .filter(l => l.status === col.status)
                  .sort((a, b) => (b._score||0) - (a._score||0));
                const isTarget = dragOverCol === col.status;
                return (
                  <div key={col.status}
                    onDragOver={e => handleDragOver(e, col.status)}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={e => handleDrop(e, col.status)}
                    style={{
                      background: isTarget ? 'var(--accent-bg)' : 'var(--card)',
                      border: `2px dashed ${isTarget ? 'var(--accent)' : 'var(--rule)'}`,
                      borderRadius: 12, padding: 12,
                      transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
                      display: 'flex', flexDirection: 'column',
                      minHeight: 0,
                      boxShadow: isTarget ? '0 0 12px rgba(61,138,92,.2) inset' : 'none',
                    }}>
                    {/* Column header */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, padding:'2px 2px 8px', borderBottom:'1px solid var(--rule)' }}>
                      <span className={`chip ${col.cls}`} style={{ fontSize:11 }}>{col.status}</span>
                      <span style={{ fontSize:11.5, color:'var(--faint)', fontWeight:500, fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>{colLeads.length}</span>
                    </div>
                    {/* Lead cards */}
                    <div style={{ display:'flex', flexDirection:'column', gap:8, flex:1, overflowY:'auto', minHeight:0 }}>
                      {colLeads.map(lead => (
                        <div key={lead._id}
                          draggable
                          onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; handleDragStart(e, lead._id); }}
                          onDragEnd={handleDragEnd}
                          style={{
                            background: draggedId === lead._id ? 'var(--accent-bg)' : 'var(--card)',
                            border: `1px solid ${draggedId === lead._id ? 'var(--accent)' : 'var(--rule)'}`,
                            borderRadius: 10, padding: '10px 12px',
                            cursor: 'all-scroll',
                            userSelect: 'none', WebkitUserSelect: 'none',
                            boxShadow: draggedId === lead._id ? '0 4px 12px rgba(61,138,92,.15)' : 'var(--shadow-card)',
                            transition: 'all 0.2s ease',
                            position: draggedId === lead._id ? 'relative' : 'static',
                            zIndex: draggedId === lead._id ? 10 : 'auto',
                            transform: draggedId === lead._id ? 'translateY(-2px)' : 'translateY(0)',
                          }}
                          onMouseEnter={e => { if (draggedId !== lead._id) e.currentTarget.style.boxShadow='0 4px 16px rgba(37,35,32,.12)'; }}
                          onMouseLeave={e => { e.currentTarget.style.boxShadow = draggedId === lead._id ? '0 8px 20px rgba(61,138,92,.3)' : 'var(--shadow-card)'; }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                            <div style={{ width:14, height:14, display:'flex', flexDirection:'column', justifyContent:'center', gap:1.2, flexShrink:0, opacity:0.6 }}>
                              <div style={{ width:'100%', height:'1.5px', background:'var(--muted)', borderRadius:'0.75px' }} />
                              <div style={{ width:'100%', height:'1.5px', background:'var(--muted)', borderRadius:'0.75px' }} />
                              <div style={{ width:'100%', height:'1.5px', background:'var(--muted)', borderRadius:'0.75px' }} />
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:12.5, fontWeight:600, color:'var(--fg)' }}>{lead.name}</div>
                            </div>
                          </div>
                          <div style={{ fontSize:11.5, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:6 }}>
                            {lead.interestedProduct}
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
                            <span className={`chip ${SOURCE_CHIP[lead.source]||'chip-muted'}`} style={{ fontSize:10 }}>{lead.source}</span>
                            <ScoreBadge lead={lead} />
                          </div>
                          <div style={{ fontSize:10.5, color:'var(--faint)', marginTop:6, fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>
                            {lead.mobile} · {lead.date ? new Date(lead.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short' }) : ''}
                          </div>
                        </div>
                      ))}
                      {colLeads.length === 0 && !boardLoading && (
                        <div style={{ textAlign:'center', color:'var(--faint)', fontSize:12, padding:'20px 8px', lineHeight:1.5 }}>
                          Drop leads here
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Mobile card list */}
      {viewMode === 'table' && isMobile && (
        <div key={listKey} className="fade-in" style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {leads.map(l => (
            <div key={l._id} data-row-id={l._id}
              className={exitId===l._id ? 'row-deleting' : ''}
              onClick={() => selected.size > 0 ? toggleSelect(l._id) : null}
              onPointerDown={() => handlePressStart(l._id)}
              onPointerUp={handlePressEnd}
              onPointerMove={handlePressMove}
              onPointerLeave={handlePressEnd}
              onContextMenu={e => e.preventDefault()}
              style={{
                background: selected.has(l._id) ? 'var(--accent-bg)' : 'var(--card)',
                border: `1px solid ${selected.has(l._id) ? 'var(--accent)' : 'var(--rule)'}`,
                borderRadius:12, padding:'14px', width:'100%', boxSizing:'border-box', overflow:'hidden',
                transition:'background 0.18s, border-color 0.18s', userSelect:'none', WebkitUserSelect:'none', cursor:'pointer',
              }}>
              <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                {/* Avatar with checkmark when selected */}
                <div style={{ position:'relative', flexShrink:0 }}>
                  <Av name={l.name} />
                  {selected.has(l._id) && (
                    <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'var(--accent)', display:'grid', placeItems:'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  )}
                </div>
                {/* Content column */}
                <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:3 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--fg)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.name}</div>
                    <div onClick={e=>e.stopPropagation()}>
                      <StatusDropdown leadId={l._id} current={l.status} onUpdate={updateStatus} disabled={updatingId===l._id} />
                    </div>
                  </div>
                  <div style={{ fontSize:12.5, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.interestedProduct}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, color:'var(--faint)' }}>{l.source} · {l.leadId}</span>
                    <ScoreBadge lead={l} />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!leads.length && <div style={{ textAlign:'center', color:'var(--faint)', fontSize:13, padding:40 }}>No leads found</div>}
        </div>
      )}

      {/* Table (desktop only) */}
      {!isMobile && viewMode === 'table' && (
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
              {loading && leads.length === 0
                ? Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} />)
                : leads.map(l=>(
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
                    {editingCell?.id === l._id && editingCell?.field === 'name' ? (
                      <input autoFocus className="input" defaultValue={l.name}
                        style={{ padding:'3px 8px', fontSize:12.5, width:140, height:28 }}
                        onBlur={e => saveInlineEdit(l._id, 'name', e.target.value)}
                        onKeyDown={e => { if (e.key==='Enter') e.target.blur(); if (e.key==='Escape') setEditingCell(null); }} />
                    ) : (
                      <div style={{ display:'flex', alignItems:'center', gap:9 }} onDoubleClick={() => setEditingCell({ id: l._id, field: 'name' })} title="Double-click to edit">
                        <Av name={l.name} />
                        <div style={{ fontSize:12.5, fontWeight:500, color:'var(--fg)', cursor:'text' }}>{l.name}</div>
                      </div>
                    )}
                  </td>
                  <td style={{ padding:'11px 16px', fontFamily:'Inter', fontSize:11.5, color:'var(--muted)', fontVariantNumeric:'tabular-nums', cursor:'pointer', userSelect:'none' }}
                    onClick={() => { navigator.clipboard?.writeText(l.mobile); addToast('Phone copied'); }}
                    title="Click to copy">
                    {l.mobile}
                  </td>
                  <td style={{ padding:'11px 16px' }}><span className={`chip ${SOURCE_CHIP[l.source]||'chip-muted'}`}>{l.source}</span></td>
                  <td style={{ padding:'11px 16px', maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12, color:'var(--muted)' }}>{l.interestedProduct}</td>
                  <td style={{ padding:'10px 16px' }}><ScoreBadge lead={l} /></td>
                  <td style={{ padding:'10px 16px' }}>
                    <StatusDropdown
                      leadId={l._id}
                      current={l.status}
                      onUpdate={updateStatus}
                      disabled={updatingId === l._id}
                    />
                  </td>
                  <td style={{ padding:'11px 16px', maxWidth:120, fontSize:11.5 }}>
                    {l.convertedOrderId ? (
                      <span className="chip chip-ok" style={{ fontSize:10 }}>→ Order placed</span>
                    ) : editingCell?.id === l._id && editingCell?.field === 'notes' ? (
                      <input autoFocus className="input" defaultValue={l.notes || ''}
                        style={{ padding:'3px 8px', fontSize:11.5, width:110, height:26 }}
                        onBlur={e => saveInlineEdit(l._id, 'notes', e.target.value)}
                        onKeyDown={e => { if (e.key==='Enter') e.target.blur(); if (e.key==='Escape') setEditingCell(null); }} />
                    ) : (
                      <div onClick={() => !l.convertedOrderId && setEditingCell({ id: l._id, field: 'notes' })}
                        title="Click to edit notes"
                        style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--faint)', cursor:'text', minWidth:60, minHeight:18 }}>
                        {l.notes || <span style={{ color:'var(--rule)', fontStyle:'italic' }}>add note…</span>}
                      </div>
                    )}
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
              {!loading && !leads.length && <tr><td colSpan={11} style={{ padding:'48px 16px', textAlign:'center', color:'var(--faint)', fontSize:13 }}>No leads found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      )}

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
      {/* Desktop bulk bar */}
      {!isMobile && selected.size > 0 && (
        <div className="bulk-bar fade-in" style={{ zIndex:500, display:'flex', alignItems:'center', gap:8, borderRadius:14, padding:'10px 14px', boxShadow:'0 8px 32px rgba(37,35,32,.3)', fontSize:12, fontWeight:500, whiteSpace:'nowrap' }}>
          <span style={{ paddingRight:10, borderRight:'1px solid rgba(255,255,255,.15)', color:'rgba(255,255,255,.7)' }}>{selected.size} selected</span>
          {STATUSES.map(s => {
            const m = STATUS_META[s];
            return (
              <button key={s} onClick={() => bulkUpdateStatus(s)} disabled={bulkWorking}
                style={{ padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11.5, fontWeight:500, background:m.bg, color:m.text }}>
                {s}
              </button>
            );
          })}
          <button onClick={bulkDelete} disabled={bulkWorking}
            style={{ padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11.5, fontWeight:500, background:'rgba(176,70,56,.25)', color:'#ff9086' }}>
            Delete {selected.size}
          </button>
          <button onClick={() => setSelected(new Set())}
            style={{ width:24, height:24, borderRadius:6, border:'none', cursor:'pointer', background:'rgba(255,255,255,.1)', color:'rgba(255,255,255,.6)', display:'grid', placeItems:'center', fontSize:14 }}>✕</button>
        </div>
      )}
    </div>
  );
}
