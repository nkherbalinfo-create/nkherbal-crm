const express = require('express');
const { syncOrders, recalculateCustomers } = require('../services/woocommerceSync');
const { generateFollowUps } = require('../services/followUpScheduler');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Pull all WooCommerce orders and recalculate customer stats
router.post('/woocommerce', protect, async (req, res) => {
  try {
    const { since } = req.body;
    const result = await syncOrders(since || null);
    res.json({ success: true, message: `Sync complete — ${result.created} new, ${result.updated} updated`, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Recalculate New/Repeat status for all customers from actual order data
router.post('/recalculate', protect, async (req, res) => {
  try {
    const count = await recalculateCustomers();
    res.json({ success: true, message: `Recalculated stats for ${count} customers` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Trigger follow-up generation on demand
router.post('/followups', protect, async (req, res) => {
  try {
    const count = await generateFollowUps();
    res.json({ success: true, message: `Generated follow-ups (${count} processed)` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Sync all WhatsApp conversations → create missing leads
router.post('/whatsapp-leads', protect, async (req, res) => {
  try {
    const WaConversation = require('../models/WaConversation');
    const Lead = require('../models/Lead');

    const convs = await WaConversation.find().lean();
    let created = 0, linked = 0, skipped = 0;

    for (const conv of convs) {
      const mobile10 = conv.phone.slice(-10);

      // Already has a valid lead linked — check it still exists
      if (conv.leadId) {
        const exists = await Lead.findById(conv.leadId);
        if (exists) { skipped++; continue; }
      }

      // Try to find an existing lead by mobile
      const existing = await Lead.findOne({ mobile: mobile10 });
      if (existing) {
        await WaConversation.findByIdAndUpdate(conv._id, { leadId: existing._id });
        linked++;
        continue;
      }

      // Extract first customer message as notes
      const firstMsg = conv.messages?.find(m => m.role === 'user');
      const notes = firstMsg ? `First message: "${firstMsg.content.slice(0, 200)}"` : 'WhatsApp contact — no messages yet';

      // Create a new lead
      try {
        const lead = await Lead.create({
          date:              conv.createdAt || new Date(),
          name:              conv.name || `WA-${mobile10}`,
          mobile:            mobile10,
          source:            'WhatsApp',
          interestedProduct: 'Muejaza For Men (300g)',
          status:            'Interested',
          notes,
        });
        await WaConversation.findByIdAndUpdate(conv._id, { leadId: lead._id });
        created++;
      } catch (e) {
        // Duplicate — find and link
        const fallback = await Lead.findOne({ mobile: mobile10 });
        if (fallback) {
          await WaConversation.findByIdAndUpdate(conv._id, { leadId: fallback._id });
          linked++;
        }
      }
    }

    res.json({
      success: true,
      message: `Sync complete — ${created} leads created, ${linked} linked to existing, ${skipped} already up to date`,
      created, linked, skipped,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
