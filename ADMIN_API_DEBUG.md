# Admin API 500 Errors - Debugging Guide

## Issue
All admin API routes returning 500 errors:
- `/admin-api/stats` - 500
- `/admin-api/projects` - 500
- `/admin-api/users` - 500
- `/admin-api/api-keys` - 500

## Possible Causes

1. **Database Connection Issues**
   - Admin service can't connect to database
   - Database credentials incorrect
   - Database not accessible from admin container

2. **Missing Tables**
   - `api_keys` table might not exist
   - Tables not migrated properly

3. **Query Syntax Errors**
   - SQL queries failing
   - Type mismatches in queries

4. **Middleware Issues**
   - `requireAdmin` middleware failing
   - `authenticateToken` not setting `req.user` properly

## Fixes Applied

### 1. ✅ Improved Error Handling
- Added try-catch blocks around all database queries
- Better error logging with query details
- Graceful degradation (return empty arrays/0 counts on error)

### 2. ✅ Fixed Type Handling
- All query results now properly typed
- Safety checks before accessing array elements

### 3. ✅ Fixed JOIN Types
- Changed `JOIN` to `LEFT JOIN` for api_keys to handle missing users

### 4. ✅ Better Error Messages
- Development mode shows detailed error messages
- Production mode shows generic errors

## Debugging Steps

### 1. Check Admin Service Logs
```bash
docker-compose logs admin | tail -100
```

Look for:
- Database connection errors
- SQL syntax errors
- Table not found errors
- Query execution errors

### 2. Check Database Connection
```bash
docker-compose exec admin node -e "
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
pool.query('SELECT 1').then(() => console.log('DB OK')).catch(e => console.error('DB Error:', e));
"
```

### 3. Check Tables Exist
```bash
docker-compose exec admin node -e "
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
pool.query('SHOW TABLES').then(([rows]) => console.log('Tables:', rows)).catch(e => console.error('Error:', e));
"
```

### 4. Test Individual Queries
Check if specific queries work:
- `SELECT COUNT(*) FROM users`
- `SELECT COUNT(*) FROM projects`
- `SELECT COUNT(*) FROM api_keys`
- `SELECT COUNT(*) FROM scenes`

## Files Changed

1. `server/admin/routes/projects.ts` - Better error handling
2. `server/admin/routes/users.ts` - Better error handling, fixed type handling
3. `server/admin/routes/apiKeys.ts` - Better error handling, LEFT JOIN
4. `server/admin/routes/stats.ts` - Individual try-catch for each query
5. `server/middleware/auth.ts` - Fixed type handling for user query

## Next Steps

1. **Rebuild admin service**:
   ```bash
   docker-compose build --no-cache admin
   docker-compose up -d admin
   ```

2. **Check logs** for actual error messages:
   ```bash
   docker-compose logs -f admin
   ```

3. **Verify database**:
   - Check if tables exist
   - Check if database connection works
   - Check if migrations ran

The improved error handling will now show the actual error in the logs, making it easier to identify the root cause.

