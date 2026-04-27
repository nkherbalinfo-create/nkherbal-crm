const express = require('express');
const { syncOrders, recalculateCustomers } = require('../services/woocommerceSync');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Pull all WooCommerce orders and recalculate customer stats
router.post('/woocommerce', protect, async (req, res) => {
  try {
    const { since } = req.body;
    const result = await syncOrders(since || null);
    res.json({ success: true, message: `Sync complete — ${result.created} new, ${result.updated} updated`, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Recalculate New/Repeat status for all customers from actual order data
router.post('/recalculate', protect, async (req, res) => {
  try {
    const count = await recalculateCustomers();
    res.json({ success: true, message: `Recalculated stats for ${count} customers` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
