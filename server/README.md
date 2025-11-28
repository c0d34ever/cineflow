# CineFlow Backend Microservice

Standalone backend microservice for CineFlow AI application.

## Features

- 🚀 RESTful API for projects management
- 🤖 Gemini AI integration (secure server-side)
- 💾 MySQL database integration
- 🔒 Secure API key handling
- 📊 Health check endpoint
- 🐳 Docker support

## Quick Start

### Prerequisites

- Node.js 20+
- MySQL 8.0+ (or remote MySQL database)
- Gemini API key

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Development

```bash
# Run in development mode (with hot reload)
npm run dev

# Server will start on http://localhost:5000
```

### Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
# or
npm run start:prod
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 5000) |
| `DB_HOST` | MySQL host | Yes |
| `DB_PORT` | MySQL port | No (default: 3306) |
| `DB_USER` | MySQL username | Yes |
| `DB_PASSWORD` | MySQL password | Yes |
| `DB_NAME` | Database name | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes (for AI features) |
| `CORS_ORIGIN` | Allowed CORS origins | No |

## API Endpoints

### Health Check
```
GET /health
```

### Projects API
```
GET    /api/projects          - Get all projects
GET    /api/projects/:id      - Get single project
POST   /api/projects          - Create or update project
DELETE /api/projects/:id      - Delete project
```

### Gemini AI API
```
POST /api/gemini/generate-story              - Generate story concept
POST /api/gemini/suggest-next-scene          - Suggest next scene
POST /api/gemini/suggest-director-settings   - Auto-suggest director settings
POST /api/gemini/enhance-scene-prompt        - Enhance scene prompt
```

## Docker Deployment

### Build Image
```bash
docker build -t cineflow-backend -f Dockerfile.backend .
```

### Run Container
```bash
docker run -d \
  --name cineflow-backend \
  -p 5000:5000 \
  --env-file .env \
  cineflow-backend
```

### Docker Compose
```bash
docker-compose -f docker-compose.backend.yml up -d
```

## Standalone Deployment

### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Build the project
npm run build

# Start with PM2
pm2 start dist/index.js --name cineflow-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Using systemd

Create `/etc/systemd/system/cineflow-backend.service`:

```ini
[Unit]
Description=CineFlow Backend Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/cineflow-ai/server
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable cineflow-backend
sudo systemctl start cineflow-backend
```

## Project Structure

```
server/
├── index.ts              # Main server entry point
├── db/
│   ├── index.ts          # Database connection
│   └── schema.ts         # Database schema
├── routes/
│   ├── projects.ts       # Projects API routes
│   └── gemini.ts         # Gemini AI API routes
├── services/
│   └── geminiService.ts  # Gemini AI service
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── .env.example          # Environment template
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

## Troubleshooting

### Database Connection Failed
- Check database credentials in `.env`
- Verify database server is accessible
- Check firewall rules

### Gemini API Errors
- Verify `GEMINI_API_KEY` is set correctly
- Check API key is valid and has quota
- Review error logs

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill process or change PORT in .env
```

## License

ISC

