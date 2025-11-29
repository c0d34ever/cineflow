# Admin API Error Handling Fix

## Issue
Admin API routes returning HTML error pages instead of JSON, causing `SyntaxError: Unexpected token '<'` errors.

## Root Causes

1. **Unhandled Promise Rejections**: Express doesn't automatically catch errors from async route handlers
2. **Missing Error Propagation**: Errors not being passed to Express error handler via `next()`
3. **Database Connection Issues**: No validation that database pool is available before queries
4. **Missing Process Handlers**: Unhandled promise rejections could crash the service

## Fixes Applied

### 1. ✅ Added Process Error Handlers
- Added `unhandledRejection` handler to catch unhandled promise rejections
- Added `uncaughtException` handler for critical errors

### 2. ✅ Improved Route Error Handling
- Added `next` parameter to all async route handlers
- Added `res.headersSent` checks before sending responses
- Pass errors to Express error handler via `next(error)` when headers already sent

### 3. ✅ Database Connection Validation
- Added checks to ensure database pool is available before queries
- Throw descriptive errors if database not connected

### 4. ✅ Better Error Messages
- All error handlers now ensure JSON responses
- Development mode shows error details

## Files Changed

1. `server/admin/index.ts` - Added process error handlers, improved error handler
2. `server/admin/routes/stats.ts` - Added next parameter, database validation, better error handling
3. `server/admin/routes/projects.ts` - Added next parameter, database validation, better error handling
4. `server/admin/routes/apiKeys.ts` - Added next parameter, database validation, better error handling

## Testing

After deployment, check admin service logs:
```bash
docker-compose logs admin | tail -50
```

Look for:
- Database connection errors
- Unhandled rejections
- Query errors

## Expected Behavior

- All errors return JSON (never HTML)
- Unhandled promise rejections are logged
- Database connection issues are caught and reported
- Error handler always sends JSON responses

