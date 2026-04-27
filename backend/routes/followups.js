const express  = require('express');
const FollowUp = require('../models/FollowUp');
const { sendFollowUpEmail, getFollowUpTemplate } = require('../services/emailService');
const { protect } = require('../middleware/auth');
const router   = express.Router();

// Count of pending follow-ups (for sidebar badge)
router.get('/count', protect, async (req, res) => {
  try {
    const count = await FollowUp.countDocuments({ status: 'pending' });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// List follow-ups with pagination + status filter
router.get('/', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const total     = await FollowUp.countDocuments(filter);
    const followups = await FollowUp.find(filter)
      .sort({ dueDate: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ followups, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get pre-composed email template for a follow-up
router.get('/:id/preview', protect, async (req, res) => {
  try {
    const fu = await FollowUp.findById(req.params.id);
    if (!fu) return res.status(404).json({ message: 'Not found' });
    const template = getFollowUpTemplate(fu.customerName, fu.productName, fu.monthNumber);
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send follow-up email
router.post('/:id/send', protect, async (req, res) => {
  try {
    const fu = await FollowUp.findById(req.params.id);
    if (!fu) return res.status(404).json({ message: 'Not found' });

    const { subject, html, toEmail } = req.body;
    const emailTo = toEmail || fu.email;

    if (!emailTo) return res.status(400).json({ message: 'No email address for this customer. Add it manually.' });

    await sendFollowUpEmail(emailTo, fu.customerName, fu.productName, fu.monthNumber, subject, html);

    fu.status = 'sent';
    fu.sentAt = new Date();
    await fu.save();

    res.json({ success: true, message: `Email sent to ${emailTo}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Skip or update a follow-up
router.put('/:id', protect, async (req, res) => {
  try {
    const fu = await FollowUp.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!fu) return res.status(404).json({ message: 'Not found' });
    res.json(fu);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
