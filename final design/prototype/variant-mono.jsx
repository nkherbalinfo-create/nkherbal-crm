// Variant 4 — Mono Brutalist
// Strong typography, bold dividers, all-mono numerals,
// no decoration. Pure black/white with hairline rules.

function VariantMono({ dark }) {
  const c = dark ? {
    bg: '#000000', card: '#000000', fg: '#ffffff',
    muted: 'rgba(255,255,255,.55)', faint: 'rgba(255,255,255,.32)',
    rule: 'rgba(255,255,255,.18)', strong: '#ffffff',
    accent: '#b9ff66', accentInk: '#000000',
    hover: 'rgba(255,255,255,.05)',
  } : {
    bg: '#ffffff', card: '#ffffff', fg: '#000000',
    muted: 'rgba(0,0,0,.55)', faint: 'rgba(0,0,0,.32)',
    rule: 'rgba(0,0,0,.18)', strong: '#000000',
    accent: '#1a4d1f', accentInk: '#ffffff',
    hover: 'rgba(0,0,0,.04)',
  };

  const [active, setActive] = React.useState('dashboard');
  const ui = { width: 1440, height: 1000, background: c.bg, color: c.fg, fontFamily: '"Geist", "Inter", system-ui, sans-serif', display: 'grid', gridTemplateColumns: '180px 1fr', overflow: 'hidden', fontSize: 13 };
  const mono = { fontFamily: '"Geist Mono", "JetBrains Mono", monospace', fontVariantNumeric: 'tabular-nums' };
  const num1 = { ...mono, letterSpacing: '-0.02em' };
  const cap = { fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.18em', color: c.muted, fontWeight: 500 };

  return (
    <div style={ui}>
      <aside style={{ borderRight: `1px solid ${c.rule}`, padding: '20px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 18px 28px', borderBottom: `1px solid ${c.rule}` }}>
          <div style={{ ...mono, fontSize: 11, letterSpacing: '.2em', color: c.muted }}>NK / HERBAL</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4, letterSpacing: '-0.02em' }}>CRM_v2</div>
        </div>

        <div style={{ padding: '14px 0' }}>
          {NK.nav.map((n, i) => {
            const sel = active === n.id;
            return (
              <div key={n.id} onClick={() => setActive(n.id)} style={{
                display: 'grid', gridTemplateColumns: '24px 1fr auto', alignItems: 'center', gap: 6,
                padding: '11px 18px', cursor: 'pointer',
                background: sel ? c.fg : 'transparent',
                color: sel ? c.bg : c.fg,
                fontSize: 12.5, fontWeight: sel ? 600 : 400,
              }}>
                <span style={{ ...mono, fontSize: 9.5, color: sel ? c.bg : c.faint }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ textTransform: 'uppercase', letterSpacing: '.04em' }}>{n.label}</span>
                {n.badge && <span style={{ ...mono, fontSize: 10 }}>{n.badge}</span>}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 'auto', padding: '16px 18px', borderTop: `1px solid ${c.rule}` }}>
          <div style={cap}>SESSION</div>
          <div style={{ ...mono, fontSize: 11, color: c.muted, marginTop: 6 }}>jassim@nkherbal</div>
          <div style={{ ...mono, fontSize: 10, color: c.faint, marginTop: 2 }}>27 APR · 09:42 IST</div>
        </div>
      </aside>

      <main style={{ overflow: 'auto' }}>
        {/* Header band */}
        <div style={{ borderBottom: `1px solid ${c.rule}`, padding: '20px 32px', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'flex-end', gap: 24 }}>
          <div>
            <div style={cap}>DASHBOARD / APRIL 2026 / OVERVIEW</div>
            <h1 style={{ fontSize: 44, fontWeight: 700, margin: '10px 0 0', letterSpacing: '-0.035em', lineHeight: 1 }}>
              Sales overview.
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 0, border: `1px solid ${c.rule}` }}>
            <button style={brutBtn(c, mono)}>APR 1–27</button>
            <button style={{ ...brutBtn(c, mono), borderLeft: `1px solid ${c.rule}` }}>ALL CHANNELS</button>
            <button style={{ ...brutBtn(c, mono), borderLeft: `1px solid ${c.rule}`, background: c.fg, color: c.bg }}>+ ORDER</button>
          </div>
        </div>

        {/* Big number row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: `1px solid ${c.rule}` }}>
          {[
            { l: 'TOTAL REVENUE', v: inr(NK.metrics.totalRevenue, { compact: true }), d: '+18.2%', spark: NK.trend.map(t => t.revenue) },
            { l: 'TOTAL ORDERS',  v: num(NK.metrics.totalOrders),                     d: '+28.0%', spark: NK.trend.map(t => t.orders) },
            { l: 'NEW CUSTOMERS', v: num(NK.metrics.newCustomers),                    d: '+12.5%', spark: [22,18,24,19,25,27] },
            { l: 'CONV. RATE',    v: NK.metrics.conversionRate.toFixed(1) + '%',      d: '+2.1pp', spark: [12,13,14,15,16,18] },
          ].map((m, i) => (
            <div key={i} style={{ padding: '24px 24px 22px', borderRight: i < 3 ? `1px solid ${c.rule}` : 'none' }}>
              <div style={{ ...cap, color: c.fg }}>{m.l}</div>
              <div style={{ ...num1, fontSize: 56, fontWeight: 700, marginTop: 14, lineHeight: .95 }}>{m.v}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                <span style={{ ...mono, fontSize: 11, color: c.fg, padding: '3px 8px', border: `1px solid ${c.rule}`, fontWeight: 500 }}>{m.d}</span>
                <Spark data={m.spark} w={70} h={22} stroke={c.fg} strokeWidth={1.5} />
              </div>
            </div>
          ))}
        </div>

        {/* Target ribbon */}
        <div style={{ padding: '24px 32px', borderBottom: `1px solid ${c.rule}`, display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={cap}>MONTHLY TARGET</div>
            <div style={{ ...num1, fontSize: 30, fontWeight: 700, marginTop: 6 }}>{NK.metrics.targetProgress}<span style={{ color: c.muted }}>/100</span></div>
          </div>
          <div style={{ position: 'relative', height: 26, border: `1px solid ${c.rule}` }}>
            <div style={{ width: `${NK.metrics.targetProgress}%`, height: '100%', background: c.fg }} />
            {/* tick marks */}
            {[0, 25, 50, 75, 100].map(t => (
              <div key={t} style={{ position: 'absolute', left: `${t}%`, bottom: -16, ...mono, fontSize: 9, color: c.faint, transform: 'translateX(-50%)' }}>{t}</div>
            ))}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ ...mono, fontSize: 11, color: c.muted }}>{inr(NK.metrics.totalRevenue, { compact: true })} / {inr(NK.metrics.targetRevenue, { compact: true })}</div>
            <div style={{ ...mono, fontSize: 10, color: c.faint, marginTop: 4 }}>3 DAYS LEFT</div>
          </div>
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', borderBottom: `1px solid ${c.rule}` }}>
          <div style={{ padding: '24px 32px', borderRight: `1px solid ${c.rule}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
              <div>
                <div style={cap}>FIG. 01</div>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 0', letterSpacing: '-0.02em' }}>Revenue trend, 6mo.</h2>
              </div>
              <div style={{ ...mono, fontSize: 10, color: c.muted }}>NOV 2025 → APR 2026</div>
            </div>
            <LineChart data={NK.trend.map(t => ({ label: t.m, v: t.revenue }))} w={760} h={210} stroke={c.fg} fill={c.fg} gridColor={c.rule} />
          </div>
          <div style={{ padding: '24px 32px' }}>
            <div style={cap}>FIG. 02</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 18px', letterSpacing: '-0.02em' }}>Channel mix.</h2>
            {NK.channels.map((ch, i) => (
              <div key={ch.name} style={{ padding: '12px 0', borderTop: i ? `1px solid ${c.rule}` : 'none', display: 'grid', gridTemplateColumns: '20px 1fr auto', gap: 10, alignItems: 'center' }}>
                <span style={{ ...mono, fontSize: 10, color: c.faint }}>{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>{ch.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <div style={{ flex: 1, height: 6, background: c.rule, position: 'relative' }}>
                      <div style={{ width: `${ch.share * 100}%`, height: '100%', background: c.fg }} />
                    </div>
                  </div>
                </div>
                <div style={{ ...num1, fontSize: 18, fontWeight: 700, textAlign: 'right' }}>
                  {(ch.share * 100).toFixed(0)}<span style={{ ...mono, fontSize: 10, color: c.muted, fontWeight: 400 }}>%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — orders + products */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', minHeight: 320 }}>
          <div style={{ padding: '24px 32px', borderRight: `1px solid ${c.rule}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <div>
                <div style={cap}>FIG. 03</div>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 0', letterSpacing: '-0.02em' }}>Recent orders.</h2>
              </div>
              <a style={{ ...mono, fontSize: 11, color: c.fg, textDecoration: 'underline', cursor: 'pointer' }}>VIEW ALL →</a>
            </div>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr 70px 90px', gap: 12, padding: '8px 0', ...cap, borderTop: `2px solid ${c.fg}`, borderBottom: `1px solid ${c.rule}` }}>
                <span>ID</span><span>CUSTOMER</span><span>PRODUCT</span><span>VALUE</span><span>STATUS</span>
              </div>
              {NK.recentOrders.slice(0, 6).map(o => (
                <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr 70px 90px', gap: 12, padding: '11px 0', borderBottom: `1px solid ${c.rule}`, alignItems: 'center', fontSize: 12 }}>
                  <span style={{ ...mono, fontSize: 10.5, color: c.muted }}>{o.id}</span>
                  <div>
                    <div style={{ fontWeight: 500 }}>{o.name}</div>
                    <div style={{ ...mono, fontSize: 10, color: c.faint, marginTop: 2 }}>{o.city.toUpperCase()}</div>
                  </div>
                  <span style={{ color: c.muted, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.product}</span>
                  <span style={{ ...mono, fontSize: 11.5, fontWeight: 500 }}>{inr(o.amt)}</span>
                  <span style={{ ...mono, fontSize: 10, padding: '3px 7px', border: `1px solid ${c.rule}`, color: c.fg, fontWeight: 500, textAlign: 'center', textTransform: 'uppercase' }}>{o.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '24px 32px' }}>
            <div style={cap}>FIG. 04</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 14px', letterSpacing: '-0.02em' }}>Top products.</h2>
            {NK.topProducts.map((p, i) => (
              <div key={p.rank} style={{ padding: '14px 0', borderTop: `1px solid ${c.rule}`, borderBottom: i === NK.topProducts.length - 1 ? `1px solid ${c.rule}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
                    <span style={{ ...num1, fontSize: 22, fontWeight: 700 }}>0{p.rank}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  </div>
                  <span style={{ ...num1, fontSize: 14, fontWeight: 600 }}>{inr(p.revenue, { compact: true })}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <div style={{ height: 4, background: c.rule, position: 'relative' }}>
                    <div style={{ width: `${p.revenue / NK.topProducts[0].revenue * 100}%`, height: '100%', background: c.fg }} />
                  </div>
                  <span style={{ ...mono, fontSize: 10, color: c.muted }}>{p.orders} orders</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function brutBtn(c, mono) {
  return {
    background: 'transparent', border: 'none', color: c.fg,
    padding: '10px 16px', ...mono, fontSize: 11, fontWeight: 500, letterSpacing: '.1em',
    cursor: 'pointer', textTransform: 'uppercase',
  };
}

window.VariantMono = VariantMono;
