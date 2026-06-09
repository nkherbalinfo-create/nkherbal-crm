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

function VoiceNote({ src, isUser, transcript }) {
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current,  setCurrent]  = useState(0);
  const audioRef = useRef(null);

  const fmt = (s) => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };
  const onTimeUpdate = () => {
    const ct = audioRef.current?.currentTime || 0, dur = audioRef.current?.duration || 0;
    setCurrent(ct); setProgress(dur > 0 ? (ct/dur)*100 : 0);
  };
  const onEnded = () => {
    setPlaying(false); setProgress(0); setCurrent(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  };
  const onSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audioRef.current.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration;
  };

  const BARS = [3,5,9,6,12,8,14,10,7,5,10,6,12,9,5,8,11,6,9,4,7,10,7,12,5,9,6,11,7,4];
  const onCol  = isUser ? 'var(--accent)'              : 'rgba(255,255,255,0.95)';
  const offCol = isUser ? 'var(--rule)'                : 'rgba(255,255,255,0.35)';
  const timeCol= isUser ? 'var(--faint)'               : 'rgba(255,255,255,0.75)';
  const btnBg  = isUser ? 'var(--accent)'              : 'rgba(255,255,255,0.22)';

  return (
    <div style={{
      display:'flex', flexDirection:'column', gap:0,
      padding:'10px 13px 10px 11px',
      background: isUser ? 'var(--card)' : 'var(--accent)',
      border: isUser ? '1px solid var(--rule)' : 'none',
      borderRadius: isUser ? '2px 14px 14px 14px' : '14px 2px 14px 14px',
      boxShadow: isUser ? 'none' : '0 1px 3px rgba(61,138,92,.18)',
      minWidth: 220, maxWidth: 270,
    }}>
      <audio ref={audioRef} src={src}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={onEnded}
      />

      {/* Main row: play + waveform + mic */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {/* Play / Pause */}
        <button onClick={toggle} style={{
          width:38, height:38, borderRadius:'50%', flexShrink:0,
          border:'none', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          background: btnBg, transition:'opacity 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
          {playing
            ? <svg width="11" height="13" viewBox="0 0 11 13" fill="white"><rect x="0" y="0" width="3.5" height="13" rx="1.2"/><rect x="7.5" y="0" width="3.5" height="13" rx="1.2"/></svg>
            : <svg width="12" height="13" viewBox="0 0 12 13" fill="white" style={{ marginLeft:2 }}><polygon points="0,0 12,6.5 0,13"/></svg>
          }
        </button>

        {/* Waveform + time */}
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:5 }}>
          <div onClick={onSeek} style={{ display:'flex', alignItems:'center', gap:2, height:30, cursor:'pointer', paddingTop:2 }}>
            {BARS.map((h, i) => (
              <div key={i} style={{
                flex:1, height:`${h}px`, borderRadius:3,
                background: (i / BARS.length * 100) < progress ? onCol : offCol,
                transition:'background 0.07s',
              }} />
            ))}
          </div>
          <div style={{ fontSize:11, fontFamily:'Inter', fontVariantNumeric:'tabular-nums', color: timeCol, lineHeight:1 }}>
            {playing || current > 0 ? fmt(current) : fmt(duration)}
          </div>
        </div>

        {/* Mic icon */}
        <svg width="15" height="15" viewBox="0 0 24 24" style={{ flexShrink:0, alignSelf:'flex-end', marginBottom:2, opacity:0.5 }}
          fill="none" stroke={isUser ? 'var(--muted)' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="12" rx="3"/>
          <path d="M5 10a7 7 0 0 0 14 0"/>
          <line x1="12" y1="20" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </div>

      {/* Transcript below player */}
      {transcript && (
        <div style={{
          marginTop:7, paddingTop:7,
          borderTop: `1px solid ${isUser ? 'var(--rule)' : 'rgba(255,255,255,0.2)'}`,
          fontSize:11.5, lineHeight:1.45, fontStyle:'italic',
          color: isUser ? 'var(--muted)' : 'rgba(255,255,255,0.85)',
        }}>
          "{transcript}"
        </div>
      )}
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

// Extract image/media tags from message content
function parseImgTag(content) {
  const empty = { product: null, imgUrl: null, allImages: null, uploadedImg: null, uploadedDoc: null, audioSrc: null, audioTranscript: null, videoSrc: null };
  // Customer voice note: [media-audio:data:...][audio-transcript:text]
  if (content?.startsWith('[media-audio:')) {
    const closeIdx = content.indexOf(']');
    const audioSrc = closeIdx > -1 ? content.slice('[media-audio:'.length, closeIdx) : null;
    const afterAudio = closeIdx > -1 ? content.slice(closeIdx + 1) : '';
    const transcriptMatch = afterAudio.match(/\[audio-transcript:([^\]]+)\]/);
    const audioTranscript = transcriptMatch ? transcriptMatch[1] : null;
    return { ...empty, text: afterAudio.replace(/\[audio-transcript:[^\]]+\]/, '').trim(), audioSrc, audioTranscript };
  }
  // Customer video: [media-video:data:video/...;base64,...]
  if (content?.includes('[media-video:')) {
    const start = content.indexOf('[media-video:') + '[media-video:'.length;
    const end = content.indexOf(']', start);
    const videoSrc = end > -1 ? content.slice(start, end) : null;
    const text = content.replace(/\s*\[media-video:[^\]]+\]/, '').trim();
    return { ...empty, text, videoSrc };
  }
  // Image (from CRM upload OR from customer): [media-img:URL]
  const uploadedImg = content?.match(/\[media-img:([^\]]+)\]/);
  if (uploadedImg) {
    return { ...empty, text: content.replace(/\s*\[media-img:[^\]]+\]/, '').trim(), uploadedImg: uploadedImg[1] };
  }
  // Document: [media-doc:FILENAME:URL]
  const uploadedDoc = content?.match(/\[media-doc:([^:]+):([^\]]+)\]/);
  if (uploadedDoc) {
    return { ...empty, text: content.replace(/\s*\[media-doc:[^\]]+\]/, '').trim(), uploadedDoc: { name: uploadedDoc[1], url: uploadedDoc[2] } };
  }
  // Product image: [img:ProductName]
  const match = content?.match(/\[img:([^\]]+)\]/);
  const product = match ? match[1] : null;
  const isAll = product === 'all-products';
  return {
    ...empty,
    text: content?.replace(/\s*\[img:[^\]]+\]/g, '').trim() || '',
    product: isAll ? null : product,
    imgUrl: (product && !isAll) ? PRODUCT_IMG_MAP[product] : null,
    allImages: isAll ? Object.entries(PRODUCT_IMG_MAP) : null,
  };
}

