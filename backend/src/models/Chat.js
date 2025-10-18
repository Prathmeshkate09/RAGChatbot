const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const ChatSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true },
    title: { type: String },
    messages: { type: [MessageSchema], default: [] },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model('Chat', ChatSchema);
