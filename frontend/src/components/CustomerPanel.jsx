import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../utils/api';

function calcScore(lead) {
  if (!lead || lead.status === 'Not Interested') return 0;
  let score = 0;
  score += { WhatsApp:30, Ads:20, Website:20, Referral:15, Direct:10 }[lead.source] || 10;
  score += { Interested:40, 'Follow Up':25, Converted:50 }[lead.status] || 0;
  const days = Math.floor((Date.now() - new Date(lead.date)) / 86400000);
  if (days <= 7) score += 30; else if (days <= 30) score += 20; else if (days <= 60) score += 10;
  return Math.min(100, score);
}

const STATUS_CHIP = { Delivered:'chip-ok', Shipped:'chip-info', Processing:'chip-muted', Cancelled:'chip-danger', RTO:'chip-warn' };
const PAY_CHIP    = { Paid:'chip-ok', COD:'chip-warn', Pending:'chip-danger' };
const inr = (n) => '₹' + Number(n||0).toLocaleString('en-IN');
const fmtDate = (d) => { try { return format(new Date(d), 'dd MMM yy'); } catch { return '—'; } };

function Initials({ name, size = 48 }) {
  const letters = (name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'var(--accent-bg)', color:'var(--accent)', display:'grid', placeItems:'center', fontSize:Math.round(size*0.36), fontWeight:700, flexShrink:0, userSelect:'none' }}>
      {letters}
    </div>
  );
}

