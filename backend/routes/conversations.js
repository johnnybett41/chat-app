const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { conversationCreateValidators, addMembersValidators, getMessagesValidators } = require('../middleware/validators');

// Create a conversation (1-to-1 or group)
router.post('/', auth, conversationCreateValidators, async (req, res) => {
  const { memberIds = [], name, isGroup = false } = req.body;
  try {
    const members = Array.from(new Set([...memberIds, req.user._id.toString()]));
    // For 1-to-1, try to find existing conversation with same two members
    if (!isGroup && members.length === 2) {
      const exists = await Conversation.findOne({ isGroup: false, members: { $all: members, $size: 2 } });
      if (exists) return res.json(exists);
    }
    const conv = new Conversation({ name: name || null, isGroup, members });
    await conv.save();
    res.json(conv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's conversations
router.get('/', auth, async (req, res) => {
  try {
    const convs = await Conversation.find({ members: req.user._id }).populate('members', 'name email');
    res.json(convs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single conversation (must be a member)
router.get('/:id', auth, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id).populate('members', 'name email');
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    if (!conv.members.map(m => String(m._id || m)).includes(String(req.user._id))) return res.status(403).json({ message: 'Forbidden' });
    res.json(conv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a conversation (must be a member)
router.delete('/:id', auth, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    if (!conv.members.map(m => String(m)).includes(String(req.user._id))) return res.status(403).json({ message: 'Forbidden' });

    // Delete all messages in this conversation
    await Message.deleteMany({ conversation: req.params.id });
    
    // Delete the conversation
    await Conversation.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Conversation deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add members to a group conversation
router.post('/:id/members', auth, addMembersValidators, async (req, res) => {
  const { memberIds = [] } = req.body;
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    if (!conv.isGroup) return res.status(400).json({ message: 'Cannot add members to a 1-to-1 conversation' });
    if (!conv.members.map(m => String(m)).includes(String(req.user._id))) return res.status(403).json({ message: 'Forbidden' });

    const updated = Array.from(new Set([...conv.members.map(m => String(m)), ...memberIds.map(m => String(m))]));
    conv.members = updated;
    await conv.save();
    const populated = await conv.populate('members', 'name email');
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for a conversation with pagination
// Query params: ?page=1&limit=50 (page 1 = newest messages)
router.get('/:id/messages', auth, getMessagesValidators, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    if (!conv.members.map(m => String(m)).includes(String(req.user._id))) return res.status(403).json({ message: 'Forbidden' });

    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const page = Math.max(1, Number(req.query.page) || 1);

    // For chat UIs it's common to page from newest backwards
    const total = await Message.countDocuments({ conversation: req.params.id });
    const messages = await Message.find({ conversation: req.params.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sender', 'name email');

    res.json({ page, limit, total, messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;