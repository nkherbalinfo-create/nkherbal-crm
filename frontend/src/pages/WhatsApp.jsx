import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { format } from 'date-fns';
import { useIsMobile } from '../hooks/useIsMobile';

// Renders WhatsApp formatting: *bold*, _italic_, ~strike~, `mono`, newlines
function WaText({ text, color }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <span>
      {lines.map((line, li) => {
        // Parse inline formatting
        const parts = [];
        let remaining = line;
        let key = 0;
        // Regex to match *bold*, _italic_, ~strike~, `mono`
        const re = /(\*[^*]+\*|_[^_]+_|~[^~]+~|`[^`]+`)/g;
        let last = 0;
        let match;
        re.lastIndex = 0;
        while ((match = re.exec(remaining)) !== null) {
          if (match.index > last) {
            parts.push(<span key={key++}>{remaining.slice(last, match.index)}</span>);
          }
          const raw = match[0];
          const inner = raw.slice(1, -1);
          if (raw.startsWith('*')) parts.push(<strong key={key++} style={{ fontWeight:700 }}>{inner}</strong>);
          else if (raw.startsWith('_')) parts.push(<em key={key++}>{inner}</em>);
          else if (raw.startsWith('~')) parts.push(<s key={key++}>{inner}</s>);
          else if (raw.startsWith('`')) parts.push(<code key={key++} style={{ fontFamily:'monospace', fontSize:'0.9em', background:'rgba(0,0,0,.15)', padding:'0 3px', borderRadius:3 }}>{inner}</code>);
          last = match.index + raw.length;
        }
        if (last < remaining.length) parts.push(<span key={key++}>{remaining.slice(last)}</span>);
        return (
          <span key={li}>
            {parts.length ? parts : line}
            {li < lines.length - 1 && <br />}
          </span>
        );
      })}
    </span>
  );
}

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

const BACKEND_URL = 'https://crm-backend-azu8.onrender.com';
const PRODUCT_IMG_MAP = {
  'Muejaza For Men (300g)':           { url: `${BACKEND_URL}/images/products/muejaza.png`,           caption: '🌿 *Muejaza For Men (300g)* — ₹4,499\n🔗 https://nkherbal.com/product/muejaza-ayurvedic-food-preparation/' },
  'Muejaza Plus For Men (300g)':      { url: 'https://nkherbal.com/wp-content/uploads/2026/01/NK-Herbal-24-1.webp', caption: '⭐ *Muejaza Plus For Men (300g)* — ₹15,000\n🔗 https://nkherbal.com/product/muejaza-plus-ayurvedic-herbal-preparation/' },
  'Testo – Vardhak For Men (300g)':   { url: `${BACKEND_URL}/images/products/testovardhak.png`,      caption: '💪 *Testo Vardhak For Men (300g)* — ₹4,199\n🔗 https://nkherbal.com/product/testo-vardhak-ayurvedic-preparation/' },
  'Shahi Kalp For Men & Women (300g)':{ url: `${BACKEND_URL}/images/products/shahikalp.png`,         caption: '👑 *Shahi Kalp For Men & Women (300g)* — ₹4,499\n🔗 https://nkherbal.com/product/shahi-kalp-ayurvedic-food-preparation/' },
  'Kashmiri Shilajit 25g':            { url: `${BACKEND_URL}/images/products/shilajit.png`,          caption: '🏔️ *Kashmiri Shilajit 25g* — ₹1,499\n🔗 https://nkherbal.com/product/pure-kashmiri-shilajit/' },
  'Kashmiri Shilajit 50g':            { url: `${BACKEND_URL}/images/products/shilajit.png`,          caption: '🏔️ *Kashmiri Shilajit 50g* — ₹2,499\n🔗 https://nkherbal.com/product/pure-kashmiri-shilajit/' },
  'Muejaza & Shahi Kalp Combo (300g)':{ url: `${BACKEND_URL}/images/products/muejaza-shahikalp-combo.png`, caption: '🎁 *Muejaza + Shahi Kalp Combo* — ₹8,999\n🔗 https://nkherbal.com/product/nk-herbal-muejaza-shahi-kalp-combo/' },
};

// Extract [img:ProductName] tag from message content
function parseImgTag(content) {
  const match = content?.match(/\[img:([^\]]+)\]/);
  const product = match ? match[1] : null;
  return {
    text: content?.replace(/\s*\[img:[^\]]+\]/g, '').trim() || '',
    product,
    imgUrl: product ? PRODUCT_IMG_MAP[product] : null,
  };
}

