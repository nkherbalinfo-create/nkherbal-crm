// WooCommerce → CRM mapping shared by the order webhook (routes/webhooks.js) and the REST sync
// (services/woocommerceSync.js), so both record the same values.
//
// Partial COD (WooBooster): the customer pays a deposit online (e.g. ₹500) and the balance in cash to
// Delhivery. WooCommerce's own `total` is only the deposit until payment completes, so the CRM takes the
// real order value from WooBooster's meta (partial_cod_total_amount / _paid_amount / _pending_amount).

const ORDER_STATUS = {
  pending: 'Processing',
  processing: 'Processing',
  'on-hold': 'Processing',
  'partial-paid': 'Processing',
  completed: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Cancelled',
  failed: 'Cancelled',
  shipped: 'Shipped'
};

function mapOrderStatus(wcStatus) {
  return ORDER_STATUS[wcStatus] || 'Processing';
}

function metaValue(wc, key) {
  const entry = (wc.meta_data || []).find(m => m && m.key === key);
  return entry ? entry.value : undefined;
}

// Rupee amount → number with at most 2 decimals; float noise like 3500.00571429 snaps to 3500.
function toRupees(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const text = String(raw).trim();
  if (!/^[0-9]{1,9}(\.[0-9]+)?$/.test(text)) return null;
  const value = Number(text);
  const whole = Math.round(value);
  if (Math.abs(value - whole) < 0.01) return whole;
  return Math.round(value * 100) / 100;
}

// { deposit, balance, total } for a valid partial-COD order, otherwise null.
function partialCod(wc) {
  const deposit = toRupees(metaValue(wc, 'partial_cod_paid_amount'));
  const balance = toRupees(metaValue(wc, 'partial_cod_pending_amount'));
  const total = toRupees(metaValue(wc, 'partial_cod_total_amount'));
  if (!deposit || !balance || total === null) return null;
  if (Math.round(deposit * 100) + Math.round(balance * 100) !== Math.round(total * 100)) return null;
  return { deposit, balance, total };
}

// The real order value: full price for partial-COD orders, WooCommerce total otherwise.
function orderValueFromWC(wc) {
  const partial = partialCod(wc);
  return partial ? partial.total : parseFloat(wc.total || 0);
}

// For an order already in the CRM: the corrected value when it was saved at the deposit amount
// (old behaviour), otherwise null. Values edited by hand in the CRM are never overwritten.
function correctedOrderValue(existingValue, wc) {
  const partial = partialCod(wc);
  if (!partial) return null;
  return Number(existingValue) === partial.deposit ? partial.total : null;
}

async function findExistingWcOrder(Order, wcOrderId, mobile, orderDate, orderValue) {
  const identity = { $or: [{ wcOrderId }, { notes: `wc:${wcOrderId}` }] };
  const linked = await Order.findOne({ ...identity, manuallyDeleted: { $ne: true } });
  if (linked) return linked;

  const deleted = await Order.findOne({ ...identity, manuallyDeleted: true });
  if (deleted || !mobile) return deleted;

  // A legacy manual website record may not have its WooCommerce ID yet.
  // Never match a different WooCommerce order just because the customer and total match.
  const dayStart = new Date(orderDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const candidates = await Order.find({
    mobile,
    salesChannel: 'Website',
    orderValue,
    orderDate: { $gte: dayStart, $lt: dayEnd },
    wcOrderId: { $in: [null, ''] },
    notes: { $not: /^wc:/ }
  }).limit(2);
  return candidates.length === 1 ? candidates[0] : null;
}

function mapPaymentStatus(wc) {
  const method = (wc.payment_method || '').toLowerCase();
  const status = wc.status || '';
  if (status === 'completed') return 'Paid';
  // Deposit paid online, balance still to be collected in cash by Delhivery.
  if (partialCod(wc) && (status === 'partial-paid' || status === 'processing')) return 'COD';
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

// "₹4,300" or "₹4,300 (₹500 paid online, ₹3,800 cash on delivery)" for customer messages.
function amountText(wc) {
  const partial = partialCod(wc);
  const inr = n => `₹${Number(n).toLocaleString('en-IN')}`;
  if (!partial) return inr(orderValueFromWC(wc));
  return `${inr(partial.total)} (${inr(partial.deposit)} paid online, ${inr(partial.balance)} cash on delivery)`;
}

module.exports = {
  mapOrderStatus,
  mapPaymentStatus,
  matchProduct,
  partialCod,
  orderValueFromWC,
  correctedOrderValue,
  findExistingWcOrder,
  amountText,
  toRupees
};
