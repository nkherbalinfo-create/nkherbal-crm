import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';
import api from '../utils/api';
import { User, Link2, Sun, Moon, RefreshCw, Save, Eye, EyeOff, Loader2 } from 'lucide-react';

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
          <Icon size={16} style={{ color: 'var(--accent)' }} />
        </div>
        <h2 className="font-bold" style={{ color: 'var(--text)' }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const { addToast } = useToast();

  const [wc, setWc] = useState({ url: '', key: '', secret: '' });
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const saveWC = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/settings/woocommerce', wc);
      addToast('WooCommerce credentials saved');
    } catch (err) {
      addToast(err.response?.data?.message || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post('/sync/woocommerce', {});
      addToast(data.message);
    } catch (err) {
      addToast(err.response?.data?.message || 'Sync failed', 'error');
    } finally { setSyncing(false); }
  };

  const Field = ({ label, ...props }) => (
    <div>
      <label className="label">{label}</label>
      <input className="input" {...props} />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Manage your account and integrations</p>
      </div>

      {/* Profile */}
      <Section icon={User} title="Profile">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--accent), #8b5cf6)' }}>
            {(user?.name || user?.email || 'U').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-bold" style={{ color: 'var(--text)' }}>{user?.name || '—'}</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            <p className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>Admin</p>
          </div>
        </div>
      </Section>

      {/* WooCommerce */}
      <Section icon={Link2} title="WooCommerce Integration">
        <form onSubmit={saveWC} className="space-y-3">
          <Field label="Store URL" type="url" placeholder="https://yourstore.com"
            value={wc.url} onChange={e => setWc(w => ({...w, url: e.target.value}))} />
          <Field label="Consumer Key" placeholder="ck_…"
            value={wc.key} onChange={e => setWc(w => ({...w, key: e.target.value}))} />
          <div>
            <label className="label">Consumer Secret</label>
            <div className="relative">
              <input className="input pr-10" type={showSecret ? 'text' : 'password'} placeholder="cs_…"
                value={wc.secret} onChange={e => setWc(w => ({...w, secret: e.target.value}))} />
              <button type="button" onClick={() => setShowSecret(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }}>
                {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-1.5">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Saving…' : 'Save Credentials'}
            </button>
          </div>
        </form>
      </Section>

      {/* Sync */}
      <Section icon={RefreshCw} title="WooCommerce Sync">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Manually pull all orders from WooCommerce. This also runs automatically every 15 minutes after the backend starts.
        </p>
        <button onClick={syncNow} disabled={syncing} className="btn-primary flex items-center gap-2 disabled:opacity-50">
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>
      </Section>

      {/* Appearance */}
      <Section icon={theme === 'dark' ? Moon : Sun} title="Appearance">
        <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Choose your preferred theme.</p>
        <div className="flex gap-3">
          {['light', 'dark'].map(t => (
            <button key={t} onClick={() => { if (theme !== t) toggle(); }}
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all"
              style={{
                borderColor: theme === t ? 'var(--accent)' : 'var(--border)',
                background: t === 'dark' ? '#111113' : '#f8fafc',
              }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: t === 'dark' ? '#27272a' : '#ffffff', border: `1px solid ${t==='dark'?'#3f3f46':'#e2e8f0'}` }}>
                {t === 'dark' ? <Moon size={16} color="#818cf8" /> : <Sun size={16} color="#f59e0b" />}
              </div>
              <span className="text-xs font-semibold capitalize" style={{ color: theme === t ? 'var(--accent)' : 'var(--text-muted)' }}>
                {t}
              </span>
              {theme === t && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent)', color: '#fff' }}>Active</span>
              )}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
