import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const LeafIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21c0-9 7-16 18-16-1 11-7 18-18 16z"/>
    <path d="M3 21c4-4 8-7 14-10"/>
  </svg>
);

const Spinner = ({ light }) => (
  <span style={{ width:14, height:14, border:`2px solid ${light?'rgba(255,255,255,.3)':'rgba(61,138,92,.3)'}`, borderTopColor: light?'white':'var(--accent)', borderRadius:'50%', animation:'spin 0.6s linear infinite', display:'inline-block' }} />
);

export default function Login() {
  // mode: 'login' | 'register' | 'forgot' | 'verify'
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name:'', email:'', password:'' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPass, setNewPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [shaking, setShaking] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Double-RAF: ensures React renders the class REMOVED first, then adds it back
  // so the browser always sees it as a fresh animation — works 100% reliably
  const triggerShake = useCallback((msg) => {
    setError(msg);
    setShaking(false);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setShaking(true))
    );
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      triggerShake(err.response?.data?.message || 'Incorrect email or password');
    } finally { setLoading(false); }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      setSuccess(`Code sent to ${forgotEmail}`);
      setMode('verify');
    } catch (err) {
      if (!err.response) {
        triggerShake('Server is starting up — please try again in 30 seconds');
      } else {
        triggerShake(err.response.data?.message || 'Something went wrong');
      }
    } finally { setLoading(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/auth/reset-password', { email: forgotEmail, code, newPassword: newPass });
      setSuccess('Password updated! You can now sign in.');
      setMode('login');
      setCode(''); setNewPass(''); setForgotEmail('');
    } catch (err) {
      triggerShake(err.response?.data?.message || 'Invalid or expired code');
    } finally { setLoading(false); }
  };


  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:24 }}>
      <div style={{ width:'100%', maxWidth:380 }}>

        {/* Brand */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:'0 4px 16px rgba(61,138,92,.35)' }}>
            <LeafIcon />
          </div>
          <div style={{ fontSize:18, fontWeight:600, color:'var(--fg)', letterSpacing:'-0.02em' }}>NK Herbal CRM</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>Sales & Analytics Platform</div>
        </div>

        {/* Card */}
        <div className={`card${shaking ? ' shake-card' : ''}`} style={{ padding:'28px 28px 24px' }}
          onAnimationEnd={() => setShaking(false)}>

          {/* Title */}
          <div style={{ fontSize:16, fontWeight:600, color:'var(--fg)', marginBottom: error ? 12 : 20 }}>
            { mode === 'login' ? 'Sign in'
            : mode === 'register' ? 'Create account'
            : mode === 'forgot' ? 'Reset password'
            : 'Enter reset code' }
          </div>

          {/* Inline error */}
          {error && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:9, background:'var(--danger-bg)', border:'1px solid rgba(176,70,56,.2)', marginBottom:16 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{ fontSize:12.5, color:'var(--danger)', fontWeight:500 }}>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && mode !== 'verify' && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:9, background:'var(--accent-bg)', marginBottom:16 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span style={{ fontSize:12.5, color:'var(--accent)', fontWeight:500 }}>{success}</span>
            </div>
          )}

          {/* ── Sign in / Register ── */}
          {(mode === 'login' || mode === 'register') && (
            <form onSubmit={handleAuth} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {mode === 'register' && (
                <div>
                  <label className="label">Full Name</label>
                  <input className="input" placeholder="Your name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
                </div>
              )}
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" placeholder="you@company.com" value={form.email}
                  onChange={e=>setForm({...form,email:e.target.value})}
                  onFocus={()=>setError('')} required />
              </div>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <label className="label" style={{ margin:0 }}>Password</label>
                  {mode === 'login' && (
                    <button type="button" onClick={()=>{ setMode('forgot'); setError(''); setSuccess(''); setForgotEmail(form.email); }}
                      style={{ fontSize:11.5, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontWeight:500, padding:0 }}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <input type="password" className="input" placeholder="••••••••" value={form.password}
                  onChange={e=>setForm({...form,password:e.target.value})}
                  onFocus={()=>setError('')} required />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}
                style={{ width:'100%', justifyContent:'center', padding:'9px 16px', marginTop:4, opacity:loading?0.7:1 }}>
                {loading ? <span style={{ display:'flex', alignItems:'center', gap:8 }}><Spinner light /> Please wait…</span>
                         : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          )}

          {/* ── Forgot password — enter email ── */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgot} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ fontSize:12.5, color:'var(--muted)', marginBottom:4, lineHeight:1.5 }}>
                Enter your account email and we'll send a 6-digit reset code.
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" placeholder="you@company.com" value={forgotEmail}
                  onChange={e=>setForgotEmail(e.target.value)} onFocus={()=>setError('')} required autoFocus />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}
                style={{ width:'100%', justifyContent:'center', padding:'9px 16px', opacity:loading?0.7:1 }}>
                {loading ? <span style={{ display:'flex', alignItems:'center', gap:8 }}><Spinner light /> Sending…</span> : 'Send reset code'}
              </button>
              <button type="button" onClick={()=>{ setMode('login'); setError(''); }}
                style={{ background:'none', border:'none', color:'var(--muted)', fontSize:12.5, cursor:'pointer', textAlign:'center' }}>
                ← Back to sign in
              </button>
            </form>
          )}

          {/* ── Forgot password — enter code + new password ── */}
          {mode === 'verify' && (
            <form onSubmit={handleVerify} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {success && (
                <div style={{ fontSize:12.5, color:'var(--accent)', background:'var(--accent-bg)', padding:'8px 12px', borderRadius:8 }}>
                  {success}
                </div>
              )}
              <div>
                <label className="label">6-digit code</label>
                <input className="input" placeholder="123456" value={code}
                  onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                  onFocus={()=>setError('')}
                  style={{ letterSpacing:'0.2em', fontSize:18, fontWeight:600, textAlign:'center' }} maxLength={6} required autoFocus />
              </div>
              <div>
                <label className="label">New password</label>
                <input type="password" className="input" placeholder="Min. 6 characters" value={newPass}
                  onChange={e=>setNewPass(e.target.value)} onFocus={()=>setError('')} required minLength={6} />
              </div>
              <button type="submit" className="btn-primary" disabled={loading || code.length < 6}
                style={{ width:'100%', justifyContent:'center', padding:'9px 16px', opacity:(loading||code.length<6)?0.7:1 }}>
                {loading ? <span style={{ display:'flex', alignItems:'center', gap:8 }}><Spinner light /> Verifying…</span> : 'Reset password'}
              </button>
              <button type="button" onClick={()=>{ setMode('forgot'); setError(''); setCode(''); }}
                style={{ background:'none', border:'none', color:'var(--muted)', fontSize:12.5, cursor:'pointer', textAlign:'center' }}>
                Resend code
              </button>
            </form>
          )}

          {/* Switch login/register */}
          {(mode === 'login' || mode === 'register') && (
            <div style={{ textAlign:'center', marginTop:18, fontSize:12.5, color:'var(--muted)' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={()=>{ setMode(mode==='login'?'register':'login'); setError(''); }}
                style={{ color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontWeight:500, fontSize:12.5, padding:0 }}>
                {mode === 'login' ? 'Register' : 'Sign in'}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-7px); }
          30%      { transform: translateX(7px); }
          45%      { transform: translateX(-5px); }
          60%      { transform: translateX(5px); }
          75%      { transform: translateX(-3px); }
          90%      { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
