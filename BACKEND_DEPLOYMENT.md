# Backend Microservice Deployment Guide

## 🚀 Standalone Backend Deployment

The backend can be deployed independently as a microservice.

## Quick Start

### Option 1: Docker (Recommended)

```bash
cd server

# Create .env file
cp .env.example .env
nano .env  # Add your GEMINI_API_KEY

# Build and run
docker-compose up -d --build

# Check logs
docker-compose logs -f
```

### Option 2: Direct Node.js

```bash
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env
nano .env  # Add your configuration

# Build
npm run build

# Start
npm start
```

### Option 3: PM2 (Production)

```bash
cd server

# Install dependencies
npm install

# Build
npm run build

# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name cineflow-backend

# Save configuration
pm2 save

# Setup auto-start on boot
pm2 startup
```

## Environment Variables

Create `.env` file in `server/` directory:

```env
NODE_ENV=production
PORT=5000

# Database (Your Production Database)
DB_HOST=162.241.86.188
DB_PORT=3306
DB_USER=youtigyk_cineflow
DB_PASSWORD=Sun12day46fun
DB_NAME=youtigyk_cineflow

# Gemini API Key (Required)
GEMINI_API_KEY=your_gemini_api_key_here

# CORS (Optional - allow frontend domains)
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
```

## API Endpoints

### Health Check
```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "environment": "production"
}
```

### Projects API
```bash
GET    /api/projects          # Get all projects
GET    /api/projects/:id      # Get single project
POST   /api/projects          # Create/update project
DELETE /api/projects/:id      # Delete project
```

### Gemini AI API
```bash
POST /api/gemini/generate-story
POST /api/gemini/suggest-next-scene
POST /api/gemini/suggest-director-settings
POST /api/gemini/enhance-scene-prompt
```

## Testing

### Health Check
```bash
curl http://localhost:5000/health
```

### Get Projects
```bash
curl http://localhost:5000/api/projects
```

### Test Gemini API
```bash
curl -X POST http://localhost:5000/api/gemini/generate-story \
  -H "Content-Type: application/json" \
  -d '{"seed": "A cyberpunk detective story"}'
```

## Docker Commands

### Build Image
```bash
docker build -t cineflow-backend -f server/Dockerfile server/
```

### Run Container
```bash
docker run -d \
  --name cineflow-backend \
  -p 5000:5000 \
  --env-file server/.env \
  cineflow-backend
```

### View Logs
```bash
docker logs -f cineflow-backend
```

### Stop Container
```bash
docker stop cineflow-backend
docker rm cineflow-backend
```

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ORIGIN` with your frontend domain
- [ ] Set strong database password
- [ ] Keep `GEMINI_API_KEY` secure (never commit to git)
- [ ] Enable HTTPS (use reverse proxy like Nginx)
- [ ] Set up monitoring/logging
- [ ] Configure firewall rules
- [ ] Set up process manager (PM2/systemd)
- [ ] Enable auto-restart on failure

## Reverse Proxy (Nginx)

If deploying behind Nginx:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
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

## Monitoring

### PM2 Monitoring
```bash
pm2 monit
pm2 logs cineflow-backend
pm2 status
```

### Docker Monitoring
```bash
docker stats cineflow-backend
docker logs -f cineflow-backend
```

## Troubleshooting

### Port Already in Use
```bash
# Find process
lsof -i :5000

# Kill process
kill -9 <PID>
```

### Database Connection Failed
- Check database credentials
- Verify database server is accessible
- Check firewall rules
- Test connection: `mysql -h 162.241.86.188 -u youtigyk_cineflow -p`

### Gemini API Errors
- Verify API key is correct
- Check API quota/limits
- Review error logs

## Update Backend

```bash
# Pull latest code
git pull

# Rebuild
npm run build

# Restart
pm2 restart cineflow-backend
# or
docker-compose restart
```

