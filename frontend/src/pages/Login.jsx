import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Loader2, Mail, Lock, User } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      addToast(err.response?.data?.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1b4b 0%, #09090b 60%)' }}>

      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #6366f1, transparent 70%)', filter: 'blur(40px)' }} />

      <div className="w-full max-w-sm relative z-10 animate-fadeIn">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-white text-2xl font-bold mb-4"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 40px #6366f150' }}>
            C
          </div>
          <h1 className="text-white text-xl font-bold tracking-tight">CRM Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: '#71717a' }}>Sales & Analytics Platform</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-7 border" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
          <h2 className="text-white text-lg font-bold mb-6">{isLogin ? 'Welcome back' : 'Create account'}</h2>

          <form onSubmit={handle} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="label" style={{ color: '#a1a1aa' }}>Full Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#52525b' }} />
                  <input className="input pl-9" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                    placeholder="Your name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
              </div>
            )}

            <div>
              <label className="label" style={{ color: '#a1a1aa' }}>Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#52525b' }} />
                <input type="email" className="input pl-9" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                  placeholder="you@company.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
            </div>

            <div>
              <label className="label" style={{ color: '#a1a1aa' }}>Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#52525b' }} />
                <input type="password" className="input pl-9" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                  placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white transition-all mt-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px #6366f140' }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: '#71717a' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setIsLogin(!isLogin)} className="font-semibold hover:opacity-80 transition-opacity" style={{ color: '#818cf8' }}>
              {isLogin ? 'Register' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