const DEFAULT_TEMPLATES = [
  { id:'t1', label:'Pricing',   text:'*Muejaza For Men* — ₹4,000 (after ₹499 discount)\n*Testo Vardhak* — ₹3,700\n*Shahi Kalp* — ₹4,000\n*Shilajit 25g* — ₹1,000 | 50g — ₹2,000\n\nFree delivery 🚚 | Discreet packaging 📦\nOrder karne ke liye reply karen ya website visit karen: https://nkherbal.com/shop' },
  { id:'t2', label:'Delivery',  text:'Delivery 3–5 working days mein ho jati hai 🚚\nHum discreet packing mein bhejte hain — box par koi product name nahi hota.\nTracking link ship hone ke baad share kiya jayega 📦' },
  { id:'t3', label:'COD',       text:'Abhi hamare paas COD available nahi hai — sirf online/UPI payment hoti hai.\nBut aap *SAVE499* coupon use karke ₹499 discount pa sakte hain website par: https://nkherbal.com/shop\nOr seedha UPI payment karke hamare number pe order de sakte hain: +91 98678 00415' },
  { id:'t4', label:'Follow up', text:'Namaste Ji! 🙏\nAapne hamare products ke baare mein enquiry ki thi — koi sawaal ho toh batayein, main help karne ke liye hoon! 😊\nKaunse product mein interest tha aapka?' },
  { id:'t5', label:'Order done',text:'Bahut shukriya aapke order ke liye! 🙏🌿\nAapka order process ho gaya hai. Hum 24 ghante mein ship kar denge.\nTracking details aapko WhatsApp/SMS par milegi. Koi bhi sawaal ho toh batayein! 😊' },
];

function loadTemplates() {
  try { return JSON.parse(localStorage.getItem('wa_templates') || 'null') || DEFAULT_TEMPLATES; }
  catch { return DEFAULT_TEMPLATES; }
}
function saveTemplates(t) { localStorage.setItem('wa_templates', JSON.stringify(t)); }

