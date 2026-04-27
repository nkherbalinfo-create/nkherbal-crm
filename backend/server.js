require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { syncOrders } = require('./services/woocommerceSync');
const { generateFollowUps } = require('./services/followUpScheduler');

const fs = require('fs');
const LAST_SYNC_FILE = require('path').join(__dirname, '.last-sync');

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

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
