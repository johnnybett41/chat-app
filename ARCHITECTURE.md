# ChatApp - Complete Architecture Overview

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Frontend Flow](#frontend-flow)
3. [Backend Flow](#backend-flow)
4. [Communication Protocol](#communication-protocol)
5. [Database Structure](#database-structure)
6. [Real-Time Features](#real-time-features)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Browser)                 │
│  - React/Vanilla JS                                  │
│  - Port: 3000 (http-server)                          │
│  - Socket.io Client Connection                       │
└────────────────────┬────────────────────────────────┘
                     │
                     │ HTTP + WebSocket
                     │
┌────────────────────▼────────────────────────────────┐
│              Backend (Node.js/Express)               │
│  - Express Server                                    │
│  - Socket.io Server                                 │
│  - Port: 5000                                       │
│  - MongoDB Connection                               │
└────────────────────┬────────────────────────────────┘
                     │
                     │ Mongoose ODM
                     │
┌────────────────────▼────────────────────────────────┐
│         Database (MongoDB - Local/Atlas)             │
│  - Users Collection                                 │
│  - Conversations Collection                         │
│  - Messages Collection                              │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 Frontend Flow

### **1. Login/Register Phase**

**File:** `frontend/src/index.html` + `frontend/src/chat.js`

**Split-Screen Layout (Two Users):**
```
┌──────────────────┬──────────────────┐
│   LEFT (User 1)  │  RIGHT (User 2)  │
│                  │                  │
│ ┌──────────────┐ │ ┌──────────────┐ │
│ │  Login Form  │ │ │  Login Form  │ │
│ │              │ │ │              │ │
│ │ Name: John   │ │ │ Name: Alice  │ │
│ │ Email: john@ │ │ │ Email: alice@│ │
│ │ Pass: ****   │ │ │ Pass: ****   │ │
│ │              │ │ │              │ │
│ │[Register]    │ │ │[Register]    │ │
│ │[Login]       │ │ │[Login]       │ │
│ └──────────────┘ │ └──────────────┘ │
└──────────────────┴──────────────────┘
```

**Process:**
```
User Input (Register/Login)
        ↓
Frontend Validation (email format, password length)
        ↓
POST /api/auth/register or /api/auth/login
        ↓
Backend Validates & Creates JWT Token
        ↓
Response: { token, user: { id, name, email } }
        ↓
Store token & currentUser in JavaScript variables
        ↓
Hide Login Screen → Show Chat Screen
        ↓
Fetch Users List + Initialize Socket.io
```

### **2. Chat Screen Phase**

```
┌──────────────────────────────────────┐
│          User 1 Chat Interface        │
├────────────────┬─────────────────────┤
│                │                     │
│  User List     │  Chat Messages      │
│  ─────────     │  ─────────────      │
│  • Alice       │  Alice: Hi!         │
│  • Bob         │  You: Hello!        │
│  • Carol       │  Alice: How are you?│
│                │  You: Good! ✓       │
│                │                     │
│                │  [Message Input]    │
│                │  [Send Button] 📤   │
│                │                     │
└────────────────┴─────────────────────┘
```

### **3. Message Sending Flow**

```javascript
User clicks "Send" button
        ↓
JavaScript: sendMessage(userNum)
        ↓
Validate: Must have selected a user
        ↓
Get message text from input field
        ↓
Display message immediately on UI (optimistic update)
        ↓
Socket.emit("sendMessage", {
  conversationId: ID,
  senderId: currentUser._id,
  text: messageText
})
        ↓
Clear input field & refocus
        ↓
[Backend processes message via Socket.io]
```

### **4. Message Status Flow**

```
User 1 sends message
        ↓
Message appears with ✓ (sent) status
        ↓
Backend receives via Socket.io
        ↓
Message saved to MongoDB
        ↓
Message broadcast to conversation room
        ↓
User 2 receives via Socket event
        ↓
Message appears with ✓✓ (delivered) status
        ↓
User 2 opens conversation
        ↓
Message marked as read
        ↓
Status updates to ✓✓ (blue) = read
```

---

## 🔧 Backend Flow

### **1. Server Setup**

**File:** `backend/server.js`

```javascript
1. Load environment variables (.env)
   - MONGO_URI: MongoDB connection string
   - JWT_SECRET: Secret key for tokens
   - CLIENT_URL: Frontend URL

2. Initialize Express App + HTTP Server

3. Setup Middleware:
   - CORS (allow localhost:3000 requests)
   - Express.json (parse JSON requests)

4. Connect to MongoDB

5. Register Routes:
   - /api/auth (login, register)
   - /api/users (get users list)
   - /api/conversations (create, get conversations)

6. Initialize Socket.io Server
   - Listen for real-time WebSocket connections
   - Handle message broadcasting
```

### **2. Authentication Flow**

**File:** `backend/routes/auth.js`

```
POST /api/auth/register
├─ Receive: { name, email, password }
├─ Validate input
├─ Hash password with bcrypt
├─ Create User in MongoDB
├─ Generate JWT token
└─ Return: { token, user }

POST /api/auth/login
├─ Receive: { email, password }
├─ Find user by email
├─ Compare password with hash
├─ Generate JWT token
└─ Return: { token, user }
```

### **3. Conversation/Message Flow**

**File:** `backend/routes/conversations.js`

```
POST /api/conversations (Create/Get existing 1-to-1)
├─ Verify token (middleware)
├─ Get recipientId from request
├─ Check if conversation exists between these 2 users
├─ If exists: return existing conversation
├─ If not: create new conversation
├─ Add both users as members
└─ Return: conversation object with ID

GET /api/conversations/:id/messages
├─ Verify token
├─ Check user is member of conversation
├─ Fetch all messages for this conversation from MongoDB
├─ Populate sender details
└─ Return: array of messages
```

### **4. Socket.io Events (Real-Time)**

**File:** `backend/server.js`

```javascript
Connection Flow:
┌─ Client connects with token
├─ Server verifies JWT
├─ Store: online[userId] = Set of socketIds
└─ Client ready to join rooms

socket.on("joinConversation", conversationId)
├─ Client joins Socket.io room named conversationId
└─ Now receives messages for this conversation

socket.on("sendMessage", { conversationId, text })
├─ Verify user is member of conversation
├─ Validate message (not empty, not too long)
├─ Create Message document in MongoDB
├─ Set status: "sent"
├─ io.to(conversationId).emit("message", messageData)
│  └─ Broadcasts to all users in that conversation room
└─ Both users receive message in real-time

socket.on("leaveConversation", conversationId)
└─ Client leaves Socket.io room
```

---

## 📡 Communication Protocol

### **HTTP Requests (REST API)**

```
┌────────────────────────────────────────┐
│         Frontend → Backend (HTTP)       │
├────────────────────────────────────────┤
│ 1. POST /api/auth/register             │
│    Payload: { name, email, password }  │
│                                        │
│ 2. POST /api/auth/login                │
│    Payload: { email, password }        │
│    Headers: Content-Type: application/json │
│                                        │
│ 3. GET /api/users                      │
│    Headers: Authorization: Bearer TOKEN│
│                                        │
│ 4. POST /api/conversations             │
│    Payload: { recipientId }            │
│    Headers: Authorization: Bearer TOKEN│
│                                        │
│ 5. GET /api/conversations/:id/messages │
│    Headers: Authorization: Bearer TOKEN│
└────────────────────────────────────────┘
```

### **WebSocket (Socket.io)**

```
┌────────────────────────────────────────┐
│   Frontend ←→ Backend (WebSocket)       │
├────────────────────────────────────────┤
│ Connection:                            │
│  - Client: io("http://localhost:5000") │
│  - Server: Validates JWT token        │
│  - Handshake: auth.token in query      │
│                                        │
│ Events (Frontend → Backend):           │
│  - joinConversation(conversationId)    │
│  - sendMessage({conversationId, text}) │
│  - leaveConversation(conversationId)   │
│                                        │
│ Events (Backend → Frontend):           │
│  - message(messageData)                │
│  - messageStatusUpdate(status)         │
│  - messageRead(messageId)              │
│  - error(errorMessage)                 │
└────────────────────────────────────────┘
```

---

## 📊 Database Structure

### **MongoDB Collections**

#### **Users Collection**
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  passwordHash: String (bcrypt hashed),
  createdAt: Date
}
```

#### **Conversations Collection**
```javascript
{
  _id: ObjectId,
  members: [ObjectId, ObjectId],  // User IDs
  isGroup: Boolean,               // false for 1-to-1
  name: String,                   // null for 1-to-1
  createdAt: Date
}
```

#### **Messages Collection**
```javascript
{
  _id: ObjectId,
  conversation: ObjectId,         // Reference to Conversation
  sender: ObjectId,               // Reference to User
  text: String,
  status: String,                 // "sent", "delivered", "read"
  readBy: [ObjectId],             // Users who read this message
  createdAt: Date
}
```

---

## ⚡ Real-Time Features

### **1. Message Status Flow**

```
User 1 sends message
    │
    └─→ Socket emit: sendMessage
            │
            └─→ Backend saves to MongoDB
                    │
                    └─→ Broadcast to conversation room
                            │
                            ├─→ User 1: receives confirmation (✓ sent)
                            └─→ User 2: receives message (✓✓ delivered)
                                    │
                                    └─→ User 2 opens chat
                                            │
                                            └─→ Mark as read
                                                    │
                                                    └─→ Update status (✓✓ blue)
```

### **2. Online Status Tracking**

```javascript
Backend maintains:
online = Map {
  userId1 → Set { socketId1, socketId2 },
  userId2 → Set { socketId3 }
}

When user connects:
- Add their socketId to their Set
- If Set size > 0, user is online

When user disconnects:
- Remove socketId from Set
- If Set size = 0, user is offline
```

### **3. Message Persistence**

```
All messages are saved to MongoDB BEFORE broadcasting
    │
    ├─ Even if recipient is offline, message is stored
    ├─ When they login again, messages load from database
    └─ No messages are lost
```

---

## 🔐 Security Features

### **Authentication**
- JWT tokens issued on login
- Tokens included in every request
- Token verified on Socket.io connection
- Tokens expire in 30 days

### **Authorization**
- Users can only:
  - Send messages in conversations they're members of
  - See conversations they belong to
  - View users list
  - View messages from conversations they're in

### **Data Validation**
- Email format validation
- Password minimum length (4 characters)
- Message text validation (1-2000 characters)
- Required field validation

---

## 🚀 Complete Message Flow Example

```
SCENARIO: User 1 (John) sends message to User 2 (Alice)

1. John logs in
   POST /api/auth/login → Backend validates → JWT token returned
   
2. John's browser connects Socket.io
   Socket.io connects with JWT token → Backend verifies
   
3. John opens chat (selects Alice)
   GET /api/users → Backend returns Alice
   POST /api/conversations → Backend creates/finds conversation
   GET /api/conversations/{convId}/messages → Load history
   
4. John selects Alice from user list
   socket.emit("joinConversation", conversationId)
   → John joins Socket.io room for this conversation
   
5. John types & sends message
   socket.emit("sendMessage", { conversationId, text: "Hi Alice!" })
   
6. Backend receives sendMessage event
   ├─ Verify John is member of conversation
   ├─ Create Message document in MongoDB
   │  {sender: John._id, text: "Hi Alice!", status: "sent"}
   ├─ Get all members in conversation (John & Alice)
   └─ io.to(conversationId).emit("message", messageData)
   
7. Both John and Alice receive message event
   ├─ John: Message shows with ✓ status
   └─ Alice: Message shows with ✓✓ status
   
8. Alice clicks on John to open conversation
   ├─ Loads message history
   ├─ Message updates status to "read"
   └─ John sees ✓✓ (blue) indicating read
```

---

## 📁 Project Structure

```
Project/
├── backend/
│   ├── server.js (Main server file)
│   ├── config/
│   │   └── db.js (MongoDB connection)
│   ├── models/
│   │   ├── User.js
│   │   ├── Conversation.js
│   │   └── Message.js
│   ├── routes/
│   │   ├── auth.js (Login/Register)
│   │   ├── conversations.js (Chat endpoints)
│   │   └── userRoutes.js (Users list)
│   ├── middleware/
│   │   ├── auth.js (JWT verification)
│   │   └── validators.js (Input validation)
│   └── package.json
│
└── frontend/
    └── src/
        ├── index.html (Split-screen layout)
        ├── chat.js (All JavaScript logic)
        ├── styles.css (Modern styling)
        └── package.json
```

---

## 🐛 Why Messages Aren't Sending (Issue)

**Problem:** Send button not delivering messages to next user

**Likely Causes:**
1. **Socket not joining conversation room**
   - `socket.emit('joinConversation')` not being called
   - Solution: Verify user selects a recipient before sending

2. **Conversation ID not set**
   - `currentConversationId` not initialized
   - Solution: Must click on user first to create/get conversation

3. **Socket emission not reaching backend**
   - Check browser console for errors
   - Verify Socket.io is connected

4. **Backend not broadcasting**
   - Message saved but not emitted to room
   - Solution: Check server logs for emit errors

**To Debug:**
1. Open browser console (F12)
2. Check for Socket.io connection message
3. Look for "joinConversation" events
4. Verify "sendMessage" events are sent
5. Check backend terminal for received events

---

## 📈 Next Steps

To fix the messaging issue:
1. Ensure `startConversation()` is called when selecting a user
2. Verify `socket.emit('joinConversation')` executes
3. Check that `currentConversationId` is set before sending
4. Test with browser console open for errors
5. Verify backend Socket.io events are logged
