// Variant 2 — Linear/Stripe Pro
// Dense, keyboard-feel, mono numerals, single-pixel rules.
// Top command bar + sidebar + dense grid of metric tiles + crisp tables.

function VariantLinear({ dark }) {
  const c = dark ? {
    bg: '#0a0b0d', panel: '#101113', card: '#0e0f11', hover: '#16181b',
    fg: '#eef0f2', muted: 'rgba(238,240,242,.55)', faint: 'rgba(238,240,242,.32)',
    rule: 'rgba(255,255,255,.07)', strong: 'rgba(255,255,255,.12)',
    accent: '#3fb87e', accentSoft: 'rgba(63,184,126,.12)',
    warn: '#e8b94a', danger: '#e87a6e',
  } : {
    bg: '#fbfbfa', panel: '#ffffff', card: '#ffffff', hover: '#f3f3f1',
    fg: '#0e1014', muted: 'rgba(14,16,20,.6)', faint: 'rgba(14,16,20,.36)',
    rule: 'rgba(14,16,20,.07)', strong: 'rgba(14,16,20,.13)',
    accent: '#1f8a4f', accentSoft: 'rgba(31,138,79,.1)',
    warn: '#a87a1a', danger: '#b04638',
  };

  const [active, setActive] = React.useState('dashboard');

  const ui = {
    width: 1440, height: 1000, background: c.bg, color: c.fg,
    fontFamily: '"Inter", system-ui, sans-serif',
    display: 'grid', gridTemplateRows: '44px 1fr', overflow: 'hidden',
    fontSize: 13,
  };
  const mono = { fontFamily: '"JetBrains Mono", monospace', fontVariantNumeric: 'tabular-nums' };
  const cap = { fontSize: 10.5, color: c.muted, fontWeight: 500, letterSpacing: '.02em' };

  const Pill = ({ tone = 'muted', children }) => {
    const tones = {
      ok:    { bg: c.accentSoft, fg: c.accent },
      warn:  { bg: dark ? 'rgba(232,185,74,.12)' : 'rgba(168,122,26,.1)', fg: c.warn },
      danger:{ bg: dark ? 'rgba(232,122,110,.12)' : 'rgba(176,70,56,.1)', fg: c.danger },
      muted: { bg: c.rule, fg: c.muted },
    };
    const t = tones[tone] || tones.muted;
    return <span style={{ ...mono, fontSize: 10, padding: '2px 7px', borderRadius: 3, background: t.bg, color: t.fg, fontWeight: 500 }}>{children}</span>;
  };

  return (
    <div style={ui}>
      {/* Top bar */}
      <header style={{ display: 'grid', gridTemplateColumns: '220px 1fr auto', alignItems: 'center', borderBottom: `1px solid ${c.rule}`, background: c.panel }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', borderRight: `1px solid ${c.rule}`, height: '100%' }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: c.fg, color: c.bg, display: 'grid', placeItems: 'center' }}>
            <Icon name="leaf" size={13} stroke={2.2} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>NK Herbal</div>
          <div style={{ marginLeft: 'auto', ...mono, fontSize: 10, color: c.faint, padding: '2px 5px', border: `1px solid ${c.rule}`, borderRadius: 3 }}>v2.0</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: c.bg, borderRadius: 5, border: `1px solid ${c.rule}`, flex: 1, maxWidth: 480, color: c.muted }}>
            <Icon name="search" size={13} />
            <span style={{ fontSize: 12, color: c.muted }}>Search orders, customers, leads…</span>
            <span style={{ marginLeft: 'auto', ...mono, fontSize: 10, color: c.faint, padding: '1px 5px', border: `1px solid ${c.rule}`, borderRadius: 3 }}>⌘K</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px' }}>
          <button style={{ background: 'transparent', border: 'none', color: c.muted, padding: 6, cursor: 'pointer', borderRadius: 4 }}><Icon name="bell" size={15} /></button>
          <div style={{ width: 1, height: 16, background: c.rule, margin: '0 4px' }} />
          <Avatar name="Jassim Sayed" size={22} bg={c.accent} fg="#fff" />
          <span style={{ fontSize: 12 }}>Jassim</span>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside style={{ borderRight: `1px solid ${c.rule}`, padding: '14px 10px', background: c.panel, overflow: 'auto' }}>
          <div style={{ ...cap, padding: '4px 10px 6px' }}>WORKSPACE</div>
          {NK.nav.slice(0, 4).map(n => (
            <NavItem key={n.id} n={n} active={active} setActive={setActive} c={c} mono={mono} />
          ))}
          <div style={{ ...cap, padding: '14px 10px 6px' }}>OPERATIONS</div>
          {NK.nav.slice(4).map(n => (
            <NavItem key={n.id} n={n} active={active} setActive={setActive} c={c} mono={mono} />
          ))}

          <div style={{ marginTop: 18, padding: 12, borderRadius: 6, border: `1px solid ${c.rule}`, background: c.bg }}>
            <div style={{ ...cap, marginBottom: 8 }}>MONTHLY TARGET</div>
            <div style={{ ...mono, fontSize: 18, fontWeight: 600 }}>{NK.metrics.targetProgress}<span style={{ color: c.muted }}>%</span></div>
            <div style={{ height: 3, background: c.rule, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ width: `${NK.metrics.targetProgress}%`, height: '100%', background: c.accent }} />
            </div>
            <div style={{ ...mono, fontSize: 10, color: c.muted, marginTop: 8 }}>
              {inr(NK.metrics.totalRevenue, { compact: true })} / {inr(NK.metrics.targetRevenue, { compact: true })}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main style={{ overflow: 'auto', padding: '20px 24px' }}>
          {/* Page header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...cap }}>
                <span>Dashboard</span>
                <span style={{ color: c.faint }}>/</span>
                <span style={{ color: c.fg }}>April 2026</span>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 600, margin: '6px 0 0', letterSpacing: '-0.01em' }}>Overview</h1>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={btn(c, mono)}><Icon name="calendar" size={12} /> Apr 1 – Apr 27</button>
              <button style={btn(c, mono)}>All channels ▾</button>
              <button style={btn(c, mono, { primary: true })}><Icon name="plus" size={12} /> New order</button>
            </div>
          </div>

          {/* Tile row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1, background: c.rule, border: `1px solid ${c.rule}`, borderRadius: 8, overflow: 'hidden' }}>
            {[
              { l: 'Total revenue', v: inr(NK.metrics.totalRevenue, { compact: true }), d: '+18.2%', tone: 'ok',  spark: NK.trend.map(t => t.revenue) },
              { l: 'Orders',        v: num(NK.metrics.totalOrders),                      d: '+28.0%', tone: 'ok',  spark: NK.trend.map(t => t.orders) },
              { l: 'New customers', v: num(NK.metrics.newCustomers),                     d: '+12.5%', tone: 'ok',  spark: [22,18,24,19,25,27] },
              { l: 'Conv. rate',    v: NK.metrics.conversionRate.toFixed(1) + '%',       d: '+2.1pp', tone: 'ok',  spark: [12,13,14,15,16,18] },
              { l: 'GST collected', v: inr(NK.metrics.gstCollected, { compact: true }),  d: '+18.2%', tone: 'ok',  spark: [12,14,13,16,17,19] },
              { l: 'Delivered',     v: NK.metrics.deliveredRate.toFixed(1) + '%',        d: '−1.7pp', tone: 'warn',spark: [96,95,96,94,95,94] },
            ].map((m, i) => (
              <div key={i} style={{ background: c.card, padding: 14 }}>
                <div style={{ ...cap, fontSize: 10 }}>{m.l.toUpperCase()}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6 }}>
                  <div style={{ ...mono, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{m.v}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <Pill tone={m.tone}>{m.d}</Pill>
                  <div style={{ color: m.tone === 'warn' ? c.warn : c.accent }}>
                    <Spark data={m.spark} w={48} h={16} stroke="currentColor" strokeWidth={1.3} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginTop: 14 }}>
            <Panel c={c} title="Revenue & orders" subtitle="Last 6 months" right={
              <div style={{ display: 'flex', gap: 10, ...mono, fontSize: 10, color: c.muted }}>
                <span style={{ color: c.fg }}>● Revenue</span>
                <span>○ Orders</span>
              </div>
            }>
              <div style={{ color: c.accent, padding: '8px 4px 0' }}>
                <LineChart
                  data={NK.trend.map(t => ({ label: t.m, v: t.revenue }))}
                  w={760} h={200}
                  stroke={c.accent}
                  fill={c.accent}
                  gridColor={c.rule}
                />
              </div>
            </Panel>

            <Panel c={c} title="Channel mix" subtitle="By revenue">
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '8px 4px 4px' }}>
                <Donut size={108} thickness={14} track={c.rule} segments={NK.channels.map((ch, i) => ({
                  value: ch.revenue,
                  color: [c.fg, c.accent, c.muted, c.faint][i],
                }))} />
                <div style={{ flex: 1 }}>
                  {NK.channels.map((ch, i) => (
                    <div key={ch.name} style={{ display: 'grid', gridTemplateColumns: '8px 1fr auto', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 11 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: [c.fg, c.accent, c.muted, c.faint][i] }} />
                      <span>{ch.name}</span>
                      <span style={{ ...mono, color: c.muted }}>{(ch.share * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          {/* Tables row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginTop: 14 }}>
            <Panel c={c} title="Recent orders" subtitle={`${NK.recentOrders.length} this week`} right={<a style={linkStyle(c)}>View all →</a>}>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr 70px 80px 80px', gap: 10, padding: '8px 4px', ...cap, fontSize: 9.5, borderBottom: `1px solid ${c.rule}` }}>
                  <span>ORDER</span><span>CUSTOMER</span><span>PRODUCT</span><span>VALUE</span><span>CHANNEL</span><span>STATUS</span>
                </div>
                {NK.recentOrders.slice(0, 7).map(o => (
                  <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr 70px 80px 80px', gap: 10, padding: '9px 4px', borderBottom: `1px solid ${c.rule}`, alignItems: 'center', fontSize: 12 }}>
                    <span style={{ ...mono, fontSize: 10.5, color: c.muted }}>{o.id}</span>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span>{o.name}</span>
                      <span style={{ color: c.faint, fontSize: 10, marginLeft: 6 }}>{o.city}</span>
                    </div>
                    <span style={{ color: c.muted, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.product}</span>
                    <span style={{ ...mono, fontSize: 11 }}>{inr(o.amt)}</span>
                    <Pill>{o.channel}</Pill>
                    <Pill tone={o.status === 'Delivered' ? 'ok' : o.status === 'Processing' ? 'warn' : 'muted'}>
                      {o.status === 'Delivered' ? '● ' : '○ '}{o.status}
                    </Pill>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel c={c} title="Top products" subtitle="Last 30 days">
              <div>
                {NK.topProducts.map((p, i) => (
                  <div key={p.rank} style={{ padding: '10px 4px', borderBottom: i < NK.topProducts.length - 1 ? `1px solid ${c.rule}` : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ ...mono, fontSize: 10, color: c.faint, width: 18 }}>0{p.rank}</span>
                        <span style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      </div>
                      <span style={{ ...mono, fontSize: 11 }}>{inr(p.revenue, { compact: true })}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', marginTop: 6 }}>
                      <Progress value={p.revenue / NK.topProducts[0].revenue * 100} color={c.accent} track={c.rule} height={3} />
                      <span style={{ ...mono, fontSize: 10, color: c.muted }}>{p.orders} orders</span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* Bottom row: leads + followups */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14, marginBottom: 24 }}>
            <Panel c={c} title="Recent leads" subtitle="Auto-captured from WhatsApp" right={<a style={linkStyle(c)}>View pipeline →</a>}>
              {NK.leads.slice(0, 5).map((l, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr 80px auto', gap: 10, alignItems: 'center', padding: '10px 4px', borderBottom: i < 4 ? `1px solid ${c.rule}` : 'none', fontSize: 12 }}>
                  <Avatar name={l.name} size={22} bg={c.rule} fg={c.fg} />
                  <span style={{ fontWeight: 500 }}>{l.name}</span>
                  <span style={{ color: c.muted, fontSize: 11 }}>{l.product}</span>
                  <Pill>{l.src}</Pill>
                  <Pill tone={l.status === 'Converted' ? 'ok' : l.status === 'Not Interested' ? 'danger' : l.status === 'Follow Up' ? 'warn' : 'muted'}>{l.status}</Pill>
                </div>
              ))}
            </Panel>

            <Panel c={c} title="Follow-ups" subtitle="Day 30 / 60 / 90 reminders" right={<a style={linkStyle(c)}>Send all →</a>}>
              {NK.followups.map((f, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto auto', gap: 10, alignItems: 'center', padding: '10px 4px', borderBottom: i < NK.followups.length - 1 ? `1px solid ${c.rule}` : 'none' }}>
                  <div style={{ ...mono, fontSize: 10, padding: '3px 6px', borderRadius: 3, background: c.rule, color: c.muted, textAlign: 'center' }}>D+{f.day}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{f.name}</div>
                    <div style={{ fontSize: 10.5, color: c.muted, marginTop: 2 }}>{f.product}</div>
                  </div>
                  <Pill tone={f.status === 'Sent' ? 'ok' : 'warn'}>{f.status}</Pill>
                  <button style={{ ...btn(c, mono), padding: '4px 8px', fontSize: 10.5 }}>Send</button>
                </div>
              ))}
            </Panel>
          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({ n, active, setActive, c, mono }) {
  const sel = active === n.id;
  return (
    <div onClick={() => setActive(n.id)} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
      borderRadius: 5, cursor: 'pointer',
      background: sel ? c.hover : 'transparent',
      color: sel ? c.fg : c.muted,
      fontSize: 12.5, fontWeight: sel ? 500 : 400,
    }}>
      <Icon name={n.icon} size={14} stroke={1.6} />
      <span style={{ flex: 1 }}>{n.label}</span>
      {n.badge && <span style={{ ...mono, fontSize: 10, padding: '1px 5px', borderRadius: 3, background: sel ? c.rule : 'transparent', color: c.faint }}>{n.badge}</span>}
    </div>
  );
}

function Panel({ c, title, subtitle, right, children }) {
  return (
    <div style={{ background: c.card, border: `1px solid ${c.rule}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: `1px solid ${c.rule}` }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '-0.005em' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{subtitle}</div>}
        </div>
        {right}
      </div>
      <div style={{ padding: '6px 10px 10px' }}>{children}</div>
    </div>
  );
}

function btn(c, mono, { primary = false } = {}) {
  return {
    background: primary ? c.fg : 'transparent',
    color: primary ? c.bg : c.fg,
    border: primary ? 'none' : `1px solid ${c.rule}`,
    padding: '6px 10px', borderRadius: 5,
    fontSize: 11.5, fontFamily: 'inherit', fontWeight: 500,
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
  };
}

function linkStyle(c) {
  return { fontSize: 11, color: c.muted, textDecoration: 'none', cursor: 'pointer' };
}

window.VariantLinear = VariantLinear;
