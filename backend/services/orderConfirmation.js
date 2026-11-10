// Paid website order → WhatsApp "is this order correct?" → address check → Delhivery shipment.
//
// Flow (one order):
//   none ──(payment received: WooCommerce partial-paid/processing with date_paid)──► sent (template)
//   sent ──"Haan, confirm"──► order_confirmed ──(address buttons)──► "Haan, sahi hai" ──► address_confirmed
//                                                                └─ "Address badlo" ──► awaiting_address ──(text with pincode)──► order_confirmed
//   address_confirmed ──► Delhivery shipment created (live) / built only (dry run). Pickup stays manual.
//   "Change karna hai", unserviceable pincode, failures, no reply ──► needs_call (team is alerted in the CRM)
//
// Environment:
//   AUTOMATION_ENABLED=true          master switch (default off)
//   AUTOMATION_TEST_PHONES=98xxxxxxxx,…  if set, ONLY these customers get the automation (safe first test)
//   WA_APP_SECRET                    Meta app secret — replies are only acted on when Meta's signature checks out
//   WA_TEMPLATE_ORDER_CONFIRM        approved template name (default nk_order_confirm), WA_TEMPLATE_LANG (default en)
//   CONFIRM_REMINDER_HOURS (4), CONFIRM_ESCALATE_HOURS (24)

const crypto = require('crypto');
const Order = require('../models/Order');
const WaConversation = require('../models/WaConversation');
const delhivery = require('./delhivery');
const { sendWhatsAppPayload } = require('./waSender');
const sse = require('./sseBroadcaster');
const { partialCod } = require('./wcOrderMapping');

const IN_STATES = {
  AN: 'Andaman and Nicobar Islands', AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh', AS: 'Assam', BR: 'Bihar',
  CH: 'Chandigarh', CT: 'Chhattisgarh', CG: 'Chhattisgarh', DD: 'Daman and Diu', DH: 'Dadra and Nagar Haveli and Daman and Diu',
  DN: 'Dadra and Nagar Haveli', DL: 'Delhi', GA: 'Goa', GJ: 'Gujarat', HR: 'Haryana', HP: 'Himachal Pradesh',
  JK: 'Jammu and Kashmir', JH: 'Jharkhand', KA: 'Karnataka', KL: 'Kerala', LA: 'Ladakh', LD: 'Lakshadweep',
  MP: 'Madhya Pradesh', MH: 'Maharashtra', MN: 'Manipur', ML: 'Meghalaya', MZ: 'Mizoram', NL: 'Nagaland',
  OR: 'Odisha', OD: 'Odisha', PB: 'Punjab', PY: 'Puducherry', RJ: 'Rajasthan', SK: 'Sikkim', TN: 'Tamil Nadu',
  TS: 'Telangana', TG: 'Telangana', TR: 'Tripura', UK: 'Uttarakhand', UT: 'Uttarakhand', UP: 'Uttar Pradesh', WB: 'West Bengal'
};

function config() {
  return {
    enabled: process.env.AUTOMATION_ENABLED === 'true',
    testPhones: (process.env.AUTOMATION_TEST_PHONES || '').split(',').map(s => s.replace(/\D/g, '').slice(-10)).filter(Boolean),
    appSecret: process.env.WA_APP_SECRET || '',
    template: process.env.WA_TEMPLATE_ORDER_CONFIRM || 'nk_order_confirm',
    templateLang: process.env.WA_TEMPLATE_LANG || 'en',
    remindAfterHours: Number(process.env.CONFIRM_REMINDER_HOURS || 4),
    escalateAfterHours: Number(process.env.CONFIRM_ESCALATE_HOURS || 24),
    // Never message customers about old orders (e.g. on the first sync after switching this on)
    maxOrderAgeHours: Number(process.env.AUTOMATION_MAX_ORDER_AGE_HOURS || 48)
  };
}