const LABEL_DEFS = [
  { key:'hot',      label:'🔥 Hot Lead',        color:'#92400e', bg:'#fef3c7' },
  { key:'payment',  label:'💳 Payment Pending',  color:'#1e40af', bg:'#dbeafe' },
  { key:'cod',      label:'📦 COD Order',        color:'#065f46', bg:'#d1fae5' },
  { key:'followup', label:'📞 Follow-up',        color:'#6d28d9', bg:'#ede9fe' },
  { key:'vip',      label:'⭐ VIP',              color:'#92400e', bg:'#fef9c3' },
];

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
  const [pendingFile, setPendingFile] = useState(null); // { file, previewUrl, type }
  const fileInputRef = useRef(null);
  const [replyTo, setReplyTo] = useState(null); // { wamid, content, role }
  const [editingMsg, setEditingMsg] = useState(null); // { index, wamid, text }
  const [editText, setEditText] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [convFilter, setConvFilter] = useState('all'); // all | unread | paused | payment
  const [labelModal, setLabelModal] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesTab, setNotesTab] = useState(false); // show notes tab in right panel
  const [templateModal, setTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null); // { index, title, body } | null
  const [msgSearch, setMsgSearch] = useState('');
  const [msgSearchOpen, setMsgSearchOpen] = useState(false);
  const [aiSummaryModal, setAiSummaryModal] = useState(false);
  const [aiSummaryData, setAiSummaryData] = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryFilter, setAiSummaryFilter] = useState('all');
  // seenCounts: { [phone]: lastSeenCustomerMsgCount } — persisted in localStorage
  const [seenCounts, setSeenCounts] = useState(() => {
    try {
      // v2 key — wipes old inflated counts from before the user-only message fix
      return JSON.parse(localStorage.getItem('wa_seen_v2') || '{}');
    } catch { return {}; }
  });
  const [showTyping, setShowTyping] = useState(false);
  const typingTimerRef = useRef(null);
  const [convLoading, setConvLoading] = useState(true);
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
      setConvLoading(false);
      // If a conversation is currently open, mark it as seen immediately so badge stays 0
      if (selectedPhoneRef.current) {
        const active = data.find(c => c.phone === selectedPhoneRef.current);
        if (active) markSeen(active.phone, active.messageCount);
      }
    } catch (e) {
      setConvLoading(false);
      console.error('[loadConvs]', e?.response?.status, e?.response?.data || e?.message);
    }
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

  const saveNotes = async (phone, text) => {
    setNotesSaving(true);
    try { await api.patch(`/wa/${phone}/notes`, { notes: text }); }
    catch { addToast('Failed to save notes', 'error'); }
    finally { setNotesSaving(false); }
  };

  const saveLabels = async (phone, labels) => {
    try {
      await api.patch(`/wa/${phone}/labels`, { labels });
      setConvs(prev => prev.map(c => c.phone === phone ? { ...c, labels } : c));
      if (selected?.phone === phone) setSelected(prev => ({ ...prev, labels }));
    } catch { addToast('Failed to save label', 'error'); }
  };

  const saveEdit = async () => {
    if (!editText.trim() || !editingMsg) return;
    setEditSaving(true);
    try {
      await api.patch(`/wa/${selected.phone}/messages/edit`, {
        wamid: editingMsg.wamid,
        msgIndex: editingMsg.index,
        newText: editText.trim(),
      });
      setMessages(prev => prev.map((m, i) =>
        i === editingMsg.index ? { ...m, content: editText.trim() + ' *(edited)*' } : m
      ));
      setEditingMsg(null);
      addToast('Message edited');
    } catch { addToast('Failed to edit', 'error'); }
    finally { setEditSaving(false); }
  };

  const selectConv = async (conv) => {
    selectedPhoneRef.current = conv.phone;
    msgCountRef.current = 0;
    setSelected(conv);
    setReplyTo(null);
    setNotesText(conv.notes || '');
    setMsgSearch('');
    setMsgSearchOpen(false);
    setNotesTab(false);
    setEditingMsg(null);
    setEditText('');
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

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { addToast('File too large — max 10MB', 'error'); e.target.value = ''; return; }
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setPendingFile({ file, previewUrl, type: file.type.startsWith('image/') ? 'image' : 'document' });
    e.target.value = '';
  };

  const sendMedia = async () => {
    if (!pendingFile || !selected) return;
    setSending(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(pendingFile.file);
      });
      const base64 = dataUrl.split(',')[1];
      const caption = manualMsg.trim();

      await api.post('/wa/send-media', {
        phone: selected.phone,
        fileBase64: base64,
        fileName: pendingFile.file.name,
        mimeType: pendingFile.file.type,
        caption: caption || undefined,
      });

      // Add immediately to local chat using the data URL so image shows right away
      const isImg = pendingFile.file.type.startsWith('image/');
      const marker = isImg
        ? `[media-img:${dataUrl}]`
        : `[media-doc:${pendingFile.file.name}:${dataUrl}]`;
      const msgContent = caption ? `${caption} ${marker}` : marker;
      setMessages(prev => [...prev, { role: 'assistant', content: msgContent, timestamp: new Date().toISOString() }]);

      setPendingFile(null);
      setManualMsg('');
      addToast('Media sent');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to send media', 'error');
    } finally {
      setSending(false);
    }
  };

  const sendManual = async () => {
    if (!manualMsg.trim()) return;
    setSending(true);
    try {
      await api.post('/wa/send', { phone:selected.phone, message:manualMsg, replyToWamid: replyTo?.wamid });
      setManualMsg('');
      setReplyTo(null);
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

  const fetchAiSummary = async () => {
    setAiSummaryLoading(true);
    setAiSummaryData(null);
    setAiSummaryModal(true);
    setAiSummaryFilter('all');
    try {
      const { data } = await api.post('/wa/ai-summary', {}, { timeout: 60000 });
      setAiSummaryData(data);
    } catch (err) {
      addToast(err.response?.data?.message || 'AI summary failed', 'error');
      setAiSummaryModal(false);
    } finally {
      setAiSummaryLoading(false);
    }
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
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.02em', color:'var(--fg)' }}>WhatsApp</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>Customer conversations via WhatsApp Business API</div>
        </div>
        <button onClick={fetchAiSummary} className="btn-secondary"
          style={{ display:'flex', alignItems:'center', gap:7, flexShrink:0, fontSize:12.5 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          AI Lead Summary
        </button>
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
          <div style={{ padding:'8px 12px', borderBottom:'1px solid var(--rule)', flexShrink:0 }}>
            <input type="text" className="input" placeholder="Search conversations…" value={searchFilter} onChange={e => setSearchFilter(e.target.value.toLowerCase())} style={{ fontSize:12 }} />
          </div>
          {/* Filter tabs */}
          <div style={{ display:'flex', gap:4, padding:'8px 12px', borderBottom:'1px solid var(--rule)', flexShrink:0, flexWrap:'wrap' }}>
            {[
              { key:'all', label:'All' },
              { key:'unread', label:'Unread' },
              { key:'paused', label:'Paused' },
              { key:'payment', label:'💰 Payment' },
            ].map(f => {
              const count = f.key === 'all' ? convs.length
                : f.key === 'unread' ? convs.filter(c => (c.messageCount||0) > (seenCounts[c.phone]||0)).length
                : f.key === 'paused' ? convs.filter(c => c.botPaused).length
                : convs.filter(c => c.paymentClaimed).length;
              return (
                <button key={f.key} onClick={() => setConvFilter(f.key)}
                  className="wa-filter-tab"
                  style={{ padding:'3px 9px', borderRadius:999, fontSize:11, fontWeight:500, cursor:'pointer', border:`1px solid ${convFilter===f.key?'var(--accent)':'var(--rule)'}`, background:convFilter===f.key?'var(--accent-bg)':'transparent', color:convFilter===f.key?'var(--accent)':'var(--muted)' }}>
                  {f.label} {count > 0 && <span style={{ opacity:0.7 }}>({count})</span>}
                </button>
              );
            })}
          </div>
          {convLoading && (
            <div style={{ padding:24, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
              <span style={{ width:20, height:20, border:'2px solid var(--rule)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />
              <span style={{ fontSize:11, color:'var(--faint)' }}>Loading conversations…</span>
            </div>
          )}
          {!convLoading && convs.length===0 && (
            <div style={{ padding:24, textAlign:'center', color:'var(--faint)', fontSize:12 }}>No conversations yet</div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:6, padding:'10px 12px', overflow:'auto', flex:1 }}>
          {convs.filter(c => {
            if (searchFilter && !c.name.toLowerCase().includes(searchFilter) && !c.phone.includes(searchFilter)) return false;
            if (convFilter === 'unread') return (c.messageCount||0) > (seenCounts[c.phone]||0);
            if (convFilter === 'paused') return c.botPaused;
            if (convFilter === 'payment') return c.paymentClaimed;
            return true;
          }).map(c=>{
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
                  {c.lastMessage
                    ?.replace(/\s*\[img:[^\]]+\]/g, '')
                    ?.replace(/\s*\[media-img:data:[^\]]{0,9999999}\]/g, '📷 Image')
                    ?.replace(/\s*\[media-video:data:[^\]]{0,9999999}\]/g, '🎥 Video')
                    ?.replace(/\s*\[media-doc:[^:]+:data:[^\]]{0,9999999}\]/g, '📄 Document')
                    ?.replace(/\s*\[media-img:[^\]]+\]/g, '📷 Image')
                    ?.replace(/\s*\[media-video:[^\]]+\]/g, '🎥 Video')
                    ?.replace(/\s*\[media-doc:[^\]]+\]/g, '📄 Document')
                    || '—'}
                </div>
                {c.labels?.length > 0 && (
                  <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginTop:3 }}>
                    {c.labels.map(l => {
                      const LDEF = LABEL_DEFS.find(d=>d.key===l);
                      return <span key={l} style={{ fontSize:9.5, padding:'1px 6px', borderRadius:999, background: LDEF?.bg||'var(--hover)', color: LDEF?.color||'var(--muted)', fontWeight:600 }}>{LDEF?.label||l}</span>;
                    })}
                  </div>
                )}
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
                className="icon-btn"
                style={{ width:24, height:24, borderRadius:6 }}
                onMouseEnter={e=>{ e.currentTarget.style.color='var(--danger)'; e.currentTarget.style.background='var(--danger-bg)'; e.currentTarget.style.borderColor='transparent'; }}
                onMouseLeave={e=>{ e.currentTarget.style.color=''; e.currentTarget.style.background=''; e.currentTarget.style.borderColor=''; }}
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
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ fontSize:11, color:'var(--faint)', fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>+{selected.phone}</span>
                  <button title="Copy phone" onClick={() => { navigator.clipboard.writeText('+'+selected.phone); addToast('Phone copied'); }}
                    className="icon-btn" style={{ width:22, height:22, borderRadius:6 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                </div>
              </div>
              {/* Message search */}
              <button title="Search messages" onClick={() => { setMsgSearchOpen(o=>!o); setMsgSearch(''); }}
                className={`icon-btn${msgSearchOpen?' active':''}`} style={{ width:30, height:30 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
              {/* Labels button */}
              <button title="Add label" onClick={() => setLabelModal(true)}
                className={`icon-btn${selected?.labels?.length?'  active':''}`} style={{ width:30, height:30 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              </button>
              {/* Payment confirm */}
              {convs.find(c=>c.phone===selected.phone)?.paymentClaimed && (
                <button onClick={confirmPayment} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, background:'#fef08a', color:'#854d0e', fontSize:11.5, fontWeight:600, border:'none', cursor:'pointer' }}>
                  💰 Confirm payment
                </button>
              )}
              <span className={`chip ${botPaused?'chip-warn':'chip-ok'}`} style={{ fontSize:10 }}>
                {botPaused?'Bot paused':'Bot active'}
              </span>
              <button className="btn-secondary" onClick={toggleBot} title={botPaused ? 'Resume automatic bot replies' : 'Pause bot and reply manually'} style={{ fontSize:11.5 }}>
                {botPaused?'Resume bot':'Take over'}
              </button>
            </div>
            {/* Message search bar */}
            {msgSearchOpen && (
              <div style={{ padding:'8px 14px', borderBottom:'1px solid var(--rule)', background:'var(--card)', flexShrink:0 }}>
                <input autoFocus className="input" placeholder="Search in conversation…" value={msgSearch} onChange={e=>setMsgSearch(e.target.value)} style={{ fontSize:12, width:'100%' }} />
              </div>
            )}

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

              {(() => {
                const filtered = msgSearch
                  ? messages.filter(m => (m.content||'').toLowerCase().includes(msgSearch.toLowerCase()))
                  : messages;
                let lastDate = '';
                return filtered.map((m,i) => {
                const { text, product, imgUrl, allImages, uploadedImg, uploadedDoc, audioSrc, audioTranscript, videoSrc } = parseImgTag(m.content);
                const isUser = m.role === 'user';
                const previewText = text || (uploadedImg ? '📷 Image' : videoSrc ? '🎥 Video' : uploadedDoc ? `📄 ${uploadedDoc.name}` : audioSrc ? '🎤 Voice note' : '');
                const msgDate = m.timestamp ? format(new Date(m.timestamp), 'yyyy-MM-dd') : '';
                const isNewDate = msgDate && msgDate !== lastDate;
                if (isNewDate) lastDate = msgDate;
                const getDateLabel = () => {
                  const d = new Date(m.timestamp);
                  const today = new Date(); const yest = new Date(); yest.setDate(today.getDate()-1);
                  return d.toDateString()===today.toDateString() ? 'Today' : d.toDateString()===yest.toDateString() ? 'Yesterday' : format(d,'dd MMM yyyy');
                };
                return (
                  <div key={i} style={{ display:'flex', flexDirection:'column', gap:0 }}>
                  {isNewDate && <div style={{ textAlign:'center', margin:'8px 0 4px' }}><span style={{ fontSize:10.5, color:'var(--faint)', background:'var(--card)', border:'1px solid var(--rule)', borderRadius:999, padding:'2px 10px', fontFamily:'Inter' }}>{getDateLabel()}</span></div>}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:isUser?'flex-start':'flex-end', gap:3 }} className="msg-row">
                    {/* Reply button — appears on hover via CSS */}
                    {/* Bubble + inline reply button on hover */}
                    <div className="bubble-wrap" style={{ display:'flex', alignItems:'flex-end', gap:5, flexDirection: isUser ? 'row' : 'row-reverse', maxWidth:'75%' }}>
                      <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
                        <button className="reply-btn" onClick={() => { setReplyTo({ wamid: m.wamid||null, content: previewText, role: m.role }); setTimeout(()=>document.querySelector('input[placeholder*="reply"]')?.focus(),50); }}
                          title="Reply" style={{ opacity:0, transition:'opacity 0.15s', background:'var(--card)', border:'1px solid var(--rule)', borderRadius:'50%', width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--muted)' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                        </button>
                        {!isUser && (
                          <button className="reply-btn" onClick={() => { setEditingMsg({ index: i, wamid: m.wamid||null }); setEditText((m.content||'').replace(/ \*\(edited\)\*$/, '')); }}
                            title="Edit message" style={{ opacity:0, transition:'opacity 0.15s', background:'var(--card)', border:'1px solid var(--rule)', borderRadius:'50%', width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--muted)' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                        )}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:3, alignItems: isUser ? 'flex-start' : 'flex-end', minWidth:0, flex:1 }}>
                    {/* Voice note player */}
                    {audioSrc && <VoiceNote src={audioSrc} isUser={isUser} transcript={audioTranscript} />}
                    {/* Customer video */}
                    {videoSrc && (
                      <div style={{ borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.15)' }}>
                        <video controls style={{ width:'100%', maxHeight:300, display:'block', background:'#000' }}>
                          <source src={videoSrc} />
                        </video>
                      </div>
                    )}
                    {/* Inline edit mode */}
                    {editingMsg?.index === i ? (
                      <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:6 }}>
                        <textarea autoFocus value={editText} onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key==='Escape') setEditingMsg(null); }}
                          style={{ padding:'8px 12px', borderRadius:12, border:'2px solid var(--accent)', background:'var(--card)', color:'var(--fg)', fontSize:13.5, lineHeight:1.5, resize:'none', fontFamily:'inherit', minWidth:180, outline:'none', boxShadow:'0 0 0 3px rgba(61,138,92,.12)' }}
                          rows={Math.min(6, editText.split('\n').length + 1)} />
                        <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                          <button onClick={() => setEditingMsg(null)} className="btn-secondary" style={{ fontSize:11, padding:'4px 10px' }}>Cancel</button>
                          <button onClick={saveEdit} disabled={editSaving} className="btn-primary" style={{ fontSize:11, padding:'4px 10px' }}>
                            {editSaving ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                        <div style={{ fontSize:10.5, color:'var(--faint)', textAlign:'right' }}>Enter to save · Esc to cancel</div>
                      </div>
                    ) : (
                    /* Text bubble */
                    text && (
                      <div style={{
                        padding:'8px 12px', borderRadius:isUser?'2px 14px 14px 14px':'14px 2px 14px 14px',
                        background:isUser?'var(--bg)':'var(--accent)',
                        color:isUser?'var(--fg)':'var(--accent-ink)',
                        fontSize:13.5, lineHeight:1.5,
                        border: isUser?'1px solid var(--rule-strong)':'none',
                        whiteSpace:'pre-wrap', wordBreak:'break-word',
                        boxShadow: isUser ? '0 1px 3px rgba(37,35,32,.08)' : '0 1px 2px rgba(61,138,92,.15)',
                      }}>
                        <WaText text={text} />
                      </div>
                    ))}
                    {/* Single product image */}
                    {imgUrl && (
                      <div style={{ maxWidth:'78%', borderRadius:14, overflow:'hidden', border: isUser ? '1px solid var(--rule)' : 'none', boxShadow: isUser ? 'var(--shadow-card)' : '0 1px 3px rgba(61,138,92,.1)' }}>
                        <img src={imgUrl.url} alt={product} style={{ width:'100%', height:'auto', display:'block', objectFit:'contain', background:'#fff' }} />
                        {imgUrl.caption && (
                          <div style={{ padding:'9px 11px', background:'#1a1a1a', fontSize:12.5, color:'#e0e0e0', whiteSpace:'pre-wrap', wordBreak:'break-all', lineHeight:1.5 }}>
                            <WaText text={imgUrl.caption} />
                          </div>
                        )}
                      </div>
                    )}
                    {/* Manually uploaded image */}
                    {uploadedImg && (
                      <div style={{ maxWidth:'78%', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.15)' }}>
                        <img src={uploadedImg} alt="sent" style={{ width:'100%', height:'auto', display:'block', objectFit:'contain', background:'#fff' }} />
                      </div>
                    )}
                    {/* Manually uploaded document */}
                    {uploadedDoc && (
                      <a href={uploadedDoc.url} target="_blank" rel="noreferrer" style={{ maxWidth:'78%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--card)', border:'1px solid var(--rule)', borderRadius:12, textDecoration:'none', boxShadow:'0 1px 3px rgba(0,0,0,.08)' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <div>
                          <div style={{ fontSize:12.5, fontWeight:600, color:'var(--fg)' }}>{uploadedDoc.name}</div>
                          <div style={{ fontSize:11, color:'var(--muted)' }}>Tap to open</div>
                        </div>
                      </a>
                    )}
                    {/* All product images */}
                    {allImages && allImages.map(([name, img]) => (
                      <div key={name} style={{ maxWidth:'78%', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(61,138,92,.1)' }}>
                        <img src={img.url} alt={name} style={{ width:'100%', height:'auto', display:'block', objectFit:'contain', background:'#fff' }} />
                        {img.caption && (
                          <div style={{ padding:'9px 11px', background:'#1a1a1a', fontSize:12.5, color:'#e0e0e0', whiteSpace:'pre-wrap', wordBreak:'break-all', lineHeight:1.5 }}>
                            <WaText text={img.caption} />
                          </div>
                        )}
                      </div>
                    ))}
                    <div style={{ fontSize:11, color:'var(--faint)', fontFamily:'Inter', fontVariantNumeric:'tabular-nums', marginTop:1 }}>
                      {timeStr(m.timestamp)}
                    </div>
                      </div>
                    </div>
                  </div>
                  </div>
                );
              });
              })()}
              {/* Typing indicator */}
              {showTyping && (
                <div style={{ display:'flex', alignItems:'flex-start', gap:3 }}>
                  <div style={{ padding:'10px 14px', borderRadius:'2px 14px 14px 14px', background:'var(--card)', border:'1px solid var(--rule)', display:'flex', gap:4, alignItems:'center' }}>
                    <span className="typing-dot" /><span className="typing-dot" style={{ animationDelay:'0.15s' }} /><span className="typing-dot" style={{ animationDelay:'0.3s' }} />
                  </div>
                </div>
              )}
              <div ref={msgEndRef} />
            </div>

            {/* Input */}
            <div style={{ borderTop:'1px solid var(--rule)', flexShrink:0, background:'var(--card)' }}>
              {/* Smart quick reply templates */}
              {showTemplates && botPaused && (() => {
                const lastCustomerMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
                const ranked = rankTemplates(lastCustomerMsg, templates);
                return (
                  <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--rule)', display:'flex', flexDirection:'column', gap:8, maxHeight:280, overflowY:'auto' }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>
                      ⚡ Quick replies
                      {lastCustomerMsg && <span style={{ fontWeight:400, textTransform:'none', marginLeft:6, color:'var(--faint)', fontSize:'10.5px' }}>sorted by relevance</span>}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                      {ranked.map((tmpl, i) => {
                        const isBest = i===0&&lastCustomerMsg;
                        return (
                          <button key={tmpl.id} onClick={() => { setManualMsg(tmpl.text); setShowTemplates(false); }}
                            style={{
                              textAlign:'left', padding:'10px 11px', borderRadius:10,
                              border:`1px solid ${isBest?'var(--accent)':'var(--rule)'}`,
                              background: isBest?'var(--accent-bg)':'var(--bg)',
                              cursor:'pointer', transition:'all 0.12s',
                              display:'flex', flexDirection:'column', gap:4
                            }}
                            onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--accent)'; if(!isBest) e.currentTarget.style.background='var(--hover)'; }}
                            onMouseLeave={e=>{ e.currentTarget.style.borderColor=isBest?'var(--accent)':'var(--rule)'; if(!isBest) e.currentTarget.style.background='var(--bg)'; }}>
                            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                              <span style={{ fontSize:11.5, fontWeight:600, color: isBest?'var(--accent)':'var(--fg)', flex:1 }}>{tmpl.label}</span>
                              {isBest&&<span style={{ fontSize:8.5, padding:'2px 6px', borderRadius:999, background:'var(--accent)', color:'#fff', fontWeight:700, whiteSpace:'nowrap' }}>BEST</span>}
                            </div>
                            <div style={{ fontSize:11, color:'var(--faint)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.3 }}>{tmpl.text.slice(0, 80)}…</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:8 }}>
              {botPaused ? (
                <>
                  {/* Reply preview bar */}
                  {replyTo && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'var(--accent-bg)', borderLeft:'3px solid var(--accent)', borderRadius:'0 8px 8px 0', margin:'0 0 4px 0' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:10.5, fontWeight:600, color:'var(--accent)', marginBottom:1 }}>{replyTo.role === 'user' ? 'Customer' : 'You'}</div>
                        <div style={{ fontSize:12, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{replyTo.content.slice(0,80)}</div>
                      </div>
                      <button onClick={() => setReplyTo(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--faint)', padding:2 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  )}
                  {/* File preview */}
                  {pendingFile && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'var(--accent-bg)', border:'1px solid var(--accent)', borderRadius:9 }}>
                      {pendingFile.previewUrl
                        ? <img src={pendingFile.previewUrl} alt="preview" style={{ width:44, height:44, objectFit:'cover', borderRadius:6, flexShrink:0 }} />
                        : <div style={{ width:44, height:44, background:'var(--hover)', borderRadius:6, display:'grid', placeItems:'center', flexShrink:0 }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          </div>
                      }
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--fg)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pendingFile.file.name}</div>
                        <div style={{ fontSize:11, color:'var(--muted)' }}>{(pendingFile.file.size/1024).toFixed(0)} KB · {pendingFile.type}</div>
                      </div>
                      <button onClick={() => setPendingFile(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--faint)', padding:4, borderRadius:4, flexShrink:0 }}>✕</button>
                    </div>
                  )}
                  <div style={{ display:'flex', gap:8 }}>
                    {/* Hidden file input */}
                    <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" style={{ display:'none' }} onChange={onFileChange} />
                    <button onClick={() => setShowTemplates(s => !s)} title="Quick replies"
                      className={`icon-btn${showTemplates?' active':''}`} style={{ width:34, height:34 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    </button>
                    <button onClick={() => setTemplateModal(true)} title="Manage templates"
                      className="icon-btn" style={{ width:34, height:34 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    {/* Attachment button */}
                    <button onClick={() => fileInputRef.current?.click()} title="Attach image or document"
                      style={{ width:34, height:34, border:'1px solid var(--rule)', borderRadius:8, background: pendingFile?'var(--accent-bg)':'var(--card)', color: pendingFile?'var(--accent)':'var(--muted)', cursor:'pointer', display:'grid', placeItems:'center', flexShrink:0, transition:'all 0.15s' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    </button>
                    <input className="input" style={{ flex:1, fontSize:13 }} placeholder={pendingFile ? 'Add caption (optional)…' : 'Type a reply…'} value={manualMsg} onChange={e=>setManualMsg(e.target.value)}
                      onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault(); pendingFile ? sendMedia() : sendManual();}}} />
                    <button className="btn-primary"
                      onClick={pendingFile ? sendMedia : sendManual}
                      disabled={sending || (!manualMsg.trim() && !pendingFile)}
                      style={{ fontSize:12 }}>
                      {sending?'…':'Send'}
                    </button>
                  </div>
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
        {!isMobile && <div style={{ borderLeft:'1px solid var(--rule)', overflowY:'auto', background:'var(--card)', display:'flex', flexDirection:'column' }}>
          {!selected ? (
            <div style={{ padding:20, color:'var(--faint)', fontSize:12, textAlign:'center', marginTop:40 }}>Select a conversation to see customer details</div>
          ) : (
            <>
            {/* Tab bar */}
            <div style={{ display:'flex', borderBottom:'1px solid var(--rule)', flexShrink:0 }}>
              {['Details','Notes'].map(t => (
                <button key={t} onClick={() => setNotesTab(t==='Notes')}
                  style={{ flex:1, padding:'10px 0', fontSize:12, fontWeight:500, border:'none', borderBottom:`2px solid ${(t==='Notes')===notesTab?'var(--accent)':'transparent'}`, background:'none', color:(t==='Notes')===notesTab?'var(--accent)':'var(--muted)', cursor:'pointer', transition:'all 0.15s' }}>
                  {t}
                </button>
              ))}
            </div>
            {notesTab ? (
              <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:10, flex:1 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--muted)' }}>Private notes — not sent to customer</div>
                <textarea value={notesText} onChange={e=>setNotesText(e.target.value)}
                  placeholder="Write notes about this customer…"
                  className="notes-area"
                  style={{ flex:1, minHeight:200, padding:'10px 12px', borderRadius:9, border:'1px solid var(--rule)', background:'var(--bg)', color:'var(--fg)', fontSize:12.5, lineHeight:1.6, resize:'vertical', fontFamily:'inherit' }} />
                <button onClick={() => saveNotes(selected.phone, notesText)} disabled={notesSaving}
                  className="btn-primary" style={{ fontSize:12, alignSelf:'flex-end' }}>
                  {notesSaving ? 'Saving…' : 'Save notes'}
                </button>
              </div>
            ) : (
            <div style={{ padding:'18px 16px', display:'flex', flexDirection:'column', gap:16, flex:1 }}>
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
                              className="lead-status-btn"
                              style={{
                                padding:'4px 10px', borderRadius:999, fontSize:11, fontWeight:500,
                                border: `1px solid ${active ? tone : 'var(--rule)'}`,
                                background: active ? toneBg : 'transparent',
                                color: active ? tone : 'var(--muted)',
                                cursor: active ? 'default' : 'pointer',
                                opacity: updatingStatus ? 0.6 : 1,
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
            </>
          )}
        </div>}
      </div>

      {/* AI Lead Summary Modal */}
      <Modal open={aiSummaryModal} onClose={() => !aiSummaryLoading && setAiSummaryModal(false)} title="AI Lead Summary" size="lg">
        {aiSummaryLoading ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:'32px 0' }}>
            <div style={{ width:44, height:44, border:'3px solid var(--rule)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            <div style={{ fontSize:14, fontWeight:500, color:'var(--fg)' }}>Analysing conversations…</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>AI is reading all chats and classifying leads. This takes 10–30 seconds.</div>
          </div>
        ) : aiSummaryData && (() => {
          const CATS = [
            { key:'all',          label:'All',           color:'var(--fg)',     bg:'var(--hover)' },
            { key:'hot',          label:'🔥 Hot',         color:'#b45309',       bg:'#fef3c7' },
            { key:'interested',   label:'✅ Interested',  color:'var(--accent)', bg:'var(--accent-bg)' },
            { key:'followup',     label:'📞 Follow up',   color:'#1d4ed8',       bg:'#eff6ff' },
            { key:'not_interested',label:'❌ Not interested', color:'var(--danger)', bg:'var(--danger-bg)' },
            { key:'undecided',    label:'🤔 Undecided',   color:'var(--muted)',  bg:'var(--bg)' },
          ];
          const leads = aiSummaryData.leads || [];
          const counts = leads.reduce((acc, l) => { acc[l.category] = (acc[l.category]||0)+1; return acc; }, {});
          const filtered = aiSummaryFilter === 'all' ? leads : leads.filter(l => l.category === aiSummaryFilter);
          return (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Stats row */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
                {CATS.slice(1).map(c => (
                  <div key={c.key} onClick={() => setAiSummaryFilter(c.key === aiSummaryFilter ? 'all' : c.key)}
                    style={{ padding:'10px 8px', borderRadius:10, textAlign:'center', cursor:'pointer', background:c.bg, border:`1.5px solid ${aiSummaryFilter===c.key ? c.color : 'transparent'}`, transition:'all 0.15s' }}>
                    <div style={{ fontSize:18, fontWeight:700, color:c.color }}>{counts[c.key] || 0}</div>
                    <div style={{ fontSize:10.5, color:c.color, fontWeight:500, marginTop:2 }}>{c.label}</div>
                  </div>
                ))}
              </div>
              {/* Filter tabs */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {CATS.map(c => (
                  <button key={c.key} onClick={() => setAiSummaryFilter(c.key)}
                    style={{ padding:'4px 10px', borderRadius:999, fontSize:11.5, fontWeight:500, cursor:'pointer', border:`1px solid ${aiSummaryFilter===c.key ? c.color : 'var(--rule)'}`, background: aiSummaryFilter===c.key ? c.bg : 'transparent', color: aiSummaryFilter===c.key ? c.color : 'var(--muted)', transition:'all 0.12s' }}>
                    {c.label} {c.key !== 'all' && counts[c.key] ? `(${counts[c.key]})` : c.key === 'all' ? `(${leads.length})` : '(0)'}
                  </button>
                ))}
              </div>
              {/* Lead list */}
              <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:400, overflowY:'auto' }}>
                {filtered.length === 0 && (
                  <div style={{ padding:'24px', textAlign:'center', color:'var(--faint)', fontSize:13 }}>No leads in this category</div>
                )}
                {filtered.map((l, i) => {
                  const cat = CATS.find(c => c.key === l.category) || CATS[0];
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:10, border:'1px solid var(--rule)', background:'var(--card)' }}>
                      <div style={{ width:40, height:40, borderRadius:'50%', background:cat.bg, display:'grid', placeItems:'center', flexShrink:0 }}>
                        <span style={{ fontSize:18 }}>{cat.label.split(' ')[0]}</span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                          <span style={{ fontSize:13, fontWeight:600, color:'var(--fg)' }}>{l.name}</span>
                          <span style={{ fontSize:10, color:'var(--faint)', fontFamily:'Inter' }}>+{l.phone}</span>
                        </div>
                        <div style={{ fontSize:12, color:'var(--muted)', marginBottom:3 }}>{l.reason}</div>
                        <div style={{ fontSize:11, fontWeight:600, color:cat.color, background:cat.bg, display:'inline-block', padding:'2px 8px', borderRadius:999 }}>→ {l.action}</div>
                      </div>
                      <button onClick={() => {
                        const normalize = p => String(p).replace(/\D/g,'').slice(-10);
                        const conv = convs.find(c => normalize(c.phone) === normalize(l.phone));
                        if(conv) { selectConv(conv); setAiSummaryModal(false); }
                        else addToast('Conversation not found','error');
                      }}
                        style={{ padding:'5px 10px', borderRadius:7, border:'1px solid var(--rule)', background:'var(--bg)', color:'var(--fg)', cursor:'pointer', fontSize:11.5, fontWeight:500, flexShrink:0, transition:'all 0.12s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.color='var(--accent)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor='var(--rule)'; e.currentTarget.style.color='var(--fg)'; }}>
                        Open chat
                      </button>
                    </div>
                  );
                })}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--rule)', paddingTop:12 }}>
                <div style={{ fontSize:11.5, color:'var(--faint)' }}>Analysed {aiSummaryData.total} conversations</div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn-secondary" onClick={fetchAiSummary} style={{ fontSize:12 }}>Refresh</button>
                  <button className="btn-secondary" onClick={() => setAiSummaryModal(false)} style={{ fontSize:12 }}>Close</button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

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
                <div style={{ fontSize:11, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8 }}>Quick templates</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, maxHeight:200, overflowY:'auto' }}>
                  {templates.map(t => (
                    <button key={t.id} onClick={() => setBroadcastMsg(t.text)}
                      style={{
                        textAlign:'left', padding:'10px 11px', borderRadius:10, border:'1px solid var(--rule)',
                        background:'var(--bg)', cursor:'pointer', transition:'all 0.12s',
                        display:'flex', flexDirection:'column', gap:4
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.background='var(--accent-bg)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--rule)'; e.currentTarget.style.background='var(--bg)'; }}>
                      <span style={{ fontWeight:600, color:'var(--fg)', fontSize:11.5 }}>{t.label}</span>
                      <span style={{ color:'var(--faint)', fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.text.slice(0, 70)}…</span>
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
      {/* Label Modal */}
      <Modal open={labelModal} onClose={() => setLabelModal(false)} title="Conversation Labels" size="sm">
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ fontSize:12, color:'var(--muted)' }}>Select labels for {selected?.name}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {LABEL_DEFS.map(l => {
              const active = selected?.labels?.includes(l.key);
              return (
                <button key={l.key} onClick={async () => {
                  const cur = selected?.labels || [];
                  const next = active ? cur.filter(x=>x!==l.key) : [...cur, l.key];
                  await saveLabels(selected.phone, next);
                }}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:9, border:`1.5px solid ${active?l.color:'var(--rule)'}`, background:active?l.bg:'var(--bg)', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                  <span style={{ fontSize:15 }}>{l.label.split(' ')[0]}</span>
                  <span style={{ fontSize:13, fontWeight:500, color:active?l.color:'var(--fg)', flex:1 }}>{l.label.slice(l.label.indexOf(' ')+1)}</span>
                  {active && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={l.color} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
              );
            })}
          </div>
          <button className="btn-secondary" onClick={() => setLabelModal(false)} style={{ alignSelf:'flex-end', fontSize:12 }}>Done</button>
        </div>
      </Modal>

      {/* Template Manager Modal */}
      <Modal open={templateModal} onClose={() => { setTemplateModal(false); setEditingTemplate(null); }} title="Quick Reply Templates" size="lg">
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {editingTemplate !== null ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div>
                <label className="label">Template title</label>
                <input className="input" value={editingTemplate.title} onChange={e=>setEditingTemplate(t=>({...t,title:e.target.value}))} />
              </div>
              <div>
                <label className="label">Message text</label>
                <textarea className="input" rows={4} value={editingTemplate.body} onChange={e=>setEditingTemplate(t=>({...t,body:e.target.value}))} style={{ resize:'vertical', lineHeight:1.5 }} />
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button className="btn-secondary" onClick={() => setEditingTemplate(null)} style={{ fontSize:12 }}>Cancel</button>
                <button className="btn-primary" onClick={() => {
                  if (!editingTemplate.title.trim() || !editingTemplate.body.trim()) return;
                  const updated = [...templates];
                  if (editingTemplate.index === -1) {
                    updated.push({ id: Date.now(), title: editingTemplate.title, text: editingTemplate.body });
                  } else {
                    updated[editingTemplate.index] = { ...updated[editingTemplate.index], title: editingTemplate.title, text: editingTemplate.body };
                  }
                  setTemplates(updated);
                  localStorage.setItem('wa_templates', JSON.stringify(updated));
                  setEditingTemplate(null);
                }} style={{ fontSize:12 }}>Save</button>
              </div>
            </div>
          ) : (
            <>
              <button className="btn-secondary" onClick={() => setEditingTemplate({ index:-1, title:'', body:'' })} style={{ alignSelf:'flex-start', fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add template
              </button>
              <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:400, overflowY:'auto' }}>
                {templates.map((t, idx) => (
                  <div key={t.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px', borderRadius:9, border:'1px solid var(--rule)', background:'var(--bg)' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12.5, fontWeight:600, color:'var(--fg)', marginBottom:3 }}>{t.title}</div>
                      <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.45, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.text}</div>
                    </div>
                    <button onClick={() => setEditingTemplate({ index:idx, title:t.title, body:t.text })}
                      style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', padding:4 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => {
                      const updated = templates.filter((_,i)=>i!==idx);
                      setTemplates(updated);
                      localStorage.setItem('wa_templates', JSON.stringify(updated));
                    }} style={{ background:'none', border:'none', color:'var(--danger)', cursor:'pointer', padding:4 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>

      <style>{`
        .bubble-wrap:hover .reply-btn { opacity: 1 !important; }
        .typing-dot { width:7px; height:7px; border-radius:50%; background:var(--muted); display:inline-block; animation:typingPulse 1s ease-in-out infinite; }
        @keyframes typingPulse { 0%,60%,100%{transform:translateY(0);opacity:0.4} 30%{transform:translateY(-5px);opacity:1} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
