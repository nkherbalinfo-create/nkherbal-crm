require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const Order = require('../models/Order');

  const orders = await Order.find({
    orderDate: {
      $gte: new Date('2026-06-01'),
      $lte: new Date('2026-06-30T23:59:59')
    },
    manuallyDeleted: { $ne: true }
  }).sort({ orderDate: 1 });

  console.log(`\nJune 2026 active orders: ${orders.length}\n`);
  let total = 0;
  orders.forEach(o => {
    total += o.orderValue || 0;
    console.log(`  ${String(o.orderDate?.toDateString()).padEnd(20)} ${o.customerName.padEnd(28)} ${o.productName.slice(0,30).padEnd(32)} ₹${o.orderValue}  [${o.salesChannel}]`);
  });
  console.log(`\n  Total: ₹${total.toLocaleString('en-IN')}\n`);

  await mongoose.disconnect();
}

main().catch(console.error);
