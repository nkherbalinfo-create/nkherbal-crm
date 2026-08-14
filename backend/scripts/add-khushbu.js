require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Order    = require('../models/Order');
const Customer = require('../models/Customer');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const od = {
    customerName:  'Khushbu Kumar',
    mobile:        '9326730065',
    productName:   'Shahi Kalp',
    quantity:      1,
    orderValue:    4400,
    orderDate:     new Date('2026-01-06'),
    salesChannel:  'WhatsApp',
    orderStatus:   'Delivered',
    paymentStatus: 'Paid',
    leadSource:    'Direct',
    notes:         'Manual entry — Jan 2026',
  };

  // Check if customer already exists
  let cust = await Customer.findOne({ mobile: od.mobile });
  let customerType;
  if (!cust) {
    await Customer.create({
      name: od.customerName, mobile: od.mobile,
      totalOrders: 1, totalRevenue: od.orderValue,
      isRepeat: false, firstOrderDate: od.orderDate, lastOrderDate: od.orderDate,
    });
    customerType = 'New';
  } else {
    cust.totalOrders  += 1;
    cust.totalRevenue += od.orderValue;
    cust.isRepeat      = cust.totalOrders >= 2;
    cust.lastOrderDate = od.orderDate;
    await cust.save();
    customerType = cust.totalOrders >= 2 ? 'Repeat' : 'New';
  }

  const order = await Order.create({ ...od, customerType });
  console.log(`\n  ✓ ${order.orderId}  ${od.customerName}  ${od.productName}  ₹${od.orderValue}  ${od.orderDate.toISOString().slice(0,10)}  [${customerType}]\n`);

  await mongoose.disconnect();
})();
