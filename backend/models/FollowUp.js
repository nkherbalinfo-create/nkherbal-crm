const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema({
  orderId:       { type: String, required: true },
  orderObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  customerName:  { type: String, required: true },
  mobile:        { type: String },
  email:         { type: String },
  productName:   { type: String, required: true },
  orderDate:     { type: Date, required: true },
  monthNumber:   { type: Number, enum: [1, 2, 3], required: true },
  dueDate:       { type: Date, required: true },
  status:        { type: String, enum: ['pending', 'sent', 'skipped'], default: 'pending' },
  sentAt:        { type: Date },
  autoSent:      { type: Boolean, default: false },
  notes:         { type: String }
}, { timestamps: true });

// Each order can only have one follow-up per month
followUpSchema.index({ orderId: 1, monthNumber: 1 }, { unique: true });

module.exports = mongoose.model('FollowUp', followUpSchema);
