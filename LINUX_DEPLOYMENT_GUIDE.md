# 🚀 CineFlow AI - Complete Linux Server Deployment Guide

This is a comprehensive step-by-step guide to deploy CineFlow AI on your Linux server.

## 📋 Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- SSH access to your server
- Domain name (optional, but recommended)
- Gemini API key from [Google AI Studio](https://aistudio.google.com/)

## 🎯 Quick Overview

Your deployment will include:
- **Backend API** (Node.js/Express) - Port 5000
- **Frontend** (React/Vite) - Port 80
- **Remote MySQL Database** - Already configured at `162.241.86.188`

---

## Method 1: Docker Deployment (Recommended) 🐳

### Step 1: Connect to Your Server

```bash
ssh user@your-server-ip
```

### Step 2: Update System and Install Dependencies

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y git curl wget

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (to run docker without sudo)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for docker group to take effect
# Or run: newgrp docker
```

### Step 3: Clone the Repository

```bash
# Navigate to your desired directory (e.g., /var/www or /home/user)
cd /var/www  # or your preferred location

# Clone your repository
git clone <your-repo-url> cineflow-ai
cd cineflow-ai

# If you don't have git repo, you can upload files via SCP or SFTP
```

### Step 4: Configure Environment Variables

```bash
# Navigate to server directory
cd server

# Create .env file from template
cp env.example .env

# Edit .env file
nano .env
```

**Edit the `.env` file with these values:**

```env
# Server Configuration
NODE_ENV=production
PORT=5000

# Database Configuration (Your Production Database)
DB_HOST=162.241.86.188
DB_PORT=3306
DB_USER=youtigyk_cineflow
DB_PASSWORD=Sun12day46fun
DB_NAME=youtigyk_cineflow

# Gemini API Key (REQUIRED - Get from https://aistudio.google.com/)
GEMINI_API_KEY=your_actual_gemini_api_key_here

# CORS Configuration (Update with your domain)
CORS_ORIGIN=http://your-domain.com,https://your-domain.com

# JWT Configuration (Generate a secure random string)
JWT_SECRET=your-secret-key-change-this-min-32-chars-long-and-random
JWT_EXPIRES_IN=24h

# Admin Microservice Configuration
ADMIN_PORT=5001
ADMIN_CORS_ORIGIN=http://your-domain.com,https://your-domain.com

# Default Admin User
ADMIN_EMAIL=admin@cineflow.ai
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Database Seeding
SEED_DATABASE=true
```

**Important:** 
- Replace `your_actual_gemini_api_key_here` with your real Gemini API key
- Replace `your-domain.com` with your actual domain
- Generate a secure JWT_SECRET (you can use: `openssl rand -base64 32`)

### Step 5: Configure Frontend Environment

```bash
# Go back to root directory
cd ..

# Create .env file for frontend (if needed)
# The frontend will use the API URL from docker-compose
```

### Step 6: Build and Start with Docker Compose

```bash
# Build and start all services
docker-compose up -d --build

# View logs to check if everything is working
docker-compose logs -f
```

**Wait for the logs to show:**
- ✅ Database connected and initialized
- ✅ Server running on port 5000
- Frontend nginx started

Press `Ctrl+C` to exit logs view.

### Step 7: Verify Deployment

```bash
# Check if containers are running
docker-compose ps

# Test backend health
curl http://localhost:5000/health

# Test from your local machine (replace with your server IP)
curl http://your-server-ip:5000/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "environment": "production"
}
```

### Step 8: Configure Firewall (if needed)

```bash
# Allow HTTP, HTTPS, and backend port
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp
sudo ufw enable
```

### Step 9: Access Your Application

- **Frontend:** `http://your-server-ip` or `http://your-domain.com`
- **Backend API:** `http://your-server-ip:5000` or `http://your-domain.com:5000`
- **Health Check:** `http://your-server-ip:5000/health`

---

## Method 2: Manual Deployment (Without Docker) 📦

### Step 1: Install Node.js

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node -v  # Should show v20.x.x
npm -v
```

### Step 2: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### Step 3: Clone and Setup Project

```bash
# Clone repository
cd /var/www  # or your preferred location
git clone <your-repo-url> cineflow-ai
cd cineflow-ai

# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
```

### Step 4: Configure Environment

```bash
# Create .env file
cp env.example .env
nano .env
```

**Use the same .env configuration as in Method 1 (Step 4)**

### Step 5: Build the Application

```bash
# Build backend
cd server
npm run build

