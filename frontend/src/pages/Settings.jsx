import { useState } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';
import api from '../utils/api';

const NAV_ITEMS = ['Profile','WooCommerce','WhatsApp Bot','Data','Appearance'];

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
  const { user, updateUser } = useAuth();
  const { theme, toggle } = useTheme();
  const { addToast } = useToast();
  const [activeNav, setActiveNav] = useState('Profile');
  const isMobile = useIsMobile();
  const [wc, setWc] = useState({ url:'', key:'', secret:'' });
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingWaLeads, setSyncingWaLeads] = useState(false);
  const [waLeadResult, setWaLeadResult] = useState(null);

  // Profile edit state
  const [profileForm, setProfileForm] = useState({ name: user?.name||'', email: user?.email||'' });
  const [savingProfile, setSavingProfile] = useState(false);
  // Password change state
  const [pwForm, setPwForm] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [savingPw, setSavingPw] = useState(false);
  const [showPw, setShowPw] = useState({ cur:false, new:false, confirm:false });

  const initials = (user?.name||user?.email||'U').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();

  const saveProfile = async (e) => {
    e.preventDefault(); setSavingProfile(true);
    try {
      const { data } = await api.put('/auth/profile', profileForm);
      updateUser(data.user);
      addToast('Profile updated');
    } catch (err) { addToast(err.response?.data?.message||'Save failed','error'); }
    finally { setSavingProfile(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { addToast('New passwords do not match','error'); return; }
    setSavingPw(true);
    try {
      await api.put('/auth/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      addToast('Password changed successfully');
      setPwForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
    } catch (err) { addToast(err.response?.data?.message||'Change failed','error'); }
    finally { setSavingPw(false); }
  };

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
    <div style={{ display:'flex', flexDirection:'column', gap: isMobile ? 14 : 20, overflow:'hidden', maxWidth:'100%' }}>
      <div>
        <div style={{ fontSize: isMobile ? 20 : 22, fontWeight:600, letterSpacing:'-0.02em', color:'var(--fg)' }}>Settings</div>
        <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>Manage your account and integrations</div>
      </div>

      {/* Mobile: pill-style tab row */}
      {isMobile && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, width:'100%', boxSizing:'border-box' }}>
          {NAV_ITEMS.map(item => (
            <button key={item} onClick={() => setActiveNav(item)}
              style={{
                padding:'9px 18px', borderRadius:999, cursor:'pointer',
                fontSize:13, fontWeight:500, whiteSpace:'nowrap',
                background: activeNav===item ? 'var(--accent)' : 'var(--card)',
                color: activeNav===item ? 'var(--accent-ink)' : 'var(--muted)',
                border: `1px solid ${activeNav===item ? 'var(--accent)' : 'var(--rule)'}`,
                transition:'all 0.15s',
              }}>
              {item}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns:'200px 1fr', gap:20, alignItems:'start' }}>
        {/* Desktop side nav */}
        {!isMobile && (
        <div className="card" style={{ padding:8 }}>
          {NAV_ITEMS.map(item=>(
            <button key={item} onClick={()=>setActiveNav(item)}
              style={{ width:'100%', textAlign:'left', padding:'8px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, transition:'background 0.2s ease, color 0.2s ease',
                background: activeNav===item ? 'var(--hover)' : 'transparent',
                color: activeNav===item ? 'var(--fg)' : 'var(--muted)',
                boxShadow: activeNav===item ? 'var(--shadow-nav)' : 'none',
              }}>
              {item}
            </button>
          ))}
        </div>
        )}

        {/* Right content */}
        <div>
          {activeNav==='Profile' && (
            <>
            <Card title="Profile" subtitle="Update your account name and email">
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
              <form onSubmit={saveProfile} style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12 }}>
                <div>
                  <label className="label">Full Name</label>
                  <input className="input" value={profileForm.name} onChange={e=>setProfileForm(p=>({...p,name:e.target.value}))} required />
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <input type="email" className="input" value={profileForm.email} onChange={e=>setProfileForm(p=>({...p,email:e.target.value}))} required />
                </div>
                <div style={{ gridColumn:'1/-1', display:'flex', justifyContent:'flex-end', gap:8, borderTop:'1px solid var(--rule)', paddingTop:12, marginTop:4 }}>
                  <button type="button" className="btn-secondary" style={{ fontSize:12 }} onClick={()=>setProfileForm({name:user?.name||'',email:user?.email||''})}>Reset</button>
                  <button type="submit" className="btn-primary" style={{ fontSize:12 }} disabled={savingProfile}>{savingProfile?'Saving…':'Save changes'}</button>
                </div>
              </form>
            </Card>

            <Card title="Change password" subtitle="You'll need your current password to set a new one">
              <form onSubmit={changePassword} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[
                  { key:'currentPassword', label:'Current password', pk:'cur' },
                  { key:'newPassword', label:'New password', pk:'new' },
                  { key:'confirmPassword', label:'Confirm new password', pk:'confirm' },
                ].map(({ key, label, pk }) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <div style={{ position:'relative' }}>
                      <input type={showPw[pk]?'text':'password'} className="input" style={{ paddingRight:36 }}
                        value={pwForm[key]} onChange={e=>setPwForm(p=>({...p,[key]:e.target.value}))} required minLength={key!=='currentPassword'?6:1} />
                      <button type="button" onClick={()=>setShowPw(p=>({...p,[pk]:!p[pk]}))}
                        style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--faint)', display:'flex' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          {showPw[pk]
                            ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                            : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'flex-end', borderTop:'1px solid var(--rule)', paddingTop:12, marginTop:4 }}>
                  <button type="submit" className="btn-primary" style={{ fontSize:12 }} disabled={savingPw}>{savingPw?'Changing…':'Change password'}</button>
                </div>
              </form>
            </Card>
            </>
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

          {activeNav==='Data' && (
            <>
              <Card title="Sync WhatsApp → Leads" subtitle="Create a lead for every WhatsApp conversation that doesn't have one yet">
                <div style={{ fontSize:12.5, color:'var(--muted)', lineHeight:1.6, marginBottom:16 }}>
                  All your WhatsApp conversations (including Meta Ad click-to-WhatsApp contacts) will appear in the Leads page and be included in exports. Safe to run multiple times — it won't create duplicates.
                </div>
                {waLeadResult && (
                  <div style={{ background:'var(--accent-bg)', borderRadius:9, padding:'10px 14px', fontSize:12.5, color:'var(--accent)', marginBottom:14, lineHeight:1.6 }}>
                    ✅ {waLeadResult.created} leads created · {waLeadResult.linked} linked to existing · {waLeadResult.skipped} already up to date
                  </div>
                )}
                <button className="btn-primary" disabled={syncingWaLeads} onClick={async () => {
                  setSyncingWaLeads(true); setWaLeadResult(null);
                  try {
                    const { data } = await api.post('/sync/whatsapp-leads');
                    setWaLeadResult(data);
                    addToast(data.message);
                  } catch (err) { addToast(err.response?.data?.message || 'Sync failed', 'error'); }
                  finally { setSyncingWaLeads(false); }
                }} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  {syncingWaLeads ? (
                    <><span style={{ width:12, height:12, border:'2px solid rgba(255,255,255,.4)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.6s linear infinite', display:'inline-block' }} /> Syncing…</>
                  ) : (
                    <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Sync WhatsApp → Leads</>
                  )}
                </button>
              </Card>
            </>
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
