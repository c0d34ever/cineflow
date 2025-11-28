<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CineFlow AI - Production-Ready Deployment

CineFlow AI is a cinematic storyboard generation tool powered by Google Gemini AI. This application now includes a full-stack architecture with MySQL database for production deployment.

View your app in AI Studio: https://ai.studio/apps/drive/1UvMsS7RcBfphhyBQPn2RrtsGMA7k63sf

## Features

- 🎬 AI-powered storyboard generation (Gemini API via secure backend)
- 🎥 Director settings and technical specifications
- 💾 MySQL database for persistent storage
- 🐳 Docker support for easy deployment
- 🔄 Automatic fallback to IndexedDB if API unavailable
- 🚀 Production-ready backend API
- 🔒 Secure API key handling (never exposed to frontend)

## Quick Start

### 🚀 Automated Setup (Recommended)

#### Linux/Ubuntu
```bash
chmod +x setup-linux.sh start-services.sh
./setup-linux.sh
# Edit server/.env with your GEMINI_API_KEY
./start-services.sh
```

#### Windows
```powershell
# Run PowerShell as Administrator
.\setup-windows.ps1
# Edit server\.env with your GEMINI_API_KEY
.\start-services.bat
```

### 📝 Manual Setup

**Prerequisites:** Node.js 20+, MySQL 8.0+ (optional for development)

1. Install dependencies:
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

2. Set up environment variables:
   ```bash
   cp server/env.example server/.env
   # Edit server/.env and add your GEMINI_API_KEY
   ```

3. Build:
   ```bash
   cd server && npm run build && cd ..
   npm run build
   ```

4. Start services:
   ```bash
   # Using PM2 (recommended)
   pm2 start ecosystem.config.js
   
   # Or development mode
   npm run dev:all
   ```

## Production Deployment

### Option 1: Docker Compose (Recommended)

The easiest way to deploy to production:

```bash
# 1. Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# 2. Build and start all services
docker-compose up -d --build

# 3. Check logs
docker-compose logs -f
```

This will start:
- MySQL database (port 3306)
- Backend API server (port 5000)
- Nginx frontend server (port 80)

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Option 2: Manual Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step manual deployment instructions.

## Project Structure

```
cineflow-ai/
├── server/              # Backend API server
│   ├── index.ts        # Express server entry point
│   ├── db/             # Database connection and schema
│   └── routes/         # API routes
├── components/         # React components
├── App.tsx            # Main application component
├── apiService.ts      # Frontend API client
├── db.ts              # IndexedDB fallback (client-side)
├── geminiService.ts   # Gemini AI integration
├── types.ts           # TypeScript type definitions
├── Dockerfile         # Production Docker image
├── docker-compose.yml # Docker Compose configuration
└── nginx.conf         # Nginx configuration
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `DB_HOST` | MySQL host | Yes (production) |
| `DB_USER` | MySQL username | Yes (production) |
| `DB_PASSWORD` | MySQL password | Yes (production) |
| `DB_NAME` | Database name | Yes (production) |
| `VITE_API_URL` | Frontend API endpoint | No (defaults to localhost) |

## API Endpoints

### Projects API
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create or update project
- `DELETE /api/projects/:id` - Delete project

### Gemini AI API (Backend Only)
- `POST /api/gemini/generate-story` - Generate story concept
- `POST /api/gemini/suggest-next-scene` - Suggest next scene
- `POST /api/gemini/suggest-director-settings` - Auto-suggest director settings
- `POST /api/gemini/enhance-scene-prompt` - Enhance scene prompt with AI

### System
- `GET /health` - Health check

## Database Schema

The application uses MySQL with the following tables:
- `projects` - Story projects
- `scenes` - Individual scenes
- `director_settings` - Project-level director settings
- `scene_director_settings` - Per-scene director settings

## Development

### Building

```bash
# Build frontend
npm run build

# Build backend
npm run build:server

# Build both
npm run build:all
```

### Running Tests

```bash
# Check if API is available
curl http://localhost:5000/health
```

## Troubleshooting

### Database Connection Issues

1. Ensure MySQL is running: `docker ps` or `sudo systemctl status mysql`
2. Check connection credentials in `.env`
3. Verify database exists: `mysql -u cineflow -p -e "USE cineflow; SHOW TABLES;"`

### API Not Available

The frontend automatically falls back to IndexedDB if the API is unavailable. Check:
- Backend server is running: `npm run dev:server`
- Port 5000 is not in use
- CORS is properly configured

## License

[Your License Here]

## Support

For deployment issues, see [DEPLOYMENT.md](DEPLOYMENT.md) for detailed troubleshooting.
