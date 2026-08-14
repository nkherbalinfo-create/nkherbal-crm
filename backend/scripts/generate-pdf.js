// NK Herbal – Performance Report PDF Generator
// Run: node scripts/generate-pdf.js

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUT = 'C:/Users/HP/Downloads/NK-Herbal-Performance-Report.pdf';

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  info: {
    Title: 'NK Herbal Performance Report',
    Author: 'NK Herbal CRM',
    Subject: 'November 2025 – August 2026',
  },
});

doc.pipe(fs.createWriteStream(OUT));

// ─── Fonts ────────────────────────────────────────────────────────────────────
// Segoe UI supports ₹ (U+20B9) and ↑ — standard on Windows
const winFonts = 'C:/Windows/Fonts/';
try {
  doc.registerFont('Reg',  winFonts + 'segoeui.ttf');
  doc.registerFont('Bold', winFonts + 'segoeuib.ttf');
  doc.registerFont('Semi', winFonts + 'seguisb.ttf');
} catch {
  // Fallback: Helvetica (₹ won't render, but layout will still be correct)
  doc.registerFont('Reg',  winFonts + 'arial.ttf');
  doc.registerFont('Bold', winFonts + 'arialbd.ttf');
  doc.registerFont('Semi', winFonts + 'arialbd.ttf');
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  fg:     '#141413',
  muted:  '#787874',
  faint:  '#ABABAB',
  rule:   '#E0E0DC',
  ruleS:  '#B8B8B4',
  green:  '#145E32',
  cost:   '#8B1A1A',
  costB:  '#C04040',  // lighter red for bar chart
  mfg:    '#9B2A2A',
  pkg:    '#A0A0A0',
  shp:    '#C4C4C0',
  ads:    '#484848',
};

// ─── Layout constants ─────────────────────────────────────────────────────────
const L = 50;   // left margin (x)
const CW = 495; // content width

// ─── Helpers ─────────────────────────────────────────────────────────────────
const hline = (y, color = C.rule, w = 0.5) =>
  doc.strokeColor(color).lineWidth(w).moveTo(L, y).lineTo(L + CW, y).stroke();

// Draw text at explicit x,y — always absolute, never cursor-relative
const tx = (str, x, y, opts = {}) => {
  const fontName = opts.bold ? 'Bold' : (opts.semi ? 'Semi' : 'Reg');
  doc
    .font(fontName)
    .fontSize(opts.size || 10)
    .fillColor(opts.color || C.fg)
    .text(String(str), x, y, {
      align:      opts.align  || 'left',
      width:      opts.width  || CW,
      lineBreak:  opts.lb     || false,
      characterSpacing: opts.cs || 0,
    });
};

// Section label (small caps label)
const secLabel = (text, y) =>
  tx(text, L, y, { size: 7.5, color: C.muted, semi: true, cs: 0.5 });

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 1
// ═══════════════════════════════════════════════════════════════════════════════
let y = 50;

// ── Header ──────────────────────────────────────────────────────────────────
tx('NK Herbal', L, y, { bold: true, size: 15 });
tx('Performance Report', L, y, { bold: true, size: 10, align: 'right' });
y += 17;
tx('November 2025 – August 2026', L, y, { size: 9, color: C.muted, align: 'right' });
y += 14;
hline(y, C.fg, 1.5);
y += 20;

// ── KPIs ────────────────────────────────────────────────────────────────────
const kpis = [
  { label: 'Revenue',    value: '₹4,68,612', sub: '63 verified orders',  green: false },
  { label: 'Net Profit', value: '₹1,70,272', sub: 'After all costs',      green: true  },
  { label: 'Net Margin', value: '36%',        sub: 'Per ₹100 earned',     green: false },
  { label: 'Ad ROAS',   value: '4.7×',       sub: 'On ₹1L ad spend',     green: false },
];
const kpiW = CW / 4;