// Why the automation would not run (empty = ready). Shown on the CRM status endpoint.
function readinessProblems() {
  const c = config();
  const problems = [];
  if (!c.enabled) problems.push('AUTOMATION_ENABLED is not true');
  if (!c.appSecret) problems.push('WA_APP_SECRET is not set (needed to trust button replies)');
  if (!process.env.WA_ACCESS_TOKEN || !process.env.WA_PHONE_NUMBER_ID) problems.push('WhatsApp Cloud API is not configured');
  return problems;
}

function appliesTo(mobile10) {
  const c = config();
  if (readinessProblems().length) return false;
  return c.testPhones.length ? c.testPhones.includes(mobile10) : true;
}

// Meta signs webhook calls with the app secret: header "X-Hub-Signature-256: sha256=<hex>".
function verifyMetaSignature(rawBody, header) {
  const secret = config().appSecret;
  if (!secret || !header || !rawBody) return false;
  const expected = Buffer.from('sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex'));
  const given = Buffer.from(String(header));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

const inr = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const firstName = name => (String(name || '').trim().split(/\s+/)[0] || 'Customer');

function productSummary(order) {
  const items = (order.lineItems && order.lineItems.length) ? order.lineItems : [{ name: order.productName, quantity: order.quantity }];
  return items.map(i => `${i.name} x${i.quantity || 1}`).join(', ').slice(0, 200);
}

function amounts(order) {
  const total = Number(order.orderValue) || 0;
  if (order.partialCod?.balance) return { total, paid: Number(order.partialCod.deposit) || 0, cod: Number(order.partialCod.balance) };
  return { total, paid: total, cod: 0 };
}

// ── WooCommerce → order details ───────────────────────────────
function isPaidWcOrder(wc) {
  return ['partial-paid', 'processing'].includes(wc.status) && Boolean(wc.date_paid);
}

function shippingFromWc(wc) {
  const src = (wc.shipping && wc.shipping.address_1) ? wc.shipping : (wc.billing || {});
  const billing = wc.billing || {};
  const stateCode = String(src.state || '').toUpperCase();
  return {
    name: `${src.first_name || billing.first_name || ''} ${src.last_name || billing.last_name || ''}`.trim(),
    phone: String(src.phone || billing.phone || '').replace(/\D/g, '').slice(-10),
    address: [src.address_1, src.address_2].filter(Boolean).join(', '),
    city: src.city || '',
    state: IN_STATES[stateCode] || src.state || '',
    pincode: String(src.postcode || '').replace(/\D/g, '')
  };
}

// Copy order number, part-payment split and address onto the CRM order (address only before it is confirmed).
function applyWcDetails(order, wc) {
  order.wcOrderId = String(wc.id || order.wcOrderId || '');
  const p = partialCod(wc);
  if (p) order.partialCod = { deposit: p.deposit, balance: p.balance };
  const status = order.confirmation?.status || 'none';
  if (['none', 'sent'].includes(status)) order.shipping = shippingFromWc(wc);
}

// ── WhatsApp helpers ──────────────────────────────────────────
async function logToConversation(phone, text) {
  try {
    await WaConversation.findOneAndUpdate(
      { phone },
      { $push: { messages: { role: 'assistant', content: text } }, $set: { lastMessageAt: new Date() } },
      { upsert: true }
    );
  } catch (e) { console.error('[Confirm] Could not log message:', e.message); }
}

async function sendText(phone, text) {
  await sendWhatsAppPayload({ to: phone, type: 'text', text: { body: text, preview_url: false } });
  await logToConversation(phone, text);
}

async function sendButtons(phone, text, buttons) {
  await sendWhatsAppPayload({
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text },
      action: { buttons: buttons.map(b => ({ type: 'reply', reply: { id: b.id, title: b.title } })) }
    }
  });
  await logToConversation(phone, `${text}\n[buttons: ${buttons.map(b => b.title).join(' / ')}]`);
}

