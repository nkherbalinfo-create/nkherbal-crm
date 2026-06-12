const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role:      { type: String, enum: ['user', 'assistant'], required: true },
  content:   { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  wamid:     { type: String }  // WhatsApp message ID for quote-reply
}, { _id: false });

const waConversationSchema = new mongoose.Schema({
  phone:    { type: String, required: true, unique: true }, // WA phone e.g. 919876543210
  name:     { type: String },
  leadId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  messages: { type: [messageSchema], default: [] },
  userMessageCount:   { type: Number, default: 0 },
  lastMessageAt:      { type: Date, default: Date.now },
  botPaused:          { type: Boolean, default: false },
  paymentClaimed:     { type: Boolean, default: false },
  contextSummary:     { type: String, default: '' },
  contextUpdatedAt:   { type: Date },
  labels:             { type: [String], default: [] },
  notes:              { type: String, default: '' }
}, { timestamps: true });

waConversationSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model('WaConversation', waConversationSchema);
