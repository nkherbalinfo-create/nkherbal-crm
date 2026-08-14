/**
 * One-shot script: February 2026 + March 2026 orders
 * Run: node backend/scripts/add-feb26-mar26-orders.js
 *
 * Price assumptions (no price stated by user):
 *   Ravi Sorout  — Muejaza ×1 → ₹4,200  (Jan-26 price used)
 *   Dhruv Attri  — "2x Testo Vardhak — 4200rs" read as ₹4,200/unit → ₹8,400 total
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Order    = require('../models/Order');
const Customer = require('../models/Customer');

async function upsertCustomer(od) {
  const { mobile, customerName, city, orderValue, orderDate } = od;
  let c = await Customer.findOne({ mobile });
  if (!c) {
    await Customer.create({
      name: customerName, mobile, city: city || '',
      totalOrders: 1, totalRevenue: orderValue,
      isRepeat: false, firstOrderDate: orderDate, lastOrderDate: orderDate,
    });
    return 'New';
  }
  c.totalOrders  += 1;
  c.totalRevenue += orderValue;
  c.isRepeat      = c.totalOrders >= 2;
  c.lastOrderDate = orderDate;
  if (customerName) c.name = customerName;
  await c.save();
  return c.totalOrders >= 2 ? 'Repeat' : 'New';
}

const COMMON = { salesChannel: 'WhatsApp', orderStatus: 'Delivered', paymentStatus: 'Paid', leadSource: 'Direct' };

const ORDERS = [
  // ── February 2026 ───────────────────────────────────────
  {
    customerName: 'Ravi Sorout',
    mobile:       '0000000018',
    productName:  'Muejaza',
    quantity:     1,
    orderValue:   4200,   // assumed — no price in notebook; update if different
    orderDate:    new Date('2026-02-10'),
    notes:        'Manual entry — Feb 2026 (price assumed ₹4,200)',
  },

  // ── March 2026 ──────────────────────────────────────────
  {
    customerName: 'Dhruv Attri',
    mobile:       '0000000019',
    productName:  'Testo Vardhak x2',
    quantity:     2,
    orderValue:   8400,   // 2 × ₹4,200; update to 4200 if that was the total
    orderDate:    new Date('2026-03-08'),
    notes:        'Manual entry — Mar 2026',
  },
  {
    customerName: 'Bhupendar Tanvar',
    mobile:       '0000000020',
    productName:  'Muejaza',
    quantity:     1,
    orderValue:   4200,
    orderDate:    new Date('2026-03-15'),
    notes:        'Manual entry — Mar 2026',
  },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB\n');

  const months = { '2026-02': 'FEBRUARY 2026', '2026-03': 'MARCH 2026' };
  let lastMonth = '';
  let total = 0;

  for (const od of ORDERS) {
    const mo = od.orderDate.toISOString().slice(0, 7);
    if (mo !== lastMonth) {
      if (lastMonth) console.log('');
      console.log(`  ── ${months[mo]} ─────────────────────────────────────`);
      lastMonth = mo;
    }
    const customerType = await upsertCustomer(od);
    const order = await Order.create({ ...COMMON, ...od, customerType });
    total += od.orderValue;
    const tag = customerType === 'Repeat' ? ' ★ repeat' : '';
    console.log(`  ✓ ${order.orderId}  ${od.customerName.padEnd(20)} ${od.productName.padEnd(22)} ₹${od.orderValue.toLocaleString('en-IN').padStart(6)}${tag}`);
  }

  console.log(`\n  ══════════════════════════════════════════════════════`);
  console.log(`  Total inserted: ₹${total.toLocaleString('en-IN')} across ${ORDERS.length} orders`);
  console.log(`\n  ⚠  Ravi Sorout's price assumed at ₹4,200 — correct in Orders page if different.`);
  console.log(`  ⚠  Dhruv Attri interpreted as 2 × ₹4,200 = ₹8,400. Correct if total was ₹4,200.\n`);

  await mongoose.disconnect();
})();