// Template "nk_order_confirm": body {{1}} name {{2}} order no {{3}} product {{4}} total {{5}} paid {{6}} COD;
// quick-reply buttons 0 "Haan, confirm" and 1 "Change karna hai".
async function sendConfirmTemplate(order) {
  const c = config();
  const a = amounts(order);
  const params = [firstName(order.shipping?.name || order.customerName), order.wcOrderId || order.orderId,
    productSummary(order), inr(a.total), inr(a.paid), inr(a.cod)];
  const phone = `91${order.mobile}`;
  await sendWhatsAppPayload({
    to: phone,
    type: 'template',
    template: {
      name: c.template,
      language: { code: c.templateLang },
      components: [
        { type: 'body', parameters: params.map(t => ({ type: 'text', text: String(t) })) },
        { type: 'button', sub_type: 'quick_reply', index: '0', parameters: [{ type: 'payload', payload: `NKC:YES:${order._id}` }] },
        { type: 'button', sub_type: 'quick_reply', index: '1', parameters: [{ type: 'payload', payload: `NKC:CHG:${order._id}` }] }
      ]
    }
  });
  await logToConversation(phone,
    `[Order confirmation sent] Order #${params[1]} · ${params[2]} · Total ${params[3]} · Paid ${params[4]} · COD ${params[5]}`);
}

function notifyTeam(order, reason) {
  console.warn(`[Confirm] ⚠️ Order ${order.orderId} needs attention: ${reason}`);
  sse.broadcast({ type: 'order_needs_attention', orderId: order.orderId, id: String(order._id), reason });
}

async function needsCall(order, reason, customerText) {
  order.confirmation.status = 'needs_call';
  order.confirmation.note = reason;
  await order.save();
  notifyTeam(order, reason);
  if (customerText) {
    try { await sendText(`91${order.mobile}`, customerText); } catch (e) { console.error('[Confirm] send failed:', e.message); }
  }
}

// ── Step 1: payment received → ask the customer to confirm ────
// Safe to call on every webhook: it sends at most once per order.
async function startConfirmation(orderId, { force = false } = {}) {
  const order = await Order.findById(orderId);
  if (!order || order.salesChannel !== 'Website' || !order.mobile || order.manuallyDeleted) return 'skipped';
  if (!appliesTo(order.mobile)) return 'skipped';
  const ageHours = (Date.now() - new Date(order.orderDate).getTime()) / 3600000;
  if (!force && ageHours > config().maxOrderAgeHours) return 'too_old';
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, $or: [{ 'confirmation.status': { $in: ['none', null] } }, { confirmation: { $exists: false } }] },
    { $set: { 'confirmation.status': 'sent', 'confirmation.sentAt': new Date(), 'confirmation.reminders': 0 } },
    { new: true }
  );
  if (!claimed) return 'already';
  try {
    await sendConfirmTemplate(claimed);
    console.log(`[Confirm] ✅ Confirmation sent for ${claimed.orderId} (wc:${claimed.wcOrderId})`);
    return 'sent';
  } catch (err) {
    await needsCall(claimed, `Could not send WhatsApp confirmation: ${err.message}`);
    return 'failed';
  }
}

// ── Step 2: address check ─────────────────────────────────────
async function askAddress(order) {
  const s = order.shipping || {};
  const phone = `91${order.mobile}`;
  if (!s.address || !/^[1-9][0-9]{5}$/.test(String(s.pincode || ''))) {
    order.confirmation.status = 'awaiting_address';
    await order.save();
    await sendText(phone,
      '📍 Kripya apna *poora delivery address* bhejein:\nGhar/Flat no., Street, Area, City, State aur *6-digit Pincode*.');
    return;
  }
  const text =
    `📍 *Delivery address:*\n${s.name || order.customerName}\n${s.address}\n` +
    `${[s.city, s.state].filter(Boolean).join(', ')} - ${s.pincode}\n📞 ${s.phone || order.mobile}\n\nKya yeh address sahi hai?`;
  await sendButtons(phone, text.slice(0, 1000), [
    { id: `NKA:YES:${order._id}`, title: 'Haan, sahi hai' },
    { id: `NKA:CHG:${order._id}`, title: 'Address badlo' }
  ]);
}

