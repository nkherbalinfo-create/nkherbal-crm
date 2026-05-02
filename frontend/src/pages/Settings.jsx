import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';
import api from '../utils/api';

const NAV_ITEMS = ['Profile','WooCommerce','WhatsApp Bot','Appearance'];

function Card({ title, subtitle, children }) {
  return (
    <div className="card" style={{ marginBottom:14 }}>
      <div style={{ borderBottom:'1px solid var(--rule)', paddingBottom:14, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:600, color:'var(--fg)' }}>{title}</div>
        {subtitle&&<div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:500, color:'var(--faint)', marginBottom:5 }}>{label}</div>
      <div style={{ background:'var(--bg)', borderRadius:9, padding:'9px 12px', fontSize:12.5, color:'var(--fg)' }}>{value||'—'}</div>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const { addToast } = useToast();
  const [activeNav, setActiveNav] = useState('Profile');
  const [wc, setWc] = useState({ url:'', key:'', secret:'' });
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const initials = (user?.name||user?.email||'U').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();

  const saveWC = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/settings/woocommerce',wc); addToast('WooCommerce credentials saved'); }
    catch (err) { addToast(err.response?.data?.message||'Save failed','error'); }
    finally { setSaving(false); }
  };

  const syncNow = async () => {
    setSyncing(true);
    try { const { data }=await api.post('/sync/woocommerce',{}); addToast(data.message); }
    catch (err) { addToast(err.response?.data?.message||'Sync failed','error'); }
    finally { setSyncing(false); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.02em', color:'var(--fg)' }}>Settings</div>
        <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>Manage your account and integrations</div>
      </div>

      <div className="settings-grid" style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:20, alignItems:'start' }}>
        {/* Left nav */}
        <div className="card settings-nav" style={{ padding:8 }}>
          {NAV_ITEMS.map(item=>(
            <button key={item} onClick={()=>setActiveNav(item)}
              style={{ width:'100%', textAlign:'left', padding:'8px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, transition:'background 0.2s ease, color 0.2s ease',
                background: activeNav===item ? 'var(--card)' : 'transparent',
                color: activeNav===item ? 'var(--fg)' : 'var(--muted)',
                boxShadow: activeNav===item ? 'var(--shadow-nav)' : 'none',
              }}>
              {item}
            </button>
          ))}
        </div>

        {/* Right content */}
        <div>
          {activeNav==='Profile' && (
            <Card title="Profile" subtitle="Your account information">
              <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20, paddingBottom:16, borderBottom:'1px solid var(--rule)' }}>
                <div style={{ width:52, height:52, borderRadius:12, background:'var(--accent)', color:'var(--accent-ink)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, flexShrink:0 }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontSize:15, fontWeight:600, color:'var(--fg)' }}>{user?.name||'User'}</div>
                  <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{user?.email}</div>
                  <span className="chip chip-info" style={{ fontSize:10, marginTop:5, display:'inline-flex' }}>Admin</span>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Field label="Full Name" value={user?.name} />
                <Field label="Email Address" value={user?.email} />
                <Field label="Role" value="Administrator" />
                <Field label="Account type" value="NK Herbal CRM" />
              </div>
            </Card>
          )}

          {activeNav==='WooCommerce' && (
            <>
              <Card title="WooCommerce Integration" subtitle="Connect your store for automatic order sync">
                <form onSubmit={saveWC} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div>
                    <label className="label">Store URL</label>
                    <input type="url" className="input" placeholder="https://yourstore.com" value={wc.url} onChange={e=>setWc(w=>({...w,url:e.target.value}))} />
                  </div>
                  <div>
                    <label className="label">Consumer Key</label>
                    <input className="input" placeholder="ck_…" value={wc.key} onChange={e=>setWc(w=>({...w,key:e.target.value}))} />
                  </div>
                  <div>
                    <label className="label">Consumer Secret</label>
                    <div style={{ position:'relative' }}>
                      <input type={showSecret?'text':'password'} className="input" style={{ paddingRight:36 }} placeholder="cs_…" value={wc.secret} onChange={e=>setWc(w=>({...w,secret:e.target.value}))} />
                      <button type="button" onClick={()=>setShowSecret(s=>!s)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--faint)', display:'flex' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, paddingTop:4 }}>
                    <button type="submit" className="btn-primary" disabled={saving} style={{ fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                      {saving?'Saving…':'Save credentials'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={syncNow} disabled={syncing} style={{ fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ animation:syncing?'spin 0.7s linear infinite':'' }}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                      {syncing?'Syncing…':'Sync now'}
                    </button>
                  </div>
                </form>
              </Card>
              <Card title="Auto-sync" subtitle="WooCommerce orders sync automatically every 15 minutes">
                <div style={{ fontSize:12.5, color:'var(--muted)', lineHeight:1.6 }}>
                  The backend automatically pulls new orders from your WooCommerce store every 15 minutes. You can also trigger a manual sync using the "Sync now" button above or from the Orders page.
                </div>
              </Card>
            </>
          )}

          {activeNav==='WhatsApp Bot' && (
            <Card title="WhatsApp Bot" subtitle="AI-powered customer support bot">
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[
                  { label:'API Number', value:'+91 84250 63240' },
                  { label:'Phone Number ID', value:'998868013320666' },
                  { label:'AI Model', value:'Claude 3.5 Haiku via OpenRouter' },
                  { label:'Default language', value:'Hinglish (auto-detects customer language)' },
                  { label:'Bot status', value:'Active — replies automatically' },
                ].map(({label,value})=>(
                  <Field key={label} label={label} value={value} />
                ))}
                <div style={{ background:'var(--accent-bg)', borderRadius:9, padding:'10px 14px', fontSize:12.5, color:'var(--accent)', marginTop:4 }}>
                  ✅ Bot is active. Send "reset bot" on WhatsApp to clear conversation history for any customer.
                </div>
              </div>
            </Card>
          )}

          {activeNav==='Appearance' && (
            <Card title="Appearance" subtitle="Choose your preferred theme">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                {[{key:'light',label:'Light',icon:'☀️'},{key:'dark',label:'Dark',icon:'🌙'},{key:'system',label:'System',icon:'💻'}].map(t=>(
                  <button key={t.key} onClick={()=>{ if(t.key==='system') return; if(theme!==t.key) toggle(); }}
                    style={{ padding:'20px 14px', borderRadius:12, border:`2px solid ${theme===t.key?'var(--accent)':'var(--rule)'}`, background:t.key==='dark'?'#1a1815':t.key==='light'?'#f6f4ee':'var(--card)', cursor:'pointer', textAlign:'center', transition:'border-color 0.2s ease, background 0.2s ease' }}>
                    <div style={{ fontSize:22, marginBottom:8 }}>{t.icon}</div>
                    <div style={{ fontSize:12.5, fontWeight:500, color:theme===t.key?'var(--accent)':'var(--muted)' }}>{t.label}</div>
                    {theme===t.key&&<span className="chip chip-ok" style={{ fontSize:9, marginTop:6, display:'inline-flex' }}>Active</span>}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
