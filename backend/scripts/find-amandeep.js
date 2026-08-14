require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Order    = require('../models/Order');
const Customer = require('../models/Customer');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // Search all name variations
  console.log('\n── All name variations of Amandeep ────────────────────');
  const nameVariants = await Order.find({ customerName: /aman/i }).lean();
  if (!nameVariants.length) console.log('  (none)');
  nameVariants.forEach(o => console.log(`  ${o.orderId}  "${o.customerName}"  mobile:${o.mobile}  [${o.salesChannel}]  ${o.orderDate?.toISOString().slice(0,10)}`));

  // Website channel orders Jan–Feb 2026 (WooCommerce would be Website channel)
  console.log('\n── Website channel orders Jan–Feb 2026 ────────────────');
  const webOrders = await Order.find({
    salesChannel: 'Website',
    orderDate: { $gte: new Date('2026-01-01'), $lte: new Date('2026-02-28') }
  }).lean();
  if (!webOrders.length) console.log('  (none found)');
  webOrders.forEach(o => console.log(`  ${o.orderId}  ${o.customerName}  mobile:${o.mobile}  ${o.productName}  ₹${o.orderValue}  ${o.orderDate?.toISOString().slice(0,10)}`));

  console.log('');
  await mongoose.disconnect();
})();
