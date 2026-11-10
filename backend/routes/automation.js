// CRM endpoints for the order confirmation + Delhivery automation.
const express = require('express');
const Order = require('../models/Order');
const { protect, readOnly } = require('../middleware/auth');
const confirmation = require('../services/orderConfirmation');
const delhivery = require('../services/delhivery');
const router = express.Router();

// What is switched on / missing — no secrets are returned.
router.get('/status', protect, (req, res) => {
  const c = confirmation.config();
  const d = delhivery.config();
  res.json({
    confirmation: {
      enabled: c.enabled,
      ready: confirmation.readinessProblems().length === 0,
      problems: confirmation.readinessProblems(),
      testMode: c.testPhones.length > 0,
      testPhones: c.testPhones.length,
      template: c.template,
      templateLang: c.templateLang,
      reminderHours: c.remindAfterHours,
      escalateHours: c.escalateAfterHours,
      maxOrderAgeHours: c.maxOrderAgeHours
    },
    delhivery: {
      mode: d.mode,
      tokenSet: Boolean(d.token),
      baseUrl: d.baseUrl,
      pickupName: d.pickupName || null,
      sellerGstSet: Boolean(d.sellerGst),
      hsn: d.hsn
    }
  });
});

// Address from the free-text billing address of a hand-entered order ("street, city, state, 400001").
function shippingFromBilling(order) {
  const text = String(order.billingAddress || '');
  const pin = text.match(/\b([1-9][0-9]{5})\b/);
  return {
    name: order.customerName,
    phone: order.mobile,
    address: text.replace(pin ? pin[0] : '', '').replace(/[\s,]+$/, '').trim(),
    city: order.city || '',
    state: '',
    pincode: pin ? pin[1] : ''
  };
}

router.put('/orders/:id/shipping', protect, readOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const pick = ['name', 'phone', 'address', 'city', 'state', 'pincode'];
    const current = order.shipping?.toObject ? order.shipping.toObject() : (order.shipping || {});
    const next = { ...current };
    for (const k of pick) if (typeof req.body[k] === 'string') next[k] = req.body[k].trim();
    if (next.pincode && !/^[1-9][0-9]{5}$/.test(next.pincode)) return res.status(400).json({ message: 'Pincode must be 6 digits' });
    order.shipping = next;
    await order.save();
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Send (or re-send when forced) the WhatsApp confirmation for a website order.
router.post('/orders/:id/send-confirmation', protect, readOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.body?.force && ['sent', 'needs_call'].includes(order.confirmation?.status)) {
      order.confirmation.status = 'none';
      await order.save();
    }
    const result = await confirmation.startConfirmation(order._id, { force: Boolean(req.body?.force) });
    res.json({ result, order: await Order.findById(order._id) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Team resolved it on a call: mark confirmed / cancelled.
router.put('/orders/:id/confirmation', protect, readOnly, async (req, res) => {
  try {
    const allowed = ['order_confirmed', 'address_confirmed', 'cancelled', 'needs_call', 'none'];
    if (!allowed.includes(req.body?.status)) return res.status(400).json({ message: `status must be one of ${allowed.join(', ')}` });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.confirmation.status = req.body.status;
    if (typeof req.body.note === 'string') order.confirmation.note = req.body.note.slice(0, 500);
    if (req.body.status === 'address_confirmed') order.confirmation.addressConfirmedAt = new Date();
    await order.save();
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Create the Delhivery shipment now (website orders after a call, or WhatsApp orders entered by hand).
router.post('/orders/:id/delhivery', protect, readOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!order.shipping?.address) order.shipping = shippingFromBilling(order);
    const result = await confirmation.createShipmentForOrder(order, { manual: true });
    const fresh = await Order.findById(order._id);
    if (!result.ok) return res.status(400).json({ message: result.error, order: fresh });
    res.json({ result: { mode: result.mode, awb: result.awb }, order: fresh });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
