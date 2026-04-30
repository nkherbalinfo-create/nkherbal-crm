import { useState } from 'react';
import api from '../utils/api';
import { exportOrdersExcel, exportSummaryPDF } from '../utils/export';
import { useToast } from '../components/Toast';
import { DateInput, FilterBar, SelectInput } from '../components/FormControls';
import { format } from 'date-fns';

const inr = (n, c=false) => {
  if (!n) return '₹0';
  if (c) {
    if (n>=100000) return `₹${(n/100000).toFixed(1)}L`;
    if (n>=1000)   return `₹${(n/1000).toFixed(1)}K`;
    return `₹${n}`;
  }
  return '₹' + Number(n).toLocaleString('en-IN');
};

const EXPORTS = [
  { key:'excel', label:'Orders Excel', desc:'All orders with full details as .xlsx spreadsheet', icon:'📊', color:'var(--accent)', colorBg:'var(--accent-bg)' },
  { key:'pdf',   label:'Summary PDF',  desc:'Metrics, channel breakdown, top products as PDF', icon:'📄', color:'var(--warn)',   colorBg:'var(--warn-bg)'   },
];

export default function Reports() {
  const [filters, setFilters] = useState({ startDate:'', endDate:'', channel:'' });
  const [loading, setLoading] = useState({ excel:false, pdf:false });
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const { addToast } = useToast();

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
      await exportOrdersExcel(data.orders);
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

  const loadPreview = async () => {
    setLoadingStats(true);
    try { setStats(await fetchStats()); } catch { addToast('Failed to load','error'); }
    finally { setLoadingStats(false); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.02em', color:'var(--fg)' }}>Reports &amp; Export</div>
        <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>Export your data and view summaries</div>
      </div>

      {/* Period filter */}
      <div className="card" style={{ padding:'14px 18px' }}>
        <div style={{ fontSize:13, fontWeight:600, color:'var(--fg)', marginBottom:12 }}>Report period</div>
        <FilterBar style={{ border:'none', padding:0 }}>
          <div>
            <label className="label">Start date</label>
            <DateInput value={filters.startDate} onChange={value=>setFilters(f=>({...f,startDate:value}))} />
          </div>
          <div>
            <label className="label">End date</label>
            <DateInput value={filters.endDate} onChange={value=>setFilters(f=>({...f,endDate:value}))} />
          </div>
          <div>
            <label className="label">Channel</label>
            <SelectInput value={filters.channel} onChange={e=>setFilters(f=>({...f,channel:e.target.value}))}>
              <option value="">All channels</option>
              {['Website','WhatsApp'].map(c=><option key={c}>{c}</option>)}
            </SelectInput>
          </div>
          <button className="btn-primary" style={{ fontSize:12 }} onClick={loadPreview} disabled={loadingStats}>
            {loadingStats?'Loading…':'Load preview'}
          </button>
        </FilterBar>
      </div>

      {/* Export cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'24px 20px' }}>
          <div style={{ width:52, height:52, borderRadius:12, background:'var(--accent-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:14 }}>📊</div>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--fg)', marginBottom:6 }}>Orders Excel</div>
          <div style={{ fontSize:12.5, color:'var(--muted)', marginBottom:20, lineHeight:1.5 }}>Download all orders with full details as an Excel spreadsheet (.xlsx)</div>
          <button className="btn-primary" style={{ width:'100%', justifyContent:'center', fontSize:12.5 }} onClick={handleExcel} disabled={loading.excel}>
            {loading.excel ? (
              <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:12, height:12, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.6s linear infinite', display:'inline-block' }} />
                Generating…
              </span>
            ) : '↓ Download Excel'}
          </button>
        </div>

        <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'24px 20px' }}>
          <div style={{ width:52, height:52, borderRadius:12, background:'var(--warn-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:14 }}>📄</div>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--fg)', marginBottom:6 }}>Summary PDF</div>
          <div style={{ fontSize:12.5, color:'var(--muted)', marginBottom:20, lineHeight:1.5 }}>Download a formatted report with metrics, channel breakdown, and top products</div>
          <button style={{ width:'100%', justifyContent:'center', fontSize:12.5, display:'flex', alignItems:'center', gap:6, background:'var(--warn)', color:'white', border:'none', borderRadius:9, padding:'7px 13px', fontWeight:500, cursor:'pointer', opacity:loading.pdf?0.7:1 }} onClick={handlePDF} disabled={loading.pdf}>
            {loading.pdf ? (
              <>
                <span style={{ width:12, height:12, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.6s linear infinite', display:'inline-block' }} />
                Generating…
              </>
            ) : '↓ Download PDF'}
          </button>
        </div>
      </div>

      {/* Preview */}
      {stats && (
        <div className="card">
          <div style={{ fontSize:14, fontWeight:600, color:'var(--fg)', marginBottom:14 }}>Report preview</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
            {[
              { label:'Total Orders',   val:stats.overview?.totalOrders||0 },
              { label:'Total Revenue',  val:inr(stats.overview?.totalRevenue,true) },
              { label:'Avg Order Value',val:inr(Math.round(stats.overview?.avgOrderValue||0),true) },
              { label:'Conversion',     val:`${stats.overview?.conversionRate||0}%` },
            ].map(({label,val})=>(
              <div key={label} style={{ background:'var(--bg)', borderRadius:9, padding:'12px 14px', textAlign:'center' }}>
                <div style={{ fontSize:11, color:'var(--faint)', marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:18, fontWeight:600, color:'var(--fg)', fontFamily:'Inter', fontVariantNumeric:'tabular-nums' }}>{val}</div>
              </div>
            ))}
          </div>

          {stats.channelBreakdown?.length>0 && (
            <>
              <div style={{ fontSize:12, fontWeight:500, color:'var(--muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.04em' }}>Channel breakdown</div>
              <div style={{ border:'1px solid var(--rule)', borderRadius:10, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead style={{ borderBottom:'1px solid var(--rule)' }}>
                    <tr>
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
