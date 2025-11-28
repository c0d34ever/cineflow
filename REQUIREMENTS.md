# Simple Requirements Guide

## 🔑 API Key: Required for AI Features

### **Short Answer: YES, you need a Gemini API key for AI features**

**What needs API key:**
- ✨ Auto-generate story (Magic Auto-Creator)
- 🎬 Auto-suggest next scene
- 🎥 Auto-suggest director settings
- 📝 AI-enhanced scene prompts

**What works WITHOUT API key:**
- ✅ Create projects manually
- ✅ Save/load projects
- ✅ Edit scenes manually
- ✅ All basic CRUD operations

**How to get API key (FREE):**
1. Visit: https://aistudio.google.com/
2. Sign in with Google
3. Click "Get API Key"
4. Copy the key
5. Add to `.env`: `GEMINI_API_KEY=your_key_here`

---

## 🖥️ Backend: Required for Production

### **Short Answer: YES, you need the backend server running**

**The backend is NOT a separate microservice** - it's part of this application.

**What the backend does:**
1. Saves projects to MySQL database
2. Calls Gemini AI (keeps API key secure)
3. Provides REST API for frontend

**Deployment:**
- ✅ **Easiest**: Use `docker-compose` (deploys everything together)
- ✅ **Same server**: Frontend + Backend on same machine
- ✅ **Different servers**: Can deploy separately if needed

**Architecture:**
```
Browser (Frontend) 
    ↓ HTTP requests
Server (Backend) ← You need this running
    ↓ SQL queries  
MySQL Database ← Your remote database
```

---

## 📋 What You Need

### **Minimum Requirements:**
1. ✅ **MySQL Database** - You have this (162.241.86.188)
2. ✅ **Backend Server** - Part of this app (needs to run)
3. ⚠️ **Gemini API Key** - Required for AI features (free to get)

### **Deployment:**
```bash
# One command deploys everything:
docker-compose up -d --build
```

This runs:
- Frontend (port 80)
- Backend (port 5000) 
- Connects to your MySQL database

---

## ❓ Common Questions

**Q: Can I skip the backend?**
A: Only for local testing. For production, you need it for database and secure AI.

**Q: Is backend a separate service?**
A: No, it's part of this app. Deploy together with `docker-compose`.

**Q: Can I use without API key?**
A: Yes, but AI features won't work. Basic features still work.

**Q: Do I need to deploy backend separately?**
A: No! `docker-compose` deploys everything together.

---

## 🚀 Quick Start

1. **Get API key** (if you want AI features)
2. **Create `.env` file** with your credentials
3. **Run**: `docker-compose up -d --build`
4. **Done!** Everything runs together

**That's it!** No separate microservice deployment needed.