// ── Step 3: create the Delhivery shipment ─────────────────────
// Used after the customer confirms, and by the CRM's "Create Delhivery order" button (manual = true).
async function createShipmentForOrder(order, { manual = false } = {}) {
  if (order.delhivery?.status === 'created') return { ok: false, error: `Already created (AWB ${order.delhivery.awb})` };
  const result = await delhivery.createShipment(order);
  const a = delhivery.amountsFor(order);
  order.delhivery = {
    status: result.ok ? (result.mode === 'live' ? 'created' : 'dry_run') : 'failed',
    awb: result.awb || order.delhivery?.awb,
    createdAt: result.ok ? new Date() : order.delhivery?.createdAt,
    error: result.ok ? '' : result.error,
    codAmount: a.cod,
    declaredValue: a.total
  };
  await order.save();
  if (!result.ok) notifyTeam(order, `Delhivery order not created${manual ? ' (manual)' : ''}: ${result.error}`);
  return result;
}

async function finishAddress(order) {
  const phone = `91${order.mobile}`;
  const s = order.shipping || {};
  let pin;
  try { pin = await delhivery.checkPincode(s.pincode); } catch (e) { pin = { serviceable: null, reason: e.message }; }
  if (pin.serviceable === false) {
    return needsCall(order, `Pincode ${s.pincode}: ${pin.reason}`,
      `🙏 Pincode *${s.pincode}* par abhi delivery check karni hogi. Hamari team aapko jaldi call karegi.`);
  }
  if (pin.serviceable && amounts(order).cod > 0 && !pin.cod) {
    return needsCall(order, `Pincode ${s.pincode} has no COD with Delhivery`,
      `🙏 Pincode *${s.pincode}* par cash on delivery available nahi hai. Hamari team aapko call karke option batayegi.`);
  }
  if (pin.serviceable && !s.city && pin.city) order.shipping.city = pin.city;

  order.confirmation.status = 'address_confirmed';
  order.confirmation.addressConfirmedAt = new Date();
  await order.save();

  const result = await createShipmentForOrder(order);
  const a = amounts(order);
  let msg = `✅ *Order confirm ho gaya!* 🎉\n\nOrder #${order.wcOrderId || order.orderId}\n${productSummary(order)}\n`;
  msg += a.cod > 0 ? `Delivery par cash dena hai: *${inr(a.cod)}*\n` : 'Payment poora ho chuka hai ✅\n';
  if (result.ok && result.awb) {
    msg += `\n🚚 Delhivery AWB: *${result.awb}*\nTrack: https://www.delhivery.com/track-v2/package/${result.awb}\n`;
  }
  msg += '\nAapka order 24–48 ghante mein dispatch hoga. Shukriya NK Herbal choose karne ke liye! 🌿🙏';
  await sendText(phone, msg);
}

// ── Incoming WhatsApp messages ────────────────────────────────
function replyPayload(msg) {
  if (msg.type === 'button') return msg.button?.payload || '';
  if (msg.type === 'interactive') return msg.interactive?.button_reply?.id || '';
  return '';
}

