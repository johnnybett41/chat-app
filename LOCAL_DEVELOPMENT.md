# Local Development Guide

## Running Locally Before Deployment

### Prerequisites
- Node.js installed (download from nodejs.org)
- MongoDB running locally OR MongoDB Atlas account
- Visual Studio Code or any code editor

### 1. Start MongoDB

**Option A: Local MongoDB**
```powershell
mongod
```

**Option B: MongoDB Atlas (Cloud)**
- Create account at mongodb.com/cloud/atlas
- Create a cluster and get connection string
- Update `.env` with your connection string

### 2. Start Backend Server

```powershell
cd backend
npm install
npm start
```

You should see:
```
Server running on port 5000
MongoDB connected
```

### 3. Open Frontend in Browser

```
http://localhost:3000
```

Or just open `frontend/src/index.html` in your browser.

### 4. Test the App

1. **Register first user**:
   - Email: john@example.com
   - Password: password123
   - Name: John

2. **Register second user** (open new browser window in incognito mode):
   - Email: alice@example.com
   - Password: password456
   - Name: Alice

3. **Send messages** between the two users

### 5. Stop the Server

Press `Ctrl+C` in the terminal running the backend.

## Environment Setup

Your `.env` file should look like:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/chat_app
JWT_SECRET=your-secret-key-change-this
CLIENT_URL=http://localhost:3000
```

For production (deployment), change these values - see `DEPLOY_STEPS.md`

## File Structure

```
Project/
├── backend/
│   ├── server.js           (Main server file)
│   ├── package.json        (Dependencies)
│   ├── .env                (Configuration)
│   ├── config/
│   ├── models/             (Database schemas)
│   ├── routes/             (API endpoints)
│   └── middleware/         (Authentication, validation)
│
└── frontend/
    └── src/
        ├── index.html      (Main HTML)
        ├── chat.js         (Frontend logic)
        ├── styles.css      (Styling)
        └── config.js       (Configuration)
```

## Common Issues

### "Cannot find module..."
```powershell
cd backend
npm install
```

### "Port 5000 already in use"
Change PORT in `.env` or kill the process using port 5000:
```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### "MongoDB connection failed"
- Make sure MongoDB is running
- Or update MONGO_URI in `.env` to your Atlas connection string

### Frontend shows "Cannot connect to server"
- Make sure backend is running on port 5000
- Check `API_URL` in chat.js is correct
- Clear browser cache

## API Endpoints

All routes require JWT token in `Authorization` header (except auth endpoints):

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users` - Get all users (except self)

### Conversations
- `GET /api/conversations` - Get all user's conversations
- `POST /api/conversations` - Create/get conversation with a user
- `GET /api/conversations/:id/messages` - Get messages in conversation
- `DELETE /api/conversations/:id` - Delete a conversation

### WebSocket Events
- `joinConversation` - Join a conversation room
- `leaveConversation` - Leave a conversation room
- `sendMessage` - Send a message in conversation
- `newMessage` - Receive new messages
- `disconnect` - Handle disconnection

## Debugging Tips

1. **Check browser console** for errors: `F12` → Console
2. **Check network tab** to see API calls: `F12` → Network
3. **Check backend logs** in terminal for server errors
4. **Use JSON formatter** extension for cleaner API responses

Ready to deploy? Follow `DEPLOY_STEPS.md` next!
