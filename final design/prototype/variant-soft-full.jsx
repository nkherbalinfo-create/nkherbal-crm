// Variant 3 — Soft, all screens
// Self-contained: includes shell (sidebar + header) + 7 screen renderers
// Dashboard is reused from variant-soft.jsx via an exposed `SoftDashboardBody`.

function SoftFull({ dark, screen: screenProp, onNav }) {
  const c = dark ? {
    bg: '#1a1815', card: '#221f1b', cardSoft: '#1f1d19',
    fg: '#f2efe8', muted: 'rgba(242,239,232,.58)', faint: 'rgba(242,239,232,.34)',
    rule: 'rgba(255,255,255,.06)', hover: 'rgba(255,255,255,.04)',
    accent: '#7fbf95', accentBg: 'rgba(127,191,149,.12)', accentInk: '#0e0e0c',
    chip: 'rgba(255,255,255,.05)',
    danger: '#e88478', dangerBg: 'rgba(232,132,120,.1)',
    warn: '#e0b061', warnBg: 'rgba(224,176,97,.1)',
    info: '#7fa9e0', infoBg: 'rgba(127,169,224,.1)',
  } : {
    bg: '#f6f4ee', card: '#ffffff', cardSoft: '#fbf9f4',
    fg: '#252320', muted: 'rgba(37,35,32,.58)', faint: 'rgba(37,35,32,.34)',
    rule: 'rgba(37,35,32,.07)', hover: 'rgba(37,35,32,.04)',
    accent: '#3d8a5c', accentBg: 'rgba(61,138,92,.1)', accentInk: '#ffffff',
    chip: 'rgba(37,35,32,.05)',
    danger: '#b04638', dangerBg: 'rgba(176,70,56,.08)',
    warn: '#a87a1a', warnBg: 'rgba(168,122,26,.08)',
    info: '#3a6ba8', infoBg: 'rgba(58,107,168,.08)',
  };

  const [activeLocal, setActiveLocal] = React.useState('dashboard');
  const active = screenProp || activeLocal;
  const setActive = (id) => { setActiveLocal(id); onNav && onNav(id); };

  const ui = { width: 1440, height: 1000, background: c.bg, color: c.fg, fontFamily: '"Inter", system-ui, sans-serif', display: 'grid', gridTemplateColumns: '232px 1fr', overflow: 'hidden' };
  const mono = { fontFamily: '"JetBrains Mono", monospace', fontVariantNumeric: 'tabular-nums' };

  return (
    <div style={ui}>
      <SoftSidebar c={c} mono={mono} active={active} setActive={setActive} />
      <main style={{ overflow: 'auto', padding: '24px 28px 28px' }}>
        {active === 'dashboard'  && <ScreenDashboard  c={c} mono={mono} />}
        {active === 'orders'     && <ScreenOrders     c={c} mono={mono} />}
        {active === 'leads'      && <ScreenLeads      c={c} mono={mono} />}
        {active === 'customers'  && <ScreenCustomers  c={c} mono={mono} />}
        {active === 'followups'  && <ScreenFollowups  c={c} mono={mono} />}
        {active === 'whatsapp'   && <ScreenWhatsApp   c={c} mono={mono} />}
        {active === 'reports'    && <ScreenReports    c={c} mono={mono} />}
        {active === 'settings'   && <ScreenSettings   c={c} mono={mono} />}
      </main>
    </div>
  );
}

function SoftSidebar({ c, mono, active, setActive }) {
  return (
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
  );
}

// ─── Page Header ──────────────────────────────────────────────────────────
function PageHeader({ c, eyebrow, title, subtitle, actions }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
      <div>
        {eyebrow && <div style={{ fontSize: 12, color: c.muted }}>{eyebrow}</div>}
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: '4px 0 0' }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 13.5, color: c.muted, marginTop: 6 }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
    </div>
  );
}

function softBtnFull(c, primary = false) {
  return {
    background: primary ? c.accent : c.card, border: primary ? 'none' : `1px solid ${c.rule}`,
    color: primary ? c.accentInk : c.fg,
    padding: '8px 13px', borderRadius: 9, fontSize: 12, fontFamily: 'inherit', fontWeight: 500,
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
  };
}

