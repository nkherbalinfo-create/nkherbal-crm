// Order confirmation + Delhivery automation, end to end with an in-memory database and fake WhatsApp.
// Nothing is sent anywhere. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const crypto = require('crypto');

// ── In-memory stand-ins ───────────────────────────────────────
const store = new Map();
const sent = [];        // WhatsApp payloads
const events = [];      // SSE broadcasts
let nextId = 1;
const newId = () => (nextId++).toString(16).padStart(24, '0');

function get(obj, dotted) { return dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
function setPath(obj, dotted, value) {
  const keys = dotted.split('.'); let o = obj;
  keys.slice(0, -1).forEach(k => { o[k] = o[k] || {}; o = o[k]; });
  o[keys[keys.length - 1]] = value;
}
function matches(doc, filter) {
  return Object.entries(filter).every(([k, cond]) => {
    if (k === '$or') return cond.some(f => matches(doc, f));
    const v = k === '_id' ? doc._id : get(doc, k);
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('$in' in cond) return cond.$in.includes(v === undefined ? null : v);
      if ('$exists' in cond) return (v !== undefined) === cond.$exists;
      if ('$lt' in cond) return v < cond.$lt;
      if ('$lte' in cond) return v <= cond.$lte;
      if ('$gte' in cond) return v >= cond.$gte;
      if ('$ne' in cond) return v !== cond.$ne;
    }
    return String(v) === String(cond);
  });
}

class FakeOrder {
  constructor(d) {
    Object.assign(this, { _id: newId(), confirmation: { status: 'none', reminders: 0 }, delhivery: { status: 'none' }, updatedAt: new Date() }, d);
  }
  async save() { this.updatedAt = new Date(); store.set(String(this._id), this); return this; }
}
const OrderStub = {
  findById: async id => store.get(String(id)) || null,
  findOneAndUpdate: async (filter, update) => {
    const doc = [...store.values()].find(d => matches(d, filter));
    if (!doc) return null;
    Object.entries(update.$set || {}).forEach(([k, v]) => setPath(doc, k, v));
    return doc;
  },
  findOne: (filter) => {
    const list = [...store.values()].filter(d => matches(d, filter));
    const p = Promise.resolve(list[0] || null);
    p.sort = () => Promise.resolve(list.sort((a, b) => b.updatedAt - a.updatedAt)[0] || null);
    return p;
  },
  find: async filter => [...store.values()].filter(d => matches(d, filter))
};

