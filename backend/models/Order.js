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
    enum: ['Website', 'WhatsApp'],
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
    discountPct: { type: Number, default: 0 },
    total: { type: Number },
    gst: { type: Number }
  }],
  manuallyDeleted: { type: Boolean, default: false },

  // ── Order confirmation + Delhivery automation ──────────────
  wcOrderId: { type: String, index: true },          // WooCommerce order number (also in notes as wc:<id>)
  partialCod: {                                      // WooBooster part payment: deposit online + balance as COD
    deposit: { type: Number },
    balance: { type: Number }
  },
  shipping: {                                        // address confirmed with the customer (falls back to billing)
    name: { type: String },
    phone: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String }
  },
  confirmation: {
    status: {
      type: String,
      enum: ['none', 'sent', 'order_confirmed', 'awaiting_address', 'address_confirmed', 'needs_call', 'cancelled'],
      default: 'none'
    },
    sentAt: { type: Date },
    orderConfirmedAt: { type: Date },
    addressConfirmedAt: { type: Date },
    reminders: { type: Number, default: 0 },
    lastReminderAt: { type: Date },
    note: { type: String }                           // why it needs a call, last error, etc.
  },
  delhivery: {
    status: { type: String, enum: ['none', 'created', 'failed', 'dry_run'], default: 'none' },
    awb: { type: String },
    createdAt: { type: Date },
    error: { type: String },
    codAmount: { type: Number },
    declaredValue: { type: Number }
  }
}, { timestamps: true });

orderSchema.index({ mobile: 1, 'confirmation.status': 1 });

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
