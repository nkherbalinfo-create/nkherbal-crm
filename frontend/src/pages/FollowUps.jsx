import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { format, differenceInDays } from 'date-fns';
import { Mail, CheckCircle, SkipForward, Clock, Loader2, RefreshCw, Edit3 } from 'lucide-react';

const MONTH_LABEL = { 1: 'Month 1', 2: 'Month 2', 3: 'Month 3' };
const MONTH_COLOR = {
  1: { cls: 'badge-info',    label: '1st Month' },
  2: { cls: 'badge-warning', label: '2nd Month' },
  3: { cls: 'badge-success', label: '3rd Month' },
};

function OverdueBadge({ dueDate }) {
  const days = differenceInDays(new Date(), new Date(dueDate));
  if (days <= 0) return null;
  return (
    <span className="badge badge-danger text-xs">{days}d overdue</span>
  );
}

export default function FollowUps() {
  const [tab, setTab]         = useState('pending');
  const [items, setItems]     = useState([]);
  const [meta, setMeta]       = useState({ total: 0, pages: 1, page: 1 });
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [emailModal, setEmailModal]   = useState(false);
  const [selected, setSelected]       = useState(null);
  const [emailData, setEmailData]     = useState({ subject: '', html: '', toEmail: '' });
  const [sending, setSending]         = useState(false);
  const [generating, setGenerating]   = useState(false);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/followups', { params: { status: tab, page, limit: 20 } });
      setItems(data.followups);
      setMeta({ total: data.total, page: data.page, pages: data.pages });
    } catch { addToast('Failed to load follow-ups', 'error'); }
    finally { setLoading(false); }
  }, [tab, page]);

  useEffect(() => { setPage(1); }, [tab]);
  useEffect(() => { load(); }, [load]);

  const openEmail = async (fu) => {
    setSelected(fu);
    setEmailData({ subject: '', html: '', toEmail: fu.email || '' });
    try {
      const { data } = await api.get(`/followups/${fu._id}/preview`);
      setEmailData(d => ({ ...d, subject: data.subject, html: data.html }));
    } catch {}
    setEmailModal(true);
  };

  const sendEmail = async () => {
    setSending(true);
    try {
      const { data } = await api.post(`/followups/${selected._id}/send`, emailData);
      addToast(data.message, 'success');
      setEmailModal(false);
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to send email', 'error');
    } finally { setSending(false); }
  };

  const skip = async (id) => {
    try {
      await api.put(`/followups/${id}`, { status: 'skipped' });
      addToast('Marked as skipped');
      load();
    } catch { addToast('Failed', 'error'); }
  };

  const generateNow = async () => {
    setGenerating(true);
    try {
      // Trigger follow-up generation via a quick page reload after a small delay
      await api.post('/sync/woocommerce', {});
      await new Promise(r => setTimeout(r, 1000));
      load();
      addToast('Follow-ups refreshed');
    } catch { addToast('Refresh failed', 'error'); }
    finally { setGenerating(false); }
  };

  const TABS = [
    { key: 'pending', label: 'Pending',  icon: Clock },
    { key: 'sent',    label: 'Sent',     icon: CheckCircle },
    { key: 'skipped', label: 'Skipped',  icon: SkipForward },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Follow-up Reminders</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Send monthly follow-up emails to customers to encourage their 3–6 month Ayurvedic journey
          </p>
        </div>
        <button onClick={generateNow} disabled={generating} className="btn-secondary flex items-center gap-1.5 text-sm">
          <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
          {generating ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* How it works */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderColor: '#bbf7d0' }}>
        <div className="flex flex-wrap gap-6 text-sm">
          {[
            { month: 1, label: 'Month 1 (Day 30)', desc: 'First course done — prompt for Month 2' },
            { month: 2, label: 'Month 2 (Day 60)', desc: 'Halfway through — encourage Month 3' },
            { month: 3, label: 'Month 3 (Day 90)', desc: 'Full course — celebrate & suggest continuing' },
          ].map(({ month, label, desc }) => (
            <div key={month} className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: month === 1 ? '#3b82f6' : month === 2 ? '#f59e0b' : '#10b981' }}>
                {month}
              </div>
              <div>
                <p className="font-semibold" style={{ color: '#166534' }}>{label}</p>
                <p style={{ color: '#16a34a' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-subtle)' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
            style={{
              background: tab === key ? 'var(--bg-card)' : 'transparent',
              color: tab === key ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: tab === key ? 'var(--shadow-sm)' : 'none',
            }}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-16">
          <CheckCircle size={40} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="font-semibold" style={{ color: 'var(--text)' }}>
            {tab === 'pending' ? 'No pending follow-ups' : `No ${tab} follow-ups`}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {tab === 'pending' ? 'Follow-ups appear 30, 60, and 90 days after each order.' : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(fu => (
            <div key={fu._id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Month indicator */}
                  <div className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 text-white"
                    style={{ background: fu.monthNumber === 1 ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : fu.monthNumber === 2 ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'linear-gradient(135deg,#10b981,#059669)' }}>
                    <span className="text-xs font-bold leading-none">M{fu.monthNumber}</span>
                    <span className="text-xs opacity-80 leading-none mt-0.5">{fu.monthNumber === 1 ? '30d' : fu.monthNumber === 2 ? '60d' : '90d'}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>{fu.customerName}</span>
                      <span className={`badge text-xs ${MONTH_COLOR[fu.monthNumber]?.cls}`}>{MONTH_COLOR[fu.monthNumber]?.label} Complete</span>
                      {fu.status === 'pending' && <OverdueBadge dueDate={fu.dueDate} />}
                      {fu.status === 'sent' && <span className="badge badge-success text-xs">Sent</span>}
                      {fu.status === 'skipped' && <span className="badge badge-neutral text-xs">Skipped</span>}
                    </div>

                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-muted)' }}>{fu.productName}</p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs" style={{ color: 'var(--text-faint)' }}>
                      <span>Order: {format(new Date(fu.orderDate), 'dd MMM yyyy')}</span>
                      <span>Due: {format(new Date(fu.dueDate), 'dd MMM yyyy')}</span>
                      {fu.email && <span>✉ {fu.email}</span>}
                      {fu.mobile && <span>📱 {fu.mobile}</span>}
                      {fu.sentAt && <span>Sent: {format(new Date(fu.sentAt), 'dd MMM yyyy')}</span>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {fu.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openEmail(fu)}
                      className="btn-primary flex items-center gap-1.5 text-sm py-2">
                      <Mail size={14} /> Send Email
                    </button>
                    <button onClick={() => skip(fu._id)}
                      className="btn-secondary flex items-center gap-1.5 text-sm py-2">
                      <SkipForward size={14} /> Skip
                    </button>
                  </div>
                )}
                {fu.status === 'sent' && (
                  <button onClick={() => openEmail(fu)}
                    className="btn-secondary flex items-center gap-1.5 text-sm py-2">
                    <Mail size={14} /> Resend
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {meta.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Page {meta.page} of {meta.pages} · {meta.total} records</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p-1)} className="btn-secondary disabled:opacity-40">← Prev</button>
            <button disabled={page >= meta.pages} onClick={() => setPage(p => p+1)} className="btn-secondary disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}

      {/* Email Compose Modal */}
      <Modal open={emailModal} onClose={() => setEmailModal(false)}
        title={`Send Follow-up — ${selected?.customerName} (Month ${selected?.monthNumber})`} size="lg">
        {selected && (
          <div className="space-y-4">
            {/* Customer info */}
            <div className="rounded-xl p-3 flex flex-wrap gap-4 text-sm" style={{ background: 'var(--bg-subtle)' }}>
              <div><span style={{ color: 'var(--text-faint)' }}>Customer:</span> <strong style={{ color: 'var(--text)' }}>{selected.customerName}</strong></div>
              <div><span style={{ color: 'var(--text-faint)' }}>Product:</span> <span style={{ color: 'var(--text-muted)' }}>{selected.productName}</span></div>
              <div><span style={{ color: 'var(--text-faint)' }}>Month:</span> <span style={{ color: 'var(--text-muted)' }}>{selected.monthNumber}</span></div>
            </div>

            {/* To email */}
            <div>
              <label className="label">To (Customer Email)</label>
              <input className="input" type="email" value={emailData.toEmail}
                onChange={e => setEmailData(d => ({...d, toEmail: e.target.value}))}
                placeholder="customer@email.com" />
              {!emailData.toEmail && (
                <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>⚠ No email stored for this customer. Enter it manually.</p>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="label">Subject</label>
              <input className="input" value={emailData.subject}
                onChange={e => setEmailData(d => ({...d, subject: e.target.value}))} />
            </div>

            {/* Email preview */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label m-0">Email Preview</label>
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-faint)' }}>
                  <Edit3 size={11} /> Editable HTML below
                </span>
              </div>
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                <iframe
                  srcDoc={emailData.html}
                  className="w-full"
                  style={{ height: '320px', border: 'none' }}
                  title="Email Preview"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setEmailModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={sendEmail} disabled={sending || !emailData.toEmail}
                className="btn-primary flex items-center gap-2 disabled:opacity-50">
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                {sending ? 'Sending…' : 'Send Email'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
