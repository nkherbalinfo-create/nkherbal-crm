const express  = require('express');
const https    = require('https');
const http     = require('http');
const Lead     = require('../models/Lead');
const WaConversation = require('../models/WaConversation');
const { getAIReply } = require('../services/aiService');
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
const PRODUCT_IMAGES = {
  'Muejaza For Men (300g)': {
    url:     'https://nkherbal.com/wp-content/uploads/2023/07/Muejaza_New_Main_Image.webp',
    caption: '🌿 *Muejaza For Men (300g)* — ₹4,499\n🔗 https://nkherbal.com/product/muejaza-ayurvedic-food-preparation/'
  },
  'Muejaza Plus For Men (300g)': {
    url:     'https://nkherbal.com/wp-content/uploads/2026/01/NK-Herbal-24-1.webp',
    caption: '⭐ *Muejaza Plus For Men (300g)* — ₹15,000\n🔗 https://nkherbal.com/product/muejaza-plus-ayurvedic-herbal-preparation/'
  },
  'Testo – Vardhak For Men (300g)': {
    url:     'https://nkherbal.com/wp-content/uploads/2023/07/Testo-Vardhak_Main_Image-1.png',
    caption: '💪 *Testo Vardhak For Men (300g)* — ₹4,199\n🔗 https://nkherbal.com/product/testo-vardhak-ayurvedic-preparation/'
  },
  'Shahi Kalp For Men & Women (300g)': {
    url:     'https://nkherbal.com/wp-content/uploads/2023/07/Shahi-Kalp_Main_Image_2-1.png',
    caption: '👑 *Shahi Kalp For Men & Women (300g)* — ₹4,499\n🔗 https://nkherbal.com/product/shahi-kalp-ayurvedic-food-preparation/'
  },
  'Kashmiri Shilajit 25g': {
    url:     'https://nkherbal.com/wp-content/uploads/2026/01/71S9lqznMmL._SL1500_.jpg',
    caption: '🏔️ *Kashmiri Shilajit 25g* — ₹1,499\n🔗 https://nkherbal.com/product/pure-kashmiri-shilajit/'
  },
  'Kashmiri Shilajit 50g': {
    url:     'https://nkherbal.com/wp-content/uploads/2026/01/71S9lqznMmL._SL1500_.jpg',
    caption: '🏔️ *Kashmiri Shilajit 50g* — ₹2,499\n🔗 https://nkherbal.com/product/pure-kashmiri-shilajit/'
  },
  'Muejaza & Shahi Kalp Combo (300g)': {
    url:     'https://nkherbal.com/wp-content/uploads/2023/07/Muejaza_New_Main_Image.webp',
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

// ── Intent detector — updates lead status automatically ─
function detectLeadIntent(text) {
  const t = text.toLowerCase().trim();

  // Check NOT INTERESTED first (highest priority — avoids "nahi chahiye" matching INTERESTED)
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
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of (body.entry || [])) {
      for (const change of (entry.changes || [])) {
        if (change.field !== 'messages') continue;

        const value    = change.value || {};
        const messages = value.messages || [];
        const contacts = value.contacts || [];

        for (const msg of messages) {
          if (msg.type !== 'text') continue;

          const phone    = msg.from;
          const text     = msg.text?.body?.trim() || '';
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
          }

          // ── Send welcome message on first contact ───────
          if (isFirstMessage) {
            const welcome =
              `Namaste *${firstName} Ji* 🙏\n\n` +
              `*NK Herbal* mein aapka warm swagat hai! 😊\n\n` +
              `Main hoon aapka NK Herbal Assistant — products ki jaankari, price, comparison, ya order karne mein — sab mein help karunga! 🌿\n\n` +
              `Batao, kaise help kar sakta hoon? 😊`;
            await sendWhatsAppMessage(phone, welcome);
          }

          // ── Auto-update lead status from customer intent ─
          const detectedIntent = detectLeadIntent(text);
          if (detectedIntent && conv.leadId) {
            await Lead.findByIdAndUpdate(conv.leadId, { status: detectedIntent });
            console.log(`[WhatsApp] 📊 Lead status → ${detectedIntent} (${mobile10})`);
          }

          // ── Add user message & get AI reply ────────────
          conv.messages.push({ role: 'user', content: text });
          conv.lastMessageAt = new Date();

          const aiReply = await getAIReply(
            conv.messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
          );

          conv.messages.push({ role: 'assistant', content: aiReply });
          await conv.save();

          // ── Build reply — append product URL for WhatsApp link preview (shows image) ──
          const detectedProduct = detectProduct(text) || detectProduct(aiReply);
          let finalReply = aiReply;

          if (detectedProduct && PRODUCT_IMAGES[detectedProduct] && !isGreeting(text)) {
            const urlMatch = PRODUCT_IMAGES[detectedProduct].caption.match(/https:\/\/\S+/);
            if (urlMatch) finalReply += `\n\n🛒 ${urlMatch[0]}`;
            console.log(`[WhatsApp] 🖼️ Adding link preview for: ${detectedProduct}`);
          }

          // preview_url: true makes WhatsApp render product image from the URL's OG tags
          await sendWhatsAppMessage(phone, finalReply, true);

          console.log(`[WhatsApp] ✅ Reply sent to ${phone}`);
        }
      }
    }
  } catch (err) {
    console.error('[WhatsApp] ❌ Error:', err.message);
  }
});

module.exports = router;
