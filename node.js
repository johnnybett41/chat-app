// Backend for Real-time Chat App using Node.js, Express, MongoDB, and Socket.IO
require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { timeStamp } = require('console');
const dns = require('dns').promises;


// MongoDB models
const UserSchema = new mongoose.Schema({
    name: String,
    message: String,
    timeStamp: String,
email: { type: String, unique: true },
passwordHash: String,
createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);



const ConversationSchema = new mongoose.Schema({
name: String,
isGroup: { type: Boolean, default: false },
members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
createdAt: { type: Date, default: Date.now }
});
const Conversation = mongoose.model('Conversation', ConversationSchema);


const MessageSchema = new mongoose.Schema({
conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
text: String,
createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

console.log('Loaded .env:', process.env.MONGO_URI); // test
// Express setup
const app = express();
const server = http.createServer(app);
const io = new socketIo.Server(server, {
cors: { origin: '*', methods: ['GET','POST'] }
});


app.use(cors());
app.use(express.json());


// Connect MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chat_app';
const MONGO_URI_NON_SRV = process.env.MONGO_URI_NON_SRV || null;

async function connectMongo() {
  try {
    // If using an Atlas SRV URI, do a fast DNS SRV check so failures are clearer and we can fall back
    if (MONGO_URI.startsWith('mongodb+srv://')) {
      const host = MONGO_URI.replace(/^mongodb\+srv:\/\//, '').split('/')[0];
      try {
        await dns.resolveSrv(`_mongodb._tcp.${host}`);
      } catch (err) {
        console.warn(`DNS SRV lookup for ${host} failed (${err && err.code}). Attempting fallback options...`);
        
        // Try non-SRV Atlas URI first if available
        if (MONGO_URI_NON_SRV && MONGO_URI_NON_SRV !== 'MONGO_URI_NON_SRV=mongodb://...') {
          try {
            await mongoose.connect(MONGO_URI_NON_SRV);
            console.log('MongoDB connected (Atlas non-SRV fallback)');
            return;
          } catch (fallbackErr) {
            console.warn('Non-SRV Atlas connection failed, trying local MongoDB...');
          }
        }
        
        // Fall back to local MongoDB
        await mongoose.connect('mongodb://127.0.0.1:27017/chat_app');
        console.log('MongoDB connected (fallback local)');
        return;
      }
    }

    // Let mongoose use default options; older flags like useNewUrlParser/useUnifiedTopology are no longer needed
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // In production you might want to exit the process here
    // process.exit(1);
  }
}

connectMongo();


// Middleware to protect routes
const auth = async (req, res, next) => {
const token = req.header('Authorization')?.replace('Bearer ', '') || req.query.token;
if (!token) return res.status(401).json({ message: 'No token' });
try {
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = await User.findById(decoded.id).select('-passwordHash');
next();
} catch (err) {
res.status(401).json({ message: 'Invalid token' });
}
};

// Routes
// Register
app.post('/api/auth/register', async (req, res) => {
const { name, email, password } = req.body;

if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });
try {
const existing = await User.findOne({ email });
if (existing) return res.status(400).json({ message: 'Email exists' });
const hash = await bcrypt.hash(password, 10);
const user = new User({ name, email, passwordHash: hash });

//TO do
// Save user
await user.save();

const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
res.json({ token, user: { _id: user._id, name: user.name, email: user.email } });
} catch (err) {
res.status(500).json({ message: 'Server error' });
}
});


// Login
app.post('/api/auth/login', async (req, res) => {
const { email, password } = req.body;
if (!email || !password) return res.status(400).json({ message: 'Missing fields' });
try {

const user = await User.findOne({ email });
if (!user) return res.status(400).json({ message: 'Invalid credentials' });
const match = await bcrypt.compare(password, user.passwordHash);
if (!match) return res.status(400).json({ message: 'Invalid credentials' });
const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
res.json({ token, user: { _id: user._id, name: user.name, email: user.email } });
} catch (err) {
    
res.status(500).json({ message: 'Server error' });
}
});

// ============================
// CHAT API ROUTES
// ============================

// Get all users (for the sidebar)
app.get('/api/users', auth, async (req, res) => {
    try {
        // Return all users except the current one
        const users = await User.find({ _id: { $ne: req.user._id } }).select('name email');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get or create a conversation between current user and recipient
app.post('/api/conversations', auth, async (req, res) => {
    const { recipientId } = req.body;
    try {
        // Check if a conversation already exists between these two
        let conversation = await Conversation.findOne({
            members: { $all: [req.user._id, recipientId] }
        });

        if (!conversation) {
            conversation = new Conversation({
                members: [req.user._id, recipientId]
            });
            await conversation.save();
        }
        res.json(conversation);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get messages for a specific conversation
app.get('/api/conversations/:id/messages', auth, async (req, res) => {
    try {
        const messages = await Message.find({ conversation: req.params.id })
            .populate('sender', 'name')
            .sort('createdAt');
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================
// SOCKET.IO LOGIC
// ============================
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinConversation', (conversationId) => {
        socket.join(conversationId);
        console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
    });

    socket.on('sendMessage', async (data) => {
        const { conversationId, senderId, text } = data;
        // Save to DB
        const newMessage = new Message({ conversation: conversationId, sender: senderId, text });
        await newMessage.save();
        await newMessage.populate('sender', 'name');

        // Broadcast only to this conversation room
        io.to(conversationId).emit('message', {
            text: newMessage.text,
            sender: newMessage.sender.name,
            senderId: newMessage.sender._id,
            createdAt: newMessage.createdAt
        });
    });
});

// ============================
// START SERVER
// ============================
const PORT = Number(process.env.PORT) || 5000;
if (require.main === module) {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
} else {
  console.log('Server module imported (not listening)');
}

// basic process handlers
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

module.exports = { app, server };