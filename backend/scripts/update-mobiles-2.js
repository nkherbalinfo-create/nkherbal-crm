/**
 * Round-2 mobile updates:
 *   - Sukumar Naskar (0000000014) → merge into Sukumar (9748804904)
 *   - Dhruv Attri   (0000000019) → 8826848617
 *   - Bhupendra     (0000000020) → 7579840395
 *   - S Amandeep    (0000000017) → still unknown, left as placeholder
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Order    = require('../models/Order');
const Customer = require('../models/Customer');

async function simpleUpdate(placeholder, real, name) {
  const cust     = await Customer.findOne({ mobile: placeholder });
  const orderRes = await Order.updateMany({ mobile: placeholder }, { $set: { mobile: real } });
  if (cust) { cust.mobile = real; await cust.save(); }
  console.log(`  ✓ ${name.padEnd(22)} ${placeholder} → ${real}   (${orderRes.modifiedCount} order${orderRes.modifiedCount !== 1 ? 's' : ''} + customer)`);
}

async function mergeInto(placeholder, realMobile, name) {
  const src  = await Customer.findOne({ mobile: placeholder });
  const dest = await Customer.findOne({ mobile: realMobile });

  if (!src) {
    // Nothing to merge; just reassign any orphaned orders
    const r = await Order.updateMany({ mobile: placeholder }, { $set: { mobile: realMobile } });
    console.log(`  ✓ ${name.padEnd(22)} no Customer record — reassigned ${r.modifiedCount} orders to ${realMobile}`);
    return;
  }
  if (!dest) {
    // Destination doesn't exist yet — simple rename
    src.mobile = realMobile;
    await src.save();
    const r = await Order.updateMany({ mobile: placeholder }, { $set: { mobile: realMobile } });
    console.log(`  ✓ ${name.padEnd(22)} ${placeholder} → ${realMobile}   (renamed, ${r.modifiedCount} orders)`);
    return;
  }

  // Both exist → merge src into dest
  dest.totalOrders  += src.totalOrders;
  dest.totalRevenue += src.totalRevenue;
  dest.isRepeat      = dest.totalOrders >= 2;
  if (src.firstOrderDate && (!dest.firstOrderDate || src.firstOrderDate < dest.firstOrderDate))
    dest.firstOrderDate = src.firstOrderDate;
  if (src.lastOrderDate && (!dest.lastOrderDate || src.lastOrderDate > dest.lastOrderDate))
    dest.lastOrderDate = src.lastOrderDate;
  await dest.save();
  await Customer.deleteOne({ mobile: placeholder });

  const r = await Order.updateMany({ mobile: placeholder }, { $set: { mobile: realMobile } });
  console.log(`  ✓ ${name.padEnd(22)} MERGED into ${realMobile}   (${r.modifiedCount} orders consolidated)`);
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB\n');

  await mergeInto('0000000014', '9748804904', 'Sukumar Naskar → Sukumar');
  await mergeInto('0000000019', '8826848617', 'Dhruv Attri');
  await mergeInto('0000000020', '7579840395', 'Bhupendra Tanvar');

  console.log(`\n  ── Still placeholder ──────────────────────────────────`);
  console.log(`     0000000017  →  S Amandeep  (no number yet)\n`);

  await mongoose.disconnect();
})();
