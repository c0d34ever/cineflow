# Database Migrations Guide

## Overview

CineFlow uses a SQL-based migration system to manage database schema changes.

## Migration Files

Migrations are located in `server/db/migrations/`:
- `001_initial_schema.sql` - Initial database schema
- `002_add_users_table.sql` - Users and authentication
- `003_add_activity_logs.sql` - Activity logging

## Running Migrations

### Automatic (Recommended)

Migrations run automatically when the server starts:

```bash
cd server
npm start
```

### Manual

```bash
cd server
npm run migrate
```

## Creating New Migrations

1. Create a new SQL file in `server/db/migrations/`:
   - Format: `XXX_description.sql`
   - Example: `004_add_tags_table.sql`

2. Write your SQL:
```sql
-- Migration: 004_add_tags_table
-- Description: Add tags support for projects
-- Created: 2024-01-01

CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

3. Migrations run automatically on next server start

## Migration Tracking

Migrations are tracked in the `migrations` table:

```sql
SELECT * FROM migrations ORDER BY executed_at;
```

## Rollback

To rollback a migration (manual process):

```bash
# Remove from migrations table
mysql -u user -p database
DELETE FROM migrations WHERE name = '004_add_tags_table';

# Manually drop tables/columns if needed
DROP TABLE IF EXISTS tags;
```

## Best Practices

1. **Always backup** before running migrations
2. **Test migrations** in development first
3. **Use transactions** for complex migrations
4. **Never modify** executed migrations
5. **Use descriptive names** for migration files
6. **Include rollback SQL** in comments if complex

## Current Schema

### Tables

- `projects` - Story projects
- `scenes` - Individual scenes
- `director_settings` - Project-level settings
- `scene_director_settings` - Per-scene settings
- `users` - User accounts
- `activity_logs` - System activity logs
- `migrations` - Migration tracking

## Seeding

### Run Seeders

```bash
cd server
npm run seed
```

### Seed Admin User

The seeder creates a default admin user:
- Username: `admin` (or from `ADMIN_USERNAME`)
- Email: `admin@cineflow.ai` (or from `ADMIN_EMAIL`)
- Password: `admin123` (or from `ADMIN_PASSWORD`)

⚠️ **Change default password immediately!**

### Auto-Seed on Startup

Set in `.env`:
```env
SEED_DATABASE=true
```

## Troubleshooting

### Migration Fails

1. Check SQL syntax
2. Verify database connection
3. Check for conflicting migrations
4. Review error logs

### Migration Already Executed

Migrations are skipped if already executed. To re-run:
1. Remove from `migrations` table
2. Drop affected tables/columns
3. Re-run migration

### Database Out of Sync

1. Check `migrations` table
2. Compare with migration files
3. Run missing migrations manually if needed

