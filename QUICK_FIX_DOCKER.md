# Quick Fix for Docker Issues

## Issue 1: Docker Permission Denied

Run these commands to fix Docker permissions:

```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Apply the changes (choose one):
# Option A: Logout and login again
# Option B: Run this command:
newgrp docker

# Verify you can run docker without sudo
docker ps
```

## Issue 2: Missing GEMINI_API_KEY

Create a `.env` file in the **root directory** (same level as docker-compose.yml):

```bash
cd /home/alchemist/cineflow
nano .env
```

Add these variables:

```env
# Database Configuration
DB_HOST=162.241.86.188
DB_PORT=3306
DB_USER=youtigyk_cineflow
DB_PASSWORD=Sun12day46fun
DB_NAME=youtigyk_cineflow

# Gemini API Key (REQUIRED)
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Optional
NODE_ENV=production
PORT=5000
```

**Important:** Replace `your_actual_gemini_api_key_here` with your real Gemini API key.

## Issue 3: Version Warning (Already Fixed)

The version field has been removed from docker-compose.yml. This warning will no longer appear.

## After Fixing

```bash
# Make sure you're in the project directory
cd /home/alchemist/cineflow

# Try docker-compose again
docker-compose up -d --build

# Check logs
docker-compose logs -f
```

## If Still Having Permission Issues

If `newgrp docker` doesn't work, you can temporarily use sudo:

```bash
sudo docker-compose up -d --build
```

But it's better to fix the permissions properly so you don't need sudo.

