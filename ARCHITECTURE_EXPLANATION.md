# Architecture & Requirements Explanation

## 🔑 API Key Requirement

### **YES, API Key is REQUIRED for AI Features**

The Gemini API key is **required** for these AI-powered features:
- ✨ Auto-generate story concepts
- 🎬 Auto-suggest next scene ideas
- 🎥 Auto-suggest director settings
- 📝 Enhance scene prompts with AI

### **What Works WITHOUT API Key:**

✅ **Basic CRUD Operations** (No API key needed):
- Create projects manually
- Save/load projects from database
- Edit scenes manually
- Delete projects
- Export/import JSON files

❌ **What WON'T Work Without API Key:**
- "Magic Auto-Creator" button (story generation)
- "Auto-Write Idea" button (scene suggestions)
- "Auto-Suggest Settings" button (director settings)
- Automatic scene enhancement

### **How to Get API Key:**

1. Go to https://aistudio.google.com/
2. Sign in with Google account
3. Click "Get API Key"
4. Create a new API key
5. Add it to `.env` file: `GEMINI_API_KEY=your_key_here`

**Note**: The API key is FREE to get, but Google may have usage limits/quotas.

---

## 🏗️ Backend Architecture

### **YES, Backend Server is REQUIRED**

The application has a **3-tier architecture**:

```
┌─────────────┐
│  Frontend   │  React app (runs in browser)
│  (Browser)  │
└──────┬──────┘
       │ HTTP Requests
       ▼
┌─────────────┐
│   Backend   │  Express.js server (runs on your server)
│   (Node.js) │  - Handles API requests
│             │  - Calls Gemini AI
│             │  - Manages database
└──────┬──────┘
       │ SQL Queries
       ▼
┌─────────────┐
│   MySQL     │  Database (your remote server)
│  Database   │  162.241.86.188
└─────────────┘
```

### **What the Backend Does:**

1. **API Endpoints**: Provides REST API for frontend
2. **Database Operations**: Saves/loads projects from MySQL
3. **AI Service**: Calls Gemini API (keeps API key secure)
4. **Business Logic**: Handles data processing

### **Is it a "Separate Microservice"?**

**Technically YES, but practically NO** - It's part of the same application:

- ✅ **Same Codebase**: Backend code is in `server/` folder
- ✅ **Same Deployment**: Deployed together with `docker-compose`
- ✅ **Same Repository**: All code in one repo
- ❌ **NOT Separate**: Not a completely independent service

**Think of it as**: A backend server that's part of your application, not a separate microservice you need to deploy independently.

---

## 📦 Deployment Options

### **Option 1: Full Stack (Recommended)**

Deploy everything together with Docker Compose:

```bash
docker-compose up -d --build
```

This runs:
- Frontend (Nginx) on port 80
- Backend (Node.js) on port 5000
- Uses your remote MySQL database

**One command, everything runs!**

### **Option 2: Backend Only (If you have separate frontend hosting)**

If you're hosting frontend elsewhere (like Vercel, Netlify):

1. Deploy backend only:
```bash
cd server
npm install
npm run build:server
npm start
```

2. Update frontend `.env`:
```env
VITE_API_URL=https://your-backend-domain.com/api
```

### **Option 3: Manual Deployment**

Deploy backend and frontend separately on same server:

```bash
# Backend
cd server
npm install
npm run build:server
pm2 start server/dist/index.js

# Frontend
npm install
npm run build
# Copy dist/ to nginx/html/
```

---

## 🤔 Can You Skip the Backend?

### **Partially YES, but with limitations:**

**Without Backend:**
- ✅ App works with IndexedDB (browser storage)
- ✅ All features work locally
- ❌ No database persistence across devices
- ❌ No AI features (Gemini API key exposed in frontend = security risk)
- ❌ No data sharing between users

**With Backend:**
- ✅ Database persistence
- ✅ Secure API key handling
- ✅ AI features work properly
- ✅ Can scale to multiple users
- ✅ Production-ready

---

## 💡 Recommendation

**For Production**: Use the full stack (Frontend + Backend + Database)

**For Development/Testing**: You can run frontend only with IndexedDB, but AI features won't work securely.

---

## 🚀 Quick Start Summary

1. **Get Gemini API Key** (free from Google)
2. **Deploy Backend** (required for database & AI)
3. **Deploy Frontend** (can be same server or separate)
4. **Configure Database** (already done - your remote MySQL)

**All in one command:**
```bash
docker-compose up -d --build
```

---

## ❓ FAQ

**Q: Can I use this without a backend?**
A: Yes, but only with IndexedDB (local browser storage). No database persistence, no secure AI features.

**Q: Is the backend a separate service I need to deploy?**
A: It's part of the same application. Deploy together with `docker-compose` or separately if needed.

**Q: Do I need the API key?**
A: Required for AI features. Without it, you can still create projects manually, but AI features won't work.

**Q: Can I deploy frontend and backend on different servers?**
A: Yes! Just update `VITE_API_URL` in frontend to point to your backend server.

