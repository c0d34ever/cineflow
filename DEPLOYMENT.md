# CineFlow AI - Production Deployment Guide

This guide will help you deploy CineFlow AI to a production server with MySQL database.

## Prerequisites

- Docker and Docker Compose installed on your server
- A Gemini API key from Google
- Basic knowledge of Linux server administration

## Quick Start with Docker Compose

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd cineflow-ai

# Copy environment file
cp .env.example .env

# Edit .env file with your configuration
nano .env
```

### 2. Configure Environment Variables

Edit the `.env` file with your settings:

```env
# Frontend Environment Variables
VITE_API_URL=http://your-domain.com/api

# Backend Environment Variables
NODE_ENV=production
PORT=5000

# Database Configuration
DB_HOST=mysql
DB_PORT=3306
DB_USER=cineflow
DB_PASSWORD=your_secure_password
DB_NAME=cineflow
DB_ROOT_PASSWORD=your_secure_root_password

# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Build and Start Services

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 4. Verify Deployment

- Frontend: http://your-domain.com (or http://localhost if testing locally)
- Backend API: http://your-domain.com/api/projects
- Health Check: http://your-domain.com/health

## Manual Deployment (Without Docker)

### 1. Database Setup

```bash
# Install MySQL
sudo apt update
sudo apt install mysql-server

# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

```sql
CREATE DATABASE cineflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cineflow'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON cineflow.* TO 'cineflow'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Backend Setup

```bash
# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Navigate to project directory
cd /path/to/cineflow-ai

# Install dependencies
npm install

# Build backend
npm run build:server

# Set environment variables
export NODE_ENV=production
export PORT=5000
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=cineflow
export DB_PASSWORD=your_secure_password
export DB_NAME=cineflow
export GEMINI_API_KEY=your_gemini_api_key

# Start backend server
npm run start:server
```

### 3. Frontend Setup

```bash
# Build frontend
npm run build

# Install nginx (if not already installed)
sudo apt install nginx

# Copy built files to nginx directory
sudo cp -r dist/* /var/www/html/

# Configure nginx (see nginx.conf for reference)
sudo nano /etc/nginx/sites-available/cineflow
```

Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

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
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/cineflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Setup Process Manager (PM2)

```bash
# Install PM2
sudo npm install -g pm2

# Start backend with PM2
pm2 start server/dist/index.js --name cineflow-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## Production Considerations

### Security

1. **Use HTTPS**: Set up SSL certificates (Let's Encrypt recommended)
2. **Firewall**: Configure firewall to only allow necessary ports
3. **Database Security**: Use strong passwords and limit database access
4. **Environment Variables**: Never commit `.env` files to version control
5. **API Keys**: Rotate API keys regularly

### Performance

1. **Database Indexing**: Already configured in schema
2. **Connection Pooling**: Configured in database connection
3. **Caching**: Consider adding Redis for session management
4. **CDN**: Use CDN for static assets in production

### Monitoring

1. **Logs**: Monitor application logs regularly
2. **Database**: Monitor database performance and size
3. **Uptime**: Use monitoring services (UptimeRobot, Pingdom, etc.)
4. **Error Tracking**: Consider adding error tracking (Sentry, etc.)

### Backup

```bash
# Database backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u cineflow -p cineflow > backup_$DATE.sql

# Restore from backup
mysql -u cineflow -p cineflow < backup_YYYYMMDD_HHMMSS.sql
```

## Troubleshooting

### Database Connection Issues

```bash
# Check MySQL status
sudo systemctl status mysql

# Check database connection
mysql -u cineflow -p -h localhost cineflow

# View backend logs
docker-compose logs backend
# or
pm2 logs cineflow-backend
```

### Port Conflicts

```bash
# Check if port is in use
sudo netstat -tulpn | grep :5000
sudo netstat -tulpn | grep :3306

# Change ports in docker-compose.yml or .env if needed
```

### Build Issues

```bash
# Clean build
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d

# For manual deployment
rm -rf node_modules dist server/dist
npm install
npm run build:all
```

## Updating the Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Or for manual deployment
npm install
npm run build:all
pm2 restart cineflow-backend
sudo systemctl reload nginx
```

## Support

For issues or questions, please check:
- Application logs: `docker-compose logs` or `pm2 logs`
- Database logs: `sudo tail -f /var/log/mysql/error.log`
- Nginx logs: `sudo tail -f /var/log/nginx/error.log`

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Frontend API endpoint | `http://localhost:5000/api` |
| `PORT` | Backend server port | `5000` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL username | `cineflow` |
| `DB_PASSWORD` | MySQL password | - |
| `DB_NAME` | Database name | `cineflow` |
| `GEMINI_API_KEY` | Google Gemini API key | - |

