# Fix CORS and Domain Configuration

## Issues Fixed

1. ✅ Added `https://cineflow.youtilitybox.com` to CORS
2. ✅ Added admin service to docker-compose
3. ✅ Updated frontend API URLs to use your domain
4. ✅ Fixed nginx to proxy admin API through `/admin-api`
5. ✅ Fixed nginx MIME types for CSS/JS files

## On Your Server - Update .env File

```bash
cd /home/alchemist/cineflow
nano .env
```

Add/update these lines:

```env
# CORS for main backend
CORS_ORIGIN=http://localhost:3000,http://localhost:80,http://209.182.232.185:8081,https://209.182.232.185:8081,http://youtilitybox.com,https://youtilitybox.com,http://www.youtilitybox.com,https://www.youtilitybox.com,https://cineflow.youtilitybox.com,http://cineflow.youtilitybox.com

# CORS for admin service
ADMIN_CORS_ORIGIN=http://localhost:3000,http://localhost:80,http://209.182.232.185:8081,https://209.182.232.185:8081,http://youtilitybox.com,https://youtilitybox.com,http://www.youtilitybox.com,https://www.youtilitybox.com,https://cineflow.youtilitybox.com,http://cineflow.youtilitybox.com

# JWT Secret (generate a secure one)
JWT_SECRET=your-secure-random-string-min-32-chars
JWT_EXPIRES_IN=24h
```

## Rebuild and Restart

```bash
# Rebuild everything (frontend needs new API URLs)
docker-compose build

# Stop and restart
docker-compose down
docker-compose up -d

# Check all services are running
docker-compose ps

# Check logs
docker-compose logs backend
docker-compose logs admin
docker-compose logs frontend
```

## Verify

1. **Backend health:** `curl http://localhost:5000/health`
2. **Admin health:** `curl http://localhost:5001/health`
3. **Frontend:** Open `https://cineflow.youtilitybox.com:8081` in browser
4. **API via nginx:** `curl https://cineflow.youtilitybox.com:8081/api/projects`
5. **Admin API via nginx:** `curl https://cineflow.youtilitybox.com:8081/admin-api/auth/login`

## What Changed

1. **docker-compose.yml:**
   - Added `admin` service
   - Updated frontend build args to use your domain
   - Added CORS_ORIGIN environment variables

2. **nginx.conf:**
   - Added `/admin-api` proxy to admin service
   - Fixed static file serving with proper MIME types

3. **server/env.example:**
   - Updated CORS origins to include your domains

## Access URLs

- **Frontend:** `https://cineflow.youtilitybox.com:8081`
- **Main API:** `https://cineflow.youtilitybox.com:8081/api` (via nginx proxy)
- **Admin API:** `https://cineflow.youtilitybox.com:8081/admin-api` (via nginx proxy)
- **Direct Backend:** `http://209.182.232.185:5000`
- **Direct Admin:** `http://209.182.232.185:5001`

