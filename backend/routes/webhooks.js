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

    // ── Auto-send WhatsApp confirmation for paid website orders ──
    const isPaid = ['paid', 'processing', 'completed'].includes((wc.status || '').toLowerCase())
      || mapPaymentStatus(wc) === 'Paid';
    if (isPaid && mobile) {
      try {
        const { sendWhatsAppMessageDirect } = require('../services/waSender');
        const WaConversation = require('../models/WaConversation');
        const phone = `91${mobile}`;
        const msg =
          `✅ *Order Confirmed!* 🎉\n\n` +
          `Namaste *${customerName.split(' ')[0]} Ji*! Aapka order receive ho gaya hai.\n\n` +
          `📦 *Order Details:*\n` +
          `• Product: *${productName}*\n` +
          `• Amount: *₹${orderValue.toLocaleString('en-IN')}*\n` +
          `• Order ID: *${order.orderId}*\n\n` +
          `🚚 Aapka order 3–5 working days mein deliver ho jaayega.\n` +
          `Tracking details aapko WhatsApp/SMS par milegi.\n\n` +
          `Shukriya NK Herbal choose karne ke liye! 🌿🙏`;
        await sendWhatsAppMessageDirect(phone, msg);
        await WaConversation.findOneAndUpdate({ phone }, { paymentClaimed: false });
        console.log(`[WooCommerce] ✅ WhatsApp confirmation sent to ${phone}`);
      } catch (waErr) {
        console.error('[WooCommerce] WhatsApp confirmation failed:', waErr.message);
      }
    }

    res.status(201).json({ message: 'Order created', orderId: order.orderId });

  } catch (err) {
    console.error('[WooCommerce Webhook Error]', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── Test endpoint — simulate a CC Avenue payment (for testing only) ──
// Usage: POST https://crm-backend-azu8.onrender.com/api/webhooks/ccavenue-test
// Body: { "mobile": "9876543210", "name": "Test User", "amount": "4000", "product": "Muejaza For Men" }
router.post('/ccavenue-test', async (req, res) => {
  const { mobile = '9999999999', name = 'Test Customer', amount = '4000', product = 'Muejaza For Men (300g)' } = req.body;
  console.log(`[CCAvenue TEST] Simulating payment: ${name} (${mobile}) ₹${amount}`);

  // Inject fake CC Avenue data and call the same handler logic
  req.body = {
    order_status:   'Success',
    billing_tel:    mobile,
    billing_name:   name,
    billing_address: '123 Test Street',
    billing_city:   'Mumbai',
    billing_state:  'Maharashtra',
    billing_zip:    '400001',
    billing_email:  'test@test.com',
    amount:         amount,
    order_id:       `TEST-${Date.now()}`,
    tracking_id:    `TRK-${Date.now()}`,
    merchant_param3: product
  };

  // Reuse the same handler
  res.json({ ok: true, message: `Test payment simulated for ${mobile}. Check WhatsApp and Render logs.` });

  // Fire the actual CC Avenue logic asynchronously
  const WaConversation = require('../models/WaConversation');
  const { sendWhatsAppMessageDirect } = require('../services/waSender');
  const sse = require('../services/sseBroadcaster');
  const data = req.body;

  try {
    const mobile10 = String(data.billing_tel).replace(/\D/g, '').slice(-10);
    const phone = `91${mobile10}`;
    const amt = parseFloat(data.amount);
    const customerName = data.billing_name;
    const city = data.billing_city;
    const address = [data.billing_address, data.billing_city, data.billing_state, data.billing_zip].filter(Boolean).join(', ');
    const ccOrderId = data.order_id;
    const firstName = customerName.split(' ')[0];

    const customerType = await upsertCustomer(mobile10, customerName, city, amt, new Date());
    const existingOrder = await Order.findOne({ notes: `cca:${ccOrderId}` });
    if (!existingOrder) {
      await Order.create({
        orderDate: new Date(), customerName, mobile: mobile10, city,
        email: data.billing_email, billingAddress: address,
        productName: data.merchant_param3 || 'NK Herbal Product',
        quantity: 1, orderValue: amt,
        salesChannel: 'Website', leadSource: 'Organic',
        paymentStatus: 'Paid', orderStatus: 'Processing',
        customerType, followUpDone: false, upsellDone: false,
        notes: `cca:${ccOrderId}`
      });
    }

    const confirmMsg =
      `✅ *Order Confirmed!* 🎉\n\nNamaste *${firstName} Ji*! Aapka payment verify ho gaya hai.\n\n` +
      `📦 *Order Summary:*\n• Product: *${data.merchant_param3}*\n• Amount: *₹${amt.toLocaleString('en-IN')}*\n• Order ID: *${ccOrderId}*\n\n` +
      `🚚 Aapka order 3–5 working days mein deliver ho jaayega. Tracking details milegi.\n\n` +
      `Shukriya NK Herbal choose karne ke liye! 🌿🙏`;

    await sendWhatsAppMessageDirect(phone, confirmMsg);
    await WaConversation.findOneAndUpdate({ phone: { $in: [phone, mobile10] } }, { paymentClaimed: false });
    sse.broadcast({ type: 'payment_confirmed', phone });
    console.log(`[CCAvenue TEST] ✅ All done for ${phone}`);
  } catch (err) {
    console.error('[CCAvenue TEST] Error:', err.message);
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
    const amount = parseFloat((data.amount || data.trans_amount || '0').replace(/,/g, ''));
    const ccOrderId = data.order_id || data.tracking_id || '';
    const customerName = (data.billing_name || data.shipping_name || `Customer-${mobile10}`).trim();
    const city = data.billing_city || data.shipping_city || '';
    const address = [data.billing_address, data.billing_city, data.billing_state, data.billing_zip].filter(Boolean).join(', ');
    const email = data.billing_email || '';
    const productName = data.merchant_param3 || data.item_code || 'NK Herbal Product';

    console.log(`[CCAvenue] ✅ Payment SUCCESS — ${customerName} (${phone}) | ₹${amount} | CC Order: ${ccOrderId}`);

    // ── Auto-capture/confirm order on CC Avenue ───────────
    const trackingId = data.tracking_id || '';
    captureCCAvOrder(ccOrderId, trackingId, amount).catch(e =>
      console.error('[CCAvenue] Auto-capture error:', e.message)
    );

    // ── Auto-create order in CRM ──────────────────────────
    try {
      const existingOrder = await Order.findOne({ notes: `cca:${ccOrderId}` });
      if (!existingOrder && mobile10 && amount > 0) {
        const customerType = await upsertCustomer(mobile10, customerName, city, amount, new Date());
        await Order.create({
          orderDate: new Date(),
          customerName,
          mobile: mobile10,
          city,
          email,
          billingAddress: address,
          productName: productName.includes('Herbal') ? productName : `NK Herbal Product`,
          quantity: 1,
          orderValue: amount,
          salesChannel: 'Website',
          leadSource: 'Organic',
          paymentStatus: 'Paid',
          orderStatus: 'Processing',
          customerType,
          followUpDone: false,
          upsellDone: false,
          notes: `cca:${ccOrderId}`
        });
        console.log(`[CCAvenue] ✅ CRM order created for ${customerName}`);
      }
    } catch (orderErr) {
      console.error('[CCAvenue] CRM order creation failed:', orderErr.message);
    }

    // ── Send WhatsApp confirmation with full order details ─
    const firstName = customerName.split(' ')[0];
    const hasAddress = address.replace(/,\s*/g, '').trim().length > 5;

    let confirmMsg = `✅ *Order Confirmed!* 🎉\n\nNamaste *${firstName} Ji*! Aapka payment verify ho gaya hai.\n\n`;
    confirmMsg += `📦 *Order Summary:*\n`;
    confirmMsg += `• Amount: *₹${amount.toLocaleString('en-IN')}*\n`;
    confirmMsg += `• Order ID: *${ccOrderId}*\n`;
    if (hasAddress) {
      confirmMsg += `• Delivery: *${address}*\n`;
    }
    confirmMsg += `\n🚚 Aapka order 3–5 working days mein deliver ho jaayega.\n`;
    confirmMsg += `Tracking details aapko WhatsApp/SMS par milegi.\n\n`;

    if (!hasAddress) {
      confirmMsg += `📍 Ek kaam karein — apna *delivery address aur pincode* yahan bhejein taaki hum jaldi ship kar sakein.\n\n`;
    }

    confirmMsg += `Shukriya NK Herbal choose karne ke liye! 🌿🙏`;

    await sendWhatsAppMessageDirect(phone, confirmMsg);

    // ── Update CRM state ──────────────────────────────────
    await WaConversation.findOneAndUpdate(
      { phone: { $in: [phone, mobile10] } },
      { paymentClaimed: false }
    );
    sse.broadcast({ type: 'payment_confirmed', phone });
    console.log(`[CCAvenue] ✅ Full confirmation sent to ${phone}`);
  } catch (err) {
    console.error('[CCAvenue] IPN error:', err.message);
  }
});

// ── CC Avenue Order Capture API — auto-confirm pending order ──
async function captureCCAvOrder(orderId, trackingId, amount) {
  const accessCode = process.env.CCAVENUE_ACCESS_CODE;
  const workingKey = process.env.CCAVENUE_WORKING_KEY;
  if (!accessCode || !workingKey) {
    console.warn('[CCAvenue] CCAVENUE_ACCESS_CODE or WORKING_KEY not set — skipping capture');
    return;
  }

  try {
    const payload = JSON.stringify({
      reference_no: trackingId,
      order_no:     orderId,
      amount:       String(amount),
      currency:     'INR'
    });

    const encReq = encryptCCAvenue(payload, workingKey);

    const body = `command=captureOrder&enc_request=${encodeURIComponent(encReq)}&access_code=${encodeURIComponent(accessCode)}&request_type=JSON&response_type=JSON`;

    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'www.ccavenue.com',
        path:     '/merchant_api.do',
        method:   'POST',
        headers: {
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => {
          try {
            // CC Avenue returns encrypted response — decrypt it
            const parsed = JSON.parse(data);
            if (parsed.enc_response) {
              const dec = decryptCCAvenue(parsed.enc_response);
              resolve(dec);
            } else {
              resolve(parsed);
            }
          } catch { resolve({ raw: data }); }
        });
      });
      req.on('error', reject);
      req.setTimeout(10000, () => { req.destroy(); reject(new Error('CC Avenue capture timeout')); });
      req.write(body);
      req.end();
    });

    console.log('[CCAvenue] Capture response:', JSON.stringify(result));
    const status = (result.order_status || result.status || '').toLowerCase();
    if (status.includes('success') || status.includes('shipped') || status.includes('confirm')) {
      console.log(`[CCAvenue] ✅ Order ${orderId} auto-captured/confirmed on CC Avenue`);
    } else {
      console.log(`[CCAvenue] ⚠️ Capture returned: ${JSON.stringify(result)}`);
    }
  } catch (err) {
    console.error('[CCAvenue] Order capture failed:', err.message);
  }
}

// Encrypt data for CC Avenue API requests (same AES-128-CBC)
function encryptCCAvenue(data, workingKey) {
  const md5hex = (s) => crypto.createHash('md5').update(s).digest('hex');
  const key = Buffer.from(md5hex(workingKey), 'hex');
  const iv  = Buffer.from(md5hex(md5hex(workingKey)), 'hex').slice(0, 16);
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
  let enc = cipher.update(data, 'utf8', 'hex');
  enc += cipher.final('hex');
  return enc;
}

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