// Score each template against the latest customer message
function rankTemplates(lastMsg, templates) {
  if (!lastMsg) return templates;
  const t = lastMsg.toLowerCase();
  const score = {
    t1: 0, // Pricing
    t2: 0, // Delivery
    t3: 0, // COD
    t4: 0, // Follow up
    t5: 0, // Order done
  };
  if (/price|rate|kitna|cost|paisa|rupee|rs\b|₹|discount|offer|deal|how much|quanto|daam|mehnga|sasta/.test(t)) score.t1 += 3;
  if (/deliver|ship|time|kitne din|when|kab|tracking|fast|quick|speed|aayega|आएगा|कब|courier/.test(t)) score.t2 += 3;
  if (/\bcod\b|cash on delivery|payment|pay|upi|gpay|phonepe|paytm|card|online|neft/.test(t)) score.t3 += 3;
  if (/hi\b|hello|hey|namaste|namaskar|info|details|batao|tell me|interested|want|kya hai|product/.test(t)) score.t4 += 2;
  if (/order\b|bought|khareed|payment done|paid|done|order kiya|placed|confirm/.test(t)) score.t5 += 3;
  return [...templates].sort((a, b) => (score[b.id] || 0) - (score[a.id] || 0));
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
  const [templates, setTemplates] = useState(loadTemplates);
  const [showTemplates, setShowTemplates] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [broadcastSelected, setBroadcastSelected] = useState(new Set());
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastProgress, setBroadcastProgress] = useState(null); // { sent, failed, total } | null
  const [broadcastDone, setBroadcastDone] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  // seenCounts: { [phone]: lastSeenCustomerMsgCount } — persisted in localStorage
  const [seenCounts, setSeenCounts] = useState(() => {
    try {
      // v2 key — wipes old inflated counts from before the user-only message fix
      return JSON.parse(localStorage.getItem('wa_seen_v2') || '{}');
    } catch { return {}; }
  });
  const isMobile = useIsMobile(767);
  const msgEndRef = useRef(null);
  const selectedPhoneRef = useRef(null);
  const msgCountRef = useRef(0);
  const { addToast } = useToast();

  const markSeen = (phone, count) => {
    setSeenCounts(prev => {
      const next = { ...prev, [phone]: count };
      localStorage.setItem('wa_seen_v2', JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('wa-unread-changed'));
      return next;
    });
  };

  const loadConvs = async () => {
    try {
      const { data } = await api.get('/wa');
      setConvs(data);
      // If a conversation is currently open, mark it as seen immediately so badge stays 0
      if (selectedPhoneRef.current) {
        const active = data.find(c => c.phone === selectedPhoneRef.current);
        if (active) markSeen(active.phone, active.messageCount);
      }
    } catch {}
  };

  useEffect(() => { loadConvs(); const t = setInterval(loadConvs, 6000); return ()=>clearInterval(t); }, []);

  // ── Real-time SSE connection ─────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    // Use the same backend base URL that axios uses, falling back to relative path for dev
    const base = import.meta.env.VITE_API_URL
      || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://crm-backend-azu8.onrender.com');
    const es = new EventSource(`${base}/api/wa/stream?token=${token}`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'message') {
          // Refresh conv list and open conversation instantly
          loadConvs();
          // Tell the Sidebar to refresh its WA badge instantly
          window.dispatchEvent(new CustomEvent('wa-unread-changed'));
          if (selectedPhoneRef.current === data.phone) {
            loadConversation({ phone: data.phone }, { showLoading: false, scroll: true });
            setShowTyping(false);
            clearTimeout(typingTimerRef.current);
          }
        }
      } catch {}
    };
    es.onerror = () => {}; // reconnects automatically
    return () => es.close();
  }, []);

  const loadConversation = async (conv, { showLoading = false, scroll = false } = {}) => {
    if (!conv?.phone) return;
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get(`/wa/${conv.phone}`);
      if (selectedPhoneRef.current && selectedPhoneRef.current !== conv.phone) return;
      const incoming = (data.messages || []);
      const prevCount = msgCountRef.current;
      const newCount = incoming.length;
      setMessages(incoming);
      setLead(data.leadId || null);
      setBotPaused(data.botPaused || false);
      // Auto-scroll if new messages arrived OR initial load
      if (scroll || newCount > prevCount) {
        setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: scroll ? 'auto' : 'smooth' }), 30);
      }
      msgCountRef.current = newCount;
    } catch { if (showLoading) addToast('Failed to load conversation','error'); }
    finally { if (showLoading) setLoading(false); }
  };

  const selectConv = async (conv) => {
    selectedPhoneRef.current = conv.phone;
    msgCountRef.current = 0;
    setSelected(conv);
    // Clear badge immediately on click
    markSeen(conv.phone, conv.messageCount);
    if (isMobile) setMobileChatOpen(true);
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
    const t = setInterval(() => loadConversation(selected, { showLoading: false, scroll: false }), 5000);
    return () => clearInterval(t);
  }, [selected?.phone]);

  const toggleBot = async () => {
    try {
      const { data } = await api.patch(`/wa/${selected.phone}/pause`, { paused:!botPaused });
      setBotPaused(data.botPaused);
      addToast(data.botPaused ? 'Bot paused — you can reply manually' : 'Bot resumed');
    } catch { addToast('Failed','error'); }
  };

  const confirmPayment = async () => {
    if (!selected?.phone) return;
    try {
      const msg = `✅ *Payment Verified!* 🎉\n\nAapka payment confirm ho gaya hai. Shukriya!\n\nAb apna order ship karne ke liye yeh details bhejein:\n\n• *Full Name*\n• *Complete Delivery Address*\n• *Pincode*\n• *Mobile Number*\n• *Product Name* (Muejaza, Shahi Kalp, etc.)\n• *Quantity* (kitne jars)\n\nDetails milte hi hum 24 ghante mein ship kar denge! 🚚📦`;
      await api.post('/wa/send', { phone: selected.phone, message: msg });
      await api.patch(`/wa/${selected.phone}/payment`, { paymentClaimed: false });
      setConvs(prev => prev.map(c => c.phone === selected.phone ? { ...c, paymentClaimed: false } : c));
      addToast('Payment confirmed — customer notified ✅', 'success');
    } catch { addToast('Failed to confirm payment', 'error'); }
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

  const toggleBroadcastSelect = (phone, e) => {
    e.stopPropagation();
    setBroadcastSelected(prev => {
      const next = new Set(prev);
      next.has(phone) ? next.delete(phone) : next.add(phone);
      return next;
    });
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim() || broadcastSelected.size === 0) return;
    const phones = [...broadcastSelected];
    setBroadcastProgress({ sent: 0, failed: 0, total: phones.length });
    setBroadcastDone(false);
    let sent = 0, failed = 0;
    for (const phone of phones) {
      try {
        await api.post('/wa/send', { phone, message: broadcastMsg });
        sent++;
      } catch { failed++; }
      setBroadcastProgress({ sent, failed, total: phones.length });
    }
    setBroadcastDone(true);
    if (failed === 0) addToast(`Broadcast sent to ${sent} contacts`);
    else addToast(`Sent ${sent}, failed ${failed}`, failed > 0 ? 'error' : 'success');
    setBroadcastSelected(new Set());
    setBroadcastMsg('');
  };

  const closeBroadcast = () => {
    if (broadcastProgress && !broadcastDone) return; // prevent close while sending
    setBroadcastModal(false);
    setBroadcastProgress(null);
    setBroadcastDone(false);
    setBroadcastMsg('');
  };

  const timeStr = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString()===now.toDateString()) return format(d,'h:mm a');
    return format(d,'dd MMM');
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.02em', color:'var(--fg)' }}>WhatsApp</div>
        <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>Customer conversations via WhatsApp Business API</div>
      </div>

      <div className="card" style={{ padding:0, display:'grid', gridTemplateColumns: isMobile ? '1fr' : '300px minmax(0,1fr) 280px', height: isMobile ? 'calc(100vh - 140px)' : 'calc(100vh - 200px)', minHeight: isMobile ? 'unset' : 560, overflow:'hidden' }}>

        {/* Left — conversation list */}
        <div style={{ borderRight: isMobile ? 'none' : '1px solid var(--rule)', display: isMobile && mobileChatOpen ? 'none' : 'flex', flexDirection:'column', minHeight:0, overflowY:'auto' }}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--rule)', display:'flex', alignItems:'center', gap:8 }}>
            <input type="checkbox"
              style={{ accentColor:'var(--accent)', cursor:'pointer', width:14, height:14, flexShrink:0 }}
              checked={convs.length > 0 && broadcastSelected.size === convs.length}
              onChange={e => setBroadcastSelected(e.target.checked ? new Set(convs.map(c=>c.phone)) : new Set())}
            />
            <span style={{ fontSize:12, fontWeight:600, color:'var(--fg)', flex:1 }}>
              Conversations <span style={{ fontFamily:'Inter', fontVariantNumeric:'tabular-nums', color:'var(--faint)', fontWeight:400 }}>({convs.length})</span>
            </span>
            {broadcastSelected.size > 0 && (
              <button onClick={() => { setBroadcastModal(true); setBroadcastProgress(null); setBroadcastDone(false); }}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:7, border:'none', background:'var(--accent)', color:'#fff', cursor:'pointer', fontSize:11.5, fontWeight:600, flexShrink:0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Broadcast ({broadcastSelected.size})
              </button>
            )}
          </div>
          <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--rule)', flexShrink:0 }}>
            <input type="text" className="input" placeholder="Search conversations…" value={searchFilter} onChange={e => setSearchFilter(e.target.value.toLowerCase())} style={{ fontSize:12 }} />
          </div>
          {convs.length===0 && (
            <div style={{ padding:24, textAlign:'center', color:'var(--faint)', fontSize:12 }}>No conversations yet</div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:6, padding:'10px 12px', overflow:'auto', flex:1 }}>
          {convs.filter(c => !searchFilter || c.name.toLowerCase().includes(searchFilter) || c.phone.includes(searchFilter)).map(c=>{
            const isSelected = selected?.phone===c.phone;
            const isBroadcast = broadcastSelected.has(c.phone);
            const unread = Math.max(0, (c.messageCount || 0) - (seenCounts[c.phone] || 0));
            return (
            <div key={c.phone} onClick={()=>selectConv(c)}
              style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'9px 11px', cursor:'pointer',
                borderRadius:10,
                background: isBroadcast ? 'var(--accent-bg)' : isSelected ? 'var(--accent-bg)' : 'var(--hover)',
                border: `1px solid ${isSelected ? 'var(--accent)' : isBroadcast ? 'var(--accent)' : 'var(--rule)'}`,
                boxShadow: isSelected ? '0 2px 8px rgba(61,138,92,.1)' : 'none',
                transition:'all 0.12s',
              }}
              onMouseEnter={e=>{ if(!isSelected && !isBroadcast) { e.currentTarget.style.background='rgba(61,138,92,.08)'; } }}
              onMouseLeave={e=>{ if(!isSelected && !isBroadcast) { e.currentTarget.style.background='var(--hover)'; } }}>
              <input type="checkbox"
                checked={isBroadcast}
                onClick={e => toggleBroadcastSelect(c.phone, e)}
                onChange={()=>{}}
                style={{ accentColor:'var(--accent)', cursor:'pointer', width:14, height:14, flexShrink:0 }}
              />
              <Av name={c.name} size={36} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:4, minWidth:0 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--fg)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</span>
                    <LangChip name={c.name} />
                  </div>
                  <span style={{ fontSize:10, color:'var(--faint)', fontFamily:'Inter', flexShrink:0, marginLeft:4, whiteSpace:'nowrap' }}>{timeStr(c.lastMessageAt)}</span>
                </div>
                <div style={{ fontSize:12, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontStyle: c.lastMessage ? 'normal' : 'italic', lineHeight:1.3 }}>
                  {c.paymentClaimed && <span style={{ marginRight:4 }}>💰</span>}
                  {c.lastMessage?.replace(/\s*\[img:[^\]]+\]/g,'') || '—'}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                {unread > 0 && (
                  <div style={{ minWidth:22, height:22, padding:'0 6px', borderRadius:999, background:'#25d366', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:10.5, fontWeight:700 }}>
                    {unread > 99 ? '99+' : unread}
                  </div>
                )}
              <button
                type="button"
                title="Delete conversation"
                onClick={(e) => requestDeleteConv(c, e)}
                style={{ width:24, height:24, display:'grid', placeItems:'center', border:'none', borderRadius:6, background:'transparent', color:'var(--faint)', cursor:'pointer', transition:'all 0.12s' }}
                onMouseEnter={e=>{ e.currentTarget.style.background='var(--danger-bg)'; e.currentTarget.style.color='var(--danger)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--faint)'; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
              </div>
            </div>
            );
          })}
          </div>
        </div>

        {/* Middle — message thread (hidden on mobile when list shown) */}
        {!(isMobile && !mobileChatOpen) && (
        !selected ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--faint)', flex:1 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" style={{ marginBottom:10 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <div style={{ fontSize:13, fontWeight:500, color:'var(--muted)' }}>Select a conversation</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', minHeight:0, minWidth:0, flex:1 }}>
            {/* Chat header with mobile back button */}
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderBottom:'1px solid var(--rule)', flexShrink:0 }}>
              {isMobile && (
                <button onClick={() => { setMobileChatOpen(false); setSelected(null); selectedPhoneRef.current = null; msgCountRef.current = 0; setMessages([]); setLead(null); }}
                  style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', padding:'2px 6px 2px 0', display:'flex', alignItems:'center', flexShrink:0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
              )}
              <Av name={selected.name} size={32} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--fg)' }}>{selected.name}</div>
                <div style={{ fontSize:11, color:'var(--faint)', fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>+{selected.phone}</div>
              </div>
              {/* Payment claimed — waiting for CC Avenue auto-confirm */}
              {convs.find(c=>c.phone===selected.phone)?.paymentClaimed && (
                <span style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, background:'#fef08a', color:'#854d0e', fontSize:11.5, fontWeight:600 }}>
                  💰 Verifying payment…
                </span>
              )}
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
              {!loading && messages.length === 0 && (
                <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, padding:32, textAlign:'center' }}>
                  <div style={{ width:48, height:48, borderRadius:'50%', background:'var(--chip)', display:'grid', placeItems:'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.5" strokeLinecap="round"><path d="M3 21l1.65-4.5A8 8 0 1112 20a8 8 0 01-3.4-.8L3 21z"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:'var(--muted)', marginBottom:4 }}>No message history</div>
                    <div style={{ fontSize:12, color:'var(--faint)', lineHeight:1.5, maxWidth:220 }}>
                      Earlier messages weren't captured.<br/>New messages will appear here when the customer replies.
                    </div>
                  </div>
                  {!botPaused && (
                    <button className="btn-secondary" style={{ fontSize:12, marginTop:4 }} onClick={toggleBot}>
                      Take over to send a message
                    </button>
                  )}
                </div>
              )}

              {messages.map((m,i)=>{
                const { text, product } = parseImgTag(m.content);
                const imgUrl = product ? PRODUCT_IMG_MAP[product] : null;
                return (
                  <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:m.role==='user'?'flex-start':'flex-end', gap:4 }}>
                    {/* Text bubble */}
                    {text && (
                      <div style={{
                        maxWidth:'75%', padding:'9px 12px', borderRadius:m.role==='user'?'4px 12px 12px 12px':'12px 4px 12px 12px',
                        background:m.role==='user'?'var(--card)':'var(--accent)',
                        color:m.role==='user'?'var(--fg)':'var(--accent-ink)',
                        fontSize:13, lineHeight:1.6,
                        border: m.role==='user'?'1px solid var(--rule)':'none',
                        whiteSpace:'pre-wrap', wordBreak:'break-word',
                      }}>
                        <WaText text={text} />
                      </div>
                    )}
                    {/* Product image — exact replica of what customer received */}
                    {imgUrl && (
                      <div style={{ maxWidth:'75%', borderRadius:12, overflow:'hidden', border:'1px solid var(--rule)', boxShadow:'var(--shadow-card)' }}>
                        <img src={imgUrl.url} alt={product} style={{ width:'100%', height:'auto', display:'block', objectFit:'contain', background:'#fff' }} />
                        {imgUrl.caption && (
                          <div style={{ padding:'8px 10px', background:'#1a1a1a', fontSize:12, color:'#e0e0e0', whiteSpace:'pre-wrap', wordBreak:'break-all', lineHeight:1.5 }}>
                            <WaText text={imgUrl.caption} />
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ fontSize:10.5, color:'var(--faint)', fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>
                      {m.role==='user'?'Customer':'Bot'} · {timeStr(m.timestamp)}
                    </div>
                  </div>
                );
              })}
              <div ref={msgEndRef} />
            </div>

            {/* Input */}
            <div style={{ borderTop:'1px solid var(--rule)', flexShrink:0, background:'var(--card)' }}>
              {/* Smart quick reply templates */}
              {showTemplates && botPaused && (() => {
                const lastCustomerMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
                const ranked = rankTemplates(lastCustomerMsg, templates);
                const topMatch = ranked[0] && rankTemplates(lastCustomerMsg, [ranked[0]])[0];
                return (
                  <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--rule)', display:'flex', flexDirection:'column', gap:6, maxHeight:240, overflowY:'auto' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>
                        ⚡ Quick replies
                        {lastCustomerMsg && <span style={{ fontWeight:400, textTransform:'none', marginLeft:6, color:'var(--faint)' }}>· sorted by relevance</span>}
                      </div>
                    </div>
                    {ranked.map((tmpl, i) => (
                      <button key={tmpl.id} onClick={() => { setManualMsg(tmpl.text); setShowTemplates(false); }}
                        style={{ textAlign:'left', padding:'9px 12px', borderRadius:9, border:`1px solid ${i===0&&lastCustomerMsg?'var(--accent)':'var(--rule)'}`, background: i===0&&lastCustomerMsg?'var(--accent-bg)':'var(--bg)', cursor:'pointer', transition:'background 0.12s' }}
                        onMouseEnter={e=>e.currentTarget.style.background='var(--hover)'}
                        onMouseLeave={e=>e.currentTarget.style.background=i===0&&lastCustomerMsg?'var(--accent-bg)':'var(--bg)'}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                          <span style={{ fontSize:11, fontWeight:600, color: i===0&&lastCustomerMsg?'var(--accent)':'var(--muted)' }}>{tmpl.label}</span>
                          {i===0&&lastCustomerMsg&&<span style={{ fontSize:9.5, padding:'1px 6px', borderRadius:999, background:'var(--accent)', color:'#fff', fontWeight:600 }}>Best match</span>}
                        </div>
                        <div style={{ fontSize:11.5, color:'var(--faint)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tmpl.text.slice(0, 90)}…</div>
                      </button>
                    ))}
                  </div>
                );
              })()}
              <div style={{ padding:'10px 14px', display:'flex', gap:8 }}>
              {botPaused ? (
                <>
                  <button onClick={() => setShowTemplates(s => !s)} title="Quick replies"
                    style={{ width:34, height:34, border:'1px solid var(--rule)', borderRadius:8, background: showTemplates?'var(--accent-bg)':'var(--card)', color: showTemplates?'var(--accent)':'var(--muted)', cursor:'pointer', display:'grid', placeItems:'center', flexShrink:0, transition:'all 0.15s' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  </button>
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
          </div>
        ))}

        {/* Right — customer details (hidden on mobile) */}
        {!isMobile && <div style={{ borderLeft:'1px solid var(--rule)', overflowY:'auto', background:'var(--card)' }}>
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
                <DetailRow label="Messages" val={String(selected.messageCount ?? 0)} />
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
        </div>}
      </div>

      {/* Broadcast Modal */}
      <Modal open={broadcastModal} onClose={closeBroadcast} title={`Broadcast to ${broadcastSelected.size} contact${broadcastSelected.size !== 1 ? 's' : ''}`}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {!broadcastProgress ? (
            <>
              <div style={{ background:'var(--warn-bg)', border:'1px solid var(--warn)', borderRadius:9, padding:'10px 14px', fontSize:12.5, color:'var(--warn)', lineHeight:1.5 }}>
                ⚠️ This will send a WhatsApp message to <strong>{broadcastSelected.size}</strong> contact{broadcastSelected.size !== 1 ? 's' : ''} one by one. Make sure the message is relevant and not spammy to avoid getting your number flagged.
              </div>
              <div>
                <label className="label">Message *</label>
                <textarea className="input" style={{ height:120, resize:'vertical', fontSize:13 }}
                  placeholder="Type your message here… Supports *bold*, _italic_ WhatsApp formatting"
                  value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} />
                <div style={{ fontSize:11, color:'var(--faint)', marginTop:4 }}>{broadcastMsg.length} characters</div>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:500, color:'var(--muted)', marginBottom:8 }}>Quick templates</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:180, overflowY:'auto' }}>
                  {templates.map(t => (
                    <button key={t.id} onClick={() => setBroadcastMsg(t.text)}
                      style={{ textAlign:'left', padding:'8px 12px', borderRadius:8, border:'1px solid var(--rule)', background:'var(--bg)', cursor:'pointer', fontSize:12, transition:'all 0.12s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.background='var(--accent-bg)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--rule)'; e.currentTarget.style.background='var(--bg)'; }}>
                      <span style={{ fontWeight:600, color:'var(--accent)' }}>{t.label}</span>
                      <span style={{ color:'var(--faint)', marginLeft:8 }}>{t.text.slice(0, 60)}…</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8, borderTop:'1px solid var(--rule)', paddingTop:14 }}>
                <button className="btn-secondary" onClick={closeBroadcast}>Cancel</button>
                <button className="btn-primary" disabled={!broadcastMsg.trim()} onClick={sendBroadcast}
                  style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  Send to {broadcastSelected.size}
                </button>
              </div>
            </>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:16, alignItems:'center', padding:'8px 0' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:15, fontWeight:600, color:'var(--fg)', marginBottom:4 }}>
                  {broadcastDone ? 'Broadcast complete' : 'Sending…'}
                </div>
                <div style={{ fontSize:13, color:'var(--muted)' }}>
                  {broadcastProgress.sent} sent · {broadcastProgress.failed} failed · {broadcastProgress.total} total
                </div>
              </div>
              <div style={{ width:'100%', height:8, background:'var(--rule)', borderRadius:4, overflow:'hidden' }}>
                <div style={{
                  height:'100%', borderRadius:4, transition:'width 0.3s ease',
                  width: `${Math.round(((broadcastProgress.sent + broadcastProgress.failed) / broadcastProgress.total) * 100)}%`,
                  background: broadcastDone && broadcastProgress.failed > 0 ? 'var(--warn)' : 'var(--accent)',
                }} />
              </div>
              <div style={{ fontSize:12, color:'var(--faint)' }}>
                {broadcastDone
                  ? broadcastProgress.failed === 0
                    ? '✅ All messages delivered successfully'
                    : `⚠️ ${broadcastProgress.failed} message${broadcastProgress.failed > 1 ? 's' : ''} failed to send`
                  : `Sending ${broadcastProgress.sent + broadcastProgress.failed + 1} of ${broadcastProgress.total}…`}
              </div>
              {broadcastDone && (
                <button className="btn-primary" onClick={closeBroadcast}>Done</button>
              )}
            </div>
          )}
        </div>
      </Modal>

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