export default function CustomerPanel({ mobile, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mobile) return;
    setLoading(true);
    setData(null);
    requestAnimationFrame(() => setVisible(true));
    api.get(`/customers/${mobile}/profile`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [mobile]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  if (!mobile) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position:'fixed', inset:0, zIndex:8000,
        background:'rgba(37,35,32,.28)', backdropFilter:'blur(2px)',
        opacity: visible ? 1 : 0,
        transition:'opacity 0.28s ease',
      }} />

      {/* Panel */}
      <div style={{
        position:'fixed', top:0, right:0, bottom:0,
        width: 420, zIndex:8001,
        background:'var(--card)', borderLeft:'1px solid var(--rule)',
        boxShadow:'-8px 0 40px rgba(37,35,32,.14)',
        display:'flex', flexDirection:'column',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition:'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        overflowY:'auto',
      }}>
        {/* Sticky header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--rule)', flexShrink:0, position:'sticky', top:0, background:'var(--card)', zIndex:1 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--fg)' }}>Customer Profile</div>
          <button onClick={handleClose} style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:7, border:'none', background:'var(--chip)', color:'var(--muted)', cursor:'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background='var(--danger-bg)'; e.currentTarget.style.color='var(--danger)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='var(--chip)'; e.currentTarget.style.color='var(--muted)'; }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:24, height:24, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.6s linear infinite' }} />
          </div>
        )}

        {/* Content */}
        {!loading && data && (
          <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:20 }}>
            {/* Identity */}
            <div style={{ display:'flex', gap:14, alignItems:'center' }}>
              <Initials name={data.customer?.name} size={52} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:17, fontWeight:600, color:'var(--fg)', lineHeight:1.2 }}>{data.customer?.name || '—'}</div>
                <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:3 }}>
                  {data.customer?.mobile}{data.customer?.city ? ` · ${data.customer.city}` : ''}
                </div>
                <span className={`chip ${data.customer?.isRepeat ? 'chip-ok' : 'chip-info'}`} style={{ marginTop:6, display:'inline-flex', fontSize:10 }}>
                  {data.customer?.isRepeat ? 'Repeat Customer' : 'New Customer'}
                </span>
              </div>
            </div>

            {/* Stats grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { label:'Total Orders',   value: data.customer?.totalOrders || data.orders?.length || 0 },
                { label:'Lifetime Value', value: inr(data.customer?.totalRevenue), accent:true },
                { label:'First Order',    value: data.customer?.firstOrderDate ? fmtDate(data.customer.firstOrderDate) : (data.orders?.length ? fmtDate(data.orders[data.orders.length-1]?.orderDate) : '—') },
                { label:'Last Order',     value: data.customer?.lastOrderDate  ? fmtDate(data.customer.lastOrderDate)  : (data.orders?.[0]?.orderDate ? fmtDate(data.orders[0].orderDate) : '—') },
              ].map(({ label, value, accent }) => (
                <div key={label} style={{ background:'var(--bg)', borderRadius:10, padding:'11px 14px' }}>
                  <div style={{ fontSize:10.5, color:'var(--faint)', marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:15, fontWeight:600, color: accent ? 'var(--accent)' : 'var(--fg)', fontFamily:'Inter', fontVariantNumeric:'tabular-nums', lineHeight:1.2 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Last orders */}
            {data.orders?.length > 0 && (
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:9 }}>Recent Orders</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {data.orders.map(o => (
                    <div key={o._id} style={{ background:'var(--bg)', borderRadius:11, padding:'11px 13px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12.5, fontWeight:500, color:'var(--fg)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.productName}</div>
                          <div style={{ fontSize:11, color:'var(--faint)', marginTop:2, fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>
                            {o.orderId} · {o.orderDate ? fmtDate(o.orderDate) : '—'}
                          </div>
                        </div>
                        <div style={{ fontSize:14, fontWeight:700, color:'var(--accent)', fontFamily:'Inter', fontVariantNumeric:'tabular-nums', flexShrink:0 }}>{inr(o.orderValue)}</div>
                      </div>
                      <div style={{ display:'flex', gap:5 }}>
                        <span className={`chip ${STATUS_CHIP[o.orderStatus]||'chip-muted'}`} style={{ fontSize:10 }}>{o.orderStatus}</span>
                        <span className={`chip ${PAY_CHIP[o.paymentStatus]||'chip-muted'}`} style={{ fontSize:10 }}>{o.paymentStatus}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked lead */}
            {data.lead && (
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:9 }}>Lead</div>
                <div style={{ background:'var(--bg)', borderRadius:11, padding:'11px 13px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:11, color:'var(--faint)', fontFamily:'Inter', fontVariantNumeric:'tabular-nums', marginBottom:3 }}>{data.lead.leadId}</div>
                    <div style={{ fontSize:12.5, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{data.lead.source} · {data.lead.interestedProduct}</div>
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                    {(() => {
                      const s = calcScore(data.lead);
                      const label = s >= 65 ? '🔴 Hot' : s >= 35 ? '🟡 Warm' : '🔵 Cold';
                      return <span style={{ fontSize:11 }}>{label}</span>;
                    })()}
                    <span className={`chip ${data.lead.status === 'Converted' ? 'chip-ok' : data.lead.status === 'Interested' ? 'chip-info' : data.lead.status === 'Follow Up' ? 'chip-warn' : 'chip-danger'}`} style={{ fontSize:10 }}>{data.lead.status}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Last WhatsApp messages */}
            {data.lastMessages?.length > 0 && (
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:9 }}>Recent WhatsApp</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {data.lastMessages.map((m, i) => (
                    <div key={i} style={{
                      background: m.role === 'user' ? 'var(--bg)' : 'var(--accent-bg)',
                      borderRadius:10, padding:'8px 12px',
                      alignSelf: m.role === 'user' ? 'flex-start' : 'flex-end',
                      maxWidth:'85%', display:'flex', flexDirection:'column',
                    }}>
                      <div style={{ fontSize:12, color: m.role === 'user' ? 'var(--fg)' : 'var(--accent)', lineHeight:1.4 }}>
                        {m.content?.slice(0, 120)}{m.content?.length > 120 ? '…' : ''}
                      </div>
                      <div style={{ fontSize:10, color:'var(--faint)', marginTop:3, textAlign:'right', fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>
                        {m.timestamp ? fmtDate(m.timestamp) : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div style={{ display:'flex', gap:8, paddingTop:4, paddingBottom:8 }}>
              <button className="btn-primary" style={{ flex:1, justifyContent:'center', display:'flex', alignItems:'center', gap:6 }}
                onClick={() => { handleClose(); navigate('/orders'); }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Order
              </button>
              {data.waPhone && (
                <button className="btn-secondary" style={{ flex:1, justifyContent:'center', display:'flex', alignItems:'center', gap:6 }}
                  onClick={() => { handleClose(); navigate('/whatsapp'); }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 21l1.65-4.5A8 8 0 1112 20a8 8 0 01-3.4-.8L3 21z"/></svg>
                  WhatsApp
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error state */}
        {!loading && !data && (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8, padding:24, color:'var(--faint)' }}>
            <div style={{ fontSize:13 }}>Could not load profile</div>
            <button className="btn-secondary" style={{ fontSize:12 }} onClick={() => {
              setLoading(true);
              api.get(`/customers/${mobile}/profile`).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
            }}>Retry</button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>,
    document.body
  );
}
