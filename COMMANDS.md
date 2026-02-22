# PowerShell Commands for Deployment

Copy and paste these commands in PowerShell to deploy your app.

## Step 1: Initialize Git Repository

```powershell
# Navigate to your project
cd "c:\Users\bettj\OneDrive\Desktop\Project"

# Initialize git
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: chat app ready for deployment"

# Rename main branch (GitHub uses 'main' by default)
git branch -M main
```

## Step 2: Connect to GitHub Repository

Replace `YOUR_USERNAME` with your actual GitHub username!

```powershell
# Add remote repository (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/chat-app.git

# Push code to GitHub
git push -u origin main
```

## Step 3: Verify Git Setup

```powershell
# Check git status
git status

# Check remote origin
git config --get remote.origin.url
```

## Step 4: Make Updates and Push Again

Whenever you update your code:

```powershell
# Check what changed
git status

# Add changes
git add .

# Create a commit with a message
git commit -m "Added feature: describe what you changed"

# Push to GitHub
git push
```

## Common Git Commands

```powershell
# View commit history
git log --oneline

# Check current branch
git branch

# Switch to a branch
git checkout branch-name

# Create new branch
git checkout -b new-branch-name

# View what changed (not yet staged)
git diff

# View what changed (already staged)
git diff --staged

# Undo changes to a file
git checkout -- filename.js

# Revert last commit
git revert HEAD
```

## Update Backend URL in Code

After you get your Render backend URL, update the frontend:

```powershell
# Open chat.js in code editor (replace with your editor)
code frontend/src/chat.js

# Find this section (around line 7):
# if (window.location.hostname.includes('onrender.com')) {
#     return 'https://chat-app-backend.onrender.com';  // ← UPDATE THIS LINE
# }
#
# Change chat-app-backend to your actual backend name from Render

# Save file, then commit and push:
git add frontend/src/chat.js
git commit -m "Updated backend URL for production"
git push
```

## Running Locally (Before Deployment)

```powershell
# Terminal 1: Start Backend
cd backend
npm install
npm start

# Terminal 2: Open Frontend
# Simply open frontend/src/index.html in your browser
# Or if you have a local server:
# cd frontend
# python -m http.server 3000
```

## Useful Links to Open

```powershell
# Open GitHub
Start-Process "https://github.com/new"

# Open MongoDB Atlas
Start-Process "https://www.mongodb.com/cloud/atlas"

# Open Render
Start-Process "https://render.com"

# Open Render Dashboard (after signing in)
Start-Process "https://dashboard.render.com"
```

## Environment Variables Needed

Save these for reference:

```
From MongoDB Atlas:
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/chat_app?retryWrites=true&w=majority

For JWT (generate a random string):
JWT_SECRET=mysupersecretkeychangethis123

Render will provide:
BACKEND_URL=https://chat-app-backend.onrender.com
FRONTEND_URL=https://chat-app-frontend.onrender.com

For Render:
PORT=5000
CLIENT_URL=https://chat-app-frontend.onrender.com
NODE_ENV=production
```

## Check Deployment Status

Once deployed, test with these commands:

```powershell
# Test backend is running
Invoke-WebRequest -Uri "https://chat-app-backend.onrender.com/api/health" -ErrorAction SilentlyContinue

# Or just open in browser:
# https://chat-app-backend.onrender.com
# https://chat-app-frontend.onrender.com
```

## Quick Checklist

```
[ ] Created GitHub account
[ ] Created MongoDB Atlas account  
[ ] Created Render.com account
[ ] Initialized git repository locally
[ ] Pushed code to GitHub
[ ] Created MongoDB cluster and got connection string
[ ] Deployed backend on Render
[ ] Set environment variables on Render
[ ] Updated backend URL in frontend/src/chat.js
[ ] Deployed frontend on Render
[ ] Tested on desktop browser
[ ] Tested on mobile phone
[ ] Shared URL with friends
```

---

Run these commands in order and your app will be live!