kpis.forEach((k, i) => {
  const kx = L + i * kpiW;
  if (i > 0) {
    doc.strokeColor(C.rule).lineWidth(0.5)
       .moveTo(kx, y - 4).lineTo(kx, y + 58).stroke();
  }
  const px = kx + 8;
  tx(k.label.toUpperCase(), px, y,      { size: 7.5, color: C.muted, semi: true, cs: 0.5, width: kpiW - 8 });
  tx(k.value,               px, y + 13, { bold: true, size: 20, color: k.green ? C.green : C.fg, width: kpiW - 8 });
  tx(k.sub,                 px, y + 42, { size: 8, color: C.faint, width: kpiW - 8 });
});
y += 60;
hline(y);
y += 16;

// ── Revenue Bar Chart ────────────────────────────────────────────────────────
secLabel('REVENUE BY MONTH  ·  ACTIVE ORDERS ONLY', y);
y += 14;

const mdata = [
  { label: 'Nov', v: 22200 },
  { label: 'Dec', v: 55800 },
  { label: 'Jan', v: 76650, peak: true },
  { label: 'Feb', v: 4200,  dead: true },
  { label: 'Mar', v: 44246 },
  { label: 'Apr', v: 54620 },
  { label: 'May', v: 8000,  dead: true },
  { label: 'Jun', v: 70000 },
  { label: 'Jul', v: 68896 },
  { label: 'Aug*',v: 64000 },
];
const CH = 85;       // chart height in pts
const CT = y;        // chart top y
const MAX_V = 80000;
const slot = CW / 10;
const bw = slot - 6; // bar width

// Gridlines + Y-axis labels
[80000, 60000, 40000, 20000].forEach(gv => {
  const gy = CT + CH * (1 - gv / MAX_V);
  doc.strokeColor(C.rule).lineWidth(0.3).moveTo(L, gy).lineTo(L + CW, gy).stroke();
  tx(`₹${gv / 1000}K`, L - 28, gy - 4, { size: 6.5, color: C.faint, align: 'right', width: 26 });
});

// Axis
hline(CT + CH, C.ruleS, 0.6);

// Bars
mdata.forEach((m, i) => {
  const bx = L + i * slot + 3;
  const bh = Math.max((m.v / MAX_V) * CH, 2);
  const by = CT + CH - bh;

  const color = m.dead ? C.costB : (m.peak ? C.fg : C.fg);
  const opacity = m.dead ? 0.55 : (m.peak ? 0.92 : 0.72);

  doc.opacity(opacity).fillColor(color).rect(bx, by, bw, bh).fill();
  doc.opacity(1);

  // Value above bar
  const vStr = `${Math.round(m.v / 1000)}K`;
  tx(vStr, bx - 1, by - 10, {
    size: 6.5,
    color: m.dead ? C.costB : C.muted,
    align: 'center',
    width: bw + 2,
  });

  // Month label below axis
  tx(m.label, bx - 1, CT + CH + 5, {
    size: 7.5, color: C.muted, align: 'center', width: bw + 2,
  });
});

y = CT + CH + 20;
tx('* Aug 1–14 only (half month). Feb and May bars in red each had just 1 order.', L, y, { size: 7.5, color: C.faint });
y += 14;
hline(y);
y += 16;

// ── Profit & Loss ────────────────────────────────────────────────────────────
secLabel('PROFIT & LOSS', y);
y += 14;

const pl = [
  { label: 'Revenue',           note: '',                     value: '₹4,68,612',  bold: true },
  { label: 'Manufacturing',     note: '₹1,800 × 94 units',   value: '−₹1,69,200', cost: true },
  { label: 'Packaging',         note: '₹110 × 94 units',     value: '−₹10,340',   cost: true },
  { label: 'Shipping',          note: '₹200 × 94 units',     value: '−₹18,800',   cost: true },
  { label: 'Meta Ads',          note: 'Nov 2025 – Aug 2026', value: '−₹1,00,000', cost: true },
  { label: 'TOTAL COSTS',       note: '',                     value: '₹2,98,340',  subtotal: true, sep: true },
  { label: 'Net Profit',        note: '',                     value: '₹1,70,272',  profit: true },
];

