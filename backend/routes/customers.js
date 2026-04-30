const express = require('express');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const { search, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type === 'repeat') filter.isRepeat = true;
    if (type === 'new') filter.isRepeat = false;
    if (search) {
      const s = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: s, $options: 'i' } },
        { mobile: { $regex: s, $options: 'i' } }
      ];
    }
    const total = await Customer.countDocuments(filter);
    const customers = await Customer.find(filter)
      .sort({ lastOrderDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ customers, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:mobile/orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ mobile: req.params.mobile }).sort({ orderDate: -1 });
    const customer = await Customer.findOne({ mobile: req.params.mobile });
    res.json({ customer, orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:mobile', protect, async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({ mobile: req.params.mobile });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    await Order.deleteMany({ mobile: req.params.mobile });
    res.json({ message: 'Customer and their orders deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