// Returns true when the message belonged to this flow (the AI bot should then stay quiet).
async function handleIncoming({ phone, msg, text, verified }) {
  const mobile10 = String(phone || '').slice(-10);
  const payload = replyPayload(msg);

  if (/^NK[CA]:(YES|CHG):[a-f0-9]{24}$/i.test(payload)) {
    if (!verified) {
      console.warn(`[Confirm] Ignored unsigned button reply from ${phone}`);
      return true;
    }
    const [kind, action, id] = payload.split(':');
    const order = await Order.findById(id);
    if (!order || order.mobile !== mobile10) return true;
    const status = order.confirmation?.status;

    if (kind === 'NKC' && action === 'YES' && status === 'sent') {
      order.confirmation.status = 'order_confirmed';
      order.confirmation.orderConfirmedAt = new Date();
      await order.save();
      await askAddress(order);
    } else if (kind === 'NKC' && action === 'CHG' && ['sent', 'order_confirmed', 'awaiting_address'].includes(status)) {
      await needsCall(order, 'Customer wants to change the order',
        '🙏 Koi baat nahi! Hamari team aapko jaldi call karke order update kar degi.');
    } else if (kind === 'NKA' && action === 'YES' && status === 'order_confirmed') {
      await finishAddress(order);
    } else if (kind === 'NKA' && action === 'CHG' && status === 'order_confirmed') {
      order.confirmation.status = 'awaiting_address';
      await order.save();
      await sendText(`91${mobile10}`,
        '📍 Kripya apna *poora naya address* bhejein:\nGhar/Flat no., Street, Area, City, State aur *6-digit Pincode*.');
    }
    return true;
  }

  // Typed address while we are waiting for one
  if (msg.type === 'text' && verified) {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const order = await Order.findOne({ mobile: mobile10, 'confirmation.status': 'awaiting_address', updatedAt: { $gte: since } })
      .sort({ updatedAt: -1 });
    if (!order) return false;
    const pinMatch = String(text || '').match(/\b([1-9][0-9]{5})\b/);
    if (!pinMatch) {
      await sendText(`91${mobile10}`, '🙏 Address mein *6-digit pincode* nahi mila. Kripya pincode ke saath poora address dobara bhejein.');
      return true;
    }
    const address = String(text).replace(pinMatch[0], ' ').replace(/\s+/g, ' ').replace(/[\s,\-]+$/, '').trim();
    order.shipping = { ...(order.shipping?.toObject ? order.shipping.toObject() : order.shipping || {}), address, pincode: pinMatch[1], city: '', state: '' };
    try {
      const pin = await delhivery.checkPincode(pinMatch[1]);
      if (pin.serviceable) order.shipping.city = pin.city || '';
    } catch { /* pincode lookup is best-effort here */ }
    order.confirmation.status = 'order_confirmed';
    await order.save();
    await askAddress(order);
    return true;
  }
  return false;
}

// ── Reminders / escalation (runs on a timer) ──────────────────
async function runReminders() {
  if (readinessProblems().length) return;
  const c = config();
  const now = Date.now();
  const remindBefore = new Date(now - c.remindAfterHours * 3600 * 1000);
  const escalateBefore = new Date(now - c.escalateAfterHours * 3600 * 1000);

  const toRemind = await Order.find({ 'confirmation.status': 'sent', 'confirmation.reminders': { $lt: 1 }, 'confirmation.sentAt': { $lte: remindBefore } });
  for (const order of toRemind) {
    if (!appliesTo(order.mobile)) continue;
    try {
      await sendConfirmTemplate(order);
      order.confirmation.reminders = 1;
      order.confirmation.lastReminderAt = new Date();
      await order.save();
    } catch (e) { console.error('[Confirm] reminder failed:', e.message); }
  }

  const stale = await Order.find({
    'confirmation.status': { $in: ['sent', 'order_confirmed', 'awaiting_address'] },
    $or: [
      { 'confirmation.status': 'sent', 'confirmation.sentAt': { $lte: escalateBefore } },
      { 'confirmation.status': { $ne: 'sent' }, updatedAt: { $lte: escalateBefore } }
    ]
  });
  for (const order of stale) {
    await needsCall(order, `No reply for ${c.escalateAfterHours}h — please call the customer`);
  }
}

module.exports = {
  config, readinessProblems, appliesTo, verifyMetaSignature, isPaidWcOrder, applyWcDetails, shippingFromWc,
  startConfirmation, handleIncoming, createShipmentForOrder, runReminders, amounts
};