pl.forEach((row) => {
  if (row.sep)    { hline(y, C.rule, 0.4); y += 5; }
  if (row.profit) { hline(y, C.fg, 1.2); y += 5; }

  const labelColor = row.profit ? C.green : (row.subtotal ? C.muted : C.fg);
  const valColor   = row.cost   ? C.cost  : (row.profit  ? C.green  : (row.subtotal ? C.muted : C.fg));
  const sz         = row.profit ? 12 : 10.5;

  tx(row.label, L, y, { size: sz, color: labelColor, bold: row.bold || row.profit, semi: row.subtotal, width: 200 });
  if (row.note) tx('  · ' + row.note, L + 90, y + 1, { size: 8, color: C.faint, width: 200 });
  tx(row.value, L, y, { size: sz + (row.profit ? 2 : 0), color: valColor, bold: row.bold || row.profit, semi: row.subtotal, align: 'right' });

  const rh = row.profit ? 14 : 13;
  y += rh;
  if (!row.sep && !row.profit) hline(y - 1, C.rule, 0.3);
});

y += 10;

// ── Cost Composition Bar ─────────────────────────────────────────────────────
tx('WHERE THE ₹4,68,612 GOES', L, y, { size: 7, color: C.faint, semi: true, cs: 0.35 });
y += 10;

const cbSegs = [
  { pct: 0.361, color: C.mfg, label: 'Manufacturing 36.1%' },
  { pct: 0.022, color: C.pkg, label: 'Packaging 2.2%' },
  { pct: 0.040, color: C.shp, label: 'Shipping 4.0%' },
  { pct: 0.213, color: C.ads, label: 'Meta Ads 21.3%' },
  { pct: 0.364, color: C.green, label: 'Profit 36.4%' },
];

let sx = L;
cbSegs.forEach(s => {
  const sw = CW * s.pct;
  doc.fillColor(s.color).rect(sx, y, sw, 10).fill();
  sx += sw;
});
y += 14;

// Legend – single row (5 items, ~99pt each fits in 495pt)
cbSegs.forEach((s, i) => {
  const lx = L + i * 99;
  doc.fillColor(s.color).circle(lx + 4, y + 4, 4).fill();
  tx(s.label, lx + 11, y, { size: 7.5, color: C.muted, width: 95 });
});
y += 14;
hline(y);

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 2
// ═══════════════════════════════════════════════════════════════════════════════
doc.addPage();
y = 50;

// ── Meta Ads Table ───────────────────────────────────────────────────────────
secLabel('META ADS — MONTHLY BREAKDOWN', y);
y += 12;

const AC = [L, L + 155, L + 265, L + 380]; // column x positions
const AW = [155,  110,  115, 115];           // column widths

hline(y, C.ruleS, 0.6);
y += 6;
['Month', 'Added', 'Spent (API)', 'Balance'].forEach((h, i) => {
  tx(h.toUpperCase(), AC[i], y, { size: 7.5, color: C.muted, semi: true, cs: 0.35, align: i > 0 ? 'right' : 'left', width: AW[i] });
});
y += 12;
hline(y, C.ruleS, 0.6);
y += 6;

const adData = [
  { m: 'Nov 2025', note: 'Joined 21–22 Nov', add: '₹15,000', sp: '₹14,919', bal: '+₹81',     pos: true  },
  { m: 'Dec 2025', add: '₹15,000', sp: '₹13,247', bal: '+₹1,753',  pos: true  },
  { m: 'Jan 2026', add: '₹10,000', sp: '₹8,474',  bal: '+₹1,526',  pos: true  },
  { m: 'Feb 2026', add: '₹10,000', sp: '₹7,878',  bal: '+₹2,122',  pos: true  },
  { m: 'Mar 2026', add: '₹5,000',  sp: '₹4,850',  bal: '+₹150',    pos: true  },
  { m: 'Apr 2026', add: '₹5,000',  sp: '₹2,548',  bal: '+₹2,452',  pos: true  },
  { m: 'May 2026', add: '₹10,000', sp: '₹9,391',  bal: '+₹609',    pos: true  },
  { m: 'Jun 2026', add: '₹10,000', sp: '₹9,233',  bal: '+₹767',    pos: true  },
  { m: 'Jul 2026', add: '₹15,000', sp: '₹11,408', bal: '+₹3,592',  pos: true  },
  { m: 'Aug 2026', note: '1–14 Aug only', add: '₹5,000', sp: '₹5,351', bal: '−₹351', pos: false },
];