function stub(rel, exportsObj) {
  const file = require.resolve(path.join(__dirname, '..', rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports: exportsObj };
}
stub('models/Order', OrderStub);
stub('models/WaConversation', { findOneAndUpdate: async () => ({}) });
stub('services/waSender', { sendWhatsAppPayload: async p => { sent.push(p); return { messages: [{ id: 'wamid.x' }] }; } });
stub('services/sseBroadcaster', { broadcast: e => events.push(e) });

process.env.AUTOMATION_ENABLED = 'true';
process.env.WA_APP_SECRET = 'app-secret';
process.env.WA_ACCESS_TOKEN = 'token';
process.env.WA_PHONE_NUMBER_ID = '123';
process.env.AUTOMATION_TEST_PHONES = '9876543210';
process.env.DELHIVERY_MODE = 'dry_run';
delete process.env.DELHIVERY_TOKEN;

const flow = require('../services/orderConfirmation');
const delhivery = require('../services/delhivery');

async function makeOrder(over = {}) {
  const o = new FakeOrder({
    orderId: 'ORD-202611-0010', orderDate: new Date(), salesChannel: 'Website', customerName: 'Ravi Kumar',
    mobile: '9876543210', productName: 'Muejaza For Men (300g)', quantity: 1, orderValue: 4300, paymentStatus: 'COD',
    lineItems: [{ name: 'Muejaza For Men (300g)', quantity: 1 }], wcOrderId: '24600',
    partialCod: { deposit: 500, balance: 3800 },
    shipping: { name: 'Ravi Kumar', phone: '9876543210', address: 'Flat 2, MG Road', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
    ...over
  });
  await o.save();
  return o;
}
const reply = (payload, type = 'button') => type === 'button'
  ? { type: 'button', button: { payload, text: 'x' } }
  : { type: 'interactive', interactive: { button_reply: { id: payload, title: 'x' } } };

test.beforeEach(() => { store.clear(); sent.length = 0; events.length = 0; });

test('payment received → one WhatsApp template with the order split and reply buttons', async () => {
  const o = await makeOrder();
  assert.equal(await flow.startConfirmation(o._id), 'sent');
  assert.equal(sent.length, 1);
  const t = sent[0].template;
  assert.equal(sent[0].to, '919876543210');
  assert.equal(t.name, 'nk_order_confirm');
  assert.deepEqual(t.components[0].parameters.map(p => p.text), ['Ravi', '24600', 'Muejaza For Men (300g) x1', '₹4,300', '₹500', '₹3,800']);
  assert.equal(t.components[1].parameters[0].payload, `NKC:YES:${o._id}`);
  assert.equal(t.components[2].parameters[0].payload, `NKC:CHG:${o._id}`);
  assert.equal((await OrderStub.findById(o._id)).confirmation.status, 'sent');
  assert.equal(await flow.startConfirmation(o._id), 'already'); // never twice
  assert.equal(sent.length, 1);
});

test('old orders, other customers in test mode and switched-off automation are never messaged', async () => {
  const old = await makeOrder({ orderDate: new Date(Date.now() - 5 * 24 * 3600 * 1000) });
  assert.equal(await flow.startConfirmation(old._id), 'too_old');
  const other = await makeOrder({ mobile: '9000000000' });
  assert.equal(await flow.startConfirmation(other._id), 'skipped');
  process.env.AUTOMATION_ENABLED = 'false';
  const o = await makeOrder();
  assert.equal(await flow.startConfirmation(o._id), 'skipped');
  process.env.AUTOMATION_ENABLED = 'true';
  assert.equal(sent.length, 0);
});

test('happy path: confirm order → confirm address → Delhivery shipment built (test mode) → final message', async () => {
  const o = await makeOrder();
  await flow.startConfirmation(o._id);
  sent.length = 0;

  assert.equal(await flow.handleIncoming({ phone: '919876543210', msg: reply(`NKC:YES:${o._id}`), text: 'Haan, confirm', verified: true }), true);
  assert.equal(o.confirmation.status, 'order_confirmed');
  assert.equal(sent[0].type, 'interactive');
  assert.match(sent[0].interactive.body.text, /Flat 2, MG Road/);
  assert.match(sent[0].interactive.body.text, /411001/);
  assert.equal(sent[0].interactive.action.buttons[0].reply.id, `NKA:YES:${o._id}`);

  sent.length = 0;
  await flow.handleIncoming({ phone: '919876543210', msg: reply(`NKA:YES:${o._id}`, 'interactive'), text: 'Haan, sahi hai', verified: true });
  assert.equal(o.confirmation.status, 'address_confirmed');
  assert.equal(o.delhivery.status, 'dry_run');
  assert.equal(o.delhivery.codAmount, 3800);
  assert.equal(o.delhivery.declaredValue, 4300);
  assert.match(sent[0].text.body, /Order confirm ho gaya/);
  assert.match(sent[0].text.body, /₹3,800/);
});

test('customer changes the address by typing it; message without a pincode is asked again', async () => {
  const o = await makeOrder();
  await flow.startConfirmation(o._id);
  await flow.handleIncoming({ phone: '919876543210', msg: reply(`NKC:YES:${o._id}`), text: '', verified: true });
  await flow.handleIncoming({ phone: '919876543210', msg: reply(`NKA:CHG:${o._id}`, 'interactive'), text: '', verified: true });
  assert.equal(o.confirmation.status, 'awaiting_address');

  sent.length = 0;
  assert.equal(await flow.handleIncoming({ phone: '919876543210', msg: { type: 'text' }, text: 'House 5 near temple', verified: true }), true);
  assert.match(sent[0].text.body, /pincode/);
  assert.equal(o.confirmation.status, 'awaiting_address');

  sent.length = 0;
  await flow.handleIncoming({ phone: '919876543210', msg: { type: 'text' }, text: 'House 5, Shivaji Nagar, Nashik 422001', verified: true });
  assert.equal(o.shipping.pincode, '422001');
  assert.equal(o.shipping.address, 'House 5, Shivaji Nagar, Nashik');
  assert.equal(o.confirmation.status, 'order_confirmed');
  assert.match(sent[0].interactive.body.text, /422001/);
});

test('"Change karna hai" → needs a call, team alerted', async () => {
  const o = await makeOrder();
  await flow.startConfirmation(o._id);
  await flow.handleIncoming({ phone: '919876543210', msg: reply(`NKC:CHG:${o._id}`), text: '', verified: true });
  assert.equal(o.confirmation.status, 'needs_call');
  assert.equal(events.at(-1).type, 'order_needs_attention');
});

test('forged or mismatched replies change nothing', async () => {
  const o = await makeOrder();
  await flow.startConfirmation(o._id);
  sent.length = 0;
  assert.equal(await flow.handleIncoming({ phone: '919876543210', msg: reply(`NKC:YES:${o._id}`), text: '', verified: false }), true);
  assert.equal(await flow.handleIncoming({ phone: '919111111111', msg: reply(`NKC:YES:${o._id}`), text: '', verified: true }), true);
  assert.equal(o.confirmation.status, 'sent');
  assert.equal(sent.length, 0);
  // Ordinary chat is left to the AI bot
  assert.equal(await flow.handleIncoming({ phone: '919876543210', msg: { type: 'text' }, text: 'price kya hai?', verified: true }), false);
});

test('Meta signature check', () => {
  const raw = '{"object":"whatsapp_business_account"}';
  const sig = 'sha256=' + crypto.createHmac('sha256', 'app-secret').update(raw).digest('hex');
  assert.equal(flow.verifyMetaSignature(raw, sig), true);
  assert.equal(flow.verifyMetaSignature(raw, 'sha256=00'), false);
  assert.equal(flow.verifyMetaSignature(raw + ' ', sig), false);
});

test('no reply → reminder once, then flagged for a call', async () => {
  const o = await makeOrder();
  await flow.startConfirmation(o._id);
  o.confirmation.sentAt = new Date(Date.now() - 5 * 3600 * 1000);
  sent.length = 0;
  await flow.runReminders();
  assert.equal(sent.length, 1);
  assert.equal(o.confirmation.reminders, 1);
  o.confirmation.sentAt = new Date(Date.now() - 25 * 3600 * 1000);
  await flow.runReminders();
  assert.equal(o.confirmation.status, 'needs_call');
});

test('Delhivery shipment: COD balance, full declared value, order number, package size', async () => {
  process.env.DELHIVERY_PICKUP_NAME = 'Nk Herbal';
  process.env.DELHIVERY_SELLER_GST = '27AUIPK9713C2ZL';
  const o = await makeOrder();
  const { shipment, pickup_location } = delhivery.buildShipment(o);
  assert.equal(shipment.payment_mode, 'COD');
  assert.equal(shipment.cod_amount, 3800);
  assert.equal(shipment.total_amount, 4300);
  assert.equal(shipment.order, '24600');
  assert.equal(shipment.pin, '411001');
  assert.equal(shipment.weight, 750);
  assert.equal(pickup_location.name, 'Nk Herbal');

  const prepaid = await makeOrder({ partialCod: undefined, paymentStatus: 'Paid', orderValue: 2499, lineItems: [{ name: 'Kashmiri Shilajit 50g', quantity: 1 }] });
  const p = delhivery.buildShipment(prepaid).shipment;
  assert.equal(p.payment_mode, 'Prepaid');
  assert.equal(p.cod_amount, 0);
  assert.equal(p.weight, 500);
});

test('live mode refuses to run without the Delhivery token, pickup name and GST', async () => {
  process.env.DELHIVERY_MODE = 'live';
  delete process.env.DELHIVERY_PICKUP_NAME;
  const o = await makeOrder();
  const r = await delhivery.createShipment(o);
  assert.equal(r.ok, false);
  assert.match(r.error, /DELHIVERY_TOKEN/);
  assert.match(r.error, /DELHIVERY_PICKUP_NAME/);
  process.env.DELHIVERY_MODE = 'dry_run';
});
