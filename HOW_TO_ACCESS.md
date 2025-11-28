# How to Access Your CineFlow AI Application

## Find Your Server IP Address

```bash
# Method 1: Check your server's public IP
curl ifconfig.me
# or
curl ipinfo.io/ip

# Method 2: Check local IP
hostname -I

# Method 3: Check from your local machine (if you know the hostname)
ping your-server-hostname
```

## Access URLs

### If Using Default Ports (Port 80)

- **Frontend (Web UI):** `http://YOUR_SERVER_IP`
- **Backend API:** `http://YOUR_SERVER_IP:5000`
- **Health Check:** `http://YOUR_SERVER_IP:5000/health`

### If You Changed Port to 8080

- **Frontend (Web UI):** `http://YOUR_SERVER_IP:8080`
- **Backend API:** `http://YOUR_SERVER_IP:5000`
- **Health Check:** `http://YOUR_SERVER_IP:5000/health`

## Check What's Running

```bash
# Check Docker containers
docker-compose ps

# Check what ports are listening
sudo netstat -tulpn | grep -E ':(80|5000|8080)'

# Check if services are accessible
curl http://localhost:5000/health
curl http://localhost:80
# or if you changed port
curl http://localhost:8080
```

## Test from Your Local Machine

Replace `YOUR_SERVER_IP` with your actual server IP:

```bash
# Test backend health
curl http://YOUR_SERVER_IP:5000/health

# Test frontend (should return HTML)
curl http://YOUR_SERVER_IP
# or
curl http://YOUR_SERVER_IP:8080
```

## If You Have a Domain Name

If you configured a domain name (e.g., `cineflow.example.com`):

- **Frontend:** `http://cineflow.example.com` or `https://cineflow.example.com` (if SSL is set up)
- **Backend API:** `http://cineflow.example.com:5000` or via nginx proxy at `http://cineflow.example.com/api`

## Quick Check Commands

```bash
# Get your server's public IP
echo "Your server IP is: $(curl -s ifconfig.me)"

# Check if containers are running
docker-compose ps

# Check backend logs
docker-compose logs backend | tail -20

# Check frontend logs  
docker-compose logs frontend | tail -20

# Test backend from server
curl http://localhost:5000/health
```

## Example

If your server IP is `123.45.67.89` and you're using port 80:

- Open in browser: `http://123.45.67.89`
- API endpoint: `http://123.45.67.89:5000`
- Health check: `http://123.45.67.89:5000/health`

## Troubleshooting

### Can't Access from Browser

1. **Check firewall:**
   ```bash
   sudo ufw status
   sudo ufw allow 80/tcp
   sudo ufw allow 5000/tcp
   ```

2. **Check if containers are running:**
   ```bash
   docker-compose ps
   ```

3. **Check logs for errors:**
   ```bash
   docker-compose logs -f
   ```

4. **Verify port is listening:**
   ```bash
   sudo lsof -i :80
   sudo lsof -i :5000
   ```

### Port 80 Already in Use

If port 80 is in use, you changed it to 8080. Access at:
- `http://YOUR_SERVER_IP:8080`

