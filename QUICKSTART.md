# Quick Start Guide

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY
   ```

3. **Start MySQL (using Docker):**
   ```bash
   docker run -d --name cineflow-mysql \
     -e MYSQL_ROOT_PASSWORD=root \
     -e MYSQL_DATABASE=cineflow \
     -e MYSQL_USER=cineflow \
     -e MYSQL_PASSWORD=cineflow \
     -p 3306:3306 \
     mysql:8.0
   ```

4. **Update .env with database credentials:**
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=cineflow
   DB_PASSWORD=cineflow
   DB_NAME=cineflow
   ```

5. **Start development servers:**
   ```bash
   npm run dev:all
   ```

   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Production Deployment (Docker Compose)

1. **Configure environment:**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your production settings
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d --build
   ```

3. **Check status:**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

4. **Access application:**
   - Frontend: http://localhost (or your domain)
   - API: http://localhost/api/projects
   - Health: http://localhost/health

## Troubleshooting

### Port already in use
```bash
# Find process using port
sudo lsof -i :5000
sudo lsof -i :3306

# Kill process or change ports in .env
```

### Database connection failed
```bash
# Check MySQL is running
docker ps | grep mysql

# Check database exists
docker exec -it cineflow-mysql mysql -u cineflow -p -e "SHOW DATABASES;"
```

### Build errors
```bash
# Clean and rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

