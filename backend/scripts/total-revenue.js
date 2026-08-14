require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const Order = require('../models/Order');

  const [agg] = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$orderValue' },
        totalOrders: { $sum: 1 },
        totalUnits: { $sum: '$quantity' },
        avgOrder: { $avg: '$orderValue' },
      }
    }
  ]);

  // Also break down by product
  const byProduct = await Order.aggregate([
    {
      $group: {
        _id: '$productName',
        revenue: { $sum: '$orderValue' },
        orders: { $sum: 1 },
        units: { $sum: '$quantity' },
      }
    },
    { $sort: { revenue: -1 } }
  ]);

  // Also by month
  const byMonth = await Order.aggregate([
    {
      $group: {
        _id: {
          year: { $year: '$orderDate' },
          month: { $month: '$orderDate' }
        },
        revenue: { $sum: '$orderValue' },
        orders: { $sum: 1 },
        units: { $sum: '$quantity' },
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  NK HERBAL CRM — ALL ORDERS TOTAL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`  Total Revenue : ₹${agg.totalRevenue.toLocaleString('en-IN')}`);
  console.log(`  Total Orders  : ${agg.totalOrders}`);
  console.log(`  Total Units   : ${agg.totalUnits}`);
  console.log(`  Avg Order     : ₹${Math.round(agg.avgOrder).toLocaleString('en-IN')}`);

  console.log('\n  BY PRODUCT:');
  byProduct.forEach(p => {
    console.log(`  ${(p._id || 'Unknown').padEnd(30)} ₹${p.revenue.toLocaleString('en-IN').padStart(10)}  (${p.orders} orders, ${p.units} units)`);
  });

  console.log('\n  BY MONTH:');
  byMonth.forEach(m => {
    const label = `${months[m._id.month]} ${m._id.year}`;
    console.log(`  ${label.padEnd(12)} ₹${m.revenue.toLocaleString('en-IN').padStart(10)}  (${m.orders} orders)`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  await mongoose.disconnect();
}

main().catch(console.error);