# Build frontend
cd ..
npm run build
```

### Step 6: Install and Configure Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/cineflow
```

**Add this configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or use _ for all

    # Frontend - serve static files
    root /var/www/cineflow-ai/dist;
    index index.html;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/cineflow /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 7: Start Backend with PM2

```bash
# Navigate to project root
cd /var/www/cineflow-ai

# Start backend
cd server
pm2 start dist/index.js --name cineflow-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions it provides (usually run a sudo command)
```

### Step 8: Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check backend logs
pm2 logs cineflow-backend

# Test health endpoint
curl http://localhost:5000/health

# Test from browser
# http://your-server-ip or http://your-domain.com
```

---

## 🔒 Setting Up SSL/HTTPS (Optional but Recommended)

### Using Let's Encrypt (Free SSL)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Follow the prompts and Certbot will configure Nginx automatically

# Test auto-renewal
sudo certbot renew --dry-run
```

After SSL setup, update your `.env` file:
```env
CORS_ORIGIN=https://your-domain.com
```

---

## 📊 Monitoring and Management

### Docker Method

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Check resource usage
docker stats

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Update and rebuild
git pull
docker-compose up -d --build
```

### PM2 Method

```bash
# View logs
pm2 logs cineflow-backend

# Monitor
pm2 monit

# Restart
pm2 restart cineflow-backend

# Stop
pm2 stop cineflow-backend

# Update
git pull
cd server
npm run build
pm2 restart cineflow-backend
```

---

## 🔧 Troubleshooting

### Backend Not Starting

```bash
# Check logs
docker-compose logs backend
# or
pm2 logs cineflow-backend

# Common issues:
# 1. Missing GEMINI_API_KEY - Check .env file
# 2. Database connection failed - Verify DB credentials
# 3. Port 5000 already in use - Check: sudo lsof -i :5000
```

### Database Connection Issues

```bash
# Test database connection
mysql -h 162.241.86.188 -u youtigyk_cineflow -p youtigyk_cineflow
# Enter password: Sun12day46fun

# If connection fails:
# - Check firewall rules
# - Verify database server is accessible
# - Check database user permissions
```

### Frontend Not Loading

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Verify frontend files exist
ls -la /var/www/cineflow-ai/dist

# For Docker
docker-compose logs frontend
```

### Port Already in Use

```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill the process
sudo kill -9 <PID>

# Or change port in .env file
```

---

## 🔄 Updating the Application

### Docker Method

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Or update specific service
docker-compose up -d --build backend
```

### PM2 Method

```bash
# Pull latest changes
git pull origin main

# Rebuild
cd server
npm install
npm run build

# Rebuild frontend
cd ..
npm install
npm run build

# Copy new frontend files
sudo cp -r dist/* /var/www/cineflow-ai/dist/

# Restart backend
pm2 restart cineflow-backend

# Reload Nginx
sudo systemctl reload nginx
```

---

## 📝 Important Notes

1. **Security:**
   - Never commit `.env` files to git
   - Use strong passwords and JWT secrets
   - Enable firewall (UFW)
   - Use HTTPS in production

2. **Database:**
   - Your database is remote at `162.241.86.188`
   - Make sure your server can reach this IP
   - Database credentials are already configured

3. **API Keys:**
   - Gemini API key is required for AI features
   - Keep it secure and never expose it

4. **Backups:**
   - Consider setting up database backups
   - Backup your `.env` file securely

---

## ✅ Deployment Checklist

- [ ] Server updated and dependencies installed
- [ ] Repository cloned
- [ ] `.env` file configured with:
  - [ ] Gemini API key
  - [ ] Database credentials
  - [ ] JWT secret
  - [ ] CORS origins
- [ ] Application built successfully
- [ ] Backend running and accessible
- [ ] Frontend served correctly
- [ ] Health check endpoint working
- [ ] SSL certificate installed (optional)
- [ ] Firewall configured
- [ ] Monitoring set up
- [ ] Backup strategy in place

---

## 🆘 Getting Help

If you encounter issues:

1. Check application logs
2. Verify environment variables
3. Test database connection
4. Check firewall rules
5. Review error messages in logs

---

## 🎉 Success!

Once deployed, you can:
- Access your application at `http://your-domain.com`
- Use the admin panel at `http://your-domain.com` (login with admin credentials)
- API is available at `http://your-domain.com/api`
- Health check at `http://your-domain.com/health`

Enjoy your CineFlow AI deployment! 🚀

