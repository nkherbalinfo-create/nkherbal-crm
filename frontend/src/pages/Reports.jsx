import { useState } from 'react';
import api from '../utils/api';
import { exportOrdersExcel, exportSummaryPDF } from '../utils/export';
import { useToast } from '../components/Toast';
import { FileSpreadsheet, FileText, Loader2, Filter } from 'lucide-react';

const fmt = (n) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(1)}K` : `₹${n}`;

export default function Reports() {
  const [filters, setFilters] = useState({ startDate: '', endDate: '', channel: '' });
  const [loading, setLoading] = useState({ excel: false, pdf: false });
  const [stats, setStats] = useState(null);
  const { addToast } = useToast();

  const fetchStats = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v));
    const { data } = await api.get('/dashboard/stats', { params });
    return data;
  };

  const handleExcel = async () => {
    setLoading(l => ({...l, excel: true}));
    try {
      const params = { limit: 10000, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) };
      const { data } = await api.get('/orders', { params });
      await exportOrdersExcel(data.orders);
      addToast('Excel exported successfully');
    } catch { addToast('Export failed', 'error'); }
    finally { setLoading(l => ({...l, excel: false})); }
  };

  const handlePDF = async () => {
    setLoading(l => ({...l, pdf: true}));
    try {
      const data = await fetchStats();
      setStats(data);
      exportSummaryPDF(data, data.channelBreakdown, data.topProducts);
      addToast('PDF exported successfully');
    } catch { addToast('Export failed', 'error'); }
    finally { setLoading(l => ({...l, pdf: false})); }
  };

  const load = async () => {
    try { setStats(await fetchStats()); } catch {}
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Reports & Export</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Export your data and view summaries</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={15} style={{ color: 'var(--accent)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Report Period</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input w-auto" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" className="input w-auto" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
          </div>
          <div>
            <label className="label">Channel</label>
            <select className="input w-auto" value={filters.channel} onChange={e => setFilters({...filters, channel: e.target.value})}>
              <option value="">All Channels</option>
              {['Amazon','Website','WhatsApp','Offline'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={load} className="btn-secondary">Load Preview</button>
          </div>
        </div>
      </div>

      {/* Export options */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 14px #10b98140' }}>
            <FileSpreadsheet size={24} className="text-white" />
          </div>
          <h3 className="font-bold mb-1" style={{ color: 'var(--text)' }}>Orders Excel Export</h3>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            Download all orders with full details as an Excel spreadsheet (.xlsx)
          </p>
          <button onClick={handleExcel} disabled={loading.excel} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading.excel ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
            {loading.excel ? 'Generating…' : 'Download Excel'}
          </button>
        </div>

        <div className="card flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', boxShadow: '0 4px 14px #ef444440' }}>
            <FileText size={24} className="text-white" />
          </div>
          <h3 className="font-bold mb-1" style={{ color: 'var(--text)' }}>Summary PDF Report</h3>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            Download a formatted report with metrics, channel breakdown, and top products
          </p>
          <button onClick={handlePDF} disabled={loading.pdf} className="btn-danger w-full flex items-center justify-center gap-2">
            {loading.pdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {loading.pdf ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Preview */}
      {stats && (
        <div className="card">
          <h2 className="font-bold text-sm mb-4" style={{ color: 'var(--text)' }}>Report Preview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Orders', value: stats.overview?.totalOrders || 0 },
              { label: 'Total Revenue', value: fmt(stats.overview?.totalRevenue || 0) },
              { label: 'Avg Order Value', value: fmt(Math.round(stats.overview?.avgOrderValue || 0)) },
              { label: 'Conversion', value: `${stats.overview?.conversionRate || 0}%` }
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-subtle)' }}>
                <p className="text-xs mb-1.5" style={{ color: 'var(--text-faint)' }}>{label}</p>
                <p className="text-xl font-bold" style={{ color: 'var(--text)' }}>{value}</p>
              </div>
            ))}
          </div>

          {stats.channelBreakdown?.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-faint)' }}>Channel Breakdown</p>
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-sm">
                  <thead style={{ background: 'var(--bg-subtle)' }}>
                    <tr>
                      {['Channel','Orders','Revenue'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {stats.channelBreakdown.map(c => (
                      <tr key={c._id} style={{ borderColor: 'var(--border)' }}>
                        <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text)' }}>{c._id}</td>
                        <td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>{c.orders}</td>
                        <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--success)' }}>{fmt(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
