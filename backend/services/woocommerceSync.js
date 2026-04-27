const https = require('https');
const http = require('http');
const Order = require('../models/Order');
const Customer = require('../models/Customer');

function mapOrderStatus(wcStatus) {
  const map = { pending: 'Processing', processing: 'Processing', 'on-hold': 'Processing', completed: 'Delivered', cancelled: 'Cancelled', refunded: 'Cancelled', failed: 'Cancelled', shipped: 'Shipped' };
  return map[wcStatus] || 'Processing';
}

function mapPaymentStatus(wc) {
  const method = (wc.payment_method || '').toLowerCase();
  const status = wc.status || '';
  if (status === 'completed') return 'Paid';
  if (method.includes('cod') || method.includes('cash')) return 'COD';
  if (status === 'processing') return 'Paid';
  return 'Pending';
}

function matchProduct(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('muejaza plus')) return 'Muejaza Plus For Men (300g)';
  if (n.includes('muejaza') && n.includes('shahi')) return 'Muejaza & Shahi Kalp Combo (300g)';
  if (n.includes('muejaza')) return 'Muejaza For Men (300g)';
  if (n.includes('shahi kalp')) return 'Shahi Kalp For Men & Women (300g)';
  if (n.includes('testo') || n.includes('vardhak')) return 'Testo – Vardhak For Men (300g)';
  if (n.includes('shilajit') && (n.includes('50') || n.includes('50g'))) return 'Kashmiri Shilajit 50g';
  if (n.includes('shilajit')) return 'Kashmiri Shilajit 25g';
  return name || 'Custom Product';
}

async function upsertCustomer(mobile, customerName, city, orderValue, orderDate) {
  let customer = await Customer.findOne({ mobile });
  if (!customer) {
    await Customer.create({ name: customerName, mobile, city, totalOrders: 1, totalRevenue: orderValue, isRepeat: false, firstOrderDate: orderDate, lastOrderDate: orderDate });
    return 'New';
  }
  customer.totalOrders += 1;
  customer.totalRevenue += orderValue;
  customer.isRepeat = customer.totalOrders >= 2;
  customer.lastOrderDate = orderDate;
  await customer.save();
  return customer.totalOrders >= 2 ? 'Repeat' : 'New';
}

function wcGet(url, key, secret) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${key}:${secret}`).toString('base64');
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { Authorization: `Basic ${auth}` } }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ data: parsed, headers: res.headers, status: res.statusCode });
        } catch (e) { reject(new Error('Invalid JSON from WooCommerce API')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('WooCommerce API timeout')); });
  });
}

async function processWCOrder(wc) {
  const billing = wc.billing || {};
  const mobile = (billing.phone || '').replace(/\D/g, '').slice(-10);
  if (!mobile) return 'skipped';

  const customerName = `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || 'Unknown';
  const city = billing.city || '';
  const email = billing.email || '';
  const billingAddress = [billing.address_1, billing.address_2, billing.city, billing.state, billing.postcode].filter(Boolean).join(', ');
  const paymentMethod = wc.payment_method_title || wc.payment_method || '';
  const orderDate = new Date(wc.date_created || Date.now());
  const orderValue = parseFloat(wc.total || 0);
  const wcOrderId = String(wc.id || '');

  const wcLineItems = wc.line_items || [];
  const primaryItem = wcLineItems[0] || {};
  const productName = matchProduct(primaryItem.name);
  const quantity = primaryItem.quantity || 1;

  const lineItems = wcLineItems.map(item => {
    const qty = item.quantity || 1;
    const lineTotal = parseFloat(item.total || 0);
    const lineTax = parseFloat(item.total_tax || 0);
    return { name: matchProduct(item.name), sku: item.sku || '', price: qty > 0 ? lineTotal / qty : 0, quantity: qty, total: lineTotal, gst: lineTax };
  });

  // Find by wc: note OR by mobile + same orderDate (catches orders synced before note was added)
  const dayStart = new Date(orderDate); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(orderDate); dayEnd.setHours(23, 59, 59, 999);
  const existing = await Order.findOne({
    $or: [
      { notes: `wc:${wcOrderId}` },
      { mobile, orderDate: { $gte: dayStart, $lte: dayEnd }, orderValue }
    ]
  });

  if (existing) {
    existing.orderStatus = mapOrderStatus(wc.status);
    existing.paymentStatus = mapPaymentStatus(wc);
    if (lineItems.length) existing.lineItems = lineItems;
    if (email) existing.email = email;
    if (billingAddress) existing.billingAddress = billingAddress;
    if (paymentMethod) existing.paymentMethod = paymentMethod;
    // Stamp the wc: note so future syncs find it by note directly
    if (!existing.notes || !existing.notes.startsWith('wc:')) {
      existing.notes = `wc:${wcOrderId}`;
    }
    await existing.save();
    return 'updated';
  }

  const customerType = await upsertCustomer(mobile, customerName, city, orderValue, orderDate);
  try {
    await Order.create({
      orderDate, customerName, mobile, city, email, billingAddress, paymentMethod,
      productName, quantity, orderValue, lineItems,
      salesChannel: 'Website', leadSource: 'Organic',
      paymentStatus: mapPaymentStatus(wc),
      orderStatus: mapOrderStatus(wc.status),
      customerType, followUpDone: false, upsellDone: false,
      notes: `wc:${wcOrderId}`
    });
    return 'created';
  } catch (err) {
    if (err.code === 11000) {
      // orderId collision on concurrent inserts — skip, already exists
      console.warn(`[WC Sync] Skipped duplicate orderId for wc:${wcOrderId}`);
      return 'skipped';
    }
    throw err;
  }
}