adData.forEach(row => {
  const hasNote = !!row.note;
  const rh = hasNote ? 22 : 14;
  const vo = hasNote ? 4 : 0; // vertical offset for number cols when there's a note

  tx(row.m,    AC[0], y,      { size: 9.5, width: AW[0] });
  if (hasNote) tx(row.note, AC[0], y + 11, { size: 7.5, color: C.faint, width: AW[0] });
  tx(row.add,  AC[1], y + vo, { size: 9.5, align: 'right', width: AW[1] });
  tx(row.sp,   AC[2], y + vo, { size: 9.5, align: 'right', width: AW[2] });
  tx(row.bal,  AC[3], y + vo, { size: 9.5, color: row.pos ? C.green : C.cost, align: 'right', width: AW[3] });

  y += rh;
  hline(y - 1, C.rule, 0.3);
});

// Total row
hline(y, C.ruleS, 0.5);
y += 6;
tx('Total',       AC[0], y, { bold: true, size: 9.5, width: AW[0] });
tx('₹1,00,000',  AC[1], y, { bold: true, size: 9.5, align: 'right', width: AW[1] });
tx('₹87,299',    AC[2], y, { bold: true, size: 9.5, align: 'right', width: AW[2] });
tx('₹210 left',  AC[3], y, { bold: true, size: 9.5, color: C.muted, align: 'right', width: AW[3] });
y += 18;

doc.font('Reg').fontSize(8.5).fillColor(C.muted)
   .text(
     'Note — The ~₹12,500 gap between funds added and API-reported spend is estimated 18% GST charged by Meta on Indian ad accounts, deducted separately from your balance.',
     L, y, { width: CW, lineBreak: true }
   );
y += 28;
hline(y);
y += 16;

// ── Analysis ──────────────────────────────────────────────────────────────────
secLabel('ANALYSIS', y);
y += 14;

const aItems = [
  {
    label: 'Profitability',
    val: '36% margin',
    valColor: C.green,
    text: '₹36 kept from every ₹100 in sales — after manufacturing, delivery and ₹1L in ad spend. Solid for a first-year physical D2C brand. Most see 20–25%.',
  },
  {
    label: 'Ad Efficiency',
    val: '4.7× ROAS',
    text: '₹4.70 in revenue for every ₹1 spent on Meta Ads. D2C industry average is around 3×. The targeting and conversion is working.',
  },
  {
    label: 'Dead Months',
    val: 'Feb & May',
    valColor: C.cost,
    text: '1 order each — nearly zero activity. Understanding why these two months collapsed is the most important open question before scaling.',
  },
  {
    label: 'Current Trajectory',
    val: '↑ Accelerating',
    text: 'Jun, Jul, Aug are the three strongest months. Aug (14 days) is on pace for ~₹1.3L — which would be the best month ever by a large margin.',
  },
];

const halfW = (CW - 24) / 2;
aItems.forEach((a, i) => {
  const ax = i % 2 === 0 ? L : L + halfW + 24;
  const ay = y + Math.floor(i / 2) * 78;

  tx(a.label.toUpperCase(), ax, ay,      { size: 7, color: C.faint, semi: true, cs: 0.25, width: halfW });
  tx(a.val,                  ax, ay + 11, { bold: true, size: 14, color: a.valColor || C.fg, width: halfW });
  doc.font('Reg').fontSize(8.5).fillColor(C.muted)
     .text(a.text, ax, ay + 30, { width: halfW, lineBreak: true });
});
y += 162;

// ── Footer ────────────────────────────────────────────────────────────────────
hline(y, C.rule, 0.5);
y += 8;
tx('NK Herbal CRM · August 14, 2026',                                  L, y, { size: 8, color: C.faint });
tx('63 verified orders · 94 units · 54 duplicate/test orders excluded', L, y, { size: 8, color: C.faint, align: 'right' });

doc.end();
console.log('');
console.log('  ✓  PDF saved to:');
console.log('     ' + OUT);
console.log('');
