const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  city: { type: String },
  totalOrders: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  isRepeat: { type: Boolean, default: false },
  firstOrderDate: { type: Date },
  lastOrderDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
