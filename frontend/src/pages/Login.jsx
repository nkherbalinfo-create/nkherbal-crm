import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name:'', email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      addToast(err.response?.data?.message||'Authentication failed','error');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:24 }}>
      <div style={{ width:'100%', maxWidth:380 }}>
        {/* Brand */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:'0 4px 16px rgba(61,138,92,.35)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21c0-9 7-16 18-16-1 11-7 18-18 16z"/>
              <path d="M3 21c4-4 8-7 14-10"/>
            </svg>
          </div>
          <div style={{ fontSize:18, fontWeight:600, color:'var(--fg)', letterSpacing:'-0.02em' }}>NK Herbal CRM</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>Sales & Analytics Platform</div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding:'28px 28px 24px' }}>
          <div style={{ fontSize:16, fontWeight:600, color:'var(--fg)', marginBottom:20 }}>
            {isLogin ? 'Sign in' : 'Create account'}
          </div>

          <form onSubmit={handle} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {!isLogin && (
              <div>
                <label className="label">Full Name</label>
                <input className="input" placeholder="Your name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@company.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="••••••••" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}
              style={{ width:'100%', justifyContent:'center', padding:'9px 16px', marginTop:4, opacity:loading?0.7:1 }}>
              {loading ? (
                <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.6s linear infinite', display:'inline-block' }} />
                  Please wait…
                </span>
              ) : isLogin ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:18, fontSize:12.5, color:'var(--muted)' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={()=>setIsLogin(!isLogin)} style={{ color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontWeight:500, fontSize:12.5, padding:0 }}>
              {isLogin ? 'Register' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
