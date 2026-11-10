// Delhivery B2C (Last-Mile) API: pincode check + shipment (order) creation. Pickup is NOT requested here —
// pickups stay manual in Delhivery One.
// Docs: https://delhivery-express-api-doc.readme.io/reference/order-creation-api
//
// Environment:
//   DELHIVERY_MODE         off | dry_run | live   (default dry_run: builds and logs the shipment, creates nothing)
//   DELHIVERY_TOKEN        API token from Delhivery One → Settings → API and MCP Setup
//   DELHIVERY_BASE_URL     https://track.delhivery.com (live) or https://staging-express.delhivery.com (staging)
//   DELHIVERY_PICKUP_NAME  registered pickup location name, exact and case-sensitive (e.g. "Nk Herbal")
//   DELHIVERY_SELLER_GST   seller GSTIN (mandatory for the API)
//   DELHIVERY_HSN          HSN code sent with shipments (default 30049011, Ayurvedic medicaments)

const https = require('https');

function config() {
  return {
    mode: (process.env.DELHIVERY_MODE || 'dry_run').toLowerCase(),
    token: process.env.DELHIVERY_TOKEN || '',
    baseUrl: (process.env.DELHIVERY_BASE_URL || 'https://track.delhivery.com').replace(/\/$/, ''),
    pickupName: process.env.DELHIVERY_PICKUP_NAME || '',
    sellerGst: process.env.DELHIVERY_SELLER_GST || '',
    hsn: process.env.DELHIVERY_HSN || '30049011'
  };
}

// Packed size per unit, from past Delhivery bookings (300g jars: 750 g in a 17 cm box; shilajit: 500 g, 9 cm).
function packageFor(productName, quantity) {
  const n = (productName || '').toLowerCase();
  const unit = n.includes('shilajit') ? { grams: 500, cm: 9 } : { grams: 750, cm: 17 };
  const qty = Math.max(1, Number(quantity) || 1);
  return {
    weight: unit.grams * qty,
    shipment_length: unit.cm,
    shipment_width: unit.cm,
    shipment_height: unit.cm * Math.min(qty, 3)
  };
}

function request(method, url, { token, body, contentType } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: {
        Authorization: `Token ${token}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': contentType, 'Content-Length': Buffer.byteLength(body) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { /* keep raw */ }
        resolve({ status: res.statusCode, json, raw: data });
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Delhivery API timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

// { serviceable, cod, city, state } or { serviceable: false }. Without a token (dry run) → unknown.
async function checkPincode(pincode) {
  const cfg = config();
  if (!/^[1-9][0-9]{5}$/.test(String(pincode || ''))) return { serviceable: false, reason: 'invalid pincode' };
  if (!cfg.token || cfg.mode === 'off') return { serviceable: null, reason: 'not checked (no Delhivery token)' };
  const res = await request('GET', `${cfg.baseUrl}/c/api/pin-codes/json/?filter_codes=${pincode}`, { token: cfg.token });
  const pc = res.json?.delivery_codes?.[0]?.postal_code;
  if (!pc) return { serviceable: false, reason: 'pincode not serviceable by Delhivery' };
  return { serviceable: true, cod: pc.cod === 'Y', city: pc.city || '', state: pc.state_code || '' };
}

// Amounts Delhivery needs: declared value = full order value; cash to collect = COD balance.
function amountsFor(order) {
  const total = Number(order.orderValue) || 0;
  if (order.partialCod?.balance) return { total, cod: Number(order.partialCod.balance), mode: 'COD' };
  if (order.paymentStatus === 'COD') return { total, cod: total, mode: 'COD' };
  return { total, cod: 0, mode: 'Prepaid' };
}

function buildShipment(order) {
  const cfg = config();
  const s = order.shipping || {};
  const { total, cod, mode } = amountsFor(order);
  const items = (order.lineItems && order.lineItems.length) ? order.lineItems : [{ name: order.productName, quantity: order.quantity }];
  const qty = items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
  const desc = items.map(i => `${i.name} x${i.quantity || 1}`).join(', ').slice(0, 250);
  const clean = v => String(v || '').replace(/[&#%;\\]/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    shipment: {
      name: clean(s.name || order.customerName),
      add: clean(s.address),
      pin: String(s.pincode || ''),
      city: clean(s.city),
      state: clean(s.state),
      country: 'India',
      phone: String(s.phone || order.mobile || '').replace(/\D/g, '').slice(-10),
      order: String(order.wcOrderId || order.orderId),
      payment_mode: mode,
      cod_amount: cod,
      total_amount: total,
      products_desc: clean(desc),
      quantity: qty,
      hsn_code: cfg.hsn,
      seller_gst_tin: cfg.sellerGst,
      shipping_mode: 'Surface',
      order_date: new Date(order.orderDate || Date.now()).toISOString().slice(0, 19).replace('T', ' '),
      waybill: '',
      ...packageFor(items[0]?.name || order.productName, qty)
    },
    pickup_location: { name: cfg.pickupName }
  };
}

// What is missing before a shipment can be created (empty array = ready).
function missingFields(order) {
  const cfg = config();
  const s = order.shipping || {};
  const missing = [];
  if (!s.address) missing.push('address');
  if (!/^[1-9][0-9]{5}$/.test(String(s.pincode || ''))) missing.push('pincode');
  if (!String(s.phone || order.mobile || '').replace(/\D/g, '').slice(-10)) missing.push('phone');
  if (!(Number(order.orderValue) > 0)) missing.push('order value');
  if (cfg.mode === 'live') {
    if (!cfg.token) missing.push('DELHIVERY_TOKEN');
    if (!cfg.pickupName) missing.push('DELHIVERY_PICKUP_NAME');
    if (!cfg.sellerGst) missing.push('DELHIVERY_SELLER_GST');
  }
  return missing;
}

// Creates the shipment (live) or only builds it (dry_run). Returns { ok, mode, awb, error, payload }.
async function createShipment(order) {
  const cfg = config();
  if (cfg.mode === 'off') return { ok: false, mode: 'off', error: 'Delhivery automation is off (DELHIVERY_MODE=off)' };
  const missing = missingFields(order);
  if (missing.length) return { ok: false, mode: cfg.mode, error: `Missing: ${missing.join(', ')}` };

  const built = buildShipment(order);
  const payload = { shipments: [built.shipment], pickup_location: built.pickup_location };
  if (cfg.mode !== 'live') {
    console.log('[Delhivery] DRY RUN — would create shipment:', JSON.stringify({ ...payload, shipments: [{ ...built.shipment, phone: '***', add: '***' }] }));
    return { ok: true, mode: 'dry_run', awb: null, payload };
  }

  const body = `format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;
  const res = await request('POST', `${cfg.baseUrl}/api/cmu/create.json`, {
    token: cfg.token, body, contentType: 'application/x-www-form-urlencoded'
  });
  const pkg = res.json?.packages?.[0];
  if (res.status >= 200 && res.status < 300 && pkg && /success/i.test(pkg.status || '') && pkg.waybill) {
    return { ok: true, mode: 'live', awb: String(pkg.waybill), payload };
  }
  const remarks = pkg?.remarks ? [].concat(pkg.remarks).join('; ') : (res.json?.rmk || res.json?.error || res.raw.slice(0, 300));
  return { ok: false, mode: 'live', error: `Delhivery ${res.status}: ${remarks}`, payload };
}

module.exports = { config, checkPincode, buildShipment, missingFields, createShipment, amountsFor, packageFor };
