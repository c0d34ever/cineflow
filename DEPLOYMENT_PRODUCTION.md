# Production Deployment Guide - Your Server Setup

This guide is specifically tailored for your production server with the remote MySQL database.

## Your Database Credentials

- **Host**: 162.241.86.188
- **Database**: youtigyk_cineflow
- **User**: youtigyk_cineflow
- **Password**: Sun12day46fun
- **Port**: 3306

## Quick Deployment Steps

### 1. Prepare Your Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for docker group to take effect
```

### 2. Clone and Setup Project

```bash
# Clone your repository
git clone <your-repo-url>
cd cineflow-ai

# Create .env file
cat > .env << EOF
# Frontend
VITE_API_URL=http://your-domain.com/api

# Backend
NODE_ENV=production
PORT=5000

# Database (Your Production Database)
DB_HOST=162.241.86.188
DB_PORT=3306
DB_USER=youtigyk_cineflow
DB_PASSWORD=Sun12day46fun
DB_NAME=youtigyk_cineflow

# Gemini API Key (REQUIRED)
GEMINI_API_KEY=your_actual_gemini_api_key_here
EOF

# Edit .env and add your actual GEMINI_API_KEY
nano .env
```

### 3. Deploy with Docker Compose

```bash
# Build and start services
docker-compose up -d --build

# Check logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 4. Verify Deployment

```bash
# Check backend health
curl http://localhost:5000/health

# Check if database connection works
docker-compose logs backend | grep "Database connected"

# Test API endpoint
curl http://localhost:5000/api/projects
```

### 5. Configure Nginx (If using domain)

If you want to use a domain name instead of IP:

```bash
# Install Nginx
sudo apt install nginx

# Create site configuration
sudo nano /etc/nginx/sites-available/cineflow
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
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

## Important Notes

### Gemini API Service

✅ **YES, the Gemini service WILL work on your server!**

The Gemini API calls are now handled by the backend server, which means:
- Your API key is kept secure (never exposed to frontend)
- All AI requests go through your backend
- Works perfectly on any server with internet access
- No CORS issues

### Database Connection

Your database is remote, so make sure:
- Your server can reach `162.241.86.188:3306`
- Firewall allows outbound connections to port 3306
- Database user has proper permissions

### Security Checklist

- [ ] Change default passwords
- [ ] Use HTTPS (Let's Encrypt SSL)
- [ ] Keep `.env` file secure (never commit to git)
- [ ] Regularly update dependencies
- [ ] Monitor logs for errors
- [ ] Set up firewall rules

## Troubleshooting

### Database Connection Failed

```bash
# Test database connection from server
mysql -h 162.241.86.188 -u youtigyk_cineflow -p youtigyk_cineflow
# Enter password: Sun12day46fun

# If connection fails, check:
# 1. Firewall rules on database server
# 2. Database user permissions
# 3. Network connectivity
```

### Backend Not Starting

```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Missing GEMINI_API_KEY in .env
# - Database connection timeout
# - Port 5000 already in use
```

### Frontend Not Loading

```bash
# Check if frontend container is running
docker-compose ps

# Check nginx logs
docker-compose logs frontend

# Rebuild if needed
docker-compose up -d --build frontend
```

## Updating the Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Or update specific service
docker-compose up -d --build backend
```

## Monitoring

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Check resource usage
docker stats

# Check database connection pool
docker-compose exec backend node -e "console.log('Backend running')"
```

## Backup Strategy

Since you're using a remote database, backups should be handled by your database provider. However, you can also:

```bash
# Export projects data
curl http://localhost:5000/api/projects > backup_$(date +%Y%m%d).json
```

## Support

If you encounter issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables: `docker-compose exec backend env | grep DB`
3. Test database connection manually
4. Check firewall and network settings

