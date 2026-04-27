const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role:      { type: String, enum: ['user', 'assistant'], required: true },
  content:   { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const waConversationSchema = new mongoose.Schema({
  phone:    { type: String, required: true, unique: true }, // WA phone e.g. 919876543210
  name:     { type: String },
  leadId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  messages: { type: [messageSchema], default: [] },
  lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('WaConversation', waConversationSchema);
