// Shared primitives: icons, charts, sparklines.
// All scale with currentColor so they work in any palette.

const Icon = ({ name, size = 16, stroke = 1.6 }) => {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'grid':    return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/></svg>;
    case 'box':     return <svg {...p}><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>;
    case 'target':  return <svg {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>;
    case 'users':   return <svg {...p}><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3.5 3.5 0 010 7"/><path d="M21 20c0-2.5-1.6-4.6-4-5.5"/></svg>;
    case 'bell':    return <svg {...p}><path d="M6 8a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7z"/><path d="M10 19a2 2 0 004 0"/></svg>;
    case 'message': return <svg {...p}><path d="M4 12a8 8 0 1116 0c0 4.4-3.6 8-8 8H4l1.6-3.5A8 8 0 014 12z"/></svg>;
    case 'chart':   return <svg {...p}><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>;
    case 'gear':    return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>;
    case 'search':  return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>;
    case 'plus':    return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case 'arrow-up':   return <svg {...p}><path d="M7 17L17 7"/><path d="M8 7h9v9"/></svg>;
    case 'arrow-down': return <svg {...p}><path d="M17 7L7 17"/><path d="M16 17H7V8"/></svg>;
    case 'arrow-right': return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case 'check':   return <svg {...p}><path d="M5 13l4 4L19 7"/></svg>;
    case 'dot':     return <svg {...p}><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>;
    case 'sun':     return <svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>;
    case 'moon':    return <svg {...p}><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>;
    case 'download': return <svg {...p}><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>;
    case 'filter':  return <svg {...p}><path d="M3 5h18l-7 9v6l-4-2v-4L3 5z"/></svg>;
    case 'more':    return <svg {...p}><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>;
    case 'logo':    return <svg {...p} viewBox="0 0 24 24"><path d="M12 2C7 2 4 6 4 11c0 6 8 11 8 11s8-5 8-11c0-5-3-9-8-9z" fill="currentColor" stroke="none"/><path d="M12 22s-2-1.5-4-4c-1.5-2-2-4-2-6 0-1 .3-2 .8-2.8" stroke="rgba(255,255,255,.45)" fill="none"/></svg>;
    case 'leaf':    return <svg {...p}><path d="M3 21c0-9 7-16 18-16-1 11-7 18-18 16z"/><path d="M3 21c4-4 8-7 14-10"/></svg>;
    case 'calendar':return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>;
    case 'export':  return <svg {...p}><path d="M14 3h7v7"/><path d="M21 3l-9 9"/><path d="M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5"/></svg>;
    case 'whatsapp':return <svg {...p}><path d="M3 21l1.65-4.5A8 8 0 1112 20a8 8 0 01-3.4-.8L3 21z"/><path d="M8.5 9.5c.3 1 1 2 2 3s2 1.7 3 2c.3 0 1-.3 1-.8s-.5-.7-1-.8c-.3 0-.6 0-1 .3-.3-.2-.7-.5-1-.8s-.6-.7-.8-1c.3-.4.3-.7.3-1 0-.5-.3-1-.8-1s-.7.7-.7 1z" fill="currentColor"/></svg>;
    case 'fire':    return <svg {...p}><path d="M12 22a7 7 0 007-7c0-3-2-5-3-7-1 2-2 3-3 3-1-3-3-5-3-7-2 4-5 7-5 11a7 7 0 007 7z"/></svg>;
    default: return null;
  }
};

// Sparkline — accepts array of numbers. min/max auto, optional area fill.
function Spark({ data, w = 80, h = 28, stroke = 'currentColor', fill = 'none', strokeWidth = 1.5, dot = false }) {
  if (!data || !data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => [i * step, h - ((v - min) / range) * (h - 4) - 2]);
  const d = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const area = `${d} L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {fill !== 'none' && <path d={area} fill={fill} opacity="0.25" />}
      <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      {dot && <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2.5" fill={stroke} />}
    </svg>
  );
}

// Donut — simple segmented donut. segments: [{value, color}]
function Donut({ size = 110, thickness = 14, segments, track = 'rgba(0,0,0,.06)' }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((a, b) => a + b.value, 0);
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={thickness} />
      {segments.map((s, i) => {
        const len = (s.value / total) * c;
        const dash = `${len} ${c - len}`;
        const dashOff = -offset;
        offset += len;
        return (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={s.color} strokeWidth={thickness}
            strokeDasharray={dash} strokeDashoffset={dashOff}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            strokeLinecap="butt" />
        );
      })}
    </svg>
  );
}

// Bar chart — vertical bars
function Bars({ data, w = 240, h = 110, color = 'currentColor', track = 'transparent', barWidth = 0.55, formatLabel = (v) => v }) {
  const max = Math.max(...data.map(d => d.v));
  const cw = w / data.length;
  const bw = cw * barWidth;
  return (
    <svg width={w} height={h + 18} viewBox={`0 0 ${w} ${h + 18}`} style={{ display: 'block' }}>
      {data.map((d, i) => {
        const bh = (d.v / max) * h;
        const x = i * cw + (cw - bw) / 2;
        const y = h - bh;
        return (
          <g key={i}>
            <rect x={x} y={0} width={bw} height={h} fill={track} />
            <rect x={x} y={y} width={bw} height={bh} fill={color} rx="1.5" />
            <text x={i * cw + cw / 2} y={h + 13} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.55" fontFamily="inherit">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// Line chart — single line with area fill
function LineChart({ data, w = 280, h = 120, stroke = 'currentColor', fill, gridColor = 'rgba(0,0,0,.06)', showGrid = true }) {
  const min = Math.min(...data.map(d => d.v));
  const max = Math.max(...data.map(d => d.v));
  const range = max - min || 1;
  const padX = 0;
  const innerW = w - padX * 2;
  const innerH = h - 22;
  const step = innerW / (data.length - 1);
  const points = data.map((d, i) => [padX + i * step, 8 + innerH - ((d.v - min) / range) * (innerH - 16)]);
  const path = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const area = `${path} L${w - padX},${h - 18} L${padX},${h - 18} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {showGrid && [0, 1, 2, 3].map(i => <line key={i} x1={0} x2={w} y1={(i * (h - 22)) / 3 + 8} y2={(i * (h - 22)) / 3 + 8} stroke={gridColor} strokeDasharray="2 4" />)}
      {fill && <path d={area} fill={fill} opacity="0.6" />}
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.8" fill={stroke} />
      ))}
      {data.map((d, i) => (
        <text key={i} x={points[i][0]} y={h - 4} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.5" fontFamily="inherit">{d.label}</text>
      ))}
    </svg>
  );
}

// Progress bar
function Progress({ value, max = 100, color = 'currentColor', track = 'rgba(0,0,0,.08)', height = 6, radius = 3 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ width: '100%', height, background: track, borderRadius: radius, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: radius, transition: 'width .3s' }} />
    </div>
  );
}

// Tiny avatar with initials
function Avatar({ name, size = 28, bg, fg = '#fff', font }) {
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  // deterministic-ish color from name
  const colors = ['#1f1f1f', '#2a2a2a', '#383838', '#4a4a4a', '#555'];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, background: bg || colors[idx], color: fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 600, fontFamily: font || 'inherit', flexShrink: 0 }}>
      {initials}
    </div>
  );
}

Object.assign(window, { Icon, Spark, Donut, Bars, LineChart, Progress, Avatar });
