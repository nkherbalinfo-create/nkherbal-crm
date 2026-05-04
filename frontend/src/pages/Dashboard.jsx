import { useState, useEffect, useCallback, useRef } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { SelectInput } from '../components/FormControls';

// ── Formatters ─────────────────────────────────────────
const inr = (n, compact = false) => {
  const v = Number(n || 0);
  if (compact) {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
    if (v >= 100000)   return `₹${(v / 100000).toFixed(2)}L`;
    if (v >= 1000)     return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${v}`;
  }
  return '₹' + v.toLocaleString('en-IN');
};
const num = (n) => Number(n || 0).toLocaleString('en-IN');
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Spark — smooth SVG sparkline with gradient fill ────
function Spark({ data = [], w = 88, h = 44, id = 'sp' }) {
  if (!data || data.length < 2) return <svg width={w} height={h} />;
  const vals = data.map(Number);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const pad = 5;
  const step = w / (vals.length - 1);
  const pts = vals.map((v, i) => [
    +(i * step).toFixed(2),
    +(pad + (1 - (v - min) / range) * (h - pad * 2)).toFixed(2)
  ]);
  // Smooth bezier: midpoint control points produce a clean monotone curve
  let line = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    line += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }
  const last = pts[pts.length - 1];
  const area = `${line} L${last[0]},${h} L${pts[0][0]},${h} Z`;
  const gid = `sg-${id.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.8" fill="currentColor" />
    </svg>
  );
}

// ── Donut — pure SVG (from design primitives) ──────────
function Donut({ segments = [], size = 120, thickness = 18, track }) {
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track || 'var(--rule)'} strokeWidth={thickness} />
      {segments.map((s, i) => {
        const len = (s.value / total) * circ;
        const cur = offset;
        offset += len;
        return (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={s.color} strokeWidth={thickness}
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-cur}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            strokeLinecap="butt" />
        );
      })}
    </svg>
  );
}

// ── Custom chart tooltip ───────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 10, padding: '8px 12px', fontSize: 12, boxShadow: '0 4px 16px rgba(37,35,32,.12)' }}>
      <div style={{ color: 'var(--muted)', marginBottom: 3, fontSize: 11, fontFamily: 'Inter' }}>{label}</div>
      <div style={{ color: 'var(--fg)', fontFamily: 'Inter', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 13 }}>
        {inr(payload[0]?.value)}
      </div>
    </div>
  );
}

// ── Avatar ─────────────────────────────────────────────
function Av({ name, size = 28 }) {
  const i = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.38), fontWeight: 600, flexShrink: 0, userSelect: 'none' }}>
      {i}
    </div>
  );
}

// ── Chip ───────────────────────────────────────────────
function Chip({ tone = 'muted', children }) {
  const t = { ok: ['var(--accent-bg)', 'var(--accent)'], warn: ['var(--warn-bg)', 'var(--warn)'], danger: ['var(--danger-bg)', 'var(--danger)'], info: ['var(--info-bg)', 'var(--info)'], muted: ['var(--chip)', 'var(--muted)'] }[tone] || ['var(--chip)', 'var(--muted)'];
  return <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: t[0], color: t[1], fontWeight: 500, display: 'inline-block', whiteSpace: 'nowrap' }}>{children}</span>;
}

// ── Skeleton ───────────────────────────────────────────
function Skel({ w = '100%', h = 14 }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: 6 }} />;
}

const STATUS_TONE = { Delivered: 'ok', Shipped: 'muted', Processing: 'muted', Cancelled: 'danger', RTO: 'warn' };
const CHAN_COLORS = ['#3d8a5c', '#a8d5be', '#2a6642', '#c8e8d8'];
const CHAN_COLOR_MAP = { WhatsApp: '#3d8a5c', Website: '#a8d5be' };

// ──────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile(767);
  const [data, setData] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartKey, setChartKey] = useState(0);
  const [channel, setChannel] = useState('');
  const [monthOffset, setMonthOffset] = useState(0);
  const [trendRange, setTrendRange] = useState(6);
  const hasLoadedRef = useRef(false);

  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = `${today.getDate()} ${MONTHS[today.getMonth()]}`;
  const firstName = user?.name?.split(' ')[0] || 'there';

  // Compute the displayed month from offset
  const displayDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const displayYear = displayDate.getFullYear();
  const displayMonth = displayDate.getMonth();
  const monthStr = `${MONTHS[displayMonth]} ${displayYear}`;

  const load = useCallback(async () => {
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
      const yr = d.getFullYear(), mo = d.getMonth();
      const start = `${yr}-${String(mo + 1).padStart(2, '0')}-01`;
      const end   = `${yr}-${String(mo + 1).padStart(2, '0')}-${new Date(yr, mo + 1, 0).getDate()}`;
      const params = { startDate: start, endDate: end, trendMonths: trendRange, ...(channel ? { channel } : {}) };
      const [dash, orders] = await Promise.all([
        api.get('/dashboard/stats', { params }),
        api.get('/orders', { params: { limit: 6, ...params } }),
      ]);
      hasLoadedRef.current = true;
      setData(dash.data);
      setChartKey(k => k + 1);
      setRecentOrders(orders.data.orders || []);
    } catch {} finally { setLoading(false); }
  }, [channel, monthOffset, trendRange]);

  useEffect(() => { load(); }, [load]);

  const ov = data?.overview || {};
  const trend = data?.monthlyTrend || [];
  const channelData = data?.channelBreakdown || [];
  const topProducts = data?.topProducts || [];
  const funnel = data?.funnel || {};

  // Build a complete month sequence for the chosen range, inserting 0 for months with no orders
  const chartData = (() => {
    const cur = today.getFullYear();
    return Array.from({ length: trendRange }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (trendRange - 1 - i), 1);
      const yr = d.getFullYear(), mo = d.getMonth() + 1;
      const found = trend.find(t => t._id.year === yr && t._id.month === mo);
      const label = yr === cur ? MONTHS[mo - 1] : `${MONTHS[mo - 1]} ${String(yr).slice(-2)}`;
      return { label, Revenue: found ? found.revenue : 0 };
    });
  })();

  const sparkRev   = trend.map(m => m.revenue);
  const sparkOrd   = trend.map(m => m.orders);
  const delivPct   = ov.totalOrders ? ((ov.deliveredOrders / ov.totalOrders) * 100) : 0;
  const chanTotal  = channelData.reduce((s, c) => s + c.revenue, 0) || 1;
  const donutSegs  = channelData.map((c, i) => ({ value: c.revenue, color: CHAN_COLOR_MAP[c._id] ?? CHAN_COLORS[i % 4] }));

  const fmtChange = (pct) => pct === null ? null : `${pct > 0 ? '+' : ''}${pct}% vs last period`;
  const KPIs = loading ? [] : [
    { l: 'Revenue',       v: inr(ov.totalRevenue, true), sub: fmtChange(ov.revenueChange) || `AOV ${inr(Math.round(ov.avgOrderValue||0))}`, spark: sparkRev, up: ov.revenueChange === null ? true : ov.revenueChange >= 0 },
    { l: 'Orders',        v: num(ov.totalOrders),         sub: fmtChange(ov.ordersChange) || `${ov.newCustomers||0} new this period`,      spark: sparkOrd, up: ov.ordersChange === null ? true : ov.ordersChange >= 0 },
    { l: 'New customers', v: num(ov.newCustomers),        sub: `${ov.repeatCustomers||0} returning`,         spark: sparkOrd.map(v => Math.max(0, v - 1)), up: true },
    { l: 'Delivered rate',v: `${delivPct.toFixed(1)}%`,  sub: delivPct >= 80 ? 'On track' : 'Needs attention', spark: [delivPct-6,delivPct-3,delivPct-1,delivPct], up: delivPct >= 80 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Page header ──────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>{dayName}, {dateStr}</div>
          <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 600, letterSpacing: '-0.02em', margin: '4px 0 0', color: 'var(--fg)', lineHeight: 1.2 }}>Hello {firstName}</h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>Here's how NK Herbal is performing today.</div>
        </div>
        <div className="toolbar-row">
          {/* Mobile: only show + Order button */}
          {isMobile && (
            <button onClick={() => window.location.href='/orders'} className="btn-primary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Order
            </button>
          )}
          {!isMobile && <>

          {/* ← Month → navigator */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 9, overflow: 'hidden' }}>
            <button onClick={() => setMonthOffset(o => o - 1)}
              style={{ padding: '8px 10px', background: 'transparent', border: 'none', borderRight: '1px solid var(--rule)', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background .12s' }}
              onMouseEnter={e => e.currentTarget.style.background='var(--hover)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', fontSize: 12, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>
              {monthStr}
            </div>
            <button onClick={() => setMonthOffset(o => o + 1)}
              disabled={monthOffset >= 0}
              style={{ padding: '8px 10px', background: 'transparent', border: 'none', borderLeft: '1px solid var(--rule)', color: monthOffset >= 0 ? 'var(--faint)' : 'var(--muted)', cursor: monthOffset >= 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', transition: 'background .12s' }}
              onMouseEnter={e => { if (monthOffset < 0) e.currentTarget.style.background='var(--hover)'; }}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <SelectInput
            style={{ minWidth: 128 }}
            triggerStyle={{ background: 'var(--card)' }}
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            <option value="">All channels</option>
            <option>Website</option>
            <option>WhatsApp</option>
          </SelectInput>

          {/* New order */}
          <button onClick={() => window.location.href='/orders'}
            className="btn-primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            New order
          </button>
          </>}
        </div>
      </div>

      {/* ── KPI strip ─────────────────────────────────── */}
      <div className="surface metric-grid" style={{ padding: isMobile ? '14px 14px' : '20px 22px', gridTemplateColumns: isMobile ? '1fr 1fr' : undefined }}>
        {loading ? [0,1,2,3].map(i => (
          <div key={i} style={{ borderLeft: i ? '1px solid var(--rule)' : 'none', paddingLeft: i ? 22 : 0, paddingRight: i < 3 ? 22 : 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skel w="50%" h={11} />
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <Skel w="60%" h={28} />
              <Skel w={88} h={44} />
            </div>
            <Skel w="65%" h={11} />
          </div>
        )) : KPIs.map((m, i) => (
          <div key={i} style={{
            borderLeft: (!isMobile && i) ? '1px solid var(--rule)' : 'none',
            borderTop: isMobile ? '1px solid var(--rule)' : 'none',
            paddingLeft: (!isMobile && i) ? 22 : 0,
            paddingRight: (!isMobile && i < 3) ? 22 : 0,
            paddingTop: isMobile ? 12 : 0,
            paddingBottom: isMobile ? 4 : 0,
          }}>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 400 }}>{m.l}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
              <div className="num" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--fg)', lineHeight: 1 }}>
                {m.v}
              </div>
              <div style={{ color: 'var(--accent)', flexShrink: 0, marginBottom: 2 }}>
                <Spark data={m.spark.length >= 2 ? m.spark : [0,1,2,4,5,6]} w={88} h={44} id={m.l} />
              </div>
            </div>
            <div className="num" style={{ fontSize: 11, color: m.up ? 'var(--accent)' : 'var(--danger)', marginTop: 6 }}>
              {m.up ? '↑' : '↓'} {m.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Conversion Funnel ────────────────────────── */}
      {!loading && funnel.total > 0 && (
        <div className="surface" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Sales funnel</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>All-time lead pipeline · {funnel.total} total leads</div>
            </div>
            {ov.dormantCustomers > 0 && (
              <a href="/customers" style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 11px', borderRadius:8, background:'var(--warn-bg)', color:'var(--warn)', fontSize:11.5, fontWeight:500, textDecoration:'none' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {ov.dormantCustomers} dormant customers
              </a>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
            {[
              { label: 'Total leads',   value: funnel.total,        color: 'var(--fg)',     bg: 'var(--chip)' },
              { label: 'Interested',    value: funnel.interested,   color: 'var(--info)',   bg: 'var(--info-bg)' },
              { label: 'Follow Up',     value: funnel.followUp,     color: 'var(--warn)',   bg: 'var(--warn-bg)' },
              { label: 'Converted',     value: funnel.converted,    color: 'var(--accent)', bg: 'var(--accent-bg)' },
            ].map((step, i, arr) => {
              const pct = funnel.total > 0 ? Math.round((step.value / funnel.total) * 100) : 0;
              return (
                <div key={step.label} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? '1 1 0' : 'none' }}>
                  <div style={{ padding: '12px 16px', borderRadius: 10, background: step.bg, minWidth: 110, textAlign: 'center' }}>
                    <div className="num" style={{ fontSize: 22, fontWeight: 700, color: step.color, lineHeight: 1 }}>{step.value}</div>
                    <div style={{ fontSize: 11, color: step.color, opacity: 0.8, marginTop: 3 }}>{step.label}</div>
                    {i > 0 && <div className="num" style={{ fontSize: 10, color: step.color, opacity: 0.65, marginTop: 2 }}>{pct}% of total</div>}
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: 'var(--rule)', margin: '0 6px', position: 'relative', minWidth: 20 }}>
                      <div style={{ height: '100%', background: step.color, opacity: 0.4, width: `${pct}%`, transition: 'width 0.5s ease' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Row 2: Revenue chart + Channels ──────────── */}
      <div className="dashboard-grid">

        {/* Revenue trend */}
        <div className="surface" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Revenue trend</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                {inr(chartData.reduce((s, d) => s + d.Revenue, 0), true)} over {trendRange} months
              </div>
            </div>
            <div style={{ display: 'flex', background: 'var(--chip)', border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden' }}>
              {[3, 6, 12].map(n => (
                <button key={n} onClick={() => setTrendRange(n)}
                  style={{
                    padding: '5px 11px', border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 500,
                    background: trendRange === n ? 'var(--accent)' : 'transparent',
                    color: trendRange === n ? 'var(--accent-ink)' : 'var(--muted)',
                    transition: 'background 0.15s, color 0.15s',
                  }}>
                  {n}M
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 180, borderRadius: 8 }} />
          ) : (
            <div key={chartKey} className="fade-in">
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={chartData} margin={{ top: 16, right: 16, left: 16, bottom: 0 }}>
                <defs>
                  <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#3d8a5c" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#3d8a5c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--rule)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10.5, fill: 'var(--muted)', fontFamily: 'Inter, system-ui, sans-serif' }}
                  axisLine={false} tickLine={false}
                  dy={8}
                  padding={{ left: 8, right: 8 }}
                  interval={trendRange <= 6 ? 0 : 'preserveStartEnd'}
                />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip content={<ChartTip />} cursor={{ stroke: 'var(--rule)', strokeWidth: 1 }} />
                <Area
                  type="linear"
                  dataKey="Revenue"
                  stroke="#3d8a5c"
                  strokeWidth={1.8}
                  fill="url(#revArea)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#3d8a5c', strokeWidth: 2, stroke: 'var(--card)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Channels donut */}
        <div className="surface" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Channels</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>By revenue share</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, paddingTop: 20 }}>
            {loading ? (
              <div className="skeleton" style={{ width: 124, height: 124, borderRadius: '50%', flexShrink: 0 }} />
            ) : (
              <Donut size={124} thickness={20} track="var(--rule-strong)"
                segments={donutSegs.length ? donutSegs : [{ value: 1, color: 'var(--rule-strong)' }]} />
            )}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {loading ? [0,1].map(i => <div key={i} className="skeleton" style={{ height: 32, borderRadius: 6 }} />) :
               channelData.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                    No orders in this period.
                  </div>
                  {/* Show placeholder channel rows */}
                  {['Website', 'WhatsApp'].map((name, i) => (
                    <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 4, opacity: 0.35 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: CHAN_COLORS[i], flexShrink: 0 }} />
                        <span style={{ color: 'var(--fg)', fontSize: 12, fontWeight: 500, flex: 1 }}>{name}</span>
                        <span className="num" style={{ color: 'var(--muted)', fontSize: 11.5 }}>₹0</span>
                        <span className="num" style={{ color: 'var(--faint)', fontSize: 11.5, fontWeight: 600, minWidth: 32, textAlign: 'right' }}>—</span>
                      </div>
                      <div style={{ height: 3, background: 'var(--rule)', borderRadius: 2 }} />
                    </div>
                  ))}
                </div>
               ) : channelData.map((ch, i) => {
                  const pct = Math.round((ch.revenue / chanTotal) * 100);
                  const color = CHAN_COLOR_MAP[ch._id] ?? CHAN_COLORS[i % 4];
                  return (
                    <div key={ch._id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ color: 'var(--fg)', fontSize: 12, fontWeight: 500, flex: 1 }}>{ch._id}</span>
                        <span className="num" style={{ color: 'var(--muted)', fontSize: 11.5 }}>{inr(ch.revenue, true)}</span>
                        <span className="num" style={{ color, fontSize: 11.5, fontWeight: 600, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                      </div>
                      <div style={{ height: 3, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Recent orders + Top products ──────── */}
      <div className="dashboard-grid">

        {/* Recent orders */}
        <div className="surface" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Recent orders</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>Latest 6</div>
            </div>
            <a href="/orders" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              View all
            </a>
          </div>
          {loading ? [0,1,2,3,4,5].map(i => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr 80px 90px', gap: 12, padding: '12px 0', borderTop: i ? '1px solid var(--rule)' : 'none', alignItems: 'center' }}>
              <div className="skeleton" style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><Skel w="70%" h={13} /><Skel w="50%" h={11} /></div>
              <Skel w="80%" h={12} />
              <Skel w="90%" h={13} />
              <Skel w={70} h={22} />
            </div>
          )) : recentOrders.map((o, i) => (
            <div key={o._id} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr 80px 90px', gap: 12, padding: '12px 0', borderTop: i ? '1px solid var(--rule)' : 'none', alignItems: 'center' }}>
              <Av name={o.customerName} size={30} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customerName}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {o.city} · {o.orderId}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {o.productName}
              </div>
              <div className="num" style={{ fontSize: 12.5, color: 'var(--fg)', whiteSpace: 'nowrap' }}>
                {inr(o.orderValue)}
              </div>
              <div>
                <Chip tone={STATUS_TONE[o.orderStatus] || 'muted'}>{o.orderStatus}</Chip>
              </div>
            </div>
          ))}
        </div>

        {/* Top products */}
        <div className="surface" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>Top products</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 14 }}>By revenue this period</div>
          {loading ? [0,1,2,3,4].map(i => (
            <div key={i} style={{ padding: '12px 0', borderTop: i ? '1px solid var(--rule)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: 24, height: 24, borderRadius: 6 }} />
                  <Skel w={90} h={12} />
                </div>
                <Skel w={40} h={12} />
              </div>
              <div className="skeleton" style={{ height: 4, borderRadius: 2 }} />
            </div>
          )) : topProducts.map((p, i) => (
            <div key={i} style={{ padding: '12px 0', borderTop: i ? '1px solid var(--rule)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                  <div className="num" style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--chip)', color: 'var(--muted)', display: 'grid', placeItems: 'center', fontSize: 10.5, fontWeight: 600, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p._id}
                  </span>
                </div>
                <span className="num" style={{ fontSize: 12, color: 'var(--fg)', flexShrink: 0 }}>
                  {inr(p.revenue, true)}
                </span>
              </div>
              <div style={{ width: '100%', height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${Math.round((p.revenue / (topProducts[0]?.revenue || 1)) * 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: 2, transition: 'width .4s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
