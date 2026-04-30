const express = require('express');
const WaConversation = require('../models/WaConversation');
const { protect } = require('../middleware/auth');
const { sendWhatsAppMessageDirect } = require('../services/waSender');
const router = express.Router();

// List all conversations
router.get('/', protect, async (req, res) => {
  try {
    const convs = await WaConversation.find()
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .lean();

    const result = convs.map(c => ({
      phone: c.phone,
      name:  c.name || `+${c.phone}`,
      lastMessage: c.messages[c.messages.length - 1]?.content?.slice(0, 80) || '',
      lastMessageAt: c.lastMessageAt,
      messageCount: c.messages.length,
      botPaused: c.botPaused || false,
      leadId: c.leadId,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get full conversation + customer details
router.get('/:phone', protect, async (req, res) => {
  try {
    const conv = await WaConversation.findOne({ phone: req.params.phone }).populate('leadId').lean();
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    res.json(conv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle bot pause
router.patch('/:phone/pause', protect, async (req, res) => {
  try {
    const { paused } = req.body;
    const conv = await WaConversation.findOneAndUpdate({ phone: req.params.phone }, { botPaused: paused }, { new: true });
    res.json({ botPaused: conv.botPaused });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a conversation from CRM
router.delete('/:phone', protect, async (req, res) => {
  try {
    const conv = await WaConversation.findOneAndDelete({ phone: req.params.phone });
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manual send from CRM (when bot is paused / take over)
router.post('/send', protect, async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ message: 'phone and message required' });

    await sendWhatsAppMessageDirect(phone, message);

    // Save to conversation history
    await WaConversation.findOneAndUpdate(
      { phone },
      { $push: { messages: { role: 'assistant', content: message } }, lastMessageAt: new Date() },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
