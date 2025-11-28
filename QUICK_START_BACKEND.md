# Quick Start - Backend Microservice

## 🚀 Deploy Backend in 3 Steps

### Step 1: Setup
```bash
cd server
cp .env.example .env
nano .env  # Add your GEMINI_API_KEY
```

### Step 2: Install & Build
```bash
npm install
npm run build
```

### Step 3: Start
```bash
npm start
```

**That's it!** Backend is running on `http://localhost:5000`

---

## 🐳 Or Use Docker (Even Easier)

```bash
cd server
cp .env.example .env
nano .env  # Add your GEMINI_API_KEY
docker-compose up -d --build
```

---

## ✅ Verify It's Working

```bash
# Health check
curl http://localhost:5000/health

# Should return:
# {"status":"ok","timestamp":"...","uptime":...,"environment":"production"}
```

---

## 📋 What You Need

1. **Gemini API Key** - Get from https://aistudio.google.com/
2. **Database** - Already configured (your remote MySQL)
3. **Node.js 20+** - For direct deployment
4. **Docker** - Optional, for containerized deployment

---

## 🔧 Configuration

Edit `server/.env`:

```env
# Required
GEMINI_API_KEY=your_key_here
DB_HOST=162.241.86.188
DB_USER=youtigyk_cineflow
DB_PASSWORD=Sun12day46fun
DB_NAME=youtigyk_cineflow

# Optional
PORT=5000
CORS_ORIGIN=http://localhost:3000
```

---

## 📚 More Info

- Full deployment guide: `BACKEND_DEPLOYMENT.md`
- Server README: `server/README.md`
- API documentation: `server/README.md`

