# Update CORS Configuration

## On Your Server

Update your `.env` file in the root directory (`/home/alchemist/cineflow/.env`):

```bash
cd /home/alchemist/cineflow
nano .env
```

Add or update the `CORS_ORIGIN` line:

```env
CORS_ORIGIN=http://localhost:3000,http://localhost:80,http://209.182.232.185:8081,https://209.182.232.185:8081,http://youtilitybox.com,https://youtilitybox.com,http://www.youtilitybox.com,https://www.youtilitybox.com
```

## Rebuild and Restart

```bash
# Rebuild frontend with new API URL
docker-compose build frontend

# Restart all services
docker-compose down
docker-compose up -d

# Check logs
docker-compose logs backend
docker-compose logs frontend
```

## Access URLs

- **Frontend:** `http://209.182.232.185:8081` or `http://youtilitybox.com:8081`
- **Backend API:** `http://209.182.232.185:5000/api` or via frontend at `/api`
- **Health Check:** `http://209.182.232.185:5000/health`

## Note About API URL

The frontend is now configured to use `/api` which will be proxied by nginx to the backend. This means:
- Frontend requests to `/api/*` → nginx → backend:5000
- No CORS issues since they're on the same domain from the browser's perspective

