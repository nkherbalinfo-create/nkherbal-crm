const express = require('express');
const Lead = require('../models/Lead');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const { status, source, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (search) {
      const s = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: s, $options: 'i' } },
        { mobile: { $regex: s, $options: 'i' } },
        { leadId: { $regex: s, $options: 'i' } }
      ];
    }
    const [total, leads, statusAgg] = await Promise.all([
      Lead.countDocuments(filter),
      Lead.find(filter).sort({ date: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);
    const statusCounts = Object.fromEntries(statusAgg.map(s => [s._id, s.count]));
    res.json({ leads, total, page: Number(page), pages: Math.ceil(total / limit), statusCounts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const lead = await Lead.create(req.body);
    res.status(201).json(lead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
