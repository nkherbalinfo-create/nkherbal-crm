const Order   = require('../models/Order');
const FollowUp = require('../models/FollowUp');
const { sendFollowUpEmail, getFollowUpTemplate } = require('./emailService');

const emailEnabled = () => !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

// Generates follow-up reminders for orders at 30, 60, 90 days after purchase
// and auto-sends emails when a customer email is on file
async function generateFollowUps() {
  const now    = new Date();
  const orders = await Order.find({ orderStatus: { $nin: ['Cancelled', 'RTO'] } });
  let created  = 0;
  let autoSent = 0;

  for (const order of orders) {
    for (const month of [1, 2, 3]) {
      const dueDate = new Date(order.orderDate);
      dueDate.setDate(dueDate.getDate() + month * 30);

      if (dueDate > now) continue; // not due yet

      // Check if this follow-up already exists
      const exists = await FollowUp.findOne({ orderId: order.orderId, monthNumber: month });
      if (exists) continue;

      const hasEmail = !!(order.email && order.email.trim());
      let status = 'pending';
      let sentAt = undefined;
      let sentOk = false;

      // Auto-send if email configured and customer email is available
      if (hasEmail && emailEnabled()) {
        try {
          const tmpl = getFollowUpTemplate(order.customerName, order.productName, month);
          await sendFollowUpEmail(order.email, order.customerName, order.productName, month, tmpl.subject, tmpl.html);
          status = 'sent';
          sentAt = new Date();
          sentOk = true;
          autoSent++;
          console.log(`[Follow-ups] ✉ Auto-sent month ${month} to ${order.email}`);
        } catch (err) {
          console.error(`[Follow-ups] Auto-send failed for ${order.email}:`, err.message);
          // Keep as pending so staff can send manually
        }
      }

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
        status,
        ...(sentAt && { sentAt }),
        autoSent:      sentOk,
      });
      created++;
    }
  }

  if (created > 0) console.log(`[Follow-ups] Created ${created} reminder(s), auto-sent ${autoSent}`);
  return created;
}

module.exports = { generateFollowUps };
