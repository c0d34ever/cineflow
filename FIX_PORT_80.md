# Fix Port 80 Already in Use Error

Port 80 is already in use on your server. Here are solutions:

## Option 1: Find and Stop the Service Using Port 80 (Recommended)

```bash
# Find what's using port 80
sudo lsof -i :80
# or
sudo netstat -tulpn | grep :80

# If it's nginx, stop it:
sudo systemctl stop nginx
sudo systemctl disable nginx  # Prevent it from starting on boot

# Then start docker-compose again
docker-compose up -d
```

## Option 2: Change Docker Port to 8080

Edit `docker-compose.yml` and change port 80 to 8080:

```yaml
frontend:
  ...
  ports:
    - "8080:80"  # Changed from "80:80"
```

Then access your app at `http://your-server-ip:8080`

## Option 3: Use Nginx as Reverse Proxy (Best for Production)

Keep nginx running and configure it to proxy to Docker:

1. **Change docker-compose.yml** to use port 8080 internally:
```yaml
frontend:
  ...
  ports:
    - "8080:80"  # Internal port 8080
```

2. **Configure nginx** to proxy to Docker:
```bash
sudo nano /etc/nginx/sites-available/cineflow
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # or your server IP

    location / {
        proxy_pass http://localhost:8080;
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

3. **Enable and restart nginx**:
```bash
sudo ln -s /etc/nginx/sites-available/cineflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Quick Fix (Easiest)

Just change the port in docker-compose.yml:

```bash
cd /home/alchemist/cineflow
nano docker-compose.yml
```

Change line 59 from:
```yaml
    ports:
      - "80:80"
```

To:
```yaml
    ports:
      - "8080:80"
```

Then:
```bash
docker-compose up -d
```

Access at: `http://your-server-ip:8080`

