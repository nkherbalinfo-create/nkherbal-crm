const express = require('express');
const WaConversation = require('../models/WaConversation');
const { protect } = require('../middleware/auth');
const { sendWhatsAppMessageDirect } = require('../services/waSender');
const router = express.Router();

// ── SSE broadcast system ─────────────────────────────────
const sseClients = new Set();

function broadcastSSE(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  sseClients.forEach(res => {
    try { res.write(payload); } catch {}
  });
}
module.exports.broadcastSSE = broadcastSSE;

// SSE stream endpoint — accepts token via query param since EventSource can't set headers
const jwt = require('jsonwebtoken');
router.get('/stream', (req, res) => {
  const token = req.query.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).end();
  try { jwt.verify(token, process.env.JWT_SECRET); } catch { return res.status(401).end(); }
  res.writeHead(200, {
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no', // disable Nginx buffering
  });
  res.write('data: {"type":"connected"}\n\n');
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

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
      lastMessage: c.messages.filter(m => m.content).slice(-1)[0]?.content?.slice(0, 80) || '',
      lastMessageAt: c.lastMessageAt,
      messageCount: c.messages.filter(m => m.role === 'user').length,
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
