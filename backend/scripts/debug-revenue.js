require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const Order = require('../models/Order');

  // Check manuallyDeleted
  const deleted = await Order.find({ manuallyDeleted: true }, { customerName: 1, orderValue: 1, orderDate: 1 });
  console.log(`\nManually deleted orders: ${deleted.length}`);
  deleted.forEach(o => console.log(`  ${o.customerName}  ₹${o.orderValue}  ${o.orderDate?.toDateString()}`));

  // Revenue with manuallyDeleted excluded (same as dashboard)
  const [clean] = await Order.aggregate([
    { $match: { manuallyDeleted: { $ne: true } } },
    { $group: { _id: null, total: { $sum: '$orderValue' }, count: { $sum: 1 } } }
  ]);
  console.log(`\nRevenue (excl. deleted): ₹${clean?.total?.toLocaleString('en-IN')}  (${clean?.count} orders)`);

  // Check for orders with orderValue = 0 or null
  const zeroVal = await Order.find(
    { manuallyDeleted: { $ne: true }, $or: [{ orderValue: 0 }, { orderValue: null }] },
    { customerName: 1, orderValue: 1, productName: 1 }
  );
  console.log(`\nOrders with ₹0 / null value: ${zeroVal.length}`);
  zeroVal.forEach(o => console.log(`  ${o.customerName} — ${o.productName} — ₹${o.orderValue}`));

  // By month with same filter as dashboard trendFilter (Sep 2025 - Aug 2026)
  const trendStart = new Date(2025, 8, 1); // Sep 2025
  const trendEnd   = new Date(2026, 8, 0, 23, 59, 59); // Aug 31 2026
  const byMonth = await Order.aggregate([
    { $match: { orderDate: { $gte: trendStart, $lte: trendEnd }, manuallyDeleted: { $ne: true } } },
    { $group: { _id: { y: { $year: '$orderDate' }, m: { $month: '$orderDate' } }, rev: { $sum: '$orderValue' }, n: { $sum: 1 } } },
    { $sort: { '_id.y': 1, '_id.m': 1 } }
  ]);

  const mo = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let trendTotal = 0;
  console.log('\nMonthly (dashboard trendFilter):');
  byMonth.forEach(m => {
    trendTotal += m.rev;
    console.log(`  ${mo[m._id.m]} ${m._id.y}   ₹${m.rev.toLocaleString('en-IN').padStart(10)}  (${m.n} orders)`);
  });
  console.log(`  ─────────────────────────────`);
  console.log(`  TOTAL   ₹${trendTotal.toLocaleString('en-IN')}`);

  await mongoose.disconnect();
}

main().catch(console.error);
