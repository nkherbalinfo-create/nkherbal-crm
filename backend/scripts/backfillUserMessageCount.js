// One-time backfill: populate userMessageCount on existing WaConversation docs
// Run with: node scripts/backfillUserMessageCount.js
require('dotenv').config();
const mongoose = require('mongoose');
const WaConversation = require('../models/WaConversation');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const convs = await WaConversation.find({}, { messages: 1 });
  let updated = 0;

  for (const conv of convs) {
    const count = conv.messages.filter(m => m.role === 'user').length;
    if (conv.userMessageCount !== count) {
      conv.userMessageCount = count;
      await conv.save();
      updated++;
    }
  }

  console.log(`Backfilled userMessageCount for ${updated}/${convs.length} conversations.`);
  await mongoose.disconnect();
})();
