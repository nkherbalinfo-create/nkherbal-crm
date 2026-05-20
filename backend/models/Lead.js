const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  leadId: { type: String, unique: true },
  date: { type: Date, default: Date.now },
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  source: {
    type: String,
    enum: ['Ads', 'WhatsApp', 'Website', 'Referral', 'Direct'],
    required: true
  },
  interestedProduct: { type: String },
  status: {
    type: String,
    enum: ['Interested', 'Not Interested', 'Converted', 'Follow Up'],
    default: 'Interested'
  },
  notes: { type: String },
  convertedOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }
}, { timestamps: true });

leadSchema.pre('save', async function (next) {
  if (!this.leadId) {
    const date = new Date();
    const ym = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    // Use timestamp + random to avoid race-condition duplicate key errors
    const suffix = String(Date.now()).slice(-5) + String(Math.floor(Math.random() * 100)).padStart(2, '0');
    this.leadId = `LEAD-${ym}-${suffix}`;
  }
  next();
});

module.exports = mongoose.model('Lead', leadSchema);
