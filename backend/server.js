require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { syncOrders } = require('./services/woocommerceSync');
const { generateFollowUps } = require('./services/followUpScheduler');

const fs = require('fs');
const path = require('path');
const LAST_SYNC_FILE = path.join(__dirname, '.last-sync');

function getLastSyncTime() {
  try {
    const ts = fs.readFileSync(LAST_SYNC_FILE, 'utf8').trim();
    return ts || null;
  } catch { return null; }
}

function saveLastSyncTime() {
  fs.writeFileSync(LAST_SYNC_FILE, new Date().toISOString(), 'utf8');
}

connectDB().then(() => {
  const autoSync = async (forceSince) => {
    try {
      // On startup use last recorded sync time so missed orders are caught.
      // During scheduled runs use 20-min window (faster, avoids full re-pull).
      const since = forceSince !== undefined ? forceSince : new Date(Date.now() - 20 * 60 * 1000).toISOString();
      const result = await syncOrders(since);
      saveLastSyncTime();
      if (result.created > 0 || result.updated > 0) {
        console.log(`[WC Auto-sync] +${result.created} new, ${result.updated} updated`);
      }
    } catch (err) {
      console.error('[WC Auto-sync error]', err.message);
    }
  };

  // On startup: sync from last recorded time (catches all missed orders while server was down)
  const lastSync = getLastSyncTime();
  console.log(`[WC Auto-sync] Starting from: ${lastSync || 'beginning'}`);
  setTimeout(() => autoSync(lastSync), 3000);

  // Every 15 min: only check recent window
  setInterval(() => autoSync(undefined), 15 * 60 * 1000);

  // Generate follow-up reminders on startup then every 6 hours
  const runFollowUps = async () => {
    try { await generateFollowUps(); }
    catch (err) { console.error('[Follow-ups error]', err.message); }
  };
  setTimeout(runFollowUps, 5000);
  setInterval(runFollowUps, 6 * 60 * 60 * 1000);
});

const app = express();
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    /\.netlify\.app$/,
    /\.netlify\.live$/,
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

// Capture raw body for WooCommerce webhook signature verification
app.use((req, res, next) => {
  let data = '';
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => {
    req.rawBody = data;
    try { req.body = data ? JSON.parse(data) : {}; } catch { req.body = {}; }
    next();
  });
});

// Serve product images statically — accessible at /images/products/filename.jpg
app.use('/images', express.static(path.join(__dirname, 'public/images')));
// Serve manually uploaded media — accessible at /uploads/filename
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/followups', require('./routes/followups'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/wa', require('./routes/waconversations'));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Auto-sync WhatsApp conversations → Leads on startup
  autoSyncWaLeads();
});

// ── Auto-sync all WhatsApp conversations to Leads ────────
async function autoSyncWaLeads() {
  try {
    const WaConversation = require('./models/WaConversation');
    const Lead = require('./models/Lead');
    const convs = await WaConversation.find().lean();
    let created = 0, linked = 0;
    for (const conv of convs) {
      const mobile10 = conv.phone.slice(-10);
      if (conv.leadId) {
        const exists = await Lead.findById(conv.leadId);
        if (exists) continue;
      }
      const existing = await Lead.findOne({ mobile: mobile10 });
      if (existing) {
        await WaConversation.findByIdAndUpdate(conv._id, { leadId: existing._id });
        linked++;
        continue;
      }
      const firstMsg = conv.messages?.find(m => m.role === 'user');
      try {
        const lead = await Lead.create({
          date: conv.createdAt || new Date(),
          name: conv.name || `WA-${mobile10}`,
          mobile: mobile10,
          source: 'WhatsApp',
          interestedProduct: 'Muejaza For Men (300g)',
          status: 'Interested',
          notes: firstMsg ? `First message: "${firstMsg.content.slice(0, 200)}"` : 'WhatsApp contact',
        });
        await WaConversation.findByIdAndUpdate(conv._id, { leadId: lead._id });
        created++;
      } catch {
        const fallback = await Lead.findOne({ mobile: mobile10 });
        if (fallback) { await WaConversation.findByIdAndUpdate(conv._id, { leadId: fallback._id }); linked++; }
      }
    }
    console.log(`[AutoSync] WA→Leads: ${created} created, ${linked} linked`);
  } catch (err) {
    console.error('[AutoSync] Error:', err.message);
  }
}

// Re-run every hour to catch new conversations
setInterval(autoSyncWaLeads, 60 * 60 * 1000);
