import { useState, useEffect, useCallback } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import api from '../utils/api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import Pagination from '../components/Pagination';
import { format, differenceInDays } from 'date-fns';

const STAGES = [
  { month:1, day:30,  label:'Month 1',  desc:'First course done — prompt for Month 2',  cls:'chip-info'   },
  { month:2, day:60,  label:'Month 2',  desc:'Halfway there — encourage Month 3',       cls:'chip-warn'   },
  { month:3, day:90,  label:'Month 3',  desc:'Full course — celebrate & suggest more',  cls:'chip-ok'     },
];

const TABS = [
  { key:'pending',  label:'Pending'  },
  { key:'sent',     label:'Sent'     },
  { key:'skipped',  label:'Skipped'  },
];

function Av({ name }) {
  const i = (name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  return <span className="avatar avatar-md">{i}</span>;
}

const M_CLS = ['chip-info','chip-warn','chip-ok'];

export default function FollowUps() {
  const [tab, setTab] = useState('pending');
  const isMobile = useIsMobile();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total:0, pages:1, page:1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [emailModal, setEmailModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [emailData, setEmailData] = useState({ subject:'', html:'', toEmail:'' });
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/followups', { params:{ status:tab, page, limit:8 } });
      setItems(data.followups); setMeta({ total:data.total, page:data.page, pages:data.pages });
    } catch { addToast('Failed to load','error'); }
    finally { setLoading(false); }
  }, [tab, page]);

  useEffect(() => { setPage(1); }, [tab]);
  useEffect(() => { load(); }, [load]);

  const openEmail = async (fu) => {
    setSelected(fu); setEmailData({ subject:'', html:'', toEmail:fu.email||'' });
    try { const { data } = await api.get(`/followups/${fu._id}/preview`); setEmailData(d=>({...d, subject:data.subject, html:data.html})); } catch {}
    setEmailModal(true);
  };

  const sendEmail = async () => {
    setSending(true);
    try {
      const { data } = await api.post(`/followups/${selected._id}/send`, emailData);
      addToast(data.message,'success'); setEmailModal(false); load();
    } catch (err) { addToast(err.response?.data?.message||'Failed to send','error'); }
    finally { setSending(false); }
  };

  const skip = async (id) => {
    try { await api.put(`/followups/${id}`,{status:'skipped'}); addToast('Skipped'); load(); }
    catch { addToast('Failed','error'); }
  };

  const refresh = async () => {
    setGenerating(true);
    try { await api.post('/sync/followups',{}); load(); addToast('Follow-ups refreshed'); }
    catch { addToast('Refresh failed','error'); }
    finally { setGenerating(false); }
  };

  const pendingCount = items.filter(i=>i.status==='pending').length;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.02em', color:'var(--fg)' }}>Follow-up reminders</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>Send monthly follow-ups to encourage the 3–6 month Ayurvedic journey</div>
        </div>
        <button className="btn-secondary" onClick={refresh} disabled={generating} style={{ display:'flex', alignItems:'center', gap:6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ animation:generating?'spin 0.7s linear infinite':'' }}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          {generating?'Refreshing…':'Refresh'}
        </button>
      </div>

      {/* Stage cards */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap:12 }}>
        {STAGES.map(({month,day,label,desc,cls})=>(
          <div key={month} className="card" style={{ padding:'14px 16px', display:'flex', alignItems:'flex-start', gap:12 }}>
            <span className={`chip ${cls}`} style={{ width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', padding:0, fontSize:12, fontWeight:700, flexShrink:0 }}>{month}</span>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--fg)', marginBottom:2 }}>{label} <span style={{ fontFamily:'Inter', fontVariantNumeric:'tabular-nums', fontSize:11, color:'var(--faint)', fontWeight:400 }}>(Day {day})</span></div>
              <div style={{ fontSize:11.5, color:'var(--muted)' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Segmented tabs */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div className="seg-control">
          {TABS.map(t=>(
            <button key={t.key} className={`seg-btn${tab===t.key?' active':''}`} onClick={()=>setTab(t.key)}>
              {t.label}
              {t.key==='pending'&&meta.total>0&&tab==='pending'&&(
                <span style={{ marginLeft:5, padding:'1px 6px', borderRadius:999, background:'var(--accent)', color:'var(--accent-ink)', fontSize:10, fontWeight:600 }}>{meta.total}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[0,1,2].map(i=><div key={i} className="skeleton" style={{ height:80, borderRadius:12 }} />)}
        </div>
      ) : items.length===0 ? (
        <div className="card" style={{ padding:'56px 20px', textAlign:'center' }}>
          <div className="chip chip-ok" style={{ width:44, height:44, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', padding:0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{ fontSize:14, fontWeight:500, color:'var(--fg)', marginBottom:6 }}>No {tab} follow-ups</div>
          <div style={{ fontSize:12.5, color:'var(--muted)' }}>Follow-ups appear 30, 60, and 90 days after each order.</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {items.map(fu=>{
            const overdue = differenceInDays(new Date(), new Date(fu.dueDate));
            return (
              <div key={fu._id} className="card" style={{ padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                  {/* Month badge */}
                  <div className={`chip ${M_CLS[fu.monthNumber-1]||'chip-muted'}`}
                    style={{ width:44, height:44, borderRadius:10, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:0, flexShrink:0 }}>
                    <span style={{ fontSize:13, fontWeight:700, lineHeight:1 }}>M{fu.monthNumber}</span>
                    <span style={{ fontSize:9, opacity:0.75, fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>D+{fu.monthNumber*30}</span>
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:7, marginBottom:3 }}>
                      <span style={{ fontSize:13, fontWeight:500, color:'var(--fg)' }}>{fu.customerName}</span>
                      <span className={`chip ${M_CLS[fu.monthNumber-1]||'chip-muted'}`} style={{ fontSize:10 }}>Month {fu.monthNumber} complete</span>
                      {fu.status==='pending'&&overdue>0&&<span className="chip chip-danger" style={{ fontSize:10 }}>{overdue}d overdue</span>}
                      {fu.status==='sent'&&!fu.autoSent&&<span className="chip chip-ok" style={{ fontSize:10 }}>Sent</span>}
                      {fu.status==='sent'&&fu.autoSent&&<span className="chip chip-info" style={{ fontSize:10 }}>⚡ Auto-sent</span>}
                      {fu.status==='skipped'&&<span className="chip chip-muted" style={{ fontSize:10 }}>Skipped</span>}
                    </div>
                    <div style={{ fontSize:12.5, color:'var(--muted)', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fu.productName}</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:12, fontSize:11, color:'var(--faint)', fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>
                      <span>Order: {format(new Date(fu.orderDate),'dd MMM yyyy')}</span>
                      <span>Due: {format(new Date(fu.dueDate),'dd MMM yyyy')}</span>
                      {fu.email&&<span>{fu.email}</span>}
                      {fu.sentAt&&<span>Sent: {format(new Date(fu.sentAt),'dd MMM yyyy')}</span>}
                    </div>
                  </div>

                  {fu.status==='pending'&&(
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button className="btn-primary" onClick={()=>openEmail(fu)} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        Send email
                      </button>
                      <button className="btn-secondary" onClick={()=>skip(fu._id)} style={{ fontSize:12 }}>Skip</button>
                    </div>
                  )}
                  {fu.status==='sent'&&(
                    <button className="btn-secondary" onClick={()=>openEmail(fu)} style={{ fontSize:12, flexShrink:0 }}>Resend</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} pages={meta.pages} total={meta.total} limit={8} onPage={p=>{setPage(p);window.scrollTo({top:0,behavior:'smooth'});}} />

      {/* Email modal */}
      <Modal open={emailModal} onClose={()=>setEmailModal(false)} title={`Follow-up — ${selected?.customerName} (Month ${selected?.monthNumber})`} size="lg">
        {selected&&(
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'var(--bg)', borderRadius:9, padding:'10px 14px', fontSize:12.5, display:'flex', flexWrap:'wrap', gap:16 }}>
              <span><span style={{ color:'var(--faint)' }}>Customer:</span> <strong style={{ color:'var(--fg)' }}>{selected.customerName}</strong></span>
              <span><span style={{ color:'var(--faint)' }}>Product:</span> <span style={{ color:'var(--muted)' }}>{selected.productName}</span></span>
              <span><span style={{ color:'var(--faint)' }}>Month:</span> <span style={{ color:'var(--muted)' }}>{selected.monthNumber}</span></span>
            </div>
            <div>
              <label className="label">To (customer email)</label>
              <input type="email" className="input" value={emailData.toEmail} onChange={e=>setEmailData(d=>({...d,toEmail:e.target.value}))} placeholder="customer@email.com" />
              {!emailData.toEmail&&<div style={{ fontSize:11, color:'var(--danger)', marginTop:4 }}>⚠ No email found. Enter manually.</div>}
            </div>
            <div>
              <label className="label">Subject</label>
              <input className="input" value={emailData.subject} onChange={e=>setEmailData(d=>({...d,subject:e.target.value}))} />
            </div>
            <div>
              <label className="label">Email preview</label>
              <div style={{ border:'1px solid var(--rule)', borderRadius:9, overflow:'hidden' }}>
                <iframe srcDoc={emailData.html} style={{ width:'100%', height:300, border:'none' }} title="Preview" />
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, borderTop:'1px solid var(--rule)', paddingTop:14 }}>
              <button className="btn-secondary" onClick={()=>setEmailModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={sendEmail} disabled={sending||!emailData.toEmail} style={{ display:'flex', alignItems:'center', gap:6, opacity:!emailData.toEmail?0.5:1 }}>
                {sending&&<span style={{ width:12, height:12, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.6s linear infinite', display:'inline-block' }} />}
                {sending?'Sending…':'Send email'}
              </button>
            </div>
          </div>
        )}
      </Modal>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
