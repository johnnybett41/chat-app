const mongoose = require('mongoose');


const ConversationSchema = new mongoose.Schema({
name: { type: String }, // optional for group
isGroup: { type: Boolean, default: false },
members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Conversation', ConversationSchema);