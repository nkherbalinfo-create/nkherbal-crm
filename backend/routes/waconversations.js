const express = require('express');
const WaConversation = require('../models/WaConversation');
const { protect } = require('../middleware/auth');
const { sendWhatsAppMessageDirect, uploadBufferToWhatsApp, sendWhatsAppMedia } = require('../services/waSender');
const router = express.Router();

const sse = require('../services/sseBroadcaster');
const jwt = require('jsonwebtoken');

// SSE stream endpoint — CRM connects here for real-time push
router.get('/stream', (req, res) => {
  const token = req.query.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).end();
  try { jwt.verify(token, process.env.JWT_SECRET); } catch { return res.status(401).end(); }
  res.writeHead(200, {
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('data: {"type":"connected"}\n\n');
  sse.addClient(res);
  req.on('close', () => sse.removeClient(res));
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
      paymentClaimed: c.paymentClaimed || false,
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

// Clear payment claimed flag after manual verification
router.patch('/:phone/payment', protect, async (req, res) => {
  try {
    const conv = await WaConversation.findOneAndUpdate(
      { phone: req.params.phone },
      { paymentClaimed: req.body.paymentClaimed ?? false },
      { new: true }
    );
    res.json({ paymentClaimed: conv.paymentClaimed });
  } catch (err) { res.status(500).json({ message: err.message }); }
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

// Manual media send from CRM (image / document)
router.post('/send-media', protect, async (req, res) => {
  try {
    const { phone, fileBase64, fileName, mimeType, caption } = req.body;
    if (!phone || !fileBase64 || !mimeType) return res.status(400).json({ message: 'phone, fileBase64, mimeType required' });

    // Decode base64 → buffer
    const buffer = Buffer.from(fileBase64, 'base64');

    // Determine WA media type
    const isImage = /^image\//.test(mimeType);
    const isVideo = /^video\//.test(mimeType);
    const waType = isImage ? 'image' : isVideo ? 'video' : 'document';

    // Upload to WhatsApp & send
    const mediaId = await uploadBufferToWhatsApp(buffer, mimeType, fileName || 'upload');
    await sendWhatsAppMedia(phone, mediaId, waType, caption || '', fileName || 'upload');

    // Store data URL in marker so image persists in CRM without file system dependency
    const dataUrl = `data:${mimeType};base64,${fileBase64}`;
    const marker = isImage
      ? `[media-img:${dataUrl}]`
      : `[media-doc:${fileName || 'document'}:${dataUrl}]`;
    const msgContent = caption ? `${caption} ${marker}` : marker;

    // Save to conversation
    await WaConversation.findOneAndUpdate(
      { phone },
      { $push: { messages: { role: 'assistant', content: msgContent, timestamp: new Date() } }, lastMessageAt: new Date() },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[WA Media Send]', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
