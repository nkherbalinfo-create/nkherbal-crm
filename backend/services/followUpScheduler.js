const Order   = require('../models/Order');
const FollowUp = require('../models/FollowUp');

// Generates follow-up reminders for orders at 30, 60, 90 days after purchase
async function generateFollowUps() {
  const now    = new Date();
  const orders = await Order.find({ orderStatus: { $nin: ['Cancelled', 'RTO'] } });
  let created  = 0;

  for (const order of orders) {
    for (const month of [1, 2, 3]) {
      const dueDate = new Date(order.orderDate);
      dueDate.setDate(dueDate.getDate() + month * 30);

      if (dueDate > now) continue; // not due yet

      // Check if this follow-up already exists
      const exists = await FollowUp.findOne({ orderId: order.orderId, monthNumber: month });
      if (exists) continue;

      await FollowUp.create({
        orderId:       order.orderId,
        orderObjectId: order._id,
        customerName:  order.customerName,
        mobile:        order.mobile,
        email:         order.email || '',
        productName:   order.productName,
        orderDate:     order.orderDate,
        monthNumber:   month,
        dueDate,
        status: 'pending'
      });
      created++;
    }
  }

  if (created > 0) console.log(`[Follow-ups] Created ${created} new follow-up reminder(s)`);
  return created;
}

module.exports = { generateFollowUps };
