# Deployment Guide - Render.com

This guide will help you deploy your chat app to Render.com for free, making it accessible from any device.

## Step 1: Prepare Your Project

Your project is ready! It has:
- ✅ `package.json` with proper dependencies
- ✅ `.env` configuration file
- ✅ `server.js` as entry point

## Step 2: Create Render.com Account

1. Go to https://render.com
2. Sign up with GitHub account (recommended)
3. Authorize Render to access your repositories

## Step 3: Prepare for Deployment

### Backend Deployment:

1. **Create a MongoDB Atlas Database** (Free tier):
   - Go to https://www.mongodb.com/cloud/atlas
   - Create a free account
   - Create a new cluster
   - Get your connection string (looks like: `mongodb+srv://username:password@cluster0.xxx.mongodb.net/chat_app?retryWrites=true&w=majority`)
   - Save this for later

2. **Push your code to GitHub**:
   - Create a GitHub repo
   - Push your Project folder to GitHub
   - Make sure `.gitignore` includes `node_modules`, `.env`, and `backend.log`

### Frontend Setup:

3. **Update frontend to use dynamic server URL**:
   - The frontend will be served from Render
   - It will auto-detect the backend URL

## Step 4: Deploy Backend on Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Fill in the form:
   - **Name**: `chat-app-backend` (or your choice)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Region**: Choose closest to you

5. Add environment variables:
   - Click "Advanced" → "Add Environment Variable"
   - Add these variables:
     ```
     PORT=5000
     MONGO_URI=mongodb+srv://username:password@cluster0.xxx.mongodb.net/chat_app?retryWrites=true&w=majority
     JWT_SECRET=use-a-very-strong-random-secret-key-here
     CLIENT_URL=https://your-frontend-url.onrender.com
     NODE_ENV=production
     ```

6. Click "Create Web Service"
7. Wait for deployment (5-10 minutes)
8. Note your backend URL: `https://chat-app-backend.onrender.com`

## Step 5: Deploy Frontend on Render

1. Go to Render dashboard
2. Click "New +" → "Static Site"
3. Connect your GitHub repo
4. Fill in the form:
   - **Name**: `chat-app-frontend`
   - **Publish Directory**: `frontend/src`
   - **Build Command**: (leave empty if no build needed)

5. Click "Create Static Site"
6. Wait for deployment
7. Note your frontend URL

## Step 6: Update Frontend Configuration

1. In `frontend/src/chat.js`, update all API calls to use your backend URL:
   - Change `http://localhost:5000` to `https://your-backend-url.onrender.com`
   - Or use environment detection (see Step 7)

## Step 7: (Optional) Use Environment-Based URLs

Create a `frontend/src/config.js`:

```javascript
// Auto-detect server URL based on environment
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://chat-app-backend.onrender.com';

export default API_URL;
```

Then update `chat.js`:
```javascript
import API_URL from './config.js';

// Replace all fetch calls:
// From: 'http://localhost:5000/api/...'
// To: `${API_URL}/api/...`
```

## Step 8: Access Your App

Once deployed:
- Frontend: `https://chat-app-frontend.onrender.com`
- Backend: `https://chat-app-backend.onrender.com`
- Share frontend URL with anyone
- Works on phone, tablet, desktop, anywhere!

## Troubleshooting

### App won't load
- Check backend URL in frontend code
- Verify CORS is set correctly in server.js

### Messages not sending
- Check MongoDB URI is correct
- Verify JWT_SECRET is set
- Check browser console for errors

### Slow first load
- Free tier on Render goes to sleep after 15 minutes of inactivity
- First request wakes it up (takes 30 seconds)
- Upgrade to paid tier for always-on service

## Next Steps

After successful deployment:
1. Test on your phone
2. Share the URL with friends
3. Monitor for errors in Render dashboard
4. Scale up if needed
