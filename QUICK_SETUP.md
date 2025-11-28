# Quick Setup Guide

## 🐧 Linux/Ubuntu Setup

### One-Command Setup
```bash
# Make scripts executable and run setup
chmod +x setup-linux.sh start-services.sh stop-services.sh
./setup-linux.sh
```

### Step-by-Step
```bash
# 1. Make scripts executable
chmod +x setup-linux.sh start-services.sh stop-services.sh

# 2. Run setup script
./setup-linux.sh

# 3. Configure environment
nano server/.env
# Add: GEMINI_API_KEY=your_key_here
# Change: JWT_SECRET=your-secure-secret-here

# 4. Start services
./start-services.sh
```

## 🪟 Windows Setup

### One-Command Setup
```powershell
# Run PowerShell as Administrator
.\setup-windows.ps1
```

### Step-by-Step
```powershell
# 1. Open PowerShell as Administrator
# Right-click PowerShell → Run as Administrator

# 2. Navigate to project directory
cd "C:\Users\ankit\Downloads\cineflow-ai (1)"

# 3. Run setup script
.\setup-windows.ps1

# 4. Configure environment
notepad server\.env
# Add: GEMINI_API_KEY=your_key_here
# Change: JWT_SECRET=your-secure-secret-here

# 5. Start services
.\start-services.bat
```

## ✅ Verification

### Check Services
```bash
# Linux
curl http://localhost:5000/health
curl http://localhost:5001/health

# Windows (PowerShell)
Invoke-WebRequest http://localhost:5000/health
Invoke-WebRequest http://localhost:5001/health
```

### Check PM2 Status
```bash
pm2 status
```

## 📋 What Gets Set Up

- ✅ Node.js 20+ (if not installed)
- ✅ All npm dependencies
- ✅ Backend and frontend builds
- ✅ .env configuration file
- ✅ PM2 process manager
- ✅ Service configuration
- ✅ Log directories

## 🎯 Services Started

- **Main API**: http://localhost:5000
- **Admin API**: http://localhost:5001
- **Frontend**: http://localhost:3000 (run `npm run dev` separately)

## 🔧 Useful Commands

```bash
# View logs
pm2 logs

# Restart services
pm2 restart all

# Stop services
pm2 stop all
# Or use: ./stop-services.sh (Linux) / stop-services.bat (Windows)

# Monitor
pm2 monit
```

## 🆘 Troubleshooting

### Setup Fails
- Check Node.js is installed: `node -v` (should be 20+)
- Check npm: `npm -v`
- Try manual installation: `npm install`

### Services Won't Start
- Check `.env` file exists in `server/` directory
- Verify database connection settings
- Check ports 5000 and 5001 are available
- View logs: `pm2 logs`

### Permission Errors (Linux)
```bash
# Make scripts executable
chmod +x *.sh

# If needed, use sudo for PM2
sudo npm install -g pm2
```

## 📝 Configuration Required

After setup, edit `server/.env`:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your-secure-random-secret-min-32-chars

# Already configured
DB_HOST=162.241.86.188
DB_USER=youtigyk_cineflow
DB_PASSWORD=Sun12day46fun
DB_NAME=youtigyk_cineflow
```

## 🚀 That's It!

Your services are now ready to run. Just:
1. Configure `.env` file
2. Run start script
3. Access the application!

