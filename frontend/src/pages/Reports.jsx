import { useState } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import api from '../utils/api';
import { exportOrdersExcel, exportSummaryPDF, exportEverything } from '../utils/export';
import { useToast } from '../components/Toast';
import { SelectInput } from '../components/FormControls';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';

const inr = (n, c=false) => {
  if (!n) return '₹0';
  if (c) {
    if (n>=100000) return `₹${(n/100000).toFixed(1)}L`;
    if (n>=1000)   return `₹${(n/1000).toFixed(1)}K`;
    return `₹${n}`;
  }
  return '₹' + Number(n).toLocaleString('en-IN');
};

const fmt = (d) => format(d, 'yyyy-MM-dd');
const fmtLabel = (d) => format(d, 'dd MMM yy');

const PRESETS = [
  { label:'Today',         range: () => { const t=new Date(); return [fmt(t),fmt(t)]; } },
  { label:'Last 7 days',   range: () => [fmt(subDays(new Date(),6)), fmt(new Date())] },
  { label:'Last 30 days',  range: () => [fmt(subDays(new Date(),29)), fmt(new Date())] },
  { label:'This month',    range: () => [fmt(startOfMonth(new Date())), fmt(endOfMonth(new Date()))] },
  { label:'Last month',    range: () => { const m=subMonths(new Date(),1); return [fmt(startOfMonth(m)), fmt(endOfMonth(m))]; } },
  { label:'Last 3 months', range: () => [fmt(startOfMonth(subMonths(new Date(),2))), fmt(new Date())] },
  { label:'This year',     range: () => [fmt(startOfYear(new Date())), fmt(new Date())] },
];

const Spinner = () => (
  <span style={{ width:12, height:12, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.6s linear infinite', display:'inline-block' }} />
);

export default function Reports() {
  const [filters, setFilters] = useState({ startDate:'', endDate:'', channel:'' });
  const isMobile = useIsMobile();
  const [activePreset, setActivePreset] = useState('');
  const [loading, setLoading] = useState({ excel:false, pdf:false, all:false });
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const { addToast } = useToast();

  const applyPreset = (preset) => {
    const [s, e] = preset.range();
    setFilters(f => ({ ...f, startDate:s, endDate:e }));
    setActivePreset(preset.label);
  };

  const dateLabel = filters.startDate && filters.endDate
    ? `${fmtLabel(new Date(filters.startDate))}-${fmtLabel(new Date(filters.endDate))}`
    : '';

  const fetchStats = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([,v])=>v));
    const { data } = await api.get('/dashboard/stats', { params });
    return data;
  };

  const handleExcel = async () => {
    setLoading(l=>({...l,excel:true}));
    try {
      const params = { limit:10000, ...Object.fromEntries(Object.entries(filters).filter(([,v])=>v)) };
      const { data } = await api.get('/orders', { params });
      await exportOrdersExcel(data.orders, activePreset.replace(/ /g,'_').toLowerCase());
      addToast('Excel exported successfully');
    } catch { addToast('Export failed','error'); }
    finally { setLoading(l=>({...l,excel:false})); }
  };

  const handlePDF = async () => {
    setLoading(l=>({...l,pdf:true}));
    try {
      const data = await fetchStats();
      setStats(data);
      exportSummaryPDF(data, data.channelBreakdown, data.topProducts);
      addToast('PDF exported successfully');
    } catch { addToast('Export failed','error'); }
    finally { setLoading(l=>({...l,pdf:false})); }
  };

  const handleExportAll = async () => {
    setLoading(l=>({...l,all:true}));
    try {
      const params = { limit:10000, ...Object.fromEntries(Object.entries(filters).filter(([,v])=>v)) };
      const [ordersRes, leadsRes, customersRes] = await Promise.all([
        api.get('/orders', { params }),
        api.get('/leads', { params: { limit:10000 } }),
        api.get('/customers', { params: { limit:10000 } }),
      ]);
      await exportEverything(
        ordersRes.data.orders || [],
        leadsRes.data.leads || [],
        customersRes.data.customers || [],
        activePreset.replace(/ /g,'_').toLowerCase()
      );
      addToast('Everything exported — 3 sheets: Orders, Leads, Customers');
    } catch { addToast('Export failed','error'); }
    finally { setLoading(l=>({...l,all:false})); }
  };

  const loadPreview = async () => {
    setLoadingStats(true);
    try { setStats(await fetchStats()); } catch { addToast('Failed to load','error'); }
    finally { setLoadingStats(false); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.02em', color:'var(--fg)' }}>Reports &amp; Export</div>
        <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>Export your data and view business summaries</div>
      </div>

      {/* Period selector */}
      <div className="card" style={{ padding:'16px 18px' }}>
        <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.04em' }}>Quick ranges</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p)}
              style={{
                padding:'5px 12px', borderRadius:999, border:'1px solid', fontSize:12, fontWeight:500, cursor:'pointer',
                background: activePreset===p.label ? 'var(--accent)' : 'var(--card)',
                color: activePreset===p.label ? 'var(--accent-ink)' : 'var(--muted)',
                borderColor: activePreset===p.label ? 'var(--accent)' : 'var(--rule)',
                transition:'all 0.15s',
              }}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end' }}>
          <div>
            <label className="label">Start date</label>
            <input type="date" className="input" style={{ width:160 }} value={filters.startDate}
              onChange={e=>{ setFilters(f=>({...f,startDate:e.target.value})); setActivePreset(''); }} />
          </div>
          <div>
            <label className="label">End date</label>
            <input type="date" className="input" style={{ width:160 }} value={filters.endDate}
              onChange={e=>{ setFilters(f=>({...f,endDate:e.target.value})); setActivePreset(''); }} />
          </div>
          <div>
            <label className="label">Channel</label>
            <SelectInput value={filters.channel} onChange={e=>setFilters(f=>({...f,channel:e.target.value}))}>
              <option value="">All channels</option>
              {['Website','WhatsApp'].map(c=><option key={c}>{c}</option>)}
            </SelectInput>
          </div>
          <button className="btn-secondary" style={{ fontSize:12 }} onClick={loadPreview} disabled={loadingStats}>
            {loadingStats ? 'Loading…' : 'Preview stats'}
          </button>
        </div>
        {filters.startDate && filters.endDate && (
          <div style={{ marginTop:10, fontSize:12, color:'var(--muted)' }}>
            Period: <strong style={{ color:'var(--fg)' }}>{fmtLabel(new Date(filters.startDate))} → {fmtLabel(new Date(filters.endDate))}</strong>
          </div>
        )}
      </div>

      {/* Export cards */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap:14 }}>
        <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'22px 18px' }}>
          <div style={{ fontSize:28, marginBottom:10 }}>📊</div>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--fg)', marginBottom:5 }}>Orders Excel</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginBottom:16, lineHeight:1.5 }}>All orders for the selected period as .xlsx</div>
          <button className="btn-primary" style={{ width:'100%', justifyContent:'center', fontSize:12 }} onClick={handleExcel} disabled={loading.excel}>
            {loading.excel ? <><Spinner /> Generating…</> : '↓ Download Excel'}
          </button>
        </div>

        <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'22px 18px' }}>
          <div style={{ fontSize:28, marginBottom:10 }}>📄</div>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--fg)', marginBottom:5 }}>Summary PDF</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginBottom:16, lineHeight:1.5 }}>Metrics, channel breakdown and top products</div>
          <button style={{ width:'100%', justifyContent:'center', fontSize:12, display:'flex', alignItems:'center', gap:6, background:'var(--warn)', color:'white', border:'none', borderRadius:9, padding:'7px', fontWeight:500, cursor:'pointer', opacity:loading.pdf?0.7:1, transition:'opacity 0.15s' }}
            onClick={handlePDF} disabled={loading.pdf}>
            {loading.pdf ? <><Spinner /> Generating…</> : '↓ Download PDF'}
          </button>
        </div>

        <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'22px 18px', border:'1px solid var(--accent-bg)' }}>
          <div style={{ fontSize:28, marginBottom:10 }}>📦</div>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--fg)', marginBottom:5 }}>Export Everything</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginBottom:16, lineHeight:1.5 }}>Orders + Leads + Customers in one Excel file (3 sheets)</div>
          <button style={{ width:'100%', justifyContent:'center', fontSize:12, display:'flex', alignItems:'center', gap:6, background:'var(--accent)', color:'white', border:'none', borderRadius:9, padding:'7px', fontWeight:600, cursor:'pointer', opacity:loading.all?0.7:1, transition:'opacity 0.15s' }}
            onClick={handleExportAll} disabled={loading.all}>
            {loading.all ? <><Spinner /> Generating…</> : '↓ Export All Data'}
          </button>
        </div>
      </div>

      {/* Preview */}
      {stats && (
        <div className="card">
          <div style={{ fontSize:14, fontWeight:600, color:'var(--fg)', marginBottom:14 }}>
            Stats preview {dateLabel && <span style={{ fontSize:12, fontWeight:400, color:'var(--muted)', marginLeft:6 }}>· {dateLabel}</span>}
          </div>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:10, marginBottom:20 }}>
            {[
              { label:'Total Orders',    val:stats.overview?.totalOrders||0,
                sub: stats.overview?.ordersChange !== null ? `${stats.overview?.ordersChange>0?'+':''}${stats.overview?.ordersChange}% vs prev` : null,
                up: (stats.overview?.ordersChange||0) >= 0 },
              { label:'Total Revenue',   val:inr(stats.overview?.totalRevenue,true),
                sub: stats.overview?.revenueChange !== null ? `${stats.overview?.revenueChange>0?'+':''}${stats.overview?.revenueChange}% vs prev` : null,
                up: (stats.overview?.revenueChange||0) >= 0 },
              { label:'Avg Order Value', val:inr(Math.round(stats.overview?.avgOrderValue||0),true), sub:null },
              { label:'Conversion Rate', val:`${stats.overview?.conversionRate||0}%`, sub:null },
            ].map(({label,val,sub,up})=>(
              <div key={label} style={{ background:'var(--bg)', borderRadius:9, padding:'12px 14px', textAlign:'center' }}>
                <div style={{ fontSize:11, color:'var(--faint)', marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:18, fontWeight:600, color:'var(--fg)', fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>{val}</div>
                {sub && <div style={{ fontSize:10.5, color:up?'var(--accent)':'var(--danger)', marginTop:3, fontWeight:500 }}>{sub}</div>}
              </div>
            ))}
          </div>

          {stats.channelBreakdown?.length>0 && (
            <>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.04em' }}>Channel breakdown</div>
              <div style={{ border:'1px solid var(--rule)', borderRadius:10, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid var(--rule)' }}>
                      {['Channel','Orders','Revenue'].map(h=>(
                        <th key={h} style={{ padding:'8px 14px', fontSize:10.5, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--faint)', textAlign:'left', background:'var(--card-soft)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.channelBreakdown.map(c=>(
                      <tr key={c._id} style={{ borderBottom:'1px solid var(--rule)' }}>
                        <td style={{ padding:'9px 14px', fontSize:13, fontWeight:500, color:'var(--fg)' }}>{c._id}</td>
                        <td style={{ padding:'9px 14px', fontFamily:'Inter', fontSize:12, color:'var(--muted)', fontVariantNumeric:'tabular-nums' }}>{c.orders}</td>
                        <td style={{ padding:'9px 14px', fontFamily:'Inter', fontSize:13, fontWeight:600, color:'var(--accent)', fontVariantNumeric:'tabular-nums' }}>{inr(c.revenue,true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
