# Architecture Fixes Summary

## Issues Fixed

### 1. ✅ Authentication Architecture
**Problem**: All users (regular + admin) were authenticating through Admin API, mixing concerns.

**Solution**:
- Created `server/routes/auth.ts` - moved authentication to main backend
- Updated `apiServices.ts` - `authService` now uses main API instead of admin API
- Updated `server/index.ts` - added auth routes to main backend

**Result**:
- **Main Backend (port 5000)**: Authentication for all users + regular user operations
- **Admin API (port 5001)**: Admin-only operations (user management, stats, etc.)

### 2. ✅ Shared Middleware
**Problem**: Main backend routes were importing middleware from `../admin/middleware/auth.js`, which is architecturally odd.

**Solution**:
- Created `server/middleware/auth.ts` - shared authentication middleware
- Updated all 18 main backend route files to use `../middleware/auth.js`
- Updated `server/admin/middleware/auth.ts` to re-export from shared location

**Result**: Clean separation - middleware is shared but properly located.

### 3. ✅ ES Module Imports
**Problem**: Missing `.js` extensions in imports causing `ERR_MODULE_NOT_FOUND` errors.

**Solution**: All imports now include `.js` extensions:
- `../db/index.js`
- `../../types.js`
- `../services/geminiService.js`
- `../middleware/auth.js`
- etc.

### 4. ✅ Nginx Routing
**Problem**: Admin API routes were returning 404 due to incorrect rewrite rules.

**Solution**: Fixed `nginx.conf` rewrite rule:
```nginx
# Before: rewrite ^/admin-api/(.*) /$1 break;
# After:  rewrite ^/admin-api/(.*) /api/$1 break;
```

## Current Architecture

```
┌─────────────┐
│   Frontend   │
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│ Main Backend│   │  Admin API  │
│  Port 5000  │   │  Port 5001  │
└─────────────┘   └─────────────┘
       │                 │
       │                 │
       ├─────────────────┤
       │                 │
       ▼                 ▼
┌─────────────────────────┐
│    MySQL Database       │
└─────────────────────────┘
```

### Main Backend (Port 5000)
- ✅ Authentication (`/api/auth/*`) - **All users**
- ✅ Projects (`/api/projects/*`) - **User's own projects**
- ✅ Scenes, Characters, Locations, etc. - **User operations**
- ✅ API Keys (`/api/api-keys/*`) - **User's own API keys**

### Admin API (Port 5001)
- ✅ User Management (`/api/users/*`) - **Admin only**
- ✅ All Projects (`/api/projects/*`) - **Admin view**
- ✅ System Stats (`/api/stats/*`) - **Admin only**
- ✅ All API Keys (`/api/api-keys/*`) - **Admin view**
- ⚠️ Auth routes still exist (for backward compatibility, not used by frontend)

## Files Changed

### New Files
- `server/routes/auth.ts` - Authentication routes for main backend
- `server/middleware/auth.ts` - Shared authentication middleware
- `ARCHITECTURE_FIXES_SUMMARY.md` - This file

### Modified Files
- `server/index.ts` - Added auth router
- `apiServices.ts` - Changed `authService` to use main API
- `server/admin/middleware/auth.ts` - Now re-exports from shared location
- All 18 route files in `server/routes/` - Updated middleware imports

## Testing Checklist

After deploying, verify:

1. **Authentication** (Main Backend):
   ```bash
   curl -X POST https://cineflow.youtilitybox.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```

2. **Admin Operations** (Admin API):
   ```bash
   curl https://cineflow.youtilitybox.com/admin-api/users \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Regular User Operations** (Main Backend):
   ```bash
   curl https://cineflow.youtilitybox.com/api/projects \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### 5. ✅ Security: Projects Routes Protection
**Problem**: Projects routes were accessible without authentication, allowing unauthorized access.

**Solution**:
- Added `authenticateToken` middleware to all project routes
- GET `/api/projects` - Now filters by `user_id` (users only see their own projects)
- GET `/api/projects/:id` - Now checks ownership before returning
- POST `/api/projects` - Now sets `user_id` when creating/updating projects
- DELETE `/api/projects/:id` - Now checks ownership before deletion

**Result**: Projects are now properly user-scoped and protected.

## Next Steps

1. **Optional**: Remove auth routes from Admin API (currently kept for backward compatibility)
2. **Optional**: Add rate limiting to auth endpoints
3. **Optional**: Add request logging/monitoring
4. **Optional**: Migrate existing projects without `user_id` to assign them to users

## Notes

- Admin API still has auth routes but they're not used by the frontend
- Both services share the same database and JWT secret
- Middleware is now properly shared between services
- All ES module imports are correctly formatted
- All routes are properly protected with authentication
- Projects are now user-scoped (users can only access their own projects)

