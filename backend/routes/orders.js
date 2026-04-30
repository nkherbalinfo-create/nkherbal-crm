const express = require('express');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const { protect } = require('../middleware/auth');
const router = express.Router();

async function upsertCustomer(orderData) {
  const { mobile, customerName, city, orderValue, orderDate } = orderData;
  let customer = await Customer.findOne({ mobile });
  if (!customer) {
    customer = await Customer.create({
      name: customerName, mobile, city,
      totalOrders: 1, totalRevenue: orderValue,
      isRepeat: false, firstOrderDate: orderDate, lastOrderDate: orderDate
    });
    return 'New';
  } else {
    customer.totalOrders += 1;
    customer.totalRevenue += orderValue;
    customer.isRepeat = customer.totalOrders >= 2;
    customer.lastOrderDate = orderDate;
    if (customerName) customer.name = customerName;
    await customer.save();
    return customer.totalOrders >= 2 ? 'Repeat' : 'New';
  }
}

router.get('/', protect, async (req, res) => {
  try {
    const { channel, status, paymentStatus, search, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (channel) filter.salesChannel = channel;
    if (status) filter.orderStatus = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      filter.orderDate = {};
      if (startDate) filter.orderDate.$gte = new Date(startDate);
      if (endDate) filter.orderDate.$lte = new Date(endDate + 'T23:59:59');
    }
    if (search) {
      const s = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { customerName: { $regex: s, $options: 'i' } },
        { mobile: { $regex: s, $options: 'i' } },
        { orderId: { $regex: s, $options: 'i' } }
      ];
    }
    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .sort({ orderDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const customerType = await upsertCustomer(req.body);
    const order = await Order.create({ ...req.body, customerType });
    // If linked to a lead, mark that lead as Converted and store the order reference
    if (req.body.linkedLeadId) {
      await Lead.findByIdAndUpdate(req.body.linkedLeadId, {
        status: 'Converted',
        convertedOrderId: order._id
      });
    }
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
