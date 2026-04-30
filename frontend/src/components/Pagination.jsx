export default function Pagination({ page, pages, total, limit = 20, onPage }) {
  if (!pages || pages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  // Build page number list with ellipsis for large ranges
  const nums = () => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    const out = [1];
    if (page - 2 > 2)  out.push('…');
    for (let i = Math.max(2, page - 2); i <= Math.min(pages - 1, page + 2); i++) out.push(i);
    if (page + 2 < pages - 1) out.push('…');
    out.push(pages);
    return out;
  };

  const Btn = ({ children, onClick, disabled, active }) => (
    <button onClick={onClick} disabled={disabled}
      style={{
        minWidth: 32, height: 32, padding: '0 6px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid', borderRadius: 8, fontSize: 12, fontWeight: active ? 600 : 400,
        cursor: disabled || active ? 'default' : 'pointer',
        background: active ? 'var(--accent)' : 'var(--card)',
        color: active ? 'var(--accent-ink)' : disabled ? 'var(--faint)' : 'var(--fg)',
        borderColor: active ? 'var(--accent)' : 'var(--rule)',
        transition: 'background 0.15s, border-color 0.15s, color 0.15s',
        opacity: disabled ? 0.45 : 1,
      }}>
      {children}
    </button>
  );

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
      <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'Inter', fontVariantNumeric: 'tabular-nums' }}>
        Showing {from}–{to} of {total}
      </span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <Btn onClick={() => onPage(page - 1)} disabled={page <= 1}>← Prev</Btn>
        {nums().map((n, i) =>
          n === '…'
            ? <span key={`d${i}`} style={{ padding: '0 2px', color: 'var(--faint)', fontSize: 12, userSelect: 'none' }}>…</span>
            : <Btn key={n} onClick={() => onPage(n)} active={n === page}>{n}</Btn>
        )}
        <Btn onClick={() => onPage(page + 1)} disabled={page >= pages}>Next →</Btn>
      </div>
    </div>
  );
}
