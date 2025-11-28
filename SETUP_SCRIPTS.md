# Setup Scripts Documentation

## 📋 Available Scripts

### Linux/Ubuntu

#### 1. `setup-linux.sh` - Complete Setup
Sets up everything needed to run the application:
- Checks and installs Node.js 20 if needed
- Installs all dependencies
- Creates .env file from template
- Builds backend and frontend
- Sets up PM2 process manager
- Creates ecosystem configuration

**Usage:**
```bash
chmod +x setup-linux.sh
./setup-linux.sh
```

#### 2. `start-services.sh` - Start Services
Starts both main API and admin API using PM2.

**Usage:**
```bash
chmod +x start-services.sh
./start-services.sh
```

#### 3. `stop-services.sh` - Stop Services
Stops all running services.

**Usage:**
```bash
chmod +x stop-services.sh
./stop-services.sh
```

### Windows

#### 1. `setup-windows.ps1` - Complete Setup
PowerShell script that sets up everything:
- Checks Node.js installation
- Installs all dependencies
- Creates .env file from template
- Builds backend and frontend
- Sets up PM2 process manager
- Creates batch files for easy management

**Usage:**
```powershell
# Run PowerShell as Administrator (recommended)
.\setup-windows.ps1
```

#### 2. `start-services.bat` - Start Services
Batch file to start all services.

**Usage:**
```cmd
start-services.bat
```

#### 3. `stop-services.bat` - Stop Services
Batch file to stop all services.

**Usage:**
```cmd
stop-services.bat
```

## 🚀 Quick Start

### Linux/Ubuntu

```bash
# 1. Make scripts executable
chmod +x setup-linux.sh start-services.sh stop-services.sh

# 2. Run setup
./setup-linux.sh

# 3. Edit configuration
nano server/.env
# Add your GEMINI_API_KEY and update JWT_SECRET

# 4. Start services
./start-services.sh
```

### Windows

```powershell
# 1. Run setup (PowerShell as Administrator)
.\setup-windows.ps1

# 2. Edit configuration
notepad server\.env
# Add your GEMINI_API_KEY and update JWT_SECRET

# 3. Start services
.\start-services.bat
```

## 📝 What the Scripts Do

### Setup Scripts

1. **Check Prerequisites**
   - Node.js 20+ installation
   - npm availability
   - MySQL client (Linux only)

2. **Install Dependencies**
   - Root package.json dependencies
   - Backend server dependencies

3. **Configuration**
   - Create .env from template
   - Set up PM2 ecosystem config
   - Create logs directory

4. **Build**
   - Build backend TypeScript
   - Build frontend React app

5. **PM2 Setup**
   - Install PM2 globally (if needed)
   - Create ecosystem configuration
   - Set up process management

### Start Scripts

1. **Validation**
   - Check PM2 installation
   - Verify configuration files
   - Check .env file

2. **Start Services**
   - Start main API (port 5000)
   - Start admin API (port 5001)
   - Save PM2 configuration

## 🔧 Manual Setup (Alternative)

If you prefer manual setup:

### Linux
```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Create .env
cp server/env.example server/.env
nano server/.env  # Edit with your values

# Build
cd server && npm run build && cd ..
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
```

### Windows
```cmd
REM Install dependencies
npm install
cd server && npm install && cd ..

REM Create .env
copy server\env.example server\.env
notepad server\.env  REM Edit with your values

REM Build
cd server && npm run build && cd ..
npm run build

REM Start with PM2
pm2 start ecosystem.config.js
pm2 save
```

## 📊 PM2 Commands

After services are started, you can use:

```bash
# Check status
pm2 status

# View logs
pm2 logs
pm2 logs cineflow-api
pm2 logs cineflow-admin

# Restart services
pm2 restart all
pm2 restart cineflow-api

# Stop services
pm2 stop all

# Monitor
pm2 monit

# Save current process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup
pm2 save
```

## 🔍 Verification

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

Should show:
- `cineflow-api` - running
- `cineflow-admin` - running

## 🆘 Troubleshooting

### Services Won't Start

1. Check .env file exists and is configured
2. Verify database connection
3. Check logs: `pm2 logs`
4. Verify ports 5000 and 5001 are not in use

### PM2 Not Found

```bash
# Linux
sudo npm install -g pm2

# Windows (as Administrator)
npm install -g pm2
```

### Build Errors

1. Check Node.js version: `node -v` (should be 20+)
2. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules server/node_modules
   npm install
   cd server && npm install
   ```

### Permission Errors (Linux)

```bash
# Make scripts executable
chmod +x *.sh

# If PM2 needs sudo
sudo npm install -g pm2
```

## 📚 Next Steps

After setup:

1. **Configure .env**: Add your API keys and secrets
2. **Start services**: Use start scripts
3. **Access application**: 
   - Frontend: http://localhost:3000
   - Main API: http://localhost:5000
   - Admin API: http://localhost:5001
4. **Login**: Use default admin credentials or register new user

## 🔐 Security Notes

- Change default admin password immediately
- Use strong JWT_SECRET (min 32 characters)
- Keep .env file secure (never commit to git)
- Use HTTPS in production
- Regularly update dependencies

