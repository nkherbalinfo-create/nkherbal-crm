const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },
  orderDate: { type: Date, required: true, default: Date.now },
  customerName: { type: String, required: true },
  mobile: { type: String, required: true },
  city: { type: String },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  orderValue: { type: Number, required: true },
  salesChannel: {
    type: String,
    enum: ['Amazon', 'Website', 'WhatsApp', 'Offline'],
    required: true
  },
  leadSource: {
    type: String,
    enum: ['Ads', 'Organic', 'Referral', 'Direct'],
    default: 'Organic'
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'COD', 'Pending'],
    default: 'Pending'
  },
  orderStatus: {
    type: String,
    enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled', 'RTO'],
    default: 'Processing'
  },
  customerType: { type: String, enum: ['New', 'Repeat'], default: 'New' },
  followUpDone: { type: Boolean, default: false },
  upsellDone: { type: Boolean, default: false },
  notes: { type: String },
  linkedLeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  email: { type: String, default: '' },
  billingAddress: { type: String, default: '' },
  paymentMethod: { type: String, default: '' },
  lineItems: [{
    name: { type: String },
    sku: { type: String },
    price: { type: Number },
    quantity: { type: Number },
    total: { type: Number },
    gst: { type: Number }
  }]
}, { timestamps: true });

orderSchema.pre('save', async function (next) {
  if (!this.orderId) {
    const date = new Date();
    const prefix = `ORD-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const last = await mongoose.model('Order').findOne(
      { orderId: new RegExp(`^${prefix}-`) },
      { orderId: 1 },
      { sort: { orderId: -1 } }
    );
    const seq = last ? parseInt(last.orderId.split('-').pop(), 10) + 1 : 1;
    this.orderId = `${prefix}-${String(seq).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
