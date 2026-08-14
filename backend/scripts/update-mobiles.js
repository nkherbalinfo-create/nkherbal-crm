/**
 * One-shot script: replace placeholder mobiles with real numbers
 * Handles merge: if the real number already has a Customer record,
 * it folds the placeholder's stats in and deletes the placeholder customer.
 * Run: node backend/scripts/update-mobiles.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Order    = require('../models/Order');
const Customer = require('../models/Customer');

const MAP = [
  { placeholder: '0000000001', real: '9908511755', name: 'Raja Shekhar'       },
  { placeholder: '0000000002', real: '9888444957', name: 'Sahil Garg'          },
  { placeholder: '0000000003', real: '9122077150', name: 'Pankaj Pandey'       },
  { placeholder: '0000000004', real: '8583965186', name: 'Shamim'              },
  { placeholder: '0000000005', real: '9748804904', name: 'Sukumar'             },
  { placeholder: '0000000006', real: '8515938209', name: 'Sukhdev'             },
  { placeholder: '0000000007', real: '8072565495', name: 'Adithyan Marivelu'   },
  { placeholder: '0000000008', real: '8240016140', name: 'Md Muzammil Shams'   },
  { placeholder: '0000000009', real: '8983766706', name: 'Mayuresh Borwake'    },
  { placeholder: '0000000010', real: '7871909737', name: 'A. Prabhakaran'      },
  { placeholder: '0000000011', real: '8625858321', name: 'Rashmi'              },
  { placeholder: '0000000012', real: '9717024007', name: 'Jnanendra Veer'      },
  { placeholder: '0000000013', real: '9144615221', name: 'Sarfaraz Khan'       },
  { placeholder: '0000000015', real: '9999893880', name: 'Sanket Maheshwari'   },
  { placeholder: '0000000016', real: '8237374943', name: 'Nilesh Gund'         },
  { placeholder: '0000000018', real: '8607834960', name: 'Ravi Sorout'         },
];

const STILL_MISSING = [
  { placeholder: '0000000014', name: 'Sukumar Naskar  (Jan 2026 — possibly same as Sukumar?)' },
  { placeholder: '0000000017', name: 'S Amandeep'      },
  { placeholder: '0000000019', name: 'Dhruv Attri'     },
  { placeholder: '0000000020', name: 'Bhupendar Tanvar' },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB\n');

  let updated = 0, merged = 0, skipped = 0;

  for (const { placeholder, real, name } of MAP) {
    const placeholderCust = await Customer.findOne({ mobile: placeholder });
    const realCust        = await Customer.findOne({ mobile: real });
    const orderCount      = await Order.countDocuments({ mobile: placeholder });

    if (!placeholderCust && orderCount === 0) {
      console.log(`  ⚠  ${name.padEnd(22)} ${placeholder} not found — skipped`);
      skipped++;
      continue;
    }

    // ── Case A: real number already exists → merge placeholder into it ──────
    if (realCust && placeholderCust) {
      // Combine stats from both records
      realCust.totalOrders  += placeholderCust.totalOrders;
      realCust.totalRevenue += placeholderCust.totalRevenue;
      realCust.isRepeat      = realCust.totalOrders >= 2;
      // Earliest first order, latest last order
      if (placeholderCust.firstOrderDate && (!realCust.firstOrderDate || placeholderCust.firstOrderDate < realCust.firstOrderDate)) {
        realCust.firstOrderDate = placeholderCust.firstOrderDate;
      }
      if (placeholderCust.lastOrderDate && (!realCust.lastOrderDate || placeholderCust.lastOrderDate > realCust.lastOrderDate)) {
        realCust.lastOrderDate = placeholderCust.lastOrderDate;
      }
      await realCust.save();
      await Customer.deleteOne({ mobile: placeholder });

      // Point all placeholder orders to the real mobile
      const orderRes = await Order.updateMany({ mobile: placeholder }, { $set: { mobile: real } });
      console.log(`  ✓ ${name.padEnd(22)} ${placeholder} → ${real}   MERGED (${orderRes.modifiedCount} orders consolidated)`);
      merged++;

    // ── Case B: real number doesn't exist yet → simple rename ────────────────
    } else {
      if (placeholderCust) {
        placeholderCust.mobile = real;
        await placeholderCust.save();
      }
      const orderRes = await Order.updateMany({ mobile: placeholder }, { $set: { mobile: real } });
      console.log(`  ✓ ${name.padEnd(22)} ${placeholder} → ${real}   (${orderRes.modifiedCount} order${orderRes.modifiedCount !== 1 ? 's' : ''} + customer)`);
      updated++;
    }
  }

  console.log(`\n  ══════════════════════════════════════════════════════`);
  console.log(`  Updated: ${updated}  Merged: ${merged}  Skipped: ${skipped}`);

  if (STILL_MISSING.length) {
    console.log(`\n  ── Still using placeholders (no number given) ─────────`);
    for (const { placeholder, name } of STILL_MISSING) {
      console.log(`     ${placeholder}  →  ${name}`);
    }
    console.log(`\n  ⚠  If Sukumar Naskar (Jan-26) is the same person as`);
    console.log(`     Sukumar, share the number and I'll merge them.\n`);
  }

  await mongoose.disconnect();
})();
