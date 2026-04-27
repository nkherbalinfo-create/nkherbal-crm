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
    const count = await mongoose.model('Lead').countDocuments();
    const date = new Date();
    this.leadId = `LEAD-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Lead', leadSchema);
