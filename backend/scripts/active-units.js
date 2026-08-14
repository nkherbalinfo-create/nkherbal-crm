require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Order = require('../models/Order');
  const [r] = await Order.aggregate([
    { $match: { manuallyDeleted: { $ne: true } } },
    { $group: { _id: null, revenue: { $sum: '$orderValue' }, orders: { $sum: 1 }, units: { $sum: '$quantity' } } }
  ]);
  console.log(`Revenue: ₹${r.revenue.toLocaleString('en-IN')} | Orders: ${r.orders} | Units: ${r.units}`);
  mongoose.disconnect();
});
