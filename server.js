require('dotenv').config({ path: __dirname + '/.env' }); // ensure .env loads first

const express = require('express');
const http = require('http');
const cors = require('cors');
const socketIo = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const convRoutes = require('./routes/conversations');
const userRoutes = require('./routes/userRoutes'); // user routes
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');


const app = express();
const server = http.createServer(app);
// ============================
            // MIDDLEWAREcd..
            
// ============================
console.log("Loaded .env:", process.env.MONGO_URI);
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json());



// ============================
// DATABASE CONNECT
// ============================
if (!process.env.MONGO_URI) {
  console.warn('⚠️ MONGO_URI not set — falling back to local MongoDB. Set MONGO_URI in .env for production.');
  process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/chat_app';
}
connectDB();

// ============================
// ROUTES
// ============================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", convRoutes);

// ============================
            // SOCKET.IO
// ============================
const io = new socketIo.Server(server, { 
    cors: { origin: "*", methods: ["GET", "POST"]}, 
});

const online = new Map(); // userId -> Set of socketIds

          // Auth middleware for socket — require a valid token
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Authentication error: token required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    console.warn('Socket auth failed', err.message);
    next(new Error('Authentication error'));
  }
});

io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    if (socket.userId) {
      const uid = String(socket.userId);
      const set = online.get(uid) || new Set();
      set.add(socket.id);
      online.set(uid, set);
    }

    socket.on("joinConversation", (id) => {
      if (!id) return;
      socket.join(id);
    });
    socket.on("leaveConversation", (id) => {
      if (!id) return;
      socket.leave(id);
    });

    socket.on("sendMessage", async ({ conversationId, text }) => {
        if (!socket.userId) return socket.emit('error', { message: 'Authentication required' });
        if (!conversationId || typeof text !== 'string') return socket.emit('error', { message: 'Invalid payload' });

        text = text.trim();
        if (text.length === 0) return socket.emit('error', { message: 'Message text is empty' });
        if (text.length > 2000) return socket.emit('error', { message: 'Message too long (max 2000 chars)' });

        // Verify conversation exists and that sender is a member
        const conv = await Conversation.findById(conversationId).lean();
        if (!conv) return socket.emit('error', { message: 'Conversation not found' });
        if (!conv.members.map(m => String(m)).includes(String(socket.userId))) {
          return socket.emit('error', { message: 'Not a member of conversation' });
        }

        const message = await Message.create({
            conversation: conversationId,
            sender: socket.userId,
            text
        });

        const populated = await message.populate("sender", "name email");

        io.to(conversationId).emit("newMessage", populated);
    });
    
    socket.on("disconnect", () => {
        if (socket.userId) {
          const uid = String(socket.userId);
          const set = online.get(uid);
          if (set) {
            set.delete(socket.id);
            if (set.size === 0) online.delete(uid);
          }
        }
        console.log("Disconnected:", socket.id);
    });
});

// ============================ 
//Ws MESSAGE
ws.on('message', (message)=>{
  const data = JSON.parse(message);

  if (data.typing !== undefined){
    //broadcasting typing event
    WebAssembly.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN){
        client.send(JSON.stringify({ typing: data.typing, username: data.username}))
      }
    })
    return;
  }
})

//Normal chat mesage
const newMessage = new Message({
  username: data.username,
  message: data.message,
  timestamp: data.timestamp
})
mercy

// ============================ 
// START SERVER (only when run directly)
// ============================
const PORT = Number(process.env.PORT) || 5000;
if (require.main === module) {
  server.listen(PORT);
  server.on('listening', () => console.log(`Server running on port ${PORT}`));
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Another process is listening on that port.`);
      console.error('You can set a different PORT env var, or stop the process using that port and try again.');
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received: closing MongoDB connection and exiting.');
    try { await mongoose.disconnect(); } catch (e) { /* ignore */ }
    process.exit(0);
  });
} else {
  // When imported for tests, don't auto-listen; tests will use `app` directly.
  console.log('Server module imported (not listening)');
}

// test-dns.js
const dns = require('dns').promises;
dns.resolveSrv('_mongodb._tcp.cluster414x.hrhenkt.mongodb.net')
  .then(console.log)
  .catch(console.error);


// basic process handlers
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

module.exports = { app, server };