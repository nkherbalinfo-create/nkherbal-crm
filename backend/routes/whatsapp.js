const express  = require('express');
const https    = require('https');
const http     = require('http');
const Lead     = require('../models/Lead');
const WaConversation = require('../models/WaConversation');
const { getAIReply, classifyIntent, buildContextSummary } = require('../services/aiService');
const sse = require('../services/sseBroadcaster');
const router   = express.Router();

// ── Media ID cache (upload once, reuse for 25 days) ─────
const mediaCache = {}; // { productKey: { id, uploadedAt } }
const CACHE_TTL  = 25 * 24 * 60 * 60 * 1000; // 25 days (WA media expires in 30)

// Download image from any URL into a Buffer (browser headers to bypass WordPress hotlink protection)
function downloadBuffer(url, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const opts = {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':          'image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer':         'https://nkherbal.com/',
        'Cache-Control':   'no-cache'
      }
    };
    lib.get(url, opts, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        return downloadBuffer(res.headers.location, redirectCount + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({
        buffer:      Buffer.concat(chunks),
        contentType: res.headers['content-type']?.split(';')[0] || 'image/jpeg'
      }));
    }).on('error', reject);
  });
}

// Upload image buffer to WhatsApp media endpoint → returns media_id
async function uploadToWhatsApp(imageUrl) {
  const { buffer, contentType } = await downloadBuffer(imageUrl);
  const mimeType  = contentType || 'image/jpeg';
  const ext       = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  const boundary  = `NKHerbal${Date.now()}`;

  const head   = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="messaging_product"\r\n\r\nwhatsapp\r\n` +
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="product.${ext}"\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const tail   = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body   = Buffer.concat([head, buffer, tail]);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'graph.facebook.com',
      path:     `/v25.0/${process.env.WA_PHONE_NUMBER_ID}/media`,
      method:   'POST',
      headers: {
        'Authorization':  `Bearer ${process.env.WA_ACCESS_TOKEN}`,
        'Content-Type':   `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.id) resolve(parsed.id);
          else reject(new Error('WA upload failed: ' + data));
        } catch (e) { reject(new Error('Parse error: ' + data)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Download audio/media sent by a customer from WhatsApp's CDN (requires auth header)
async function downloadWhatsAppMedia(mediaId) {
  // Step 1: get the temporary download URL from Graph API
  const info = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'graph.facebook.com',
      path:     `/v25.0/${mediaId}`,
      method:   'GET',
      headers:  { 'Authorization': `Bearer ${process.env.WA_ACCESS_TOKEN}` }
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Media info parse error: ' + data.slice(0, 100))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Media info timeout')); });
    req.end();
  });
  if (!info.url) throw new Error('No download URL in WhatsApp media response');

  // Step 2: download the actual bytes (auth required)
  const parsed = new URL(info.url);
  const buffer = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   'GET',
      headers:  { 'Authorization': `Bearer ${process.env.WA_ACCESS_TOKEN}` }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(25000, () => { req.destroy(); reject(new Error('Media download timeout')); });
    req.end();
  });
  const mimeType = (info.mime_type || 'audio/ogg').split(';')[0].trim();
  return { buffer, mimeType };
}

// Transcribe audio buffer using Groq Whisper (supports 99+ languages)
async function transcribeAudio(buffer, mimeType) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');
  const boundary = `GroqW${Date.now()}`;
  const ext = mimeType.includes('mp4')||mimeType.includes('m4a') ? 'm4a'
    : mimeType.includes('webm') ? 'webm'
    : mimeType.includes('mp3')||mimeType.includes('mpeg') ? 'mp3'
    : 'ogg';
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.${ext}"\r\nContent-Type: ${mimeType}\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3-turbo\r\n--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\njson\r\n--${boundary}--\r\n`),
  ]);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.groq.com',
      path:     '/openai/v1/audio/transcriptions',
      method:   'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type':  `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      }
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) resolve(parsed.text.trim());
          else reject(new Error('Groq: ' + data.slice(0, 200)));
        } catch(e) { reject(new Error('Groq parse error: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Groq timeout')); });
    req.write(body);
    req.end();
  });
}

// Get cached media_id or upload fresh
async function getMediaId(productKey, imageUrl) {
  const cached = mediaCache[productKey];
  if (cached && (Date.now() - cached.uploadedAt) < CACHE_TTL) return cached.id;

  console.log(`[WhatsApp] 📤 Uploading image: ${productKey}`);
  const id = await uploadToWhatsApp(imageUrl);
  mediaCache[productKey] = { id, uploadedAt: Date.now() };
  console.log(`[WhatsApp] ✅ Uploaded ${productKey} → media_id: ${id}`);
  return id;
}

// ── Product image catalog ────────────────────────────────
// Local images in backend/public/images/products/ take priority.
// Naming convention: muejaza.jpg, muejaza-plus.jpg, testo-vardhak.jpg,
//   shahi-kalp.jpg, shilajit-25g.jpg, shilajit-50g.jpg, combo.jpg
const BACKEND_URL = process.env.BACKEND_URL || 'https://crm-backend-azu8.onrender.com';

function isPaymentClaim(text) {
  const t = text.toLowerCase();
  // Only match EXPLICIT payment proof — not "le liya" or "lena hai" (intent to buy)
  return /\bpaid\b|payment (done|kiya|ho gaya|kar diya|bhej diya|sent|complete)|screenshot (bheja|send kiya|diya|kar diya|bhejta)|transfer (kiya|kar diya|ho gaya)|paise (bhej diye|de diye|bheje)|transaction (done|complete|ho gaya)|upi (kiya|kar diya|done|sent)/.test(t);
}


const PRODUCT_IMAGES = {
  'Muejaza For Men (300g)': {
    url:     `${BACKEND_URL}/images/products/muejaza.png`,
    caption: '🌿 *Muejaza For Men (300g)* — ₹4,499\n🔗 https://nkherbal.com/product/muejaza-ayurvedic-food-preparation/'
  },
  // Muejaza Plus — fetch from website (no local image)
  'Muejaza Plus For Men (300g)': {
    url:     'https://nkherbal.com/wp-content/uploads/2026/01/NK-Herbal-24-1.webp',
    caption: '⭐ *Muejaza Plus For Men (300g)* — ₹15,000\n🔗 https://nkherbal.com/product/muejaza-plus-ayurvedic-herbal-preparation/'
  },
  'Testo – Vardhak For Men (300g)': {
    url:     `${BACKEND_URL}/images/products/testovardhak.png`,
    caption: '💪 *Testo Vardhak For Men (300g)* — ₹4,199\n🔗 https://nkherbal.com/product/testo-vardhak-ayurvedic-preparation/'
  },
  'Shahi Kalp For Men & Women (300g)': {
    url:     `${BACKEND_URL}/images/products/shahikalp.png`,
    caption: '👑 *Shahi Kalp For Men & Women (300g)* — ₹4,499\n🔗 https://nkherbal.com/product/shahi-kalp-ayurvedic-food-preparation/'
  },
  // Both Shilajit sizes use the same image
  'Kashmiri Shilajit 25g': {
    url:     `${BACKEND_URL}/images/products/shilajit.png`,
    caption: '🏔️ *Kashmiri Shilajit 25g* — ₹1,499\n🔗 https://nkherbal.com/product/pure-kashmiri-shilajit/'
  },
  'Kashmiri Shilajit 50g': {
    url:     `${BACKEND_URL}/images/products/shilajit.png`,
    caption: '🏔️ *Kashmiri Shilajit 50g* — ₹2,499\n🔗 https://nkherbal.com/product/pure-kashmiri-shilajit/'
  },
  'Muejaza & Shahi Kalp Combo (300g)': {
    url:     `${BACKEND_URL}/images/products/muejaza-shahikalp-combo.png`,
    caption: '🎁 *Muejaza + Shahi Kalp Combo* — ₹8,999\n🔗 https://nkherbal.com/product/nk-herbal-muejaza-shahi-kalp-combo/'
  },
};

function detectProduct(text) {
  const t = text.toLowerCase();
  if (t.includes('muejaza plus') || t.includes('plus'))        return 'Muejaza Plus For Men (300g)';
  if (t.includes('testo') || t.includes('vardhak'))            return 'Testo – Vardhak For Men (300g)';
  if (t.includes('muejaza'))                                   return 'Muejaza For Men (300g)';
  if (t.includes('shahi kalp') || t.includes('shahikalp'))     return 'Shahi Kalp For Men & Women (300g)';
  if (t.includes('combo'))                                     return 'Muejaza & Shahi Kalp Combo (300g)';
  if (t.includes('shilajit') && t.includes('50'))              return 'Kashmiri Shilajit 50g';
  if (t.includes('shilajit'))                                  return 'Kashmiri Shilajit 25g';
  return null;
}

// Detect if customer is asking for an image/photo
function isImageRequest(text) {
  const t = text.toLowerCase().trim();
  return /image|photo|pic\b|picture|dikhao|dikha|bhejo|dekh|tasveer|tasweer|photo bhejo|image bhejo|image send|send image|show me/.test(t);
}

// Detect if customer wants ALL product images
function isAllProductsRequest(text) {
  const t = text.toLowerCase().trim();
  return /sab(ki|ka|ke|hi|)|saare|sare|all product|all image|sabhi|every product|sab bhejo|sab product|sab image|all photo|sab photo/.test(t);
}

// Find the last product mentioned in recent conversation history
function lastMentionedProduct(messages) {
  const recent = [...messages].reverse().slice(0, 10);
  for (const m of recent) {
    const p = detectProduct(m.content || '');
    if (p) return p;
  }
  return null;
}

// ── Legacy keyword detector (kept as fallback, AI is primary) ─
function detectLeadIntent(text) {
  const t = text.toLowerCase().trim();
  const NOT_INTERESTED = [
    // English
    'not interested', 'no thanks', 'no thank you', 'dont want', "don't want",
    'not needed', 'no need', 'not required', 'not buying', 'wont buy', "won't buy",
    'stop messaging', 'remove me', 'unsubscribe', 'i am not interested',
    "i'm not interested", 'im not interested',
    // Hinglish
    'nahi chahiye', 'nahin chahiye', 'nahi lena', 'lena nahi', 'nahi kharidna',
    'kharidna nahi', 'interest nahi', 'nahi interested', 'interested nahi',
    'mat bhejo', 'band karo', 'nahi chahie', 'nahi lene', 'mujhe nahi chahiye',
    'abhi nahi chahiye', 'filhaal nahi', 'zaroorat nahi', 'nahi chahie',
    'nahi mangna', 'nahi mangta', 'nahi mangti',
    // Devanagari
    'नहीं चाहिए', 'नहीं लेना', 'इंटरेस्ट नहीं', 'जरूरत नहीं', 'नहीं खरीदना',
  ];

  const CONVERTED = [
    'order kar diya', 'order kiya', 'buy kar liya', 'khareed liya', 'le liya',
    'order de diya', 'payment kar diya', 'payment kiya', 'order placed',
    'already ordered', 'already bought', 'mil gaya', 'pa gaya',
    'ऑर्डर कर दिया', 'खरीद लिया',
  ];

  const FOLLOW_UP = [
    'baad mein batata', 'baad mein bataata', 'soch ke batata', 'sochke batata',
    'later batata', 'will let you know', 'let me think', 'will think',
    'sochna hai', 'thoda sochta', 'think karke batata',
    'kal batata', 'kal bata', 'think karta', 'discuss karke',
    'soch ke bata', 'discuss karke batata',
    'सोचकर बताता', 'बाद में बताता',
  ];

  // INTERESTED — someone expressing want/desire to buy
  const INTERESTED = [
    // English
    'interested', 'want to buy', 'want to order', 'i want', 'want this',
    'how to order', 'how to buy', 'place order', 'where to buy',
    'tell me more', 'want more info',
    // Hinglish — "chahiye" = want/need (very common)
    'chahiye', 'chahie', 'chaiye', 'lena hai', 'kharidna hai',
    'order karna hai', 'buy karna hai', 'mangna hai', 'mangwana hai',
    'order chahiye', 'lena chahta', 'lena chahti', 'khareedna chahta',
    'price batao', 'kitna hai', 'kitne ka', 'rate batao',
    'kaise milega', 'kaise order', 'kab milega', 'kitne din mein',
    'mujhe chahiye', 'mujhe lena', 'mujhe order', 'hamein chahiye',
    'haan chahiye', 'ha chahiye', 'yes chahiye',
    // Devanagari
    'चाहिए', 'लेना है', 'खरीदना है', 'ऑर्डर करना है', 'मुझे चाहिए',
  ];

  if (NOT_INTERESTED.some(p => t.includes(p))) return 'Not Interested';
  if (CONVERTED.some(p => t.includes(p)))      return 'Converted';
  if (FOLLOW_UP.some(p => t.includes(p)))      return 'Follow Up';
  if (INTERESTED.some(p => t.includes(p)))     return 'Interested';
  if (CONVERTED.some(p => t.includes(p)))      return 'Converted';
  if (FOLLOW_UP.some(p => t.includes(p)))      return 'Follow Up';
  return null;
}

function isGreeting(text) {
  const t = text.toLowerCase().trim();
  const greetings = ['hi', 'hello', 'hey', 'hii', 'helo', 'namaste', 'namaskar', 'hy', 'hlo',
    'नमस्ते', 'नमस्कार', 'हेलो', 'hai', 'good morning', 'good evening', 'good afternoon'];
  return greetings.some(g => t === g || t.startsWith(g + ' ') || t.startsWith(g + '!'));
}

// ── Send typing indicator to customer ───────────────────
function sendTypingIndicator(to) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'typing',
      typing: { action: 'typing_on' }
    });
    const req = https.request({
      hostname: 'graph.facebook.com',
      path:     `/v25.0/${process.env.WA_PHONE_NUMBER_ID}/messages`,
      method:   'POST',
      headers: {
        'Authorization':  `Bearer ${process.env.WA_ACCESS_TOKEN}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => { res.on('data', () => {}); res.on('end', resolve); });
    req.on('error', resolve); // silent fail — typing indicator is best-effort
    req.write(body);
    req.end();
  });
}

// ── Send text message ────────────────────────────────────
function sendWhatsAppMessage(to, text, previewUrl = false) {
  return waApiCall({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text, preview_url: previewUrl }
  });
}

// ── Send image using cached media_id (reliable, no URL fetching by WA) ──
async function sendProductImage(to, productKey, img) {
  try {
    const mediaId = await getMediaId(productKey, img.url);
    console.log(`[WhatsApp] 📨 Sending image to ${to} with media_id: ${mediaId}`);
    const result = await waApiCall({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'image',
      image: { id: mediaId, caption: img.caption }
    });
    console.log(`[WhatsApp] 🖼️ Image sent OK:`, JSON.stringify(result));
  } catch (err) {
    console.error(`[WhatsApp] ❌ Image failed (${productKey}):`, err.message);
    // Fallback: send caption as text
    await sendWhatsAppMessage(to, img.caption);
  }
}

// ── Base WhatsApp API caller ─────────────────────────────
function waApiCall(payload) {
  const body = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'graph.facebook.com',
      path:     `/v25.0/${process.env.WA_PHONE_NUMBER_ID}/messages`,
      method:   'POST',
      headers: {
        'Authorization':  `Bearer ${process.env.WA_ACCESS_TOKEN}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // Throw on WhatsApp API errors so they are caught properly
          if (parsed.error) reject(new Error(`WA API error: ${parsed.error.message} (code ${parsed.error.code})`));
          else resolve(parsed);
        } catch (e) { reject(new Error('WA parse error: ' + data)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── GET: Status/config check — open endpoint for diagnostics ───
router.get('/status', (req, res) => {
  res.json({
    ok: true,
    phoneNumberId: process.env.WA_PHONE_NUMBER_ID ? '✅ set' : '❌ MISSING',
    accessToken:   process.env.WA_ACCESS_TOKEN   ? '✅ set' : '❌ MISSING',
    verifyToken:   process.env.WA_VERIFY_TOKEN   ? '✅ set' : '❌ MISSING',
    webhookUrl:    `${req.protocol}://${req.get('host')}/api/whatsapp/webhook`,
    time:          new Date().toISOString(),
  });
});

// ── POST: Inject a test message (for debugging) ──────────
router.post('/test-message', async (req, res) => {
  try {
    const { phone = '919999999999', text = 'hi test', name = 'Test User' } = req.body;
    const WaConversation = require('../models/WaConversation');
    const mobile10 = phone.slice(-10);
    let conv = await WaConversation.findOne({ phone });
    if (!conv) conv = await WaConversation.create({ phone, name, messages: [] });
    conv.messages.push({ role: 'user', content: text });
    conv.lastMessageAt = new Date();
    await conv.save();
    res.json({ ok: true, phone, text, totalMessages: conv.messages.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET: Webhook verification ────────────────────────────
router.get('/webhook', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) {
    console.log('[WhatsApp] ✅ Webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// ── POST: Receive & process messages ────────────────────
router.post('/webhook', async (req, res) => {
  res.sendStatus(200); // respond immediately

  try {
    const body = req.body;
    console.log('[WhatsApp] 📥 Webhook received, object:', body?.object, '| entries:', body?.entry?.length || 0);
    if (body.object !== 'whatsapp_business_account') {
      console.log('[WhatsApp] ⚠️ Not a WA business account event, ignoring');
      return;
    }

    for (const entry of (body.entry || [])) {
      for (const change of (entry.changes || [])) {
        if (change.field !== 'messages') continue;

        const value    = change.value || {};
        const messages = value.messages || [];
        const contacts = value.contacts || [];

        for (const msg of messages) {
          // ── Detect CC Avenue Order Alert WhatsApp notification ──
          // CC Avenue sends: "Order ID: xxx\nAmount: ₹4000\nCustomer: Rahul\nMobile: 9876543210\nStatus: Success"
          // These come from CC Avenue's system to the business number
          const rawText = msg.text?.body || msg.button?.text || '';
          if (/ccavenue|order.*success|payment.*success|amount.*₹|transaction.*success/i.test(rawText)) {
            const mobileMatch = rawText.match(/(?:mobile|phone|tel|number)[:\s]+(\d{10,12})/i)
                             || rawText.match(/\b(91\d{10}|\d{10})\b/);
            const amountMatch = rawText.match(/(?:amount|₹|rs)[:\s]*[\s₹]?([\d,]+)/i);
            if (mobileMatch) {
              const mobile10 = mobileMatch[1].slice(-10);
              const phone = `91${mobile10}`;
              const amount = amountMatch ? amountMatch[1] : '';
              console.log(`[WhatsApp] 💰 CC Avenue payment alert detected — ${phone} | ₹${amount}`);
              const confirmMsg =
                `✅ *Payment Verified!* 🎉\n\n` +
                `Aapka payment confirm ho gaya hai.${amount ? ` (₹${amount})` : ''}\n\n` +
                `Ab apna order ship karne ke liye yeh details bhejein:\n\n` +
                `• *Full Name*\n• *Complete Delivery Address*\n• *Pincode*\n` +
                `• *Mobile Number*\n• *Product Name*\n• *Quantity*\n\n` +
                `Details milte hi hum 24 ghante mein ship kar denge! 🚚📦`;
              try {
                await sendWhatsAppMessage(phone, confirmMsg, false);
                await WaConversation.findOneAndUpdate({ phone }, { paymentClaimed: false });
                sse.broadcast({ type: 'payment_confirmed', phone });
                console.log(`[WhatsApp] ✅ Auto-confirmed payment for ${phone}`);
              } catch (e) { console.error('[WhatsApp] Auto-confirm failed:', e.message); }
            }
            continue; // Don't process as customer message
          }

          // Extract text from text, button (Meta Ads CTA), and interactive messages
          let text = '';
          let audioBuffer = null, audioMime = 'audio/ogg';
          if (msg.type === 'text') {
            text = msg.text?.body?.trim() || '';
          } else if (msg.type === 'button') {
            text = msg.button?.text?.trim() || '';
          } else if (msg.type === 'interactive') {
            text = msg.interactive?.button_reply?.title?.trim()
                || msg.interactive?.list_reply?.title?.trim()
                || '';
          } else if (msg.type === 'audio' || msg.type === 'voice') {
            // Download voice note from WhatsApp so CRM can play it
            const mediaId = msg.audio?.id || msg.voice?.id;
            text = '[audio message]'; // fallback if download fails
            if (mediaId) {
              try {
                const { buffer, mimeType } = await downloadWhatsAppMedia(mediaId);
                if (buffer.length <= 3 * 1024 * 1024) { // 3MB limit
                  text = `[media-audio:data:${mimeType};base64,${buffer.toString('base64')}]`;
                  audioBuffer = buffer;
                  audioMime = mimeType;
                  console.log(`[WhatsApp] 🎤 Voice note downloaded: ${(buffer.length/1024).toFixed(0)}KB from ${phone}`);
                } else {
                  console.log(`[WhatsApp] ⚠️ Voice note too large (${(buffer.length/1024).toFixed(0)}KB), using placeholder`);
                }
              } catch(e) {
                console.error('[WhatsApp] ⚠️ Voice note download failed:', e.message);
              }
            }
          } else if (msg.type === 'image' || msg.type === 'video' || msg.type === 'document' || msg.type === 'sticker') {
            const mediaId = msg.image?.id || msg.video?.id || msg.document?.id || msg.sticker?.id;
            const caption = msg.image?.caption || msg.video?.caption || msg.document?.caption || '';
            const fileName = msg.document?.filename || '';
            const isImage = msg.type === 'image' || msg.type === 'sticker';
            const isVideo = msg.type === 'video';
            text = caption || `[${msg.type} received]`;
            if (mediaId) {
              try {
                const { buffer, mimeType } = await downloadWhatsAppMedia(mediaId);
                const sizeMB = buffer.length / (1024 * 1024);
                if (sizeMB <= 5) {
                  const b64 = buffer.toString('base64');
                  const dataUrl = `data:${mimeType};base64,${b64}`;
                  if (isImage) {
                    text = caption ? `${caption} [media-img:${dataUrl}]` : `[media-img:${dataUrl}]`;
                  } else if (isVideo) {
                    text = caption ? `${caption} [media-video:${dataUrl}]` : `[media-video:${dataUrl}]`;
                  } else {
                    text = caption ? `${caption} [media-doc:${fileName || 'document'}:${dataUrl}]` : `[media-doc:${fileName || 'document'}:${dataUrl}]`;
                  }
                  console.log(`[WhatsApp] 📎 ${msg.type} downloaded: ${sizeMB.toFixed(1)}MB from ${phone}`);
                } else {
                  text = caption || `[${msg.type} received — too large to preview]`;
                  console.log(`[WhatsApp] ⚠️ ${msg.type} too large: ${sizeMB.toFixed(1)}MB`);
                }
              } catch(e) {
                text = caption || `[${msg.type} received]`;
                console.error(`[WhatsApp] ⚠️ ${msg.type} download failed:`, e.message);
              }
            }
          } else {
            text = `[${msg.type || 'media'} message]`;
          }
          if (!text) continue;

          const phone    = msg.from;
          const waName   = contacts.find(c => c.wa_id === phone)?.profile?.name || '';
          const mobile10 = phone.slice(-10);
          const firstName = (waName || 'Aap').split(' ')[0];

          console.log(`[WhatsApp] 📩 ${waName || phone}: ${text}`);

          // ── Secret reset command to clear conversation history ──
          if (text.toLowerCase().trim() === 'reset bot') {
            await WaConversation.deleteOne({ phone });
            await sendWhatsAppMessage(phone, '✅ Conversation reset! Ab fresh start se baat karte hain 🙏');
            continue;
          }

          // ── Get or create conversation ──────────────────
          let conv = await WaConversation.findOne({ phone });
          const isFirstMessage = !conv || conv.messages.length === 0;

          if (!conv) {
            conv = await WaConversation.create({ phone, name: waName, messages: [] });
          } else if (waName && !conv.name) {
            conv.name = waName;
            await conv.save();
          }

          // ── Auto-create Lead (always verify lead still exists) ──
          let leadMissing = false;
          if (!conv.leadId) {
            leadMissing = true;
          } else {
            const leadStillExists = await Lead.findById(conv.leadId);
            if (!leadStillExists) {
              leadMissing = true;
              conv.leadId = null;
            }
          }

          if (leadMissing) {
            try {
              const byMobile = await Lead.findOne({ mobile: mobile10 });
              if (!byMobile) {
                const lead = await Lead.create({
                  date:              new Date(),
                  name:              waName || `WA-${mobile10}`,
                  mobile:            mobile10,
                  source:            'WhatsApp',
                  interestedProduct: detectProduct(text) || 'Muejaza For Men (300g)',
                  status:            'Interested',
                  notes:             `First message: "${text.slice(0, 200)}"`
                });
                conv.leadId = lead._id;
                console.log(`[WhatsApp] ✅ New lead created: ${waName} (${mobile10})`);
              } else {
                conv.leadId = byMobile._id;
                console.log(`[WhatsApp] 🔗 Linked to existing lead: ${mobile10}`);
              }
              await conv.save();
            } catch (leadErr) {
              // If lead creation fails (e.g. duplicate key race), try to link to existing lead
              console.error(`[WhatsApp] ⚠️ Lead create failed, trying to find existing:`, leadErr.message);
              const fallback = await Lead.findOne({ mobile: mobile10 });
              if (fallback) { conv.leadId = fallback._id; await conv.save(); }
              // Continue — message must be saved regardless of lead creation outcome
            }
          }

          // ── Send welcome on first contact — always, regardless of what they said
          if (isFirstMessage) {
            const welcome = `Namaste *${firstName} Ji*! 🙏 *NK Herbal* mein aapka swagat hai!`;
            await sendWhatsAppMessage(phone, welcome);
          }

          // ── Save user message immediately so it's never lost ──
          conv.messages.push({ role: 'user', content: text, wamid: msg.id });
          conv.lastMessageAt = new Date();
          await conv.save(); // ← CRITICAL: save before AI call so message persists even if AI fails

          console.log(`[WhatsApp] 💬 User message saved: "${text.slice(0, 60)}" from ${phone}`);

          // ── Show typing indicator to customer while AI processes ──
          sendTypingIndicator(phone); // fire-and-forget, don't await

          // ── Skip AI if bot is paused ──────────────────────
          if (conv.botPaused) {
            console.log(`[WhatsApp] ⏸️ Bot paused for ${phone}, skipping AI reply`);
            continue;
          }

          // ── Audio/voice messages — transcribe then reply with AI ──
          if (msg.type === 'audio' || msg.type === 'voice') {
            if (audioBuffer && process.env.GROQ_API_KEY) {
              try {
                const transcript = await transcribeAudio(audioBuffer, audioMime);
                console.log(`[WhatsApp] 🎤 Transcript (${phone}): "${transcript.slice(0, 120)}"`);
                // Append transcript to the saved audio message so CRM shows it
                const lastMsg = conv.messages[conv.messages.length - 1];
                lastMsg.content += `[audio-transcript:${transcript}]`;
                await conv.save();
                // Let AI reply to what the customer actually said
                text = transcript;
                // fall through to normal AI processing below
              } catch(e) {
                console.error('[WhatsApp] ⚠️ Transcription failed:', e.message);
                const audioReply = 'Voice note mili! 🎤 Thoda technical issue aa gaya — text mein likhein apna sawaal? 🙏';
                conv.messages.push({ role: 'assistant', content: audioReply });
                await conv.save();
                await sendWhatsAppMessage(phone, audioReply);
                sse.broadcast({ type: 'message', phone });
                continue;
              }
            } else {
              // No Groq key — ask to type
              const audioReply = 'Voice note mili! 🎤 Text mein likhein apna sawaal? 🙏';
              conv.messages.push({ role: 'assistant', content: audioReply });
              await conv.save();
              await sendWhatsAppMessage(phone, audioReply);
              sse.broadcast({ type: 'message', phone });
              continue;
            }
          }

          // ── Refresh context summary every 10 messages (fire-and-forget) ──
          const msgCount = conv.messages.length;
          const needsSummary = msgCount >= 4 && (
            !conv.contextUpdatedAt ||
            msgCount % 10 === 0
          );
          if (needsSummary) {
            const cleanMsgs = conv.messages.map(m => ({
              ...m,
              content: (m.content || '')
                .replace(/\[media-img:data:[^\]]+\]/g, '[image sent]')
                .replace(/\[media-doc:[^:]+:data:[^\]]+\]/g, '[document sent]')
            }));
            buildContextSummary(cleanMsgs, firstName).then(summary => {
              if (summary) {
                WaConversation.findOneAndUpdate(
                  { phone },
                  { contextSummary: summary, contextUpdatedAt: new Date() }
                ).catch(() => {});
                console.log(`[WhatsApp] 🧠 Memory updated for ${phone}`);
              }
            }).catch(() => {});
          }

          // ── Run AI reply + intent classification in parallel ──
          const cleanMsg = m => ({
            role: m.role,
            content: (m.content || '')
              .replace(/\[media-audio:data:[^\]]{0,5000000}\]\[audio-transcript:([^\]]+)\]/g, '🎤 Voice message: "$1"')
              .replace(/\[media-audio:[^\]]{0,5000000}\]/g, '[voice note]')
              .replace(/\[media-img:data:[^\]]{0,2000000}\]/g, '[customer sent an image]')
              .replace(/\[media-video:data:[^\]]{0,5000000}\]/g, '[customer sent a video]')
              .replace(/\[media-doc:[^:]+:data:[^\]]{0,2000000}\]/g, '[customer sent a document]')
              .replace(/\[img:([^\]]+)\]/g, '[product image: $1]')
          });
          let aiReply, detectedIntent;
          try {
            const msgsForAI = conv.messages.slice(-20).map(cleanMsg);
            [aiReply, detectedIntent] = await Promise.all([
              getAIReply(msgsForAI, firstName, conv.contextSummary || ''),
              classifyIntent(text)
            ]);
          } catch (aiErr) {
            // If still too long, retry with fewer messages
            if (aiErr.message?.includes('too long') || aiErr.message?.includes('400')) {
              try {
                console.log(`[WhatsApp] ⚠️ AI context too long — retrying with last 5 messages`);
                const shortMsgs = conv.messages.slice(-5).map(cleanMsg);
                aiReply = await getAIReply(shortMsgs, firstName, conv.contextSummary || '');
              } catch (retryErr) {
                console.error(`[WhatsApp] ❌ AI retry also failed for ${phone}:`, retryErr.message);
                continue;
              }
            } else {
              console.error(`[WhatsApp] ❌ AI call failed for ${phone}:`, aiErr.message);
              continue;
            }
          }

          // ── Auto-update lead status from AI-detected intent ─
          if (detectedIntent && conv.leadId) {
            await Lead.findByIdAndUpdate(conv.leadId, { status: detectedIntent });
            console.log(`[WhatsApp] 📊 Lead status → ${detectedIntent} for "${text}" (${mobile10})`);
          }

          // ── Save AI reply ─────────────────────────────────
          conv.messages.push({ role: 'assistant', content: aiReply });
          await conv.save();

          // ── Strip internal image markers the AI may have echoed from history ──
          aiReply = aiReply.replace(/\[product image:[^\]]*\]/gi, '').replace(/\[img:[^\]]*\]/gi, '').trim();

          // ── Send AI text reply ────────────────────────────
          await sendWhatsAppMessage(phone, aiReply, false);
          console.log(`[WhatsApp] ✅ Reply sent to ${phone}`);

          // ── Flag payment claim — alert CRM for manual verification ──
          if (isPaymentClaim(text)) {
            await WaConversation.findOneAndUpdate({ phone }, { paymentClaimed: true });
            sse.broadcast({ type: 'payment_claimed', phone, name: conv.name || waName });
            console.log(`[WhatsApp] 💰 Payment claimed by ${phone} — needs manual verification`);
          }

          // ── Broadcast message event so CRM refreshes instantly ──
          sse.broadcast({ type: 'message', phone });

          // ── Send product images ────────────────────────────
          const imgRequest = isImageRequest(text);
          const allProductsRequest = isAllProductsRequest(text);

          // Check AI reply also mentions sending all products (e.g. "Sab products ki images bhej raha hoon")
          const aiMentionsAll = /sab product|all product|sabhi product|sab image|all image/i.test(aiReply);

          if (allProductsRequest || aiMentionsAll) {
            // Check if already sent all products recently
            const recentMsgs = conv.messages.slice(-15);
            const sentKeys = recentMsgs
              .filter(m => m.role === 'assistant')
              .flatMap(m => { const x = m.content.match(/\[img:([^\]]+)\]/g) || []; return x; });
            const alreadySentAll = sentKeys.length >= 3 || recentMsgs.some(m => m.role === 'assistant' && m.content.includes('[img:all-products]'));

            if (!alreadySentAll) {
              console.log(`[WhatsApp] 📸 Sending ALL product images to ${phone}`);
              for (const [productKey, imgData] of Object.entries(PRODUCT_IMAGES)) {
                await sendProductImage(phone, productKey, imgData);
                // Save each image as its own message so CRM mirrors WhatsApp exactly
                conv.messages.push({ role: 'assistant', content: `[img:${productKey}]`, timestamp: new Date() });
                await conv.save();
                await new Promise(r => setTimeout(r, 600));
              }
            }
          } else {
            // Single product detection
            // Priority: 1) product in customer message  2) image request → look back in history
            let detectedProduct = detectProduct(text);
            if (!detectedProduct && imgRequest) {
              detectedProduct = lastMentionedProduct(conv.messages);
            }
            // Only use AI reply as fallback when bot clearly recommended exactly one product
            if (!detectedProduct) {
              const p = detectProduct(aiReply);
              const mentionCount = ['muejaza','testo','shahi kalp','shilajit','vardhak'].filter(k => aiReply.toLowerCase().includes(k)).length;
              if (p && mentionCount <= 1) detectedProduct = p;
            }
            if (detectedProduct && PRODUCT_IMAGES[detectedProduct] && !isGreeting(text)) {
              const recentMessages = conv.messages.slice(-10);
              const alreadySentImage = !imgRequest && recentMessages.some(
                m => m.role === 'assistant' && m.content.includes(`[img:${detectedProduct}]`)
              );
              if (!alreadySentImage) {
                console.log(`[WhatsApp] 🖼️ Sending product image: ${detectedProduct}${imgRequest ? ' (image request)' : ''}`);
                await sendProductImage(phone, detectedProduct, PRODUCT_IMAGES[detectedProduct]);
                conv.messages[conv.messages.length - 1].content += ` [img:${detectedProduct}]`;
                await conv.save();
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[WhatsApp] ❌ Error:', err.message);
  }
});

module.exports = router;
