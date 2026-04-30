import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { format } from 'date-fns';

function Av({ name, size = 32 }) {
  const i = (name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const hue = [...(name||'U')].reduce((a,c)=>a+c.charCodeAt(0),0)%360;
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:`hsl(${hue},40%,88%)`, color:`hsl(${hue},40%,35%)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.36, fontWeight:600, flexShrink:0, userSelect:'none' }}>
      {i}
    </div>
  );
}

function LangChip({ name }) {
  if (!name) return null;
  const lang = name.includes('NEGI')||name.includes('Kumar')||name.includes('Singh') ? 'HI' : 'EN';
  return <span className="chip chip-info" style={{ fontSize:9, padding:'1px 5px' }}>{lang}</span>;
}

function DetailRow({ label, val }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'82px 1fr', gap:10, alignItems:'baseline', padding:'8px 0', borderBottom:'1px solid var(--rule)' }}>
      <div style={{ fontSize:11, color:'var(--faint)' }}>{label}</div>
      <div className="num" style={{ fontSize:12.5, fontWeight:500, color:'var(--fg)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{val || '—'}</div>
    </div>
  );
}

export default function WhatsApp() {
  const [convs, setConvs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [lead, setLead] = useState(null);
  const [botPaused, setBotPaused] = useState(false);
  const [manualMsg, setManualMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const msgEndRef = useRef(null);
  const selectedPhoneRef = useRef(null);
  const { addToast } = useToast();

  const loadConvs = async () => {
    try { const { data } = await api.get('/wa'); setConvs(data); } catch {}
  };

  useEffect(() => { loadConvs(); const t = setInterval(loadConvs, 15000); return ()=>clearInterval(t); }, []);

  const loadConversation = async (conv, { showLoading = false, scroll = false } = {}) => {
    if (!conv?.phone) return;
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get(`/wa/${conv.phone}`);
      if (selectedPhoneRef.current && selectedPhoneRef.current !== conv.phone) return;
      setMessages(data.messages || []);
      setLead(data.leadId || null);
      setBotPaused(data.botPaused || false);
    } catch { addToast('Failed to load conversation','error'); }
    finally {
      if (showLoading) setLoading(false);
      if (scroll) setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior:'auto' }), 0);
    }
  };

  const selectConv = async (conv) => {
    selectedPhoneRef.current = conv.phone;
    setSelected(conv);
    await loadConversation(conv, { showLoading: true, scroll: true });
  };

  const requestDeleteConv = (conv, e) => {
    e.stopPropagation();
    setPendingDelete(conv);
  };

  const deleteConv = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/wa/${encodeURIComponent(pendingDelete.phone)}`);
      setConvs(list => list.filter(c => c.phone !== pendingDelete.phone));
      if (selected?.phone === pendingDelete.phone) {
        setSelected(null);
        selectedPhoneRef.current = null;
        setMessages([]);
        setLead(null);
      }
      setPendingDelete(null);
      addToast('Conversation deleted');
    } catch (err) {
      addToast(err.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    selectedPhoneRef.current = selected?.phone || null;
  }, [selected?.phone]);

  // Refresh messages every 10s when conversation open
  useEffect(() => {
    if (!selected) return;
    const t = setInterval(() => loadConversation(selected, { showLoading: false, scroll: false }), 10000);
    return () => clearInterval(t);
  }, [selected?.phone]);

  const toggleBot = async () => {
    try {
      const { data } = await api.patch(`/wa/${selected.phone}/pause`, { paused:!botPaused });
      setBotPaused(data.botPaused);
      addToast(data.botPaused ? 'Bot paused — you can reply manually' : 'Bot resumed');
    } catch { addToast('Failed','error'); }
  };

  const updateLeadStatus = async (newStatus) => {
    if (!lead?._id) return;
    setUpdatingStatus(true);
    try {
      await api.put(`/leads/${lead._id}`, { status: newStatus });
      setLead(l => ({ ...l, status: newStatus }));
      addToast(`Lead marked as "${newStatus}"`,'success');
    } catch { addToast('Failed to update status','error'); }
    finally { setUpdatingStatus(false); }
  };

  const sendManual = async () => {
    if (!manualMsg.trim()) return;
    setSending(true);
    try {
      await api.post('/wa/send', { phone:selected.phone, message:manualMsg });
      setManualMsg('');
      setMessages(m=>[...m, { role:'assistant', content:manualMsg, timestamp:new Date() }]);
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior:'smooth' }), 0);
      addToast('Message sent');
    } catch (err) { addToast(err.response?.data?.message||'Failed to send','error'); }
    finally { setSending(false); }
  };

  const timeStr = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString()===now.toDateString()) return format(d,'HH:mm');
    return format(d,'dd MMM');
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.02em', color:'var(--fg)' }}>WhatsApp</div>
        <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>Customer conversations via WhatsApp Business API</div>
      </div>

      <div className="card" style={{ padding:0, display:'grid', gridTemplateColumns:'300px minmax(0,1fr) 280px', height:'calc(100vh - 200px)', minHeight:560, overflow:'hidden' }}>

        {/* Left — conversation list */}
        <div style={{ borderRight:'1px solid var(--rule)', display:'flex', flexDirection:'column', minHeight:0, overflowY:'auto' }}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--rule)', fontSize:12, fontWeight:600, color:'var(--fg)' }}>
            Conversations <span style={{ fontFamily:'Inter', fontVariantNumeric:'tabular-nums', color:'var(--faint)', fontWeight:400 }}>({convs.length})</span>
          </div>
          {convs.length===0 && (
            <div style={{ padding:24, textAlign:'center', color:'var(--faint)', fontSize:12 }}>No conversations yet</div>
          )}
          {convs.map(c=>(
            <div key={c.phone} onClick={()=>selectConv(c)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', cursor:'pointer', borderBottom:'1px solid var(--rule)', background:selected?.phone===c.phone?'var(--accent-bg)':'transparent', transition:'background 0.1s' }}
              onMouseEnter={e=>{ if(selected?.phone!==c.phone) e.currentTarget.style.background='var(--hover)'; }}
              onMouseLeave={e=>{ if(selected?.phone!==c.phone) e.currentTarget.style.background='transparent'; }}>
              <Av name={c.name} size={36} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontSize:12.5, fontWeight:500, color:'var(--fg)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:120 }}>{c.name}</span>
                    <LangChip name={c.name} />
                  </div>
                  <span style={{ fontSize:10.5, color:'var(--faint)', fontFamily:'Inter', flexShrink:0 }}>{timeStr(c.lastMessageAt)}</span>
                </div>
                <div style={{ fontSize:11.5, color:'var(--faint)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.lastMessage||'—'}</div>
              </div>
              <div
                title={`${c.messageCount || 0} messages`}
                style={{
                  minWidth:18,
                  height:18,
                  padding:'0 6px',
                  borderRadius:999,
                  background:'var(--accent-bg)',
                  color:'var(--accent)',
                  display:'inline-flex',
                  alignItems:'center',
                  justifyContent:'center',
                  fontSize:10,
                  fontWeight:600,
                  fontVariantNumeric:'tabular-nums',
                  flexShrink:0
                }}
              >
                {c.messageCount || 0}
              </div>
              <button
                type="button"
                title="Delete conversation"
                onClick={(e) => requestDeleteConv(c, e)}
                style={{ width:24, height:24, display:'grid', placeItems:'center', border:'none', borderRadius:7, background:'transparent', color:'var(--faint)', cursor:'pointer', flexShrink:0 }}
                onMouseEnter={e=>{ e.currentTarget.style.background='var(--danger-bg)'; e.currentTarget.style.color='var(--danger)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--faint)'; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Middle — message thread */}
        {!selected ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--faint)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" style={{ marginBottom:10 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <div style={{ fontSize:13, fontWeight:500, color:'var(--muted)' }}>Select a conversation</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', minHeight:0, minWidth:0 }}>
            {/* Chat header */}
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderBottom:'1px solid var(--rule)', flexShrink:0 }}>
              <Av name={selected.name} size={32} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--fg)' }}>{selected.name}</div>
                <div style={{ fontSize:11, color:'var(--faint)', fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>+{selected.phone}</div>
              </div>
              <span className={`chip ${botPaused?'chip-warn':'chip-ok'}`} style={{ fontSize:10 }}>
                {botPaused?'Bot paused':'Bot active'}
              </span>
              <button className="btn-secondary" onClick={toggleBot} title={botPaused ? 'Resume automatic bot replies' : 'Pause bot and reply manually'} style={{ fontSize:11.5 }}>
                {botPaused?'Resume bot':'Take over'}
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex:1, minHeight:0, overflowY:'auto', padding:'16px 14px', display:'flex', flexDirection:'column', gap:8, background:'var(--card-soft)' }}>
              {loading && <div style={{ textAlign:'center', color:'var(--faint)', fontSize:12 }}>Loading…</div>}
              {messages.map((m,i)=>(
                <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:m.role==='user'?'flex-start':'flex-end' }}>
                  <div style={{
                    maxWidth:'75%', padding:'9px 12px', borderRadius:m.role==='user'?'4px 12px 12px 12px':'12px 4px 12px 12px',
                    background:m.role==='user'?'var(--card)':'var(--accent)',
                    color:m.role==='user'?'var(--fg)':'var(--accent-ink)',
                    fontSize:13, lineHeight:1.5,
                    border: m.role==='user'?'1px solid var(--rule)':'none',
                  }}>
                    {m.content}
                  </div>
                  <div style={{ fontSize:10.5, color:'var(--faint)', marginTop:3, fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>
                    {m.role==='user'?'Customer':'Bot'} · {timeStr(m.timestamp)}
                  </div>
                </div>
              ))}
              <div ref={msgEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding:'10px 14px', borderTop:'1px solid var(--rule)', display:'flex', gap:8, flexShrink:0, background:'var(--card)' }}>
              {botPaused ? (
                <>
                  <input className="input" style={{ flex:1, fontSize:13 }} placeholder="Type a reply…" value={manualMsg} onChange={e=>setManualMsg(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendManual();}}} />
                  <button className="btn-primary" onClick={sendManual} disabled={sending||!manualMsg.trim()} style={{ fontSize:12 }}>
                    {sending?'…':'Send'}
                  </button>
                </>
              ) : (
                <div style={{ flex:1, padding:'9px 12px', background:'var(--bg)', border:'1px solid var(--rule)', borderRadius:9, fontSize:13, color:'var(--faint)', fontStyle:'italic' }}>
                  Bot is handling replies automatically… click "Take over" to reply manually.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right — customer details */}
        <div style={{ borderLeft:'1px solid var(--rule)', overflowY:'auto', background:'var(--card)' }}>
          {!selected ? (
            <div style={{ padding:20, color:'var(--faint)', fontSize:12, textAlign:'center', marginTop:40 }}>Select a conversation to see customer details</div>
          ) : (
            <div style={{ padding:'18px 16px', display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, paddingBottom:14, borderBottom:'1px solid var(--rule)' }}>
                <Av name={selected.name} size={48} />
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--fg)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selected.name}</div>
                  <div className="num" style={{ fontSize:11.5, color:'var(--muted)', marginTop:2 }}>+{selected.phone}</div>
                  <span className={`chip ${botPaused?'chip-warn':'chip-ok'}`} style={{ fontSize:10, marginTop:7, display:'inline-flex' }}>
                    {botPaused?'Bot paused':'Active'}
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--muted)', marginBottom:4 }}>Customer details</div>
                <DetailRow label="Mobile" val={'+'+selected.phone} />
                <DetailRow label="Messages" val={selected.messageCount} />
                <DetailRow label="Last active" val={timeStr(selected.lastMessageAt)} />
                {lead && (
                  <>
                    <DetailRow label="Source" val={lead.source} />
                    <DetailRow label="Product" val={lead.interestedProduct} />
                    <div style={{ padding:'10px 0', borderBottom:'1px solid var(--rule)' }}>
                      <div style={{ fontSize:11, color:'var(--faint)', marginBottom:7 }}>Lead status</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                        {['Interested','Not Interested','Converted','Follow Up'].map(s => {
                          const active = lead.status === s;
                          const tone = { Interested:'var(--info)', 'Not Interested':'var(--danger)', Converted:'var(--accent)', 'Follow Up':'var(--warn)' }[s];
                          const toneBg = { Interested:'var(--info-bg)', 'Not Interested':'var(--danger-bg)', Converted:'var(--accent-bg)', 'Follow Up':'var(--warn-bg)' }[s];
                          return (
                            <button key={s} onClick={() => updateLeadStatus(s)} disabled={updatingStatus || active}
                              style={{
                                padding:'4px 10px', borderRadius:999, fontSize:11, fontWeight:500,
                                border: `1px solid ${active ? tone : 'var(--rule)'}`,
                                background: active ? toneBg : 'transparent',
                                color: active ? tone : 'var(--muted)',
                                cursor: active ? 'default' : 'pointer',
                                opacity: updatingStatus ? 0.6 : 1,
                                transition:'all 0.18s ease',
                              }}>
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div style={{ background:'var(--card-soft)', border:'1px solid var(--rule)', borderRadius:10, padding:12 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--fg)', marginBottom:4 }}>{botPaused ? 'Manual mode' : 'Bot mode'}</div>
                <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.45 }}>
                  {botPaused ? 'You are replying manually. Resume the bot when this conversation can go back to automation.' : 'The assistant replies automatically. Use Take over to pause automation and type a manual reply.'}
                </div>
              </div>

              <div style={{ background:'var(--card-soft)', border:'1px solid var(--rule)', borderRadius:10, padding:12 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--fg)', marginBottom:8 }}>Latest message</div>
                <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.45, display:'-webkit-box', WebkitLineClamp:4, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                  {selected.lastMessage || 'No message preview available.'}
                </div>
              </div>

              {lead && (
                <a href="/leads" style={{ display:'block', textAlign:'center', padding:'8px 12px', background:'var(--accent-bg)', color:'var(--accent)', borderRadius:9, fontSize:12.5, fontWeight:500, textDecoration:'none' }}>
                  View lead →
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal open={!!pendingDelete} onClose={()=>!deleting && setPendingDelete(null)} title="Delete conversation" size="sm">
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'var(--danger-bg)', color:'var(--danger)', display:'grid', placeItems:'center', flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--fg)' }}>Delete {pendingDelete?.name}?</div>
              <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:5, lineHeight:1.5 }}>
                This will remove the WhatsApp conversation history from the CRM. This action cannot be undone.
              </div>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, borderTop:'1px solid var(--rule)', paddingTop:14 }}>
            <button type="button" className="btn-secondary" onClick={()=>setPendingDelete(null)} disabled={deleting}>Cancel</button>
            <button
              type="button"
              onClick={deleteConv}
              disabled={deleting}
              style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, background:'var(--danger)', color:'#fff', border:'none', borderRadius:9, padding:'8px 13px', fontSize:12, fontWeight:500, cursor:deleting?'default':'pointer', opacity:deleting?0.7:1 }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