function SoftCardFull({ c, title, subtitle, right, children, p = '18px 20px' }) {
  return (
    <div style={{ background: c.card, border: `1px solid ${c.rule}`, borderRadius: 14, padding: p }}>
      {(title || right) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            {title && <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 11.5, color: c.muted, marginTop: 2 }}>{subtitle}</div>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function Chip({ c, tone = 'muted', children }) {
  const tones = {
    ok:     { bg: c.accentBg, fg: c.accent },
    warn:   { bg: c.warnBg,   fg: c.warn },
    danger: { bg: c.dangerBg, fg: c.danger },
    info:   { bg: c.infoBg,   fg: c.info },
    muted:  { bg: c.chip,     fg: c.muted },
  };
  const t = tones[tone] || tones.muted;
  return <span style={{ fontSize: 10.5, padding: '3px 9px', borderRadius: 999, background: t.bg, color: t.fg, fontWeight: 500, display: 'inline-block' }}>{children}</span>;
}

// ─── Dashboard ────────────────────────────────────────────────────────────
function ScreenDashboard({ c, mono }) {
  return (
    <React.Fragment>
      <PageHeader c={c}
        eyebrow="Monday, 27 April"
        title="Hello Jassim 👋"
        subtitle="Here's how NK Herbal is performing today."
        actions={<React.Fragment>
          <button style={softBtnFull(c)}><Icon name="calendar" size={13} /> April 2026</button>
          <button style={softBtnFull(c)}>All channels</button>
          <button style={softBtnFull(c, true)}><Icon name="plus" size={13} /> New order</button>
        </React.Fragment>}
      />

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

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <SoftCardFull c={c} title="Revenue trend" subtitle="Last 6 months">
          <div style={{ color: c.accent, padding: '12px 4px 4px' }}>
            <LineChart data={NK.trend.map(t => ({ label: t.m, v: t.revenue }))} w={760} h={210} stroke={c.accent} fill={c.accent} gridColor={c.rule} />
          </div>
        </SoftCardFull>
        <SoftCardFull c={c} title="Channels" subtitle="By revenue share">
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
        </SoftCardFull>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginTop: 16 }}>
        <SoftCardFull c={c} title="Recent orders" subtitle="Latest 6" right={<a style={{ fontSize: 12, color: c.muted, cursor: 'pointer' }}>View all →</a>}>
          {NK.recentOrders.slice(0, 6).map((o, i) => (
            <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 80px 90px', gap: 12, padding: '12px 4px', borderTop: i ? `1px solid ${c.rule}` : 'none', alignItems: 'center', fontSize: 12.5 }}>
              <Avatar name={o.name} size={28} bg={c.accentBg} fg={c.accent} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{o.name}</div>
                <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{o.city} · {o.id}</div>
              </div>
              <div style={{ color: c.muted, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.product}</div>
              <div style={{ ...mono, fontSize: 12 }}>{inr(o.amt)}</div>
              <Chip c={c} tone={o.status === 'Delivered' ? 'ok' : 'muted'}>{o.status}</Chip>
            </div>
          ))}
        </SoftCardFull>
        <SoftCardFull c={c} title="Top products" subtitle="By revenue this month">
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
        </SoftCardFull>
      </div>
    </React.Fragment>
  );
}

// ─── Orders ────────────────────────────────────────────────────────────────
function ScreenOrders({ c, mono }) {
  return (
    <React.Fragment>
      <PageHeader c={c}
        title="Orders"
        subtitle={`${NK.metrics.totalOrders} total · ${NK.recentOrders.length} this week`}
        actions={<React.Fragment>
          <button style={softBtnFull(c)}><Icon name="export" size={13} /> Sync WooCommerce</button>
          <button style={softBtnFull(c, true)}><Icon name="plus" size={13} /> New order</button>
        </React.Fragment>}
      />

      {/* filter bar */}
      <div style={{ background: c.card, border: `1px solid ${c.rule}`, borderRadius: 12, padding: '10px 12px', display: 'grid', gridTemplateColumns: '1.4fr auto auto auto auto auto auto', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: c.bg, borderRadius: 8, color: c.muted }}>
          <Icon name="search" size={13} /><span style={{ fontSize: 12 }}>Search name, mobile, order ID…</span>
        </div>
        <button style={{ ...softBtnFull(c), background: c.bg }}><Icon name="calendar" size={12} /> From</button>
        <button style={{ ...softBtnFull(c), background: c.bg }}><Icon name="calendar" size={12} /> To</button>
        <button style={{ ...softBtnFull(c), background: c.bg }}>All channels ▾</button>
        <button style={{ ...softBtnFull(c), background: c.bg }}>All status ▾</button>
        <button style={{ ...softBtnFull(c), background: c.bg }}>All payments ▾</button>
        <button style={softBtnFull(c, true)}>Filter</button>
      </div>

      <SoftCardFull c={c} p="6px 12px 12px">
        <div style={{ display: 'grid', gridTemplateColumns: '90px 70px 1.2fr 1fr 0.6fr 90px 90px 90px 100px 60px', gap: 10, padding: '14px 8px 10px', fontSize: 10.5, color: c.muted, fontWeight: 500, letterSpacing: '.02em', textTransform: 'uppercase', borderBottom: `1px solid ${c.rule}` }}>
          <span>ORDER ID</span><span>DATE</span><span>CUSTOMER</span><span>PRODUCT</span><span style={{ textAlign: 'right' }}>QTY</span><span style={{ textAlign: 'right' }}>VALUE</span><span>CHANNEL</span><span>PAYMENT</span><span>STATUS</span><span></span>
        </div>
        {NK.recentOrders.map((o, i) => (
          <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '90px 70px 1.2fr 1fr 0.6fr 90px 90px 90px 100px 60px', gap: 10, padding: '12px 8px', borderBottom: i < NK.recentOrders.length - 1 ? `1px solid ${c.rule}` : 'none', alignItems: 'center', fontSize: 12.5 }}>
            <span style={{ ...mono, fontSize: 10.5, color: c.muted }}>{o.id}</span>
            <span style={{ ...mono, fontSize: 11, color: c.muted }}>{o.date}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <Avatar name={o.name} size={24} bg={c.accentBg} fg={c.accent} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</div>
                <div style={{ fontSize: 10.5, color: c.muted, marginTop: 1 }}>{o.city}</div>
              </div>
            </div>
            <span style={{ color: c.muted, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.product}</span>
            <span style={{ ...mono, fontSize: 11.5, color: c.muted, textAlign: 'right' }}>1</span>
            <span style={{ ...mono, fontSize: 12, fontWeight: 500, textAlign: 'right' }}>{inr(o.amt)}</span>
            <Chip c={c} tone="info">{o.channel}</Chip>
            <Chip c={c} tone={o.pay === 'Paid' ? 'ok' : o.pay === 'COD' ? 'warn' : 'muted'}>{o.pay}</Chip>
            <Chip c={c} tone={o.status === 'Delivered' ? 'ok' : o.status === 'Processing' ? 'warn' : 'muted'}>{o.status}</Chip>
            <div style={{ display: 'flex', gap: 4, color: c.muted, justifyContent: 'flex-end' }}>
              <button style={iconBtn(c)}><Icon name="more" size={14} /></button>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 8px 4px', fontSize: 12, color: c.muted }}>
          <span>Showing 1–{NK.recentOrders.length} of {NK.metrics.totalOrders}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ ...softBtnFull(c), padding: '5px 10px' }}>← Prev</button>
            <button style={{ ...softBtnFull(c), padding: '5px 10px' }}>Next →</button>
          </div>
        </div>
      </SoftCardFull>
    </React.Fragment>
  );
}

function iconBtn(c) {
  return { background: 'transparent', border: 'none', padding: 4, borderRadius: 6, color: c.muted, cursor: 'pointer' };
}

// ─── Customers ─────────────────────────────────────────────────────────────
function ScreenCustomers({ c, mono }) {
  // expand list by repeating
  const customers = [
    { name: 'Tarun Negi',         mob: '8527359978', city: 'Noida',     type: 'New',    orders: 1, rev: 4199, last: '24 Apr 26' },
    { name: 'Shurveer Sankhala',  mob: '8696393427', city: 'Ahmedabad', type: 'New',    orders: 1, rev: 23698, last: '23 Apr 26' },
    { name: 'Sanket Maheshwari',  mob: '9999893880', city: 'Gurgaon',   type: 'Repeat', orders: 3, rev: 12000, last: '21 Apr 26' },
    { name: 'Raghu R',            mob: '9817093441', city: 'Bengaluru', type: 'New',    orders: 1, rev: 4199, last: '11 Apr 26' },
    { name: 'Shaurya Bhargava',   mob: '9929907560', city: 'Mumbai',    type: 'Repeat', orders: 2, rev: 4499, last: '30 Mar 26' },
    { name: 'Bhupender Tanwar',   mob: '9897953947', city: 'Mathura',   type: 'New',    orders: 1, rev: 6748, last: '19 Mar 26' },
    { name: 'Dhruv Attri',        mob: '8525848617', city: 'Guwahati',  type: 'New',    orders: 1, rev: 8398, last: '13 Mar 26' },
    { name: 'Priya Sharma',       mob: '9876543210', city: 'Delhi',     type: 'Repeat', orders: 4, rev: 8997, last: '27 Apr 26' },
  ];
  return (
    <React.Fragment>
      <PageHeader c={c}
        title="Customers"
        subtitle={`${customers.length} total · ${customers.filter(x => x.type === 'Repeat').length} repeat`}
        actions={<React.Fragment>
          <button style={softBtnFull(c)}><Icon name="export" size={13} /> Recalculate stats</button>
          <button style={softBtnFull(c, true)}><Icon name="plus" size={13} /> Add customer</button>
        </React.Fragment>}
      />
      <div style={{ background: c.card, border: `1px solid ${c.rule}`, borderRadius: 12, padding: '10px 12px', display: 'grid', gridTemplateColumns: '1.4fr auto auto', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: c.bg, borderRadius: 8, color: c.muted }}>
          <Icon name="search" size={13} /><span style={{ fontSize: 12 }}>Search name or mobile…</span>
        </div>
        <button style={{ ...softBtnFull(c), background: c.bg }}>All types ▾</button>
        <button style={softBtnFull(c, true)}>Filter</button>
      </div>
      <SoftCardFull c={c} p="6px 12px 12px">
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1.3fr 1fr 1fr 90px 80px 100px 100px 60px', gap: 10, padding: '14px 8px 10px', fontSize: 10.5, color: c.muted, fontWeight: 500, letterSpacing: '.02em', textTransform: 'uppercase', borderBottom: `1px solid ${c.rule}` }}>
          <span></span><span>Name</span><span>Mobile</span><span>City</span><span>Type</span><span style={{ textAlign: 'right' }}>Orders</span><span style={{ textAlign: 'right' }}>Revenue</span><span>Last order</span><span></span>
        </div>
        {customers.map((u, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1.3fr 1fr 1fr 90px 80px 100px 100px 60px', gap: 10, padding: '12px 8px', borderBottom: i < customers.length - 1 ? `1px solid ${c.rule}` : 'none', alignItems: 'center', fontSize: 12.5 }}>
            <Avatar name={u.name} size={30} bg={c.accentBg} fg={c.accent} />
            <span style={{ fontWeight: 500 }}>{u.name}</span>
            <span style={{ ...mono, fontSize: 11.5, color: c.muted }}>{u.mob}</span>
            <span style={{ color: c.muted }}>{u.city}</span>
            <Chip c={c} tone={u.type === 'Repeat' ? 'ok' : 'info'}>{u.type}</Chip>
            <span style={{ ...mono, fontSize: 12, textAlign: 'right' }}>{u.orders}</span>
            <span style={{ ...mono, fontSize: 12, fontWeight: 500, textAlign: 'right' }}>{inr(u.rev)}</span>
            <span style={{ ...mono, fontSize: 11, color: c.muted }}>{u.last}</span>
            <button style={iconBtn(c)}><Icon name="arrow-right" size={14} /></button>
          </div>
        ))}
      </SoftCardFull>
    </React.Fragment>
  );
}

// ─── Leads ────────────────────────────────────────────────────────────────
function ScreenLeads({ c, mono }) {
  const stats = [
    { l: 'Interested',     v: 4, tone: 'info'   },
    { l: 'Not Interested', v: 1, tone: 'danger' },
    { l: 'Converted',      v: 1, tone: 'ok'     },
    { l: 'Follow Up',      v: 2, tone: 'warn'   },
  ];
  return (
    <React.Fragment>
      <PageHeader c={c}
        title="Leads"
        subtitle={`${NK.leads.length} total · auto-captured from WhatsApp`}
        actions={<button style={softBtnFull(c, true)}><Icon name="plus" size={13} /> Add lead</button>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        {stats.map(s => (
          <div key={s.l} style={{ background: c.card, border: `1px solid ${c.rule}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: { ok: c.accentBg, warn: c.warnBg, danger: c.dangerBg, info: c.infoBg }[s.tone], color: { ok: c.accent, warn: c.warn, danger: c.danger, info: c.info }[s.tone], display: 'grid', placeItems: 'center' }}>
              <Icon name="target" size={16} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: c.muted }}>{s.l}</div>
              <div style={{ ...mono, fontSize: 22, fontWeight: 600, marginTop: 2 }}>{s.v}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: c.card, border: `1px solid ${c.rule}`, borderRadius: 12, padding: '10px 12px', display: 'grid', gridTemplateColumns: '1.4fr auto auto auto', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: c.bg, borderRadius: 8, color: c.muted }}>
          <Icon name="search" size={13} /><span style={{ fontSize: 12 }}>Search name or mobile…</span>
        </div>
        <button style={{ ...softBtnFull(c), background: c.bg }}>All status ▾</button>
        <button style={{ ...softBtnFull(c), background: c.bg }}>All sources ▾</button>
        <button style={softBtnFull(c, true)}>Filter</button>
      </div>
      <SoftCardFull c={c} p="6px 12px 12px">
        <div style={{ display: 'grid', gridTemplateColumns: '90px 80px 40px 1.2fr 1fr 110px 1fr 110px 60px', gap: 10, padding: '14px 8px 10px', fontSize: 10.5, color: c.muted, fontWeight: 500, letterSpacing: '.02em', textTransform: 'uppercase', borderBottom: `1px solid ${c.rule}` }}>
          <span>LEAD ID</span><span>DATE</span><span></span><span>NAME</span><span>MOBILE</span><span>SOURCE</span><span>PRODUCT</span><span>STATUS</span><span></span>
        </div>
        {NK.leads.map((l, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 80px 40px 1.2fr 1fr 110px 1fr 110px 60px', gap: 10, padding: '12px 8px', borderBottom: i < NK.leads.length - 1 ? `1px solid ${c.rule}` : 'none', alignItems: 'center', fontSize: 12.5 }}>
            <span style={{ ...mono, fontSize: 10.5, color: c.muted }}>LEAD-{String(2024001 + i)}</span>
            <span style={{ ...mono, fontSize: 11, color: c.muted }}>{l.when} ago</span>
            <Avatar name={l.name} size={28} bg={c.accentBg} fg={c.accent} />
            <span style={{ fontWeight: 500 }}>{l.name}</span>
            <span style={{ ...mono, fontSize: 11.5, color: c.muted }}>+91 98765 4{String(1000 + i).slice(-4)}</span>
            <Chip c={c} tone={l.src === 'WhatsApp' ? 'ok' : 'info'}>{l.src}</Chip>
            <span style={{ color: c.muted }}>{l.product}</span>
            <Chip c={c} tone={l.status === 'Converted' ? 'ok' : l.status === 'Not Interested' ? 'danger' : l.status === 'Follow Up' ? 'warn' : 'info'}>{l.status}</Chip>
            <button style={iconBtn(c)}><Icon name="more" size={14} /></button>
          </div>
        ))}
      </SoftCardFull>
    </React.Fragment>
  );
}

// ─── Follow-ups ───────────────────────────────────────────────────────────
function ScreenFollowups({ c, mono }) {
  const [tab, setTab] = React.useState('Pending');
  const tabs = ['Pending', 'Sent', 'Skipped'];
  const stages = [
    { n: 1, day: 30, t: 'Post-course done — prompt for Month 2', tone: 'info'   },
    { n: 2, day: 60, t: 'Halfway through — encourage Month 3',   tone: 'warn'   },
    { n: 3, day: 90, t: 'Full course — celebrate & suggest continuing', tone: 'ok' },
  ];
  return (
    <React.Fragment>
      <PageHeader c={c}
        title="Follow-up reminders"
        subtitle="Send 3-monthly follow-ups to encourage their 3 / 6 month Ayurvedic journey"
        actions={<button style={softBtnFull(c)}><Icon name="arrow-right" size={13} /> Refresh</button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
        {stages.map(s => (
          <div key={s.n} style={{ background: c.card, border: `1px solid ${c.rule}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: { ok: c.accentBg, warn: c.warnBg, info: c.infoBg }[s.tone], color: { ok: c.accent, warn: c.warn, info: c.info }[s.tone], display: 'grid', placeItems: 'center', ...mono, fontSize: 12, fontWeight: 600 }}>{s.n}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Month {s.n} <span style={{ color: c.muted, fontWeight: 400 }}>(Day {s.day})</span></div>
                <div style={{ fontSize: 11.5, color: c.muted, marginTop: 2 }}>{s.t}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, padding: 4, background: c.card, border: `1px solid ${c.rule}`, borderRadius: 10, width: 'fit-content', marginBottom: 14 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: tab === t ? c.accentBg : 'transparent',
            color: tab === t ? c.accent : c.muted,
            fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
          }}>{t} {tab === t && `· ${NK.followups.filter(f => f.status === t).length}`}</button>
        ))}
      </div>

      <SoftCardFull c={c} p="6px 12px 12px">
        {NK.followups.filter(f => f.status === tab).length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: c.accentBg, color: c.accent, display: 'inline-grid', placeItems: 'center', marginBottom: 14 }}>
              <Icon name="check" size={22} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No {tab.toLowerCase()} follow-ups</div>
            <div style={{ fontSize: 12, color: c.muted, marginTop: 4 }}>Follow-ups appear at 30, 60, and 90 days after each order.</div>
          </div>
        ) : (
          <React.Fragment>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 50px 1fr 1fr 1fr 110px 100px', gap: 10, padding: '14px 8px 10px', fontSize: 10.5, color: c.muted, fontWeight: 500, letterSpacing: '.02em', textTransform: 'uppercase', borderBottom: `1px solid ${c.rule}` }}>
              <span></span><span>DAY</span><span>NAME</span><span>PRODUCT</span><span>EMAIL</span><span>STATUS</span><span></span>
            </div>
            {NK.followups.filter(f => f.status === tab).map((f, i, a) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 50px 1fr 1fr 1fr 110px 100px', gap: 10, padding: '12px 8px', borderBottom: i < a.length - 1 ? `1px solid ${c.rule}` : 'none', alignItems: 'center', fontSize: 12.5 }}>
                <Avatar name={f.name} size={28} bg={c.accentBg} fg={c.accent} />
                <span style={{ ...mono, fontSize: 11, color: c.muted, fontWeight: 600 }}>D+{f.day}</span>
                <span style={{ fontWeight: 500 }}>{f.name}</span>
                <span style={{ color: c.muted }}>{f.product}</span>
                <span style={{ ...mono, fontSize: 11, color: c.muted }}>{f.name.toLowerCase().replace(/\s/g, '.')}@gmail.com</span>
                <Chip c={c} tone={f.status === 'Sent' ? 'ok' : 'warn'}>{f.status}</Chip>
                <button style={softBtnFull(c, true)}><Icon name="message" size={12} /> Send</button>
              </div>
            ))}
          </React.Fragment>
        )}
      </SoftCardFull>
    </React.Fragment>
  );
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────
function ScreenWhatsApp({ c, mono }) {
  const convos = [
    { name: 'Suresh Yadav',  preview: 'Mukoze ka price kya hai bhai?', when: '2m', unread: 2, lang: 'HI' },
    { name: 'Pooja Gupta',   preview: 'Is this safe for diabetics?',   when: '14m', unread: 1, lang: 'EN' },
    { name: 'Rahul Verma',   preview: 'Order placed, thanks!',         when: '1h', unread: 0, lang: 'EN' },
    { name: 'Divya Nair',    preview: 'വിലവിവരം?',                    when: '3h', unread: 0, lang: 'ML' },
    { name: 'Arjun Kapoor',  preview: 'Bhai delivery kab tak?',        when: '5h', unread: 0, lang: 'HI' },
  ];
  const messages = [
    { from: 'them', text: 'Hello, I want to know about Mukoze For Men 300g', time: '09:24' },
    { from: 'bot',  text: 'Hi Suresh! 👋 Mukoze For Men 300g is ₹2,999 with free shipping pan-India. It is a 30-day course recommended for men 30+. Would you like to know about the ingredients?', time: '09:24' },
    { from: 'them', text: 'haan ingredients batao', time: '09:25' },
    { from: 'bot',  text: 'Mukoze 300g contains: Ashwagandha, Shilajit, Safed Musli, Kaunch Beej, Gokhru. 100% Ayurvedic, GMP-certified. Free Vaidya consultation included. Shall I share the link to order?', time: '09:25' },
    { from: 'them', text: 'price kya hai bhai?', time: '09:26' },
  ];
  return (
    <React.Fragment>
      <PageHeader c={c}
        title="WhatsApp"
        subtitle="Auto-replies powered by language detection · 5 active conversations"
        actions={<button style={softBtnFull(c)}><Icon name="gear" size={13} /> Bot settings</button>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 280px', gap: 0, height: 700, background: c.card, border: `1px solid ${c.rule}`, borderRadius: 14, overflow: 'hidden' }}>
        {/* convo list */}
        <div style={{ borderRight: `1px solid ${c.rule}`, overflow: 'auto' }}>
          <div style={{ padding: 12, borderBottom: `1px solid ${c.rule}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: c.bg, borderRadius: 8, color: c.muted }}>
              <Icon name="search" size={13} /><span style={{ fontSize: 12 }}>Search conversations…</span>
            </div>
          </div>
          {convos.map((m, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 10, padding: '12px 14px', borderBottom: `1px solid ${c.rule}`, cursor: 'pointer', background: i === 0 ? c.bg : 'transparent', alignItems: 'center' }}>
              <Avatar name={m.name} size={36} bg={c.accentBg} fg={c.accent} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</span>
                  <span style={{ ...mono, fontSize: 9, color: c.muted, padding: '1px 5px', background: c.chip, borderRadius: 4 }}>{m.lang}</span>
                </div>
                <div style={{ fontSize: 11.5, color: c.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.preview}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...mono, fontSize: 10, color: c.muted }}>{m.when}</div>
                {m.unread > 0 && <div style={{ ...mono, fontSize: 10, color: c.accentInk, background: c.accent, width: 18, height: 18, borderRadius: 9, display: 'inline-grid', placeItems: 'center', marginTop: 4, fontWeight: 600 }}>{m.unread}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* messages */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${c.rule}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name="Suresh Yadav" size={36} bg={c.accentBg} fg={c.accent} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Suresh Yadav</div>
              <div style={{ fontSize: 11, color: c.muted }}>+91 98765 12345 · Hindi</div>
            </div>
            <Chip c={c} tone="ok">Bot active</Chip>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.from === 'them' ? 'flex-start' : 'flex-end', maxWidth: '70%' }}>
                <div style={{
                  background: m.from === 'them' ? c.bg : c.accent,
                  color: m.from === 'them' ? c.fg : c.accentInk,
                  padding: '10px 14px', borderRadius: 14,
                  borderBottomLeftRadius: m.from === 'them' ? 4 : 14,
                  borderBottomRightRadius: m.from === 'them' ? 14 : 4,
                  fontSize: 12.5, lineHeight: 1.5,
                }}>{m.text}</div>
                <div style={{ ...mono, fontSize: 9.5, color: c.muted, marginTop: 4, padding: '0 6px', textAlign: m.from === 'them' ? 'left' : 'right' }}>{m.from === 'bot' ? 'NK Bot · ' : ''}{m.time}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: 14, borderTop: `1px solid ${c.rule}`, display: 'flex', gap: 8 }}>
            <input placeholder="Bot is typing reply…" disabled style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: `1px solid ${c.rule}`, background: c.bg, color: c.fg, fontFamily: 'inherit', fontSize: 12.5 }} />
            <button style={softBtnFull(c, true)}>Take over</button>
          </div>
        </div>

        {/* customer details */}
        <div style={{ borderLeft: `1px solid ${c.rule}`, padding: 18, overflow: 'auto' }}>
          <div style={{ fontSize: 11, color: c.muted, marginBottom: 12 }}>CUSTOMER DETAILS</div>
          <Avatar name="Suresh Yadav" size={56} bg={c.accentBg} fg={c.accent} />
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>Suresh Yadav</div>
          <div style={{ fontSize: 11.5, color: c.muted, marginTop: 2 }}>New lead · Auto-captured 2m ago</div>

          <div style={{ marginTop: 18, display: 'grid', gap: 10, fontSize: 12 }}>
            <Row c={c} l="Mobile" v="+91 98765 12345" mono={mono} />
            <Row c={c} l="Language" v="Hindi (HI)" mono={mono} />
            <Row c={c} l="Source" v={<Chip c={c} tone="ok">WhatsApp</Chip>} />
            <Row c={c} l="Interested in" v="Mukoze For Men 300g" mono={mono} />
            <Row c={c} l="Status" v={<Chip c={c} tone="warn">Follow Up</Chip>} />
          </div>

          <button style={{ ...softBtnFull(c, true), width: '100%', justifyContent: 'center', marginTop: 18 }}>Convert to order</button>
        </div>
      </div>
    </React.Fragment>
  );
}

function Row({ c, l, v, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <span style={{ color: c.muted }}>{l}</span>
      <span style={{ ...(mono || {}), fontSize: 12 }}>{v}</span>
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────
function ScreenReports({ c, mono }) {
  return (
    <React.Fragment>
      <PageHeader c={c}
        title="Reports & Export"
        subtitle="Export your data and view summaries."
      />
      <SoftCardFull c={c} title="Report period" subtitle="Filter by date and channel">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginTop: 14, alignItems: 'flex-end' }}>
          <Field c={c} label="Start date" value="01 / 04 / 2026" />
          <Field c={c} label="End date"   value="27 / 04 / 2026" />
          <Field c={c} label="Channel"    value="All channels ▾" />
          <button style={softBtnFull(c, true)}>Load preview</button>
        </div>
      </SoftCardFull>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
        <SoftCardFull c={c} p="22px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: c.accentBg, color: c.accent, display: 'grid', placeItems: 'center' }}>
              <Icon name="export" size={20} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Orders Excel export</div>
              <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>Full details — products, GST, status, channel</div>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Stat c={c} mono={mono} l="Rows" v={NK.metrics.totalOrders} />
            <Stat c={c} mono={mono} l="File size" v="≈ 84 KB" />
          </div>
          <button style={{ ...softBtnFull(c, true), width: '100%', justifyContent: 'center', marginTop: 14 }}><Icon name="download" size={13} /> Download .xlsx</button>
        </SoftCardFull>
        <SoftCardFull c={c} p="22px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: c.warnBg, color: c.warn, display: 'grid', placeItems: 'center' }}>
              <Icon name="chart" size={20} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Summary PDF report</div>
              <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>Metrics, channel breakdown, top products</div>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Stat c={c} mono={mono} l="Pages" v="6" />
            <Stat c={c} mono={mono} l="File size" v="≈ 320 KB" />
          </div>
          <button style={{ ...softBtnFull(c), width: '100%', justifyContent: 'center', marginTop: 14, background: c.warn, color: '#fff', border: 'none' }}><Icon name="download" size={13} /> Download .pdf</button>
        </SoftCardFull>
      </div>

      <SoftCardFull c={c} title="Recent exports" subtitle="Last 30 days" right={<a style={{ fontSize: 12, color: c.muted, cursor: 'pointer' }}>Clear history</a>}>
        <div style={{ marginTop: 8 }}>
          {[
            { date: 'Apr 27, 09:42', type: 'Excel', range: 'Apr 1 – Apr 27', size: '84 KB', user: 'Jassim' },
            { date: 'Apr 24, 18:11', type: 'PDF',   range: 'Apr 1 – Apr 24', size: '316 KB', user: 'Jassim' },
            { date: 'Apr 14, 11:03', type: 'Excel', range: 'Mar 1 – Apr 14', size: '142 KB', user: 'Jassim' },
            { date: 'Apr 01, 10:00', type: 'PDF',   range: 'Mar 1 – Mar 31', size: '298 KB', user: 'Jassim' },
          ].map((x, i, a) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 80px 1fr 1fr 1fr 80px', gap: 10, padding: '10px 4px', borderBottom: i < a.length - 1 ? `1px solid ${c.rule}` : 'none', alignItems: 'center', fontSize: 12.5 }}>
              <span style={{ ...mono, fontSize: 11, color: c.muted }}>{x.date}</span>
              <Chip c={c} tone={x.type === 'Excel' ? 'ok' : 'warn'}>{x.type}</Chip>
              <span style={{ color: c.muted }}>{x.range}</span>
              <span style={{ ...mono, fontSize: 11, color: c.muted }}>{x.size}</span>
              <span style={{ color: c.muted }}>by {x.user}</span>
              <button style={iconBtn(c)}><Icon name="download" size={14} /></button>
            </div>
          ))}
        </div>
      </SoftCardFull>
    </React.Fragment>
  );
}

function Field({ c, label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: c.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ padding: '9px 12px', background: c.bg, borderRadius: 9, fontSize: 12.5 }}>{value}</div>
    </div>
  );
}

function Stat({ c, mono, l, v }) {
  return (
    <div style={{ background: c.bg, borderRadius: 9, padding: '10px 12px' }}>
      <div style={{ fontSize: 10.5, color: c.muted }}>{l}</div>
      <div style={{ ...mono, fontSize: 16, fontWeight: 600, marginTop: 2 }}>{v}</div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────
function ScreenSettings({ c, mono }) {
  return (
    <React.Fragment>
      <PageHeader c={c} title="Settings" subtitle="Manage your account and integrations" />
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {['Profile', 'WooCommerce', 'WhatsApp Bot', 'Notifications', 'Appearance', 'Billing', 'Team'].map((s, i) => (
            <div key={s} style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
              background: i === 0 ? c.card : 'transparent',
              color: i === 0 ? c.fg : c.muted,
              fontWeight: i === 0 ? 500 : 400,
              border: i === 0 ? `1px solid ${c.rule}` : '1px solid transparent',
            }}>{s}</div>
          ))}
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SoftCardFull c={c} title="Profile" subtitle="Update your personal information">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, paddingBottom: 14, borderBottom: `1px solid ${c.rule}` }}>
              <Avatar name="Jassim Sayed" size={56} bg={c.accent} fg={c.accentInk} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Jassim Sayed</div>
                <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>nkherbalinfo@gmail.com · Admin</div>
              </div>
              <button style={softBtnFull(c)}>Change photo</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
              <Field c={c} label="Full name" value="Jassim Sayed" />
              <Field c={c} label="Email"     value="nkherbalinfo@gmail.com" />
              <Field c={c} label="Phone"     value="+91 98765 43210" />
              <Field c={c} label="Role"      value="Admin" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button style={softBtnFull(c)}>Cancel</button>
              <button style={softBtnFull(c, true)}>Save changes</button>
            </div>
          </SoftCardFull>

          <SoftCardFull c={c} title="WooCommerce integration" subtitle="Connect your WooCommerce store" right={<Chip c={c} tone="ok">● Connected</Chip>}>
            <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
              <Field c={c} label="Store URL"      value="https://nkherbal.com" />
              <Field c={c} label="Consumer key"   value="ck_••••••••••••••••12ab" />
              <Field c={c} label="Consumer secret" value="cs_••••••••••••••••cd34" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${c.rule}` }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>Auto-sync</div>
                <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>Pulls new orders every 15 min · last sync 4 min ago</div>
              </div>
              <button style={softBtnFull(c)}><Icon name="arrow-right" size={13} /> Sync now</button>
            </div>
          </SoftCardFull>

          <SoftCardFull c={c} title="Appearance" subtitle="Choose your preferred theme">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 14 }}>
              {[
                { name: 'Light', bg: '#f6f4ee', fg: '#252320', selected: !c.bg.startsWith('#1') },
                { name: 'Dark',  bg: '#1a1815', fg: '#f2efe8', selected: c.bg.startsWith('#1') },
                { name: 'System', bg: 'linear-gradient(90deg, #f6f4ee 50%, #1a1815 50%)', fg: c.fg, selected: false },
              ].map(t => (
                <div key={t.name} style={{ padding: 14, borderRadius: 11, border: `2px solid ${t.selected ? c.accent : c.rule}`, cursor: 'pointer' }}>
                  <div style={{ height: 60, borderRadius: 6, background: t.bg, marginBottom: 10, border: `1px solid ${c.rule}` }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>{t.name}</span>
                    {t.selected && <Chip c={c} tone="ok">Active</Chip>}
                  </div>
                </div>
              ))}
            </div>
          </SoftCardFull>
        </div>
      </div>
    </React.Fragment>
  );
}

window.SoftFull = SoftFull;
