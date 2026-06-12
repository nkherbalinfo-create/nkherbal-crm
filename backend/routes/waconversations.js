const express = require('express');
const https = require('https');
const WaConversation = require('../models/WaConversation');
const { protect, readOnly } = require('../middleware/auth');
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
      .limit(500)
      .select({
        phone: 1, name: 1, lastMessageAt: 1, botPaused: 1, paymentClaimed: 1,
        leadId: 1, labels: 1, notes: 1, userMessageCount: 1,
        messages: { $slice: -1 },
      })
      .lean();

    const result = convs.map(c => {
      const rawLast = c.messages.filter(m => m.content).slice(-1)[0]?.content || '';
      const lastMessage = rawLast.startsWith('[media-audio:') ? '🎤 Voice note'
        : rawLast.includes('[media-video:')   ? '🎥 Video'
        : rawLast.startsWith('[media-img:')   ? '📷 Image'
        : rawLast.startsWith('[media-doc:')   ? '📄 Document'
        : rawLast.replace(/\[img:[^\]]+\]/g, '').trim().slice(0, 80);
      return ({
      phone: c.phone,
      name:  c.name || `+${c.phone}`,
      lastMessage,
      lastMessageAt: c.lastMessageAt,
      messageCount: c.userMessageCount || 0,
      botPaused: c.botPaused || false,
      paymentClaimed: c.paymentClaimed || false,
      leadId: c.leadId,
      labels: c.labels || [],
      notes: c.notes || '',
    });});

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
router.patch('/:phone/payment', protect, readOnly, async (req, res) => {
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
router.patch('/:phone/pause', protect, readOnly, async (req, res) => {
  try {
    const { paused } = req.body;
    const conv = await WaConversation.findOneAndUpdate({ phone: req.params.phone }, { botPaused: paused }, { new: true });
    res.json({ botPaused: conv.botPaused });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update labels
router.patch('/:phone/labels', protect, readOnly, async (req, res) => {
  try {
    const conv = await WaConversation.findOneAndUpdate(
      { phone: req.params.phone },
      { labels: req.body.labels || [] },
      { new: true }
    );
    res.json({ labels: conv.labels });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Update internal notes
router.patch('/:phone/notes', protect, readOnly, async (req, res) => {
  try {
    const conv = await WaConversation.findOneAndUpdate(
      { phone: req.params.phone },
      { notes: req.body.notes ?? '' },
      { new: true }
    );
    res.json({ notes: conv.notes });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Delete a conversation from CRM
router.delete('/:phone', protect, readOnly, async (req, res) => {
  try {
    const conv = await WaConversation.findOneAndDelete({ phone: req.params.phone });
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manual send from CRM (when bot is paused / take over)
router.post('/send', protect, readOnly, async (req, res) => {
  try {
    const { phone, message, replyToWamid } = req.body;
    if (!phone || !message) return res.status(400).json({ message: 'phone and message required' });

    const waRes = await sendWhatsAppMessageDirect(phone, message, replyToWamid);
    const sentWamid = waRes?.messages?.[0]?.id || null;

    // Save to conversation history with wamid so we can edit later
    await WaConversation.findOneAndUpdate(
      { phone },
      { $push: { messages: { role: 'assistant', content: message, wamid: sentWamid } }, lastMessageAt: new Date() },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Edit a sent message (CRM + WhatsApp)
router.patch('/:phone/messages/edit', protect, async (req, res) => {
  try {
    const { wamid, newText, msgIndex } = req.body;
    if (!newText?.trim()) return res.status(400).json({ message: 'newText required' });

    const conv = await WaConversation.findOne({ phone: req.params.phone });
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    // Update by index or wamid
    const idx = msgIndex !== undefined
      ? msgIndex
      : conv.messages.findIndex(m => m.wamid === wamid);

    if (idx === -1 || idx >= conv.messages.length) return res.status(404).json({ message: 'Message not found' });

    conv.messages[idx].content = newText + ' *(edited)*';
    conv.markModified('messages');
    await conv.save();

    // Edit on WhatsApp if wamid available
    if (wamid && process.env.WA_ACCESS_TOKEN) {
      try {
        const body = JSON.stringify({
          messaging_product: 'whatsapp',
          to: req.params.phone,
          type: 'text',
          text: { body: newText },
          context: { message_id: wamid }
        });
        await new Promise((resolve) => {
          const r = https.request({
            hostname: 'graph.facebook.com',
            path: `/v25.0/${process.env.WA_PHONE_NUMBER_ID}/messages`,
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${process.env.WA_ACCESS_TOKEN}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
          }, (resp) => { resp.resume(); resp.on('end', resolve); });
          r.on('error', resolve);
          r.write(body); r.end();
        });
      } catch { /* WA edit is best-effort */ }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manual media send from CRM (image / document)
router.post('/send-media', protect, readOnly, async (req, res) => {
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

// AI-powered lead summary across all conversations
function buildSnapshot(c) {
  const msgs = c.messages.slice(-15).map(m => {
    const role = m.role === 'user' ? 'C' : 'B';
    const content = (m.content || '')
      .replace(/\[media-audio:data:[^\]]{0,9999999}\]\[audio-transcript:([^\]]+)\]/g, '[Voice:"$1"]')
      .replace(/\[media-audio:[^\]]{0,9999999}\]/g, '[voice]')
      .replace(/\[media-img:data:[^\]]{0,9999999}\]/g, '[img]')
      .replace(/\[media-doc:[^:]+:data:[^\]]{0,9999999}\]/g, '[doc]')
      .replace(/\[img:[^\]]+\]/g, '[img]')
      .slice(0, 200);
    return `${role}:${content}`;
  }).join('|');
  return `${c.name||c.phone}(+${c.phone}):${msgs}`;
}

const AI_SYSTEM = `You are a sales analyst for NK Herbal (Ayurvedic brand). Classify each WhatsApp lead.
Return ONLY a JSON array. Each item: {"phone":"digits only","name":"name","category":"hot|interested|followup|not_interested|undecided","reason":"max 10 words","action":"max 7 words"}
Categories: hot=ready to buy/asked payment; interested=engaged asking questions; followup=showed interest then silent; not_interested=rejected; undecided=neutral/just started.
Cover EVERY conversation given. No extra text, only the JSON array.`;

function callAI(batch) {
  const snapshots = batch.map(buildSnapshot).join('\n');
  const body = JSON.stringify({
    model: 'anthropic/claude-3.5-haiku',
    messages: [
      { role: 'system', content: AI_SYSTEM },
      { role: 'user', content: `Classify all ${batch.length} conversations:\n${snapshots}` }
    ],
    max_tokens: 4000,
    temperature: 0.1,
  });
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nkherbal.com',
        'X-Title': 'NK Herbal CRM',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const r = https.request(opts, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices?.[0]?.message?.content || '[]';
          const match = text.match(/\[[\s\S]*\]/);
          resolve(match ? JSON.parse(match[0]) : []);
        } catch { resolve([]); }
      });
    });
    r.on('error', () => resolve([]));
    r.setTimeout(45000, () => { r.destroy(); resolve([]); });
    r.write(body);
    r.end();
  });
}

router.post('/ai-summary', protect, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) return res.status(500).json({ message: 'OPENROUTER_API_KEY not configured' });

    const convs = await WaConversation.find().sort({ lastMessageAt: -1 }).lean();

    // Split into batches of 40 and run in parallel
    const BATCH = 40;
    const batches = [];
    for (let i = 0; i < convs.length; i += BATCH) batches.push(convs.slice(i, i + BATCH));

    const results = await Promise.all(batches.map(callAI));
    const leads = results.flat();

    res.json({ leads, total: convs.length });
  } catch (err) {
    console.error('[AI Summary]', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
