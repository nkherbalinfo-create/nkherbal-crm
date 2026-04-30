// Variant 3 — Soft Notion-like
// Rounded cards, generous padding, soft cream/sage palette, friendly.

function VariantSoft({ dark }) {
  const c = dark ? {
    bg: '#1a1815', card: '#221f1b', cardSoft: '#1f1d19',
    fg: '#f2efe8', muted: 'rgba(242,239,232,.58)', faint: 'rgba(242,239,232,.34)',
    rule: 'rgba(255,255,255,.06)', hover: 'rgba(255,255,255,.04)',
    accent: '#7fbf95', accentBg: 'rgba(127,191,149,.12)', accentInk: '#0e0e0c',
    chip: 'rgba(255,255,255,.05)',
  } : {
    bg: '#f6f4ee', card: '#ffffff', cardSoft: '#fbf9f4',
    fg: '#252320', muted: 'rgba(37,35,32,.58)', faint: 'rgba(37,35,32,.34)',
    rule: 'rgba(37,35,32,.07)', hover: 'rgba(37,35,32,.04)',
    accent: '#3d8a5c', accentBg: 'rgba(61,138,92,.1)', accentInk: '#ffffff',
    chip: 'rgba(37,35,32,.05)',
  };

  const [active, setActive] = React.useState('dashboard');
  const ui = { width: 1440, height: 1000, background: c.bg, color: c.fg, fontFamily: '"Inter", system-ui, sans-serif', display: 'grid', gridTemplateColumns: '232px 1fr', overflow: 'hidden' };
  const mono = { fontFamily: '"JetBrains Mono", monospace', fontVariantNumeric: 'tabular-nums' };

  return (
    <div style={ui}>
      <aside style={{ padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px 24px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: c.accent, color: c.accentInk, display: 'grid', placeItems: 'center' }}>
            <Icon name="leaf" size={17} stroke={2} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>NK Herbal</div>
            <div style={{ fontSize: 11, color: c.muted }}>Sales workspace</div>
          </div>
        </div>

        <div style={{ background: c.card, border: `1px solid ${c.rule}`, borderRadius: 10, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, color: c.muted, marginBottom: 12 }}>
          <Icon name="search" size={14} />
          <span style={{ fontSize: 12 }}>Search…</span>
          <span style={{ marginLeft: 'auto', ...mono, fontSize: 9.5, color: c.faint }}>⌘K</span>
        </div>

        {NK.nav.map(n => {
          const sel = active === n.id;
          return (
            <div key={n.id} onClick={() => setActive(n.id)} style={{
              display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 9, cursor: 'pointer',
              background: sel ? c.card : 'transparent',
              boxShadow: sel ? `0 1px 0 ${c.rule}, 0 0 0 1px ${c.rule}` : 'none',
              color: sel ? c.fg : c.muted, fontSize: 13, fontWeight: sel ? 500 : 400,
            }}>
              <Icon name={n.icon} size={15} stroke={1.6} />
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge && <span style={{ ...mono, fontSize: 10, padding: '1px 7px', borderRadius: 999, background: sel ? c.accentBg : c.chip, color: sel ? c.accent : c.faint }}>{n.badge}</span>}
            </div>
          );
        })}

        <div style={{ marginTop: 'auto', padding: 14, borderRadius: 12, background: c.card, border: `1px solid ${c.rule}` }}>
          <div style={{ fontSize: 11, color: c.muted, marginBottom: 8 }}>Monthly target</div>
          <div style={{ ...mono, fontSize: 22, fontWeight: 600 }}>{NK.metrics.targetProgress}%</div>
          <Progress value={NK.metrics.targetProgress} color={c.accent} track={c.rule} height={6} />
          <div style={{ ...mono, fontSize: 10.5, color: c.muted, marginTop: 8 }}>
            {inr(NK.metrics.totalRevenue, { compact: true })} of {inr(NK.metrics.targetRevenue, { compact: true })}
          </div>
        </div>
      </aside>

      <main style={{ overflow: 'auto', padding: '24px 28px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 12, color: c.muted }}>Monday, 27 April</div>
            <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', margin: '4px 0 0' }}>Hello Jassim 👋</h1>
            <div style={{ fontSize: 13.5, color: c.muted, marginTop: 6 }}>Here's how NK Herbal is performing today.</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={softBtn(c)}><Icon name="calendar" size={13} /> April 2026</button>
            <button style={softBtn(c)}>All channels</button>
            <button style={{ ...softBtn(c), background: c.accent, color: c.accentInk, border: 'none' }}><Icon name="plus" size={13} /> New order</button>
          </div>
        </div>

        {/* Highlight strip */}
        <div style={{ background: c.card, border: `1px solid ${c.rule}`, borderRadius: 16, padding: '20px 22px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22, marginBottom: 16 }}>
          {[
            { l: 'Revenue', v: inr(NK.metrics.totalRevenue, { compact: true }), d: '+18.2% vs March', spark: NK.trend.map(t => t.revenue) },
            { l: 'Orders',  v: num(NK.metrics.totalOrders),                     d: '+28% vs March',   spark: NK.trend.map(t => t.orders) },
            { l: 'New customers', v: num(NK.metrics.newCustomers),              d: '+12% vs March',   spark: [22,18,24,19,25,27] },
            { l: 'Delivered rate', v: NK.metrics.deliveredRate.toFixed(1) + '%', d: 'On track',       spark: [96,95,96,94,95,94] },
          ].map((m, i) => (
            <div key={i} style={{ borderLeft: i ? `1px solid ${c.rule}` : 'none', paddingLeft: i ? 22 : 0 }}>
              <div style={{ fontSize: 11.5, color: c.muted }}>{m.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 }}>
                <div style={{ ...mono, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>{m.v}</div>
                <div style={{ color: c.accent }}><Spark data={m.spark} w={56} h={20} stroke="currentColor" fill="currentColor" strokeWidth={1.4} dot /></div>
              </div>
              <div style={{ fontSize: 11, color: c.accent, marginTop: 4, ...mono }}>↑ {m.d}</div>
            </div>
          ))}
        </div>

        {/* Two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <SoftCard c={c} title="Revenue trend" subtitle="Last 6 months">
            <div style={{ color: c.accent, padding: '12px 4px 4px' }}>
              <LineChart data={NK.trend.map(t => ({ label: t.m, v: t.revenue }))} w={760} h={210} stroke={c.accent} fill={c.accent} gridColor={c.rule} />
            </div>
          </SoftCard>

          <SoftCard c={c} title="Channels" subtitle="By revenue share">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 4px' }}>
              <Donut size={120} thickness={18} track={c.rule} segments={NK.channels.map((ch, i) => ({ value: ch.revenue, color: [c.accent, c.fg, c.muted, c.faint][i] }))} />
              <div style={{ flex: 1 }}>
                {NK.channels.map((ch, i) => (
                  <div key={ch.name} style={{ display: 'grid', gridTemplateColumns: '10px 1fr auto', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: [c.accent, c.fg, c.muted, c.faint][i] }} />
                    <span>{ch.name}</span>
                    <span style={{ ...mono, color: c.muted, fontSize: 11 }}>{(ch.share * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </SoftCard>
        </div>

        {/* Orders + Top products */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginTop: 16 }}>
          <SoftCard c={c} title="Recent orders" subtitle="Latest 6" right={<a style={{ fontSize: 12, color: c.muted }}>View all →</a>}>
            {NK.recentOrders.slice(0, 6).map((o, i) => (
              <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 80px 90px', gap: 12, padding: '12px 4px', borderTop: i ? `1px solid ${c.rule}` : 'none', alignItems: 'center', fontSize: 12.5 }}>
                <Avatar name={o.name} size={28} bg={c.accentBg} fg={c.accent} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>{o.name}</div>
                  <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{o.city} · {o.id}</div>
                </div>
                <div style={{ color: c.muted, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.product}</div>
                <div style={{ ...mono, fontSize: 12 }}>{inr(o.amt)}</div>
                <span style={{ fontSize: 10.5, padding: '4px 9px', borderRadius: 999, background: o.status === 'Delivered' ? c.accentBg : c.chip, color: o.status === 'Delivered' ? c.accent : c.muted, fontWeight: 500, textAlign: 'center' }}>{o.status}</span>
              </div>
            ))}
          </SoftCard>

          <SoftCard c={c} title="Top products" subtitle="By revenue this month">
            {NK.topProducts.map((p, i) => (
              <div key={p.rank} style={{ padding: '12px 4px', borderTop: i ? `1px solid ${c.rule}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: c.chip, color: c.muted, display: 'grid', placeItems: 'center', ...mono, fontSize: 10.5, fontWeight: 600 }}>{p.rank}</div>
                    <span style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  </div>
                  <span style={{ ...mono, fontSize: 12 }}>{inr(p.revenue, { compact: true })}</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Progress value={p.revenue / NK.topProducts[0].revenue * 100} color={c.accent} track={c.rule} height={4} />
                </div>
              </div>
            ))}
          </SoftCard>
        </div>

        {/* Bottom — leads + followups */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16, marginBottom: 8 }}>
          <SoftCard c={c} title="Leads from WhatsApp" subtitle="Auto-captured">
            {NK.leads.slice(0, 4).map((l, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto auto', gap: 12, alignItems: 'center', padding: '12px 4px', borderTop: i ? `1px solid ${c.rule}` : 'none' }}>
                <Avatar name={l.name} size={28} bg={c.accentBg} fg={c.accent} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{l.product} · {l.when} ago</div>
                </div>
                <span style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 999, background: c.chip, color: c.muted }}>{l.src}</span>
                <span style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 999, background: l.status === 'Converted' ? c.accentBg : c.chip, color: l.status === 'Converted' ? c.accent : c.muted, fontWeight: 500 }}>{l.status}</span>
              </div>
            ))}
          </SoftCard>

          <SoftCard c={c} title="Follow-up reminders" subtitle="Day 30 / 60 / 90">
            {NK.followups.map((f, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto auto', gap: 12, alignItems: 'center', padding: '12px 4px', borderTop: i ? `1px solid ${c.rule}` : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: c.accentBg, color: c.accent, display: 'grid', placeItems: 'center', ...mono, fontSize: 11, fontWeight: 600 }}>D{f.day}</div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{f.product}</div>
                </div>
                <span style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 999, background: f.status === 'Sent' ? c.accentBg : c.chip, color: f.status === 'Sent' ? c.accent : c.muted }}>{f.status}</span>
                <button style={{ ...softBtn(c), padding: '5px 10px', fontSize: 11 }}>Send</button>
              </div>
            ))}
          </SoftCard>
        </div>
      </main>
    </div>
  );
}

function softBtn(c) {
  return {
    background: c.card, border: `1px solid ${c.rule}`, color: c.fg,
    padding: '8px 13px', borderRadius: 9, fontSize: 12, fontFamily: 'inherit', fontWeight: 500,
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
  };
}

function SoftCard({ c, title, subtitle, right, children }) {
  return (
    <div style={{ background: c.card, border: `1px solid ${c.rule}`, borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11.5, color: c.muted, marginTop: 2 }}>{subtitle}</div>}
        </div>
        {right}
      </div>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

window.VariantSoft = VariantSoft;
