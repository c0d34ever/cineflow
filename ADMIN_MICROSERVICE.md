# Admin Microservice Documentation

## Overview

The Admin Microservice provides authentication, user management, and administrative features for CineFlow AI.

## Features

- 🔐 JWT-based authentication
- 👥 User management (CRUD operations)
- 📊 System statistics and analytics
- 🔒 Role-based access control (admin, moderator, user)
- 📝 Activity logging
- 🛡️ Secure password hashing

## Quick Start

### Development

```bash
cd server
npm install
npm run dev:admin
```

### Production

```bash
cd server
npm install
npm run build:admin
npm run start:admin
```

### Docker

```bash
cd server/admin
docker-compose up -d --build
```

## API Endpoints

### Authentication

```
POST   /api/auth/login      - Login
POST   /api/auth/register   - Register new user
GET    /api/auth/me         - Get current user
```

### Users (Admin Only)

```
GET    /api/users           - List all users
GET    /api/users/:id       - Get user details
PUT    /api/users/:id       - Update user
DELETE /api/users/:id       - Delete user
```

### Projects (Admin Only)

```
GET    /api/projects        - List all projects
DELETE /api/projects/:id    - Delete project
```

### Statistics (Admin Only)

```
GET    /api/stats           - System statistics
```

## Authentication

### Login

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@cineflow.ai",
    "role": "admin"
  }
}
```

### Using Token

```bash
curl http://localhost:5001/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Environment Variables

```env
ADMIN_PORT=5001
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
ADMIN_CORS_ORIGIN=http://localhost:3000
ADMIN_EMAIL=admin@cineflow.ai
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
SEED_DATABASE=true
```

## Default Admin Credentials

After seeding:
- **Username**: `admin`
- **Email**: `admin@cineflow.ai`
- **Password**: `admin123`

⚠️ **Change the default password immediately!**

## Database Migrations

Migrations are automatically run on startup. To run manually:

```bash
cd server
npm run migrate
```

## Seeding Database

To seed admin user:

```bash
cd server
npm run seed
```

Or set `SEED_DATABASE=true` in `.env` to auto-seed on startup.

## Security Notes

1. **Change JWT_SECRET** in production
2. **Change default admin password** immediately
3. **Use HTTPS** in production
4. **Set CORS_ORIGIN** to your frontend domain
5. **Use strong passwords** for admin accounts

## Role-Based Access

- **admin**: Full access to all endpoints
- **moderator**: Limited admin access
- **user**: Basic user access

## Integration with Main API

The admin microservice uses the same database as the main API. Both services can run simultaneously:

- Main API: Port 5000
- Admin API: Port 5001

## Troubleshooting

### Port Already in Use
```bash
lsof -i :5001
kill -9 <PID>
```

### Database Connection Failed
- Check database credentials
- Verify database server is accessible
- Check firewall rules

### Authentication Fails
- Verify JWT_SECRET matches
- Check token expiration
- Verify user exists and is active

