import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const LeafIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21c0-9 7-16 18-16-1 11-7 18-18 16z"/>
    <path d="M3 21c4-4 8-7 14-10"/>
  </svg>
);

const Spinner = ({ light }) => (
  <span style={{ width:14, height:14, border:`2px solid ${light?'rgba(255,255,255,.3)':'rgba(5,150,105,.3)'}`, borderTopColor: light?'white':'var(--accent)', borderRadius:'50%', animation:'spin 0.6s linear infinite', display:'inline-block' }} />
);

function FormError({ msg }) {
  if (!msg) return null;
  return (
    <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.18 }}
      style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:9, background:'var(--danger-bg)', border:'1px solid rgba(220,38,38,.15)', marginBottom:2 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span style={{ fontSize:12.5, color:'var(--danger)', fontWeight:500 }}>{msg}</span>
    </motion.div>
  );
}

function SuccessMsg({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:9, background:'var(--accent-bg)', marginBottom:12 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      <span style={{ fontSize:12.5, color:'var(--accent)', fontWeight:500 }}>{msg}</span>
    </div>
  );
}

export default function Login() {
  const [mode, setMode] = useState('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPass, setNewPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [topError, setTopError] = useState('');
  const [topSuccess, setTopSuccess] = useState('');
  const [shaking, setShaking] = useState(false);
  const { login, register, loginAsGuest } = useAuth();
  const navigate = useNavigate();

  const triggerShake = useCallback((msg) => {
    setTopError(msg);
    setShaking(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setShaking(true)));
  }, []);

  const { register: regField, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(mode === 'login' ? loginSchema : registerSchema),
  });

  const onSubmit = async (data) => {
    setLoading(true); setTopError('');
    try {
      if (mode === 'login') await login(data.email, data.password);
      else await register(data.name, data.email, data.password);
      navigate('/');
    } catch (err) {
      triggerShake(err.response?.data?.message || 'Incorrect email or password');
    } finally { setLoading(false); }
  };

  const handleForgot = async (e, isRetry = false) => {
    if (e?.preventDefault) e.preventDefault();
    setLoading(true);
    if (!isRetry) setTopError('');
    let keepLoading = false;
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail }, { timeout: 30000 });
      setTopSuccess(`Code sent to ${forgotEmail} — check spam if not in inbox`);
      setMode('verify');
    } catch (err) {
      if (!err.response && !isRetry) {
        setTopError('Server is waking up… retrying automatically in 35 s');
        keepLoading = true;
        setTimeout(() => handleForgot(null, true), 35000);
      } else if (!err.response) {
        triggerShake('Server is slow — please click Send again');
      } else {
        triggerShake(err.response.data?.message || 'Something went wrong');
      }
    } finally { if (!keepLoading) setLoading(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true); setTopError('');
    try {
      await api.post('/auth/reset-password', { email: forgotEmail, code, newPassword: newPass });
      toast.success('Password updated! You can now sign in.');
      setMode('login');
      reset();
      setCode(''); setNewPass(''); setForgotEmail('');
      setTopSuccess('');
    } catch (err) {
      triggerShake(err.response?.data?.message || 'Invalid or expired code');
    } finally { setLoading(false); }
  };

  const switchMode = (m) => {
    setMode(m); setTopError(''); setTopSuccess(''); reset();
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:24 }}>
      <div style={{ width:'100%', maxWidth:388 }}>

        {/* Brand */}
        <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.32, ease:[0.16,1,0.3,1] }}
          style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:52, height:52, borderRadius:16, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:'0 4px 20px rgba(5,150,105,.35)' }}>
            <LeafIcon />
          </div>
          <div style={{ fontSize:20, fontWeight:700, color:'var(--fg)', letterSpacing:'-0.03em' }}>NK Herbal CRM</div>
          <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:5 }}>Sales &amp; Analytics Platform</div>
        </motion.div>

        {/* Card */}
        <motion.div initial={{ opacity:0, y:16, scale:0.98 }} animate={{ opacity:1, y:0, scale:1 }}
          transition={{ duration:0.38, ease:[0.16,1,0.3,1], delay:0.06 }}
          className={`card${shaking ? ' shake-card' : ''}`}
          style={{ padding:'28px 28px 24px' }}
          onAnimationEnd={(e) => { if (e.animationName === 'shake') setShaking(false); }}>

          <div style={{ fontSize:16, fontWeight:600, color:'var(--fg)', marginBottom:16 }}>
            { mode === 'login'    ? 'Sign in'
            : mode === 'register' ? 'Create account'
            : mode === 'forgot'   ? 'Reset password'
            :                       'Enter reset code' }
          </div>

          <FormError msg={topError} />
          {topSuccess && mode !== 'verify' && <SuccessMsg msg={topSuccess} />}

          {/* ── Sign in / Register ── */}
          {(mode === 'login' || mode === 'register') && (
            <form onSubmit={handleSubmit(onSubmit)} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {mode === 'register' && (
                <div>
                  <label className="label">Full Name</label>
                  <input {...regField('name')} className="input" placeholder="Your name" autoFocus />
                  {errors.name && <p style={{ fontSize:11.5, color:'var(--danger)', marginTop:4 }}>{errors.name.message}</p>}
                </div>
              )}
              <div>
                <label className="label">Email</label>
                <input type="email" {...regField('email')} className="input" placeholder="you@company.com"
                  autoFocus={mode === 'login'} onFocus={() => setTopError('')} />
                {errors.email && <p style={{ fontSize:11.5, color:'var(--danger)', marginTop:4 }}>{errors.email.message}</p>}
              </div>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <label className="label" style={{ margin:0 }}>Password</label>
                  {mode === 'login' && (
                    <button type="button"
                      onClick={() => { setMode('forgot'); setTopError(''); setTopSuccess(''); }}
                      style={{ fontSize:11.5, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontWeight:500, padding:0 }}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <input type="password" {...regField('password')} className="input" placeholder="••••••••"
                  onFocus={() => setTopError('')} />
                {errors.password && <p style={{ fontSize:11.5, color:'var(--danger)', marginTop:4 }}>{errors.password.message}</p>}
              </div>

              <button type="submit" className="btn-primary" disabled={loading}
                style={{ width:'100%', justifyContent:'center', padding:'10px 16px', marginTop:4, fontSize:14, opacity:loading?0.75:1 }}>
                {loading
                  ? <span style={{ display:'flex', alignItems:'center', gap:8 }}><Spinner light /> Please wait…</span>
                  : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>

              {mode === 'login' && (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ flex:1, height:1, background:'var(--rule)' }} />
                    <span style={{ fontSize:11, color:'var(--faint)' }}>or</span>
                    <div style={{ flex:1, height:1, background:'var(--rule)' }} />
                  </div>
                  <button type="button" disabled={guestLoading}
                    onClick={async () => {
                      setGuestLoading(true);
                      try { await loginAsGuest(); navigate('/'); }
                      catch { toast.error('Guest login failed'); }
                      finally { setGuestLoading(false); }
                    }}
                    style={{ width:'100%', padding:'9px 16px', borderRadius:9, border:'1px solid var(--rule)', background:'transparent', color:'var(--muted)', cursor:'pointer', fontSize:12.5, fontWeight:500, display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.color='var(--accent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='var(--rule)'; e.currentTarget.style.color='var(--muted)'; }}>
                    {guestLoading ? <><Spinner /> Loading…</> : <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      Continue as Guest (view only)
                    </>}
                  </button>
                </>
              )}
            </form>
          )}

          {/* ── Forgot password ── */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgot} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <p style={{ fontSize:12.5, color:'var(--muted)', lineHeight:1.55 }}>
                Enter your account email and we'll send a 6-digit reset code.
              </p>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" placeholder="you@company.com" value={forgotEmail}
                  onChange={e=>setForgotEmail(e.target.value)} onFocus={()=>setTopError('')} required autoFocus />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}
                style={{ width:'100%', justifyContent:'center', padding:'10px 16px', opacity:loading?0.75:1 }}>
                {loading ? <span style={{ display:'flex', alignItems:'center', gap:8 }}><Spinner light /> Sending…</span> : 'Send reset code'}
              </button>
              <button type="button" onClick={() => switchMode('login')}
                style={{ background:'none', border:'none', color:'var(--muted)', fontSize:12.5, cursor:'pointer', textAlign:'center' }}>
                ← Back to sign in
              </button>
            </form>
          )}

          {/* ── Verify reset code ── */}
          {mode === 'verify' && (
            <form onSubmit={handleVerify} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {topSuccess && <SuccessMsg msg={topSuccess} />}
              <div>
                <label className="label">6-digit code</label>
                <input className="input" placeholder="123456" value={code}
                  onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                  onFocus={()=>setTopError('')}
                  style={{ letterSpacing:'0.2em', fontSize:18, fontWeight:600, textAlign:'center' }}
                  maxLength={6} required autoFocus />
              </div>
              <div>
                <label className="label">New password</label>
                <input type="password" className="input" placeholder="Min. 6 characters" value={newPass}
                  onChange={e=>setNewPass(e.target.value)} onFocus={()=>setTopError('')} required minLength={6} />
              </div>
              <button type="submit" className="btn-primary" disabled={loading || code.length < 6}
                style={{ width:'100%', justifyContent:'center', padding:'10px 16px', opacity:(loading||code.length<6)?0.7:1 }}>
                {loading ? <span style={{ display:'flex', alignItems:'center', gap:8 }}><Spinner light /> Verifying…</span> : 'Reset password'}
              </button>
              <button type="button" onClick={() => { setMode('forgot'); setTopError(''); setCode(''); }}
                style={{ background:'none', border:'none', color:'var(--muted)', fontSize:12.5, cursor:'pointer', textAlign:'center' }}>
                Resend code
              </button>
            </form>
          )}

          {/* Switch login / register */}
          {(mode === 'login' || mode === 'register') && (
            <div style={{ textAlign:'center', marginTop:18, fontSize:12.5, color:'var(--muted)' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => switchMode(mode==='login'?'register':'login')}
                style={{ color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontWeight:500, fontSize:12.5, padding:0 }}>
                {mode === 'login' ? 'Register' : 'Sign in'}
              </button>
            </div>
          )}
        </motion.div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
