import { TrendingUp, TrendingDown } from 'lucide-react';

const GRADIENTS = {
  indigo:  ['#6366f1', '#8b5cf6'],
  emerald: ['#10b981', '#059669'],
  violet:  ['#8b5cf6', '#6366f1'],
  amber:   ['#f59e0b', '#ef4444'],
  rose:    ['#ef4444', '#f97316'],
  sky:     ['#06b6d4', '#3b82f6'],
  teal:    ['#14b8a6', '#06b6d4'],
  orange:  ['#f97316', '#f59e0b'],
};

export default function MetricCard({ title, value, sub, color = 'indigo', icon: Icon, trend }) {
  const [from, to] = GRADIENTS[color] || GRADIENTS.indigo;

  return (
    <div className="card group hover:-translate-y-0.5 transition-all duration-200 cursor-default">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-faint)' }}>
            {title}
          </p>
          <p className="text-2xl font-bold leading-none" style={{ color: 'var(--text)' }}>{value}</p>

          {sub && <p className="text-xs mt-1.5 truncate" style={{ color: 'var(--text-muted)' }}>{sub}</p>}

          {trend && (
            <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
              trend.direction === 'up'
                ? 'bg-emerald-500/15 text-emerald-500'
                : 'bg-red-500/15 text-red-400'
            }`}>
              {trend.direction === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {trend.value}%
            </span>
          )}
        </div>

        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white"
          style={{
            background: `linear-gradient(135deg, ${from}, ${to})`,
            boxShadow: `0 4px 14px ${from}50`,
          }}>
          {Icon && <Icon size={19} strokeWidth={2.2} />}
        </div>
      </div>
    </div>
  );
}
