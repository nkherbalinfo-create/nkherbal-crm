// Variant 1 — Editorial Mono
// Big Instrument Serif headlines, lots of whitespace, restrained palette,
// mono numerals. Reads like a financial publication.

function VariantEditorial({ dark }) {
  const c = dark ? {
    bg: '#0e0e0c', card: '#16161310', cardBd: 'rgba(255,255,255,.08)',
    fg: '#f4f1ea', muted: 'rgba(244,241,234,.55)', faint: 'rgba(244,241,234,.32)',
    rule: 'rgba(244,241,234,.12)', accent: '#7ed29a', accentInk: '#0e0e0c',
    sidebar: '#0a0a08', sidebarHover: 'rgba(255,255,255,.05)',
  } : {
    bg: '#fafaf7', card: '#ffffff', cardBd: 'rgba(20,20,16,.06)',
    fg: '#1a1a17', muted: 'rgba(26,26,23,.55)', faint: 'rgba(26,26,23,.32)',
    rule: 'rgba(26,26,23,.1)', accent: '#1f7a3f', accentInk: '#ffffff',
    sidebar: '#fafaf7', sidebarHover: 'rgba(0,0,0,.04)',
  };

  const [active, setActive] = React.useState('dashboard');

  const ui = {
    width: 1440, height: 1000, background: c.bg, color: c.fg,
    fontFamily: '"Inter", system-ui, sans-serif',
    display: 'grid', gridTemplateColumns: '220px 1fr', overflow: 'hidden',
  };
  const serif = { fontFamily: '"Instrument Serif", "Times New Roman", serif', fontWeight: 400, letterSpacing: '-0.01em' };
  const mono = { fontFamily: '"JetBrains Mono", monospace', fontVariantNumeric: 'tabular-nums' };
  const cap = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '.14em', color: c.muted, fontWeight: 500 };

  return (
    <div style={ui}>
      {/* Sidebar */}
      <aside style={{ borderRight: `1px solid ${c.rule}`, padding: '28px 16px', background: c.sidebar, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px 28px' }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: c.accent, color: c.accentInk, display: 'grid', placeItems: 'center' }}>
            <Icon name="leaf" size={16} stroke={2} />
          </div>
          <div>
            <div style={{ ...serif, fontSize: 18, lineHeight: 1 }}>NK Herbal</div>
            <div style={{ ...cap, fontSize: 9, marginTop: 4 }}>CRM · v2</div>
          </div>
        </div>

        <div style={{ ...cap, padding: '4px 12px 8px' }}>Workspace</div>
        {NK.nav.map(n => (
          <div key={n.id} onClick={() => setActive(n.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
              borderRadius: 6, cursor: 'pointer',
              background: active === n.id ? c.sidebarHover : 'transparent',
              color: active === n.id ? c.fg : c.muted,
              fontSize: 13, fontWeight: active === n.id ? 500 : 400,
              borderLeft: active === n.id ? `2px solid ${c.accent}` : '2px solid transparent', marginLeft: -2,
            }}>
            <Icon name={n.icon} size={15} stroke={1.5} />
            <span style={{ flex: 1 }}>{n.label}</span>
            {n.badge && <span style={{ ...mono, fontSize: 10, color: c.faint }}>{n.badge}</span>}
          </div>
        ))}

        <div style={{ marginTop: 'auto', borderTop: `1px solid ${c.rule}`, paddingTop: 16, marginLeft: -16, marginRight: -16, padding: '16px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name="Jassim Sayed" size={28} bg={c.accent} fg={c.accentInk} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>Jassim Sayed</div>
              <div style={{ fontSize: 10, color: c.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>nkherbalinfo@gmail.com</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ overflow: 'auto', padding: '0 56px' }}>
        {/* Hero */}
        <header style={{ padding: '40px 0 36px', borderBottom: `1px solid ${c.rule}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ ...cap, marginBottom: 14 }}>Monday · 27 April 2026 · Mumbai</div>
              <h1 style={{ ...serif, fontSize: 56, lineHeight: 1, margin: 0, letterSpacing: '-0.02em' }}>
                Good morning, Jassim.
              </h1>
              <p style={{ fontSize: 15, color: c.muted, margin: '14px 0 0', maxWidth: 540, lineHeight: 1.5 }}>
                Six orders so far today, ₹14,200 in revenue, two new customers from the WhatsApp bot. You're at 77% of the monthly target with three days to go.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ background: 'transparent', border: `1px solid ${c.rule}`, color: c.fg, padding: '9px 14px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="calendar" size={13} /> April 2026
              </button>
              <button style={{ background: c.accent, border: 'none', color: c.accentInk, padding: '9px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="plus" size={13} /> New order
              </button>
            </div>
          </div>
        </header>

        {/* Big metric row */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: `1px solid ${c.rule}` }}>
          {[
            { label: 'Revenue · April', big: inr(NK.metrics.totalRevenue, { compact: true }), sub: '+18.2% vs March', spark: NK.trend.map(t => t.revenue), pos: true },
            { label: 'Orders · April',  big: num(NK.metrics.totalOrders),                        sub: '+28% vs March',     spark: NK.trend.map(t => t.orders), pos: true },
            { label: 'Customers',       big: num(NK.metrics.uniqueCustomers),                    sub: '27 new this month', spark: [70, 74, 78, 82, 88, 98], pos: true },
            { label: 'GST collected',   big: inr(NK.metrics.gstCollected, { compact: true }),    sub: '5% on orders',      spark: [12, 14, 13, 16, 17, 19], pos: true },
          ].map((m, i) => (
            <div key={i} style={{ padding: '32px 24px 28px', borderRight: i < 3 ? `1px solid ${c.rule}` : 'none' }}>
              <div style={cap}>{m.label}</div>
              <div style={{ ...serif, fontSize: 52, lineHeight: 1, marginTop: 18, letterSpacing: '-0.02em' }}>{m.big}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 18 }}>
                <div style={{ ...mono, fontSize: 11, color: m.pos ? c.accent : c.muted }}>↑ {m.sub}</div>
                <div style={{ color: c.accent }}>
                  <Spark data={m.spark} w={64} h={22} stroke={c.accent} fill={c.accent} strokeWidth={1.4} />
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Target banner */}
        <section style={{ padding: '28px 0', borderBottom: `1px solid ${c.rule}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <span style={{ ...cap }}>Monthly target</span>
              <span style={{ ...serif, fontSize: 20 }}>{NK.metrics.targetProgress}% reached</span>
            </div>
            <div style={{ ...mono, fontSize: 12, color: c.muted }}>
              <span style={{ color: c.fg }}>{inr(NK.metrics.totalRevenue, { compact: true })}</span> &nbsp;/&nbsp; {inr(NK.metrics.targetRevenue, { compact: true })}
            </div>
          </div>
          <div style={{ height: 4, background: c.rule, borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
            <div style={{ width: `${NK.metrics.targetProgress}%`, height: '100%', background: c.accent }} />
            {/* tick marks */}
            {[25, 50, 75].map(t => (
              <div key={t} style={{ position: 'absolute', left: `${t}%`, top: -3, width: 1, height: 10, background: c.faint }} />
            ))}
          </div>
        </section>

        {/* Two-column lower */}
        <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 0, borderBottom: `1px solid ${c.rule}` }}>
          {/* Left: revenue trend */}
          <div style={{ padding: '32px 32px 32px 0', borderRight: `1px solid ${c.rule}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
              <div>
                <div style={cap}>Revenue trend</div>
                <h2 style={{ ...serif, fontSize: 28, margin: '6px 0 0' }}>Six-month outlook</h2>
              </div>
              <div style={{ display: 'flex', gap: 14, ...mono, fontSize: 11, color: c.muted }}>
                <span>● <span style={{ color: c.fg }}>Revenue</span></span>
                <span style={{ color: c.faint }}>○ Orders</span>
              </div>
            </div>
            <div style={{ color: c.accent }}>
              <LineChart
                data={NK.trend.map(t => ({ label: t.m, v: t.revenue }))}
                w={780} h={220}
                stroke={c.accent}
                fill={c.accent}
                gridColor={c.rule}
              />
            </div>
          </div>

          {/* Right: channel mix */}
          <div style={{ padding: '32px 0 32px 32px' }}>
            <div style={cap}>Channel mix</div>
            <h2 style={{ ...serif, fontSize: 28, margin: '6px 0 22px' }}>By revenue</h2>
            {NK.channels.map((ch, i) => (
              <div key={ch.name} style={{ padding: '14px 0', borderBottom: i < 3 ? `1px solid ${c.rule}` : 'none', display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{ch.name}</div>
                  <div style={{ ...mono, fontSize: 10, color: c.muted, marginTop: 4 }}>{ch.orders} orders</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ ...serif, fontSize: 20 }}>{inr(ch.revenue, { compact: true })}</div>
                  <div style={{ ...mono, fontSize: 10, color: c.muted, marginTop: 4 }}>{(ch.share * 100).toFixed(0)}%</div>
                </div>
                <div style={{ gridColumn: '1 / -1', height: 2, background: c.rule, position: 'relative', marginTop: 4 }}>
                  <div style={{ width: `${ch.share * 100}%`, height: '100%', background: c.fg }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom: orders + leads side by side */}
        <section style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 0 }}>
          <div style={{ padding: '32px 32px 40px 0', borderRight: `1px solid ${c.rule}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
              <div>
                <div style={cap}>Recent</div>
                <h2 style={{ ...serif, fontSize: 28, margin: '6px 0 0' }}>Latest orders</h2>
              </div>
              <a style={{ fontSize: 12, color: c.muted, textDecoration: 'none' }}>View all →</a>
            </div>
            <div>
              {NK.recentOrders.slice(0, 6).map((o, i) => (
                <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr 80px 90px', gap: 12, padding: '14px 0', borderTop: `1px solid ${c.rule}`, alignItems: 'center', fontSize: 12 }}>
                  <div style={{ ...mono, color: c.muted, fontSize: 10 }}>{o.id}</div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{o.name}</div>
                    <div style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>{o.city}</div>
                  </div>
                  <div style={{ color: c.muted, fontSize: 11 }}>{o.product}</div>
                  <div style={{ ...mono, fontSize: 11 }}>{inr(o.amt)}</div>
                  <div style={{ ...mono, fontSize: 10, color: o.status === 'Delivered' ? c.accent : c.muted, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                    {o.status === 'Delivered' ? '● ' : '○ '}{o.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '32px 0 40px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
              <div>
                <div style={cap}>Pipeline</div>
                <h2 style={{ ...serif, fontSize: 28, margin: '6px 0 0' }}>Top products</h2>
              </div>
            </div>
            {NK.topProducts.map((p, i) => (
              <div key={p.rank} style={{ padding: '16px 0', borderTop: `1px solid ${c.rule}`, display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: 12, alignItems: 'center' }}>
                <div style={{ ...serif, fontSize: 24, color: c.faint }}>{p.rank}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</div>
                  <div style={{ ...mono, fontSize: 10, color: c.muted, marginTop: 3 }}>{p.orders} orders</div>
                </div>
                <div style={{ ...serif, fontSize: 18, textAlign: 'right' }}>{inr(p.revenue, { compact: true })}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

window.VariantEditorial = VariantEditorial;
