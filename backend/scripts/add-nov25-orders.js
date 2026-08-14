/**
 * One-shot script: add 3 manual November 2025 orders
 * Run: node backend/scripts/add-nov25-orders.js
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

const ORDERS = [
  {
    customerName: 'Raja Shekhar',
    mobile:       '0000000001',   // ← update with real number
    productName:  'Muejaza Plus',
    quantity:     1,
    orderValue:   12000,
    orderDate:    new Date('2025-11-05'),
    salesChannel: 'WhatsApp',
    orderStatus:  'Delivered',
    paymentStatus:'Paid',
    leadSource:   'Direct',
    notes:        'Manual entry — November 2025',
  },
  {
    customerName: 'Sahil Garg',
    mobile:       '0000000002',   // ← update with real number
    productName:  'Muejaza + Shilajit',
    quantity:     2,
    orderValue:   6000,
    orderDate:    new Date('2025-11-10'),
    salesChannel: 'WhatsApp',
    orderStatus:  'Delivered',
    paymentStatus:'Paid',
    leadSource:   'Direct',
    notes:        'Manual entry — November 2025',
  },
  {
    customerName: 'Pankaj Pandey',
    mobile:       '0000000003',   // ← update with real number
    productName:  'Testo Vardhak',
    quantity:     1,
    orderValue:   4200,
    orderDate:    new Date('2025-11-15'),
    salesChannel: 'WhatsApp',
    orderStatus:  'Delivered',
    paymentStatus:'Paid',
    leadSource:   'Direct',
    notes:        'Manual entry — November 2025',
  },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB\n');

  let total = 0;
  for (const od of ORDERS) {
    const customerType = await upsertCustomer(od);
    const order = await Order.create({ ...od, customerType });
    total += od.orderValue;
    console.log(`  ✓ ${order.orderId}  ${od.customerName.padEnd(18)} ${od.productName.padEnd(24)} ₹${od.orderValue.toLocaleString('en-IN')}  [${customerType}]`);
  }

  console.log(`\n  ─────────────────────────────────────────────────────`);
  console.log(`  Total: ₹${total.toLocaleString('en-IN')} across ${ORDERS.length} orders`);
  console.log(`\n  ⚠  Mobile numbers are placeholders (0000000001-3).`);
  console.log(`     Edit them in the Orders page once the real numbers are known.\n`);

  await mongoose.disconnect();
})();
