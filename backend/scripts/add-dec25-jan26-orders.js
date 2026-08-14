/**
 * One-shot script: add December 2025 and January 2026 orders from notebook
 * Run: node backend/scripts/add-dec25-jan26-orders.js
 *
 * Returning customers share the same placeholder mobile as their first order:
 *   0000000001 = Raja Shekhar   (first seen Nov-25)
 *   0000000002 = Sahil Garg     (first seen Nov-25)
 *   0000000008 = Md Muzammil Shams
 *   0000000009 = Mayuresh/Mayresh Borvale
 *   0000000010 = A. Prabhakaran
 *   0000000012 = Jnaendra Veer  (orders twice in Jan-26)
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

const COMMON = {
  salesChannel: 'WhatsApp',
  orderStatus:  'Delivered',
  paymentStatus:'Paid',
  leadSource:   'Direct',
};

// ── DECEMBER 2025 ─────────────────────────────────────────
const DEC = [
  { customerName: 'Shamim',              mobile: '0000000004', productName: 'Muejaza',                    quantity: 1, orderValue:  4400, orderDate: new Date('2025-12-03'), notes: 'Manual entry — Dec 2025' },
  { customerName: 'Sukumar',             mobile: '0000000005', productName: 'Muejaza',                    quantity: 1, orderValue:  4400, orderDate: new Date('2025-12-05'), notes: 'Manual entry — Dec 2025' },
  { customerName: 'Sukhdev',             mobile: '0000000006', productName: 'Muejaza',                    quantity: 1, orderValue:  4400, orderDate: new Date('2025-12-07'), notes: 'Manual entry — Dec 2025' },
  { customerName: 'Adithiyan Marivelu',  mobile: '0000000007', productName: 'Testo Vardhak',              quantity: 1, orderValue:  4400, orderDate: new Date('2025-12-09'), notes: 'Manual entry — Dec 2025' },
  { customerName: 'Sahil Garg',          mobile: '0000000002', productName: 'Testo Vardhak + Muejaza x2', quantity: 3, orderValue: 12500, orderDate: new Date('2025-12-11'), notes: 'Manual entry — Dec 2025 (repeat customer)' },
  { customerName: 'Md Muzammil Shams',   mobile: '0000000008', productName: 'Muejaza',                    quantity: 1, orderValue:  4400, orderDate: new Date('2025-12-13'), notes: 'Manual entry — Dec 2025' },
  { customerName: 'Mayuresh Borvale',    mobile: '0000000009', productName: 'Testo Vardhak',              quantity: 1, orderValue:  4400, orderDate: new Date('2025-12-16'), notes: 'Manual entry — Dec 2025' },
  { customerName: 'Raja Shekhar',        mobile: '0000000001', productName: 'Muejaza x3',                 quantity: 3, orderValue: 12500, orderDate: new Date('2025-12-19'), notes: 'Manual entry — Dec 2025 (repeat customer)' },
  { customerName: 'A. Prabhakaran',      mobile: '0000000010', productName: 'Muejaza',                    quantity: 1, orderValue:  4400, orderDate: new Date('2025-12-22'), notes: 'Manual entry — Dec 2025' },
];

// ── JANUARY 2026 ──────────────────────────────────────────
const JAN = [
  { customerName: 'Rashmi',              mobile: '0000000011', productName: 'Muejaza x3',      quantity: 3, orderValue: 12500, orderDate: new Date('2026-01-03'), notes: 'Manual entry — Jan 2026' },
  { customerName: 'Jnaendra Veer',       mobile: '0000000012', productName: 'Muejaza',          quantity: 1, orderValue:  4400, orderDate: new Date('2026-01-05'), notes: 'Manual entry — Jan 2026' },
  { customerName: 'Sarfaraaz Khan',      mobile: '0000000013', productName: 'Muejaza',          quantity: 1, orderValue:  4400, orderDate: new Date('2026-01-07'), notes: 'Manual entry — Jan 2026' },
  { customerName: 'Sukumar Naskar',      mobile: '0000000014', productName: 'Muejaza',          quantity: 1, orderValue:  4200, orderDate: new Date('2026-01-09'), notes: 'Manual entry — Jan 2026' },
  { customerName: 'Sanket Maheshwari',   mobile: '0000000015', productName: 'Muejaza',          quantity: 1, orderValue:  4200, orderDate: new Date('2026-01-11'), notes: 'Manual entry — Jan 2026' },
  { customerName: 'Mayresh Borvale',     mobile: '0000000009', productName: 'Testo Vardhak x3', quantity: 3, orderValue: 12000, orderDate: new Date('2026-01-14'), notes: 'Manual entry — Jan 2026 (repeat customer)' },
  { customerName: 'Nilesh Gund',         mobile: '0000000016', productName: 'Muejaza',          quantity: 1, orderValue:  4500, orderDate: new Date('2026-01-16'), notes: 'Manual entry — Jan 2026' },
  { customerName: 'Jnaendra Veer',       mobile: '0000000012', productName: 'Muejaza',          quantity: 1, orderValue:  4200, orderDate: new Date('2026-01-18'), notes: 'Manual entry — Jan 2026 (2nd order)' },
  { customerName: 'Md Muzammil Shams',   mobile: '0000000008', productName: 'Shahi Kap',        quantity: 1, orderValue:  4200, orderDate: new Date('2026-01-20'), notes: 'Manual entry — Jan 2026 (repeat customer)' },
  { customerName: 'A. Prabhakaran',      mobile: '0000000010', productName: 'Muejaza',          quantity: 1, orderValue:  4200, orderDate: new Date('2026-01-22'), notes: 'Manual entry — Jan 2026 (repeat customer)' },
  { customerName: 'S Amandeep',          mobile: '0000000017', productName: 'Muejaza x3',       quantity: 3, orderValue: 13450, orderDate: new Date('2026-01-25'), notes: 'Manual entry — Jan 2026' },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB\n');

  const sections = [
    { label: 'DECEMBER 2025', orders: DEC, expected: 55800 },
    { label: 'JANUARY 2026',  orders: JAN, expected: 72250 },
  ];

  let grandTotal = 0;
  for (const { label, orders, expected } of sections) {
    console.log(`  ── ${label} ─────────────────────────────────────────`);
    let sectionTotal = 0;
    for (const od of orders) {
      const customerType = await upsertCustomer(od);
      const order = await Order.create({ ...COMMON, ...od, customerType });
      sectionTotal += od.orderValue;
      const tag = customerType === 'Repeat' ? ' ★ repeat' : '';
      console.log(`  ✓ ${order.orderId}  ${od.customerName.padEnd(22)} ${od.productName.padEnd(28)} ₹${od.orderValue.toLocaleString('en-IN').padStart(6)}${tag}`);
    }
    const match = sectionTotal === expected ? '✓' : '✗ MISMATCH';
    console.log(`\n     Section total: ₹${sectionTotal.toLocaleString('en-IN')}  (expected ₹${expected.toLocaleString('en-IN')}) ${match}\n`);
    grandTotal += sectionTotal;
  }

  console.log(`  ══════════════════════════════════════════════════════`);
  console.log(`  Grand total inserted: ₹${grandTotal.toLocaleString('en-IN')} across ${DEC.length + JAN.length} orders`);
  console.log(`\n  ⚠  All mobile numbers are placeholders.`);
  console.log(`     Update real numbers in the Orders page when available.\n`);

  await mongoose.disconnect();
})();