// Rebuild every customer's stats directly from the orders collection.
// "Repeat" = customer placed a second SEPARATE ORDER on a different occasion.
// Qty=2 in one cart, or multiple line items in one WC order = still New (1 purchase occasion).
async function recalculateCustomers() {
  // Step 1: Remove duplicate CRM orders for the same WooCommerce order.
  // A duplicate happens when the same wc:XXXXX note appears more than once
  // (e.g., webhook + sync both created a record before dedup was in place).
  const wcDupes = await Order.aggregate([
    { $match: { notes: { $regex: '^wc:' } } },
    { $group: { _id: '$notes', ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]);
  for (const dup of wcDupes) {
    const [, ...toRemove] = dup.ids; // keep first, delete the rest
    await Order.deleteMany({ _id: { $in: toRemove } });
    console.log(`[Recalc] Removed ${toRemove.length} duplicate(s) for ${dup._id}`);
  }

  // Step 2: Count distinct purchase occasions per customer.
  // One WC order number = one occasion regardless of how many products/qty were in it.
  const stats = await Order.aggregate([
    {
      $group: {
        _id:           '$mobile',
        name:          { $last: '$customerName' },
        city:          { $last: '$city' },
        totalOrders:   { $sum: 1 },           // each CRM order = one purchase occasion
        totalRevenue:  { $sum: '$orderValue' },
        firstOrderDate:{ $min: '$orderDate' },
        lastOrderDate: { $max: '$orderDate' }
      }
    }
  ]);

  // Step 3: Update customer records. Repeat = 2+ separate purchase occasions.
  for (const s of stats) {
    if (!s._id) continue;
    await Customer.findOneAndUpdate(
      { mobile: s._id },
      {
        name:           s.name,
        city:           s.city,
        totalOrders:    s.totalOrders,
        totalRevenue:   s.totalRevenue,
        isRepeat:       s.totalOrders >= 2,   // came back and bought again = Repeat
        firstOrderDate: s.firstOrderDate,
        lastOrderDate:  s.lastOrderDate
      },
      { upsert: true, new: true }
    );
  }

  // Step 4: Fix customerType on each order.
  // A customer's FIRST order (by date) = New. Any order after that = Repeat.
  const allOrders = await Order.find({}, { _id: 1, mobile: 1, orderDate: 1, customerType: 1 })
    .sort({ orderDate: 1 });
  const firstOrderSeen = new Set();
  for (const o of allOrders) {
    const correctType = firstOrderSeen.has(o.mobile) ? 'Repeat' : 'New';
    firstOrderSeen.add(o.mobile);
    if (o.customerType !== correctType) {
      await Order.updateOne({ _id: o._id }, { customerType: correctType });
    }
  }

  return stats.length;
}

async function syncOrders(since = null) {
  const baseUrl = (process.env.WC_STORE_URL || '').replace(/\/$/, '');
  const key = process.env.WC_CONSUMER_KEY;
  const secret = process.env.WC_CONSUMER_SECRET;

  if (!baseUrl || !key || !secret) {
    throw new Error('WooCommerce API not configured. Add WC_STORE_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET to .env');
  }

  let page = 1;
  let created = 0, updated = 0, skipped = 0;

  while (true) {
    let url = `${baseUrl}/wp-json/wc/v3/orders?per_page=100&page=${page}&orderby=date&order=desc`;
    if (since) url += `&after=${since}`;

    const { data: orders, headers } = await wcGet(url, key, secret);

    // WC returns an error object (not an array) when credentials are wrong
    if (!Array.isArray(orders)) {
      const msg = orders?.message || JSON.stringify(orders);
      throw new Error(`WooCommerce API error: ${msg}`);
    }
    if (!orders.length) break;

    for (const wc of orders) {
      const result = await processWCOrder(wc);
      if (result === 'created') created++;
      else if (result === 'updated') updated++;
      else skipped++;
    }

    const totalPages = parseInt(headers['x-wp-totalpages'] || '1', 10);
    if (page >= totalPages) break;
    page++;
  }

  // Always recalculate after syncing so New/Repeat is always accurate
  await recalculateCustomers();

  return { created, updated, skipped };
}

module.exports = { syncOrders, recalculateCustomers };
