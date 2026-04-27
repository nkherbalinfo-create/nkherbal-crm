const express = require('express');
const fs = require('fs');
const path = require('path');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/woocommerce', protect, async (req, res) => {
  try {
    const { url, key, secret } = req.body;
    if (!url || !key || !secret) return res.status(400).json({ message: 'url, key and secret are required' });

    // Update runtime environment immediately
    process.env.WC_STORE_URL = url;
    process.env.WC_CONSUMER_KEY = key;
    process.env.WC_CONSUMER_SECRET = secret;

    // Persist to .env file so they survive restarts
    const envPath = path.join(__dirname, '../.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    const set = (content, key, value) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      return regex.test(content)
        ? content.replace(regex, `${key}=${value}`)
        : content.trimEnd() + `\n${key}=${value}\n`;
    };

    envContent = set(envContent, 'WC_STORE_URL', url);
    envContent = set(envContent, 'WC_CONSUMER_KEY', key);
    envContent = set(envContent, 'WC_CONSUMER_SECRET', secret);

    fs.writeFileSync(envPath, envContent, 'utf8');

    res.json({ success: true, message: 'WooCommerce credentials saved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
