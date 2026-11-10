// Run: npm test   (uses Node's built-in test runner, no database needed)
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const crypto = require('crypto');

const map = require('../services/wcOrderMapping');

// WooCommerce order as the REST API / webhook sends it for a WooBooster partial-COD order.
function wcOrder(overrides = {}, meta = { paid: '500', pending: '3800', total: '4300' }) {
  return {
    id: 99001,
    status: 'pending',
    total: '500.00',
    payment_method: 'ccavenue',
    payment_method_title: 'Part payment online + balance cash on delivery',
    date_created: '2026-11-10T10:00:00',
    billing: { first_name: 'Test', last_name: 'Customer', phone: '+91 98765 43210', city: 'Mumbai', address_1: 'A-1', postcode: '400001' },
    line_items: [{ name: 'Muejaza For Men (300g)', quantity: 1, total: '4095.24', total_tax: '204.76', sku: 'A0017' }],
    meta_data: meta ? [
      { key: 'partial_cod_paid_amount', value: meta.paid },
      { key: 'partial_cod_pending_amount', value: meta.pending },
      { key: 'partial_cod_total_amount', value: meta.total }
    ] : [],
    ...overrides
  };
}

// ── Mapping helpers ───────────────────────────────────────────────
test('partial COD order value is the full price, not the ₹500 deposit', () => {
  assert.equal(map.orderValueFromWC(wcOrder()), 4300);
  assert.deepEqual(map.partialCod(wcOrder()), { deposit: 500, balance: 3800, total: 4300 });
});

test('float noise like 3500.00571429 snaps to whole rupees', () => {
  const wc = wcOrder({}, { paid: '500', pending: '3500.00571429', total: '4000.00571429' });
  assert.deepEqual(map.partialCod(wc), { deposit: 500, balance: 3500, total: 4000 });
});

test('normal (non-partial) orders keep the WooCommerce total', () => {
  assert.equal(map.orderValueFromWC(wcOrder({ total: '4199.00' }, null)), 4199);
});

test('amounts that do not add up are not treated as partial COD', () => {
  assert.equal(map.partialCod(wcOrder({}, { paid: '500', pending: '999', total: '4300' })), null);
});

test('payment status: deposit paid → COD, completed → Paid, unpaid → Pending', () => {
  assert.equal(map.mapPaymentStatus(wcOrder({ status: 'partial-paid' })), 'COD');
  assert.equal(map.mapPaymentStatus(wcOrder({ status: 'processing' })), 'COD');
  assert.equal(map.mapPaymentStatus(wcOrder({ status: 'completed' })), 'Paid');
  assert.equal(map.mapPaymentStatus(wcOrder({ status: 'pending' })), 'Pending');
  assert.equal(map.mapPaymentStatus(wcOrder({ status: 'processing' }, null)), 'Paid');
  assert.equal(map.mapOrderStatus('partial-paid'), 'Processing');
});

test('only orders saved at the deposit amount get corrected; hand-edited values are kept', () => {
  assert.equal(map.correctedOrderValue(500, wcOrder()), 4300);
  assert.equal(map.correctedOrderValue(2500, wcOrder()), null); // edited in CRM (e.g. upgrade to 50g)
  assert.equal(map.correctedOrderValue(500, wcOrder({}, null)), null);
});

test('customer message shows the split', () => {
  assert.equal(map.amountText(wcOrder()), '₹4,300 (₹500 paid online, ₹3,800 cash on delivery)');
});

// ── Webhook routes with stubbed database / WhatsApp ───────────────
function loadWebhooks() {
  const calls = { created: [], customerUpdates: [], waSent: [], existing: null };
  const stub = (rel, exportsObj) => {
    const file = require.resolve(path.join(__dirname, '..', rel));
    require.cache[file] = { id: file, filename: file, loaded: true, exports: exportsObj };
  };
  stub('models/Order', {
    findOne: async () => calls.existing,
    create: async (doc) => { calls.created.push(doc); return { ...doc, orderId: 'ORD-TEST-0001' }; }
  });
  stub('models/Customer', {
    findOne: async () => null,
    create: async () => ({}),
    updateOne: async (q, u) => { calls.customerUpdates.push({ q, u }); }
  });
  stub('services/waSender', { sendWhatsAppMessageDirect: async (to, text) => { calls.waSent.push({ to, text }); } });
  stub('models/WaConversation', { findOneAndUpdate: async () => {} });
  stub('services/sseBroadcaster', { broadcast: () => {} });
  delete require.cache[require.resolve('../routes/webhooks')];
  const router = require('../routes/webhooks');
  const handler = (p) => router.stack.find(l => l.route && l.route.path === p)?.route.stack[0].handle;
  return { router, handler, calls };
}

function fakeRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.sendStatus = (c) => { res.statusCode = c; return res; };
  return res;
}

function wcReq(body, secret) {
  const rawBody = JSON.stringify(body);
  const headers = { 'x-wc-webhook-topic': 'order.updated' };
  if (secret) headers['x-wc-webhook-signature'] = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  return { body, rawBody, headers };
}

test('the unauthenticated /ccavenue-test address is gone', () => {
  const { router } = loadWebhooks();
  const paths = router.stack.filter(l => l.route).map(l => l.route.path);
  assert.ok(!paths.includes('/ccavenue-test'));
  assert.ok(paths.includes('/ccavenue') && paths.includes('/woocommerce'));
});

test('new website COD order is saved at ₹4,300', async () => {
  process.env.WC_WEBHOOK_SECRET = 'test-secret';
  const { handler, calls } = loadWebhooks();
  const res = fakeRes();
  await handler('/woocommerce')(wcReq(wcOrder(), 'test-secret'), res);
  assert.equal(res.statusCode, 201);
  assert.equal(calls.created[0].orderValue, 4300);
  assert.equal(calls.created[0].paymentStatus, 'Pending');
});

test('order first saved at ₹500 is corrected to ₹4,300 when the deposit is paid', async () => {
  process.env.WC_WEBHOOK_SECRET = 'test-secret';
  const { handler, calls } = loadWebhooks();
  let saved = false;
  calls.existing = { orderValue: 500, mobile: '9876543210', lineItems: [{}], save: async () => { saved = true; } };
  await handler('/woocommerce')(wcReq(wcOrder({ status: 'partial-paid', total: '4300.00' }), 'test-secret'), fakeRes());
  assert.ok(saved);
  assert.equal(calls.existing.orderValue, 4300);
  assert.equal(calls.existing.paymentStatus, 'COD');
  assert.deepEqual(calls.customerUpdates[0].u, { $inc: { totalRevenue: 3800 } });
});

test('a value edited by hand in the CRM is never overwritten', async () => {
  process.env.WC_WEBHOOK_SECRET = 'test-secret';
  const { handler, calls } = loadWebhooks();
  calls.existing = { orderValue: 2500, mobile: '9930003274', lineItems: [{}], save: async () => {} };
  await handler('/woocommerce')(wcReq(wcOrder({ status: 'partial-paid' }, { paid: '500', pending: '999', total: '1499' }), 'test-secret'), fakeRes());
  assert.equal(calls.existing.orderValue, 2500);
  assert.equal(calls.customerUpdates.length, 0);
});

test('WooCommerce webhook with a wrong signature is rejected', async () => {
  process.env.WC_WEBHOOK_SECRET = 'test-secret';
  const { handler, calls } = loadWebhooks();
  const res = fakeRes();
  await handler('/woocommerce')(wcReq(wcOrder(), 'wrong-secret'), res);
  assert.equal(res.statusCode, 401);
  assert.equal(calls.created.length, 0);
});

test('a fake unencrypted CCAvenue "payment" creates nothing and sends no WhatsApp', async () => {
  const { handler, calls } = loadWebhooks();
  const body = { order_status: 'Success', billing_tel: '9999999999', billing_name: 'Attacker', amount: '4000', order_id: 'FAKE-1' };
  const res = fakeRes();
  await handler('/ccavenue')({ body, rawBody: JSON.stringify(body), headers: {} }, res);
  await new Promise(r => setImmediate(r));
  assert.equal(res.statusCode, 200);
  assert.equal(calls.created.length, 0);
  assert.equal(calls.waSent.length, 0);
});

test('garbage encResp is ignored', async () => {
  process.env.CCAVENUE_WORKING_KEY = 'ABCDEF0123456789ABCDEF0123456789';
  const { handler, calls } = loadWebhooks();
  await handler('/ccavenue')({ body: {}, rawBody: 'encResp=deadbeef', headers: {} }, fakeRes());
  await new Promise(r => setImmediate(r));
  assert.equal(calls.created.length, 0);
  assert.equal(calls.waSent.length, 0);
});
