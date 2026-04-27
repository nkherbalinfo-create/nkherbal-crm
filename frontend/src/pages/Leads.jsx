import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { format } from 'date-fns';
import { Pencil, Trash2, Zap, X, CheckCircle, Clock, Megaphone, MessageCircle, Globe, Phone, Users } from 'lucide-react';

const SOURCES  = ['Ads', 'WhatsApp', 'Website', 'Referral', 'Direct'];
const STATUSES = ['Interested', 'Not Interested', 'Converted', 'Follow Up'];
const PRODUCTS = [
  'Muejaza For Men (300g)', 'Shahi Kalp For Men & Women (300g)',
  'Testo – Vardhak For Men (300g)', 'Kashmiri Shilajit 25g',
  'Kashmiri Shilajit 50g', 'Muejaza & Shahi Kalp Combo (300g)',
  'Muejaza Plus For Men (300g)', 'Other / Not Sure'
];

const STATUS_STYLE = {
  Interested:      { cls: 'badge-info',    icon: Zap },
  'Not Interested':{ cls: 'badge-danger',  icon: X },
  Converted:       { cls: 'badge-success', icon: CheckCircle },
  'Follow Up':     { cls: 'badge-warning', icon: Clock },
};

const SOURCE_STYLE = {
  Ads:      { icon: Megaphone },
  WhatsApp: { icon: MessageCircle },
  Website:  { icon: Globe },
  Referral: { icon: Users },
  Direct:   { icon: Phone },
};

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  name: '', mobile: '', source: 'Ads',
  interestedProduct: PRODUCTS[0], status: 'Interested', notes: ''
};

const HEADERS = ['Lead ID','Date','Name','Mobile','Source','Product','Status','Notes','Actions'];

export default function Leads() {
  const [leads, setLeads]   = useState([]);
  const [meta, setMeta]     = useState({ total: 0, pages: 1, page: 1 });
  const [filters, setFilters] = useState({ status: '', source: '', search: '' });
  const [page, setPage]     = useState(1);
  const [modal, setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]     = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  // Funnel counts
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: leads.filter(l => l.status === s).length }), {});

  const load = useCallback(async () => {
    try {
      const params = { page, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) };
      const { data } = await api.get('/leads', { params });
      setLeads(data.leads);
      setMeta({ total: data.total, page: data.page, pages: data.pages });
    } catch { addToast('Failed to load leads', 'error'); }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 15 seconds to pick up new WhatsApp leads without manual reload
  useEffect(() => {
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await api.put(`/leads/${editing}`, form);
      else await api.post('/leads', form);
      addToast(editing ? 'Lead updated' : 'Lead added');
      setModal(false); load();
    } catch (err) { addToast(err.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this lead?')) return;
    try { await api.delete(`/leads/${id}`); addToast('Lead deleted'); load(); }
    catch { addToast('Delete failed', 'error'); }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Leads</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{meta.total} total leads</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(emptyForm); setModal(true); }} className="btn-primary">+ Add Lead</button>
      </div>

      {/* Funnel summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUSES.map(s => {
          const { cls, icon: Icon } = STATUS_STYLE[s] || {};
          return (
            <div key={s} className="card flex items-center gap-3 py-3">
              <div className={`badge w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cls}`}>
                {Icon && <Icon size={14} />}
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-faint)' }}>{s}</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{counts[s] || 0}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-2">
          <input className="input flex-1 min-w-[160px] text-sm" placeholder="Search name, mobile…"
            value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} />
          <select className="input w-auto text-sm" value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="input w-auto text-sm" value={filters.source} onChange={e => setFilters(f => ({...f, source: e.target.value}))}>
            <option value="">All Sources</option>
            {SOURCES.map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={() => { setPage(1); load(); }} className="btn-primary text-sm">Filter</button>
          <button onClick={() => setFilters({status:'',source:'',search:''})} className="btn-secondary text-sm">Clear</button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
            <tr>
              {HEADERS.map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: 'var(--text-faint)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map(l => {
              const st = STATUS_STYLE[l.status] || { cls: 'badge-neutral' };
              const sr = SOURCE_STYLE[l.source] || {};
              const SrcIcon = sr.icon;
              const StIcon = st.icon;
              return (
                <tr key={l._id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-faint)' }}>{l.leadId}</td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{format(new Date(l.date), 'dd MMM yy')}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text)' }}>{l.name}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{l.mobile}</td>
                  <td className="px-4 py-3">
                    <span className="badge badge-neutral gap-1.5">
                      {SrcIcon && <SrcIcon size={11} />}{l.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[130px] truncate" style={{ color: 'var(--text-muted)' }}>{l.interestedProduct}</td>
                  <td className="px-4 py-3">
                    <span className={`badge gap-1 ${st.cls}`}>
                      {StIcon && <StIcon size={10} />}{l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs max-w-[120px] truncate" style={{ color: 'var(--text-faint)' }}>{l.notes}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(l._id); setForm({...l, date: l.date?.split('T')[0]}); setModal(true); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:opacity-80"
                        style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => del(l._id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:opacity-80"
                        style={{ background: '#ef444415', color: 'var(--danger)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!leads.length && (
              <tr><td colSpan={9} className="text-center py-12" style={{ color: 'var(--text-faint)' }}>No leads found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {meta.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Page {meta.page} of {meta.pages} · {meta.total} records</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p-1)} className="btn-secondary disabled:opacity-40">← Prev</button>
            <button disabled={page >= meta.pages} onClick={() => setPage(p => p+1)} className="btn-secondary disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Lead' : 'Add New Lead'}>
        <form onSubmit={save} className="grid grid-cols-2 gap-4">
          <div><label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} required /></div>
          <div><label className="label">Full Name</label>
            <input type="text" className="input" value={form.name} onChange={e => set('name', e.target.value)} required /></div>
          <div><label className="label">Mobile</label>
            <input type="text" className="input" value={form.mobile} onChange={e => set('mobile', e.target.value)} required /></div>
          <div><label className="label">Source</label>
            <select className="input" value={form.source} onChange={e => set('source', e.target.value)}>
              {SOURCES.map(o => <option key={o}>{o}</option>)}</select></div>
          <div><label className="label">Interested Product</label>
            <select className="input" value={form.interestedProduct} onChange={e => set('interestedProduct', e.target.value)}>
              {PRODUCTS.map(o => <option key={o}>{o}</option>)}</select></div>
          <div><label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(o => <option key={o}>{o}</option>)}</select></div>
          <div className="col-span-2"><label className="label">Notes</label>
            <textarea className="input h-20 resize-none" value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></div>
          <div className="col-span-2 flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : editing ? 'Update' : 'Add Lead'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
