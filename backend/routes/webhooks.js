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

// ── CC Avenue IPN — auto-confirm payment when CC Avenue notifies us ──
// Setup: in CC Avenue merchant panel → Payment Options → Notify URL:
//   https://crm-backend-azu8.onrender.com/api/webhooks/ccavenue
router.post('/ccavenue', async (req, res) => {
  res.sendStatus(200); // Always respond immediately so CC Avenue doesn't retry

  try {
    const WaConversation = require('../models/WaConversation');
    const { sendWhatsAppMessageDirect } = require('../services/waSender');
    const sse = require('../services/sseBroadcaster');

    let data = {};

    // CC Avenue sends either encrypted (encResp) or plain text response
    if (req.body.encResp) {
      data = decryptCCAvenue(req.body.encResp);
      console.log('[CCAvenue] Decrypted IPN:', JSON.stringify(data));
    } else {
      data = req.body;
      console.log('[CCAvenue] Plain IPN:', JSON.stringify(data));
    }

    const status = (data.order_status || data.payment_status || '').toLowerCase();
    if (status !== 'success' && status !== 'successful') {
      console.log(`[CCAvenue] Payment not successful: ${status}`);
      return;
    }

    // Extract mobile — CC Avenue puts it in billing_tel or merchant_param fields
    const rawMobile = (
      data.billing_tel ||
      data.merchant_param1 ||
      data.merchant_param2 ||
      data.shipping_tel ||
      ''
    ).replace(/\D/g, '');

    const mobile10 = rawMobile.slice(-10);
    if (!mobile10 || mobile10.length !== 10) {
      console.log('[CCAvenue] Could not extract mobile from IPN data');
      return;
    }

    const phone = `91${mobile10}`;
    const amount = data.amount || data.trans_amount || '';
    const orderId = data.order_id || data.tracking_id || '';
    console.log(`[CCAvenue] ✅ Payment SUCCESS — ${phone} | ₹${amount} | Order: ${orderId}`);

    // Find WhatsApp conversation
    const conv = await WaConversation.findOne({
      phone: { $in: [phone, mobile10] }
    });

    const confirmMsg =
      `✅ *Payment Verified!* 🎉\n\n` +
      `Aapka payment confirm ho gaya hai. Shukriya!\n\n` +
      `Ab apna order ship karne ke liye yeh details bhejein:\n\n` +
      `• *Full Name*\n` +
      `• *Complete Delivery Address*\n` +
      `• *Pincode*\n` +
      `• *Mobile Number*\n` +
      `• *Product Name* (Muejaza, Shahi Kalp, etc.)\n` +
      `• *Quantity* (kitne jars)\n\n` +
      `Details milte hi hum 24 ghante mein ship kar denge! 🚚📦`;

    await sendWhatsAppMessageDirect(phone, confirmMsg);

    if (conv) {
      await WaConversation.findOneAndUpdate({ phone }, { paymentClaimed: false });
      sse.broadcast({ type: 'payment_confirmed', phone });
    }

    console.log(`[CCAvenue] ✅ Confirmation message sent to ${phone}`);
  } catch (err) {
    console.error('[CCAvenue] IPN error:', err.message);
  }
});

// Decrypt CC Avenue encrypted response (AES-128-CBC)
function decryptCCAvenue(encResp) {
  const workingKey = process.env.CCAVENUE_WORKING_KEY;
  if (!workingKey) throw new Error('CCAVENUE_WORKING_KEY not set');
  const md5hex = (s) => crypto.createHash('md5').update(s).digest('hex');
  const key = Buffer.from(md5hex(workingKey), 'hex');          // 16 bytes
  const iv  = Buffer.from(md5hex(md5hex(workingKey)), 'hex').slice(0, 16); // 16 bytes
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  let dec = decipher.update(encResp, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return Object.fromEntries(new URLSearchParams(dec));
}

module.exports = router;
