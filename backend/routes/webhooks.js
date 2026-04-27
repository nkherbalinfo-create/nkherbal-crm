const express = require('express');
const crypto = require('crypto');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const router = express.Router();

// Map WooCommerce order status → CRM order status
function mapOrderStatus(wcStatus) {
  const map = {
    'pending': 'Processing',
    'processing': 'Processing',
    'on-hold': 'Processing',
    'completed': 'Delivered',
    'cancelled': 'Cancelled',
    'refunded': 'Cancelled',
    'failed': 'Cancelled',
    'shipped': 'Shipped'
  };
  return map[wcStatus] || 'Processing';
}

// Map WooCommerce payment method → CRM payment status
function mapPaymentStatus(wcOrder) {
  const method = wcOrder.payment_method || '';
  const status = wcOrder.status || '';
  if (status === 'completed') return 'Paid';
  if (method.includes('cod') || method.includes('cash')) return 'COD';
  if (status === 'processing') return 'Paid';
  return 'Pending';
}

// Find best matching CRM product name from WooCommerce line item
function matchProduct(wcProductName) {
  const name = (wcProductName || '').toLowerCase();
  if (name.includes('muejaza plus')) return 'Muejaza Plus For Men (300g)';
  if (name.includes('muejaza') && name.includes('shahi')) return 'Muejaza & Shahi Kalp Combo (300g)';
  if (name.includes('muejaza')) return 'Muejaza For Men (300g)';
  if (name.includes('shahi kalp')) return 'Shahi Kalp For Men & Women (300g)';
  if (name.includes('testo') || name.includes('vardhak')) return 'Testo – Vardhak For Men (300g)';
  if (name.includes('shilajit') && (name.includes('50') || name.includes('50g'))) return 'Kashmiri Shilajit 50g';
  if (name.includes('shilajit')) return 'Kashmiri Shilajit 25g';
  return wcProductName || 'Custom Product';
}

async function upsertCustomer(mobile, customerName, city, orderValue, orderDate) {
  let customer = await Customer.findOne({ mobile });
  if (!customer) {
    await Customer.create({
      name: customerName, mobile, city,
      totalOrders: 1, totalRevenue: orderValue,
      isRepeat: false, firstOrderDate: orderDate, lastOrderDate: orderDate
    });
    return 'New';
  }
  customer.totalOrders += 1;
  customer.totalRevenue += orderValue;
  customer.isRepeat = customer.totalOrders >= 2;
  customer.lastOrderDate = orderDate;
  await customer.save();
  return customer.totalOrders >= 2 ? 'Repeat' : 'New';
}

// Verify WooCommerce webhook signature
function verifySignature(req) {
  const secret = process.env.WC_WEBHOOK_SECRET;
  if (!secret) return true; // skip if not configured
  const signature = req.headers['x-wc-webhook-signature'];
  if (!signature) return false;
  const hash = crypto.createHmac('sha256', secret).update(req.rawBody).digest('base64');
  return hash === signature;
}

router.post('/woocommerce', async (req, res) => {
  try {
    if (!verifySignature(req)) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const wc = req.body;
    const event = req.headers['x-wc-webhook-topic'] || '';

    // Only handle order creation and updates
    if (!event.startsWith('order.')) {
      return res.json({ message: 'Event ignored' });
    }

    const billing = wc.billing || {};
    const mobile = (billing.phone || '').replace(/\D/g, '').slice(-10);
    const customerName = `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || 'Unknown';
    const city = billing.city || '';
    const email = billing.email || '';
    const billingAddress = [billing.address_1, billing.address_2, billing.city, billing.state, billing.postcode].filter(Boolean).join(', ');
    const paymentMethod = wc.payment_method_title || wc.payment_method || '';
    const orderDate = new Date(wc.date_created || Date.now());
    const orderValue = parseFloat(wc.total || 0);
    const wcOrderId = String(wc.id || '');

    // Map all line items with GST breakdown
    const wcLineItems = wc.line_items || [];
    const primaryItem = wcLineItems[0] || {};
    const productName = matchProduct(primaryItem.name);
    const quantity = primaryItem.quantity || 1;

    const lineItems = wcLineItems.map(item => {
      const qty = item.quantity || 1;
      const lineTotal = parseFloat(item.total || 0);
      const lineTax = parseFloat(item.total_tax || 0);
      return {
        name: matchProduct(item.name),
        sku: item.sku || '',
        price: qty > 0 ? lineTotal / qty : 0,
        quantity: qty,
        total: lineTotal,
        gst: lineTax
      };
    });

    // Check if order already exists (avoid duplicates on updates)
    const existing = await Order.findOne({ 'notes': `wc:${wcOrderId}` });

    if (existing) {
      existing.orderStatus = mapOrderStatus(wc.status);
      existing.paymentStatus = mapPaymentStatus(wc);
      // Backfill missing fields if not stored on original sync
      if (!existing.lineItems?.length && lineItems.length) {
        existing.lineItems = lineItems;
        existing.productName = matchProduct(wcLineItems[0]?.name) || existing.productName;
      }
      if (!existing.email && email) existing.email = email;
      if (!existing.billingAddress && billingAddress) existing.billingAddress = billingAddress;
      if (!existing.paymentMethod && paymentMethod) existing.paymentMethod = paymentMethod;
      await existing.save();
      return res.json({ message: 'Order updated', orderId: existing.orderId });
    }

    if (!mobile) {
      return res.status(400).json({ message: 'No mobile number in order' });
    }

    const customerType = await upsertCustomer(mobile, customerName, city, orderValue, orderDate);

    const order = await Order.create({
      orderDate,
      customerName,
      mobile,
      city,
      email,
      billingAddress,
      paymentMethod,
      productName,
      quantity,
      orderValue,
      lineItems,
      salesChannel: 'Website',
      leadSource: 'Organic',
      paymentStatus: mapPaymentStatus(wc),
      orderStatus: mapOrderStatus(wc.status),
      customerType,
      followUpDone: false,
      upsellDone: false,
      notes: `wc:${wcOrderId}`
    });

    console.log(`[WooCommerce] New order synced: ${order.orderId} for ${customerName}`);
    res.status(201).json({ message: 'Order created', orderId: order.orderId });

  } catch (err) {
    console.error('[WooCommerce Webhook Error]', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
