import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import MetricCard from '../components/MetricCard';
import api from '../utils/api';
import {
  ShoppingCart, IndianRupee, Users, UserPlus, Repeat2,
  PercentCircle, Receipt, PackageCheck, CalendarDays, TrendingUp
} from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmt = (n) =>
  n >= 10000000 ? `₹${(n/10000000).toFixed(1)}Cr`
  : n >= 100000 ? `₹${(n/100000).toFixed(1)}L`
  : n >= 1000   ? `₹${(n/1000).toFixed(1)}K`
  : `₹${n}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.name === 'Revenue' ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

const Skeleton = ({ h = 'h-28' }) => (
  <div className={`skeleton ${h} rounded-2xl`} />
);

const MONTHLY_TARGET = 200000;

export default function Dashboard() {
  const [data, setData]       = useState(null);
  const [today, setToday]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', channel: '' });

  const load = async (overrideFilters) => {
    setLoading(true);
    try {
      const active = overrideFilters ?? filters;
      const params = Object.fromEntries(Object.entries(active).filter(([,v]) => v));
      const [main, todayRes] = await Promise.all([
        api.get('/dashboard/stats', { params }),
        api.get('/dashboard/stats', { params: {
          startDate: new Date().toISOString().split('T')[0],
          endDate:   new Date().toISOString().split('T')[0],
          ...(active.channel ? { channel: active.channel } : {})
        }})
      ]);
      setData(main.data);
      setToday(todayRes.data.overview);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const trend = data?.monthlyTrend?.map(m => ({
    name: `${MONTHS[m._id.month - 1]} ${String(m._id.year).slice(2)}`,
    Orders: m.orders,
    Revenue: m.revenue,
  })) || [];

  const channelData = data?.channelBreakdown?.map(c => ({
    name: c._id, Orders: c.orders, Revenue: c.revenue,
  })) || [];

  const ov = data?.overview || {};
  const gstCollected = Math.round((ov.totalRevenue || 0) - (ov.totalRevenue || 0) / 1.05);
  const deliveredRate = ov.totalOrders ? Math.round((ov.deliveredOrders / ov.totalOrders) * 100) : 0;
  const targetPct = Math.min(100, Math.round(((ov.totalRevenue || 0) / MONTHLY_TARGET) * 100));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Business performance overview</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input type="date" className="input w-auto text-sm" value={filters.startDate}
            onChange={e => setFilters(f => ({...f, startDate: e.target.value}))} />
          <input type="date" className="input w-auto text-sm" value={filters.endDate}
            onChange={e => setFilters(f => ({...f, endDate: e.target.value}))} />
          <select className="input w-auto text-sm" value={filters.channel}
            onChange={e => setFilters(f => ({...f, channel: e.target.value}))}>
            <option value="">All Channels</option>
            {['Amazon','Website','WhatsApp','Offline'].map(c => <option key={c}>{c}</option>)}
          </select>
          <button onClick={() => load()} className="btn-primary">Apply</button>
          <button onClick={() => { const e = {startDate:'',endDate:'',channel:''}; setFilters(e); load(e); }} className="btn-secondary">Reset</button>
        </div>
      </div>

      {/* Today's snapshot */}
      {today && !loading && (
        <div className="rounded-2xl border px-5 py-3 flex flex-wrap gap-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <CalendarDays size={15} style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>TODAY</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShoppingCart size={13} style={{ color: 'var(--text-faint)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{today.totalOrders}</span>
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>orders</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{fmt(today.totalRevenue || 0)}</span>
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <UserPlus size={13} style={{ color: 'var(--text-faint)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{today.newCustomers}</span>
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>new customers</span>
          </div>
        </div>
      )}

      {/* Metric cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Orders"      value={ov.totalOrders || 0}          sub="This period"                           color="indigo"  icon={ShoppingCart} />
          <MetricCard title="Total Revenue"     value={fmt(ov.totalRevenue || 0)}    sub={`AOV: ${fmt(Math.round(ov.avgOrderValue || 0))}`} color="emerald" icon={IndianRupee} />
          <MetricCard title="Unique Customers"  value={ov.uniqueCustomers || 0}      sub={`${ov.repeatCustomerCount || 0} repeat`}  color="violet"  icon={Users} />
          <MetricCard title="New Customers"     value={ov.newCustomers || 0}         sub="First-time buyers"                     color="sky"     icon={UserPlus} />
          <MetricCard title="Repeat Customers"  value={ov.repeatCustomers || 0}      sub="Came back"                             color="amber"   icon={Repeat2} />
          <MetricCard title="Conversion Rate"   value={`${ov.conversionRate || 0}%`} sub={`${ov.convertedLeads || 0}/${ov.totalLeads || 0} leads`} color="rose" icon={PercentCircle} />
          <MetricCard title="GST Collected"     value={fmt(gstCollected)}            sub="5% on orders"                         color="teal"    icon={Receipt} />
          <MetricCard title="Delivered Rate"    value={`${deliveredRate}%`}          sub={`${ov.deliveredOrders || 0} delivered`} color="orange"  icon={PackageCheck} />
        </div>
      )}

      {/* Revenue target bar */}
      {!loading && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Monthly Revenue Target</span>
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
              {fmt(ov.totalRevenue || 0)} <span style={{ color: 'var(--text-faint)' }}>/ {fmt(MONTHLY_TARGET)}</span>
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${targetPct}%`, background: 'linear-gradient(90deg, var(--accent), #8b5cf6)' }} />
          </div>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-faint)' }}>{targetPct}% of monthly target reached</p>
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--text)' }}>Orders by Channel</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={channelData} animationDuration={800}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Orders" fill="url(#barGrad)" radius={[8,8,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--text)' }}>Revenue by Channel</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={channelData} dataKey="Revenue" nameKey="name"
                cx="50%" cy="50%" outerRadius={85} innerRadius={50}
                paddingAngle={3} animationDuration={800}
                label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                labelLine={false}>
                {channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--text)' }}>Monthly Orders Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend} animationDuration={800}>
              <defs>
                <linearGradient id="lineGrad1" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="Orders" stroke="url(#lineGrad1)" strokeWidth={2.5}
                dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--text)' }}>Monthly Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend} animationDuration={800}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2.5}
                dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products */}
      {data?.topProducts?.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--text)' }}>Top Products</h3>
          <div className="space-y-3">
            {data.topProducts.map((p, i) => {
              const maxRev = data.topProducts[0]?.revenue || 1;
              const pct = Math.round((p.revenue / maxRev) * 100);
              return (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-xs font-bold w-4 shrink-0" style={{ color: 'var(--text-faint)' }}>#{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium truncate" style={{ color: 'var(--text)' }}>{p._id}</span>
                      <span className="shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>{p.orders} orders · {fmt(p.revenue)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
