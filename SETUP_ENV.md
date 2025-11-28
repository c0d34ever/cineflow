# Environment Setup Guide

## 🔧 Backend .env File Setup

### Step 1: Create .env File

```bash
cd server
cp env.example .env
```

### Step 2: Edit .env File

Open `server/.env` and update these values:

```env
# Required - Get from https://aistudio.google.com/
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Required - Change to a secure random string (min 32 characters)
JWT_SECRET=your-super-secret-key-change-this-in-production-min-32-chars-long

# Database (Already configured with your credentials)
DB_HOST=162.241.86.188
DB_USER=youtigyk_cineflow
DB_PASSWORD=Sun12day46fun
DB_NAME=youtigyk_cineflow

# Optional - Update if your frontend runs on different port
CORS_ORIGIN=http://localhost:3000,http://localhost:80
ADMIN_CORS_ORIGIN=http://localhost:3000,http://localhost:80
```

### Step 3: Generate JWT Secret

You can generate a secure JWT secret:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use online generator
# https://randomkeygen.com/
```

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd server

# Create .env file
cp env.example .env
# Edit .env with your GEMINI_API_KEY and JWT_SECRET

# Install dependencies
npm install

# Build
npm run build

# Start main API
npm start  # Runs on port 5000

# In another terminal, start admin API
npm run start:admin  # Runs on port 5001
```

### 2. Frontend Setup

```bash
# In project root
npm install
npm run dev  # Runs on port 3000
```

## ✅ Verification

### Check Backend Health

```bash
# Main API
curl http://localhost:5000/health

# Admin API
curl http://localhost:5001/health
```

### Test Authentication

1. Open http://localhost:3000
2. You should see login screen
3. Register a new user or login with admin:
   - Username: `admin`
   - Password: `admin123`

## 🔐 Default Admin Account

After database seeding:
- **Username**: `admin`
- **Email**: `admin@cineflow.ai`
- **Password**: `admin123`

⚠️ **Change password immediately after first login!**

## 📋 Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | Yes | - |
| `JWT_SECRET` | Secret for JWT tokens | Yes | - |
| `DB_HOST` | MySQL host | Yes | - |
| `DB_USER` | MySQL username | Yes | - |
| `DB_PASSWORD` | MySQL password | Yes | - |
| `DB_NAME` | Database name | Yes | - |
| `PORT` | Main API port | No | 5000 |
| `ADMIN_PORT` | Admin API port | No | 5001 |
| `CORS_ORIGIN` | Allowed origins | No | * |
| `SEED_DATABASE` | Auto-seed on startup | No | true |

## 🆘 Troubleshooting

### Backend won't start
- Check `.env` file exists in `server/` directory
- Verify all required variables are set
- Check database connection

### Authentication fails
- Verify `JWT_SECRET` is set
- Check admin API is running on port 5001
- Verify database has users table

### CORS errors
- Update `CORS_ORIGIN` in `.env` with your frontend URL
- Restart backend after changing `.env`

