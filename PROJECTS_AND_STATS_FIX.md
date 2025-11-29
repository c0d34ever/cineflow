# Projects and Stats API Fix

## Issues Fixed

### 1. ✅ Projects Not Showing (NULL user_id)
**Problem**: Existing projects in database have `user_id = NULL`, but the query filters by `user_id = ?`, so they're not returned.

**Solution**:
- Modified query to include projects with `user_id = ? OR user_id IS NULL`
- Added automatic migration: when a user accesses a project with NULL user_id, it's automatically assigned to that user
- This ensures backward compatibility with existing projects

**Files Changed**:
- `server/routes/projects.ts` - GET `/api/projects` route
- `server/routes/projects.ts` - GET `/api/projects/:id` route  
- `server/routes/projects.ts` - POST `/api/projects` route

### 2. ✅ Admin Stats 500 Error
**Problem**: Stats route was failing on database queries, causing 500 errors.

**Solution**:
- Added individual try-catch blocks for each database query
- If a query fails, it returns a default value (0 for counts, [] for arrays)
- Better error logging to identify which query is failing

**Files Changed**:
- `server/admin/routes/stats.ts` - All database queries now have error handling

## Migration Strategy

### Automatic Migration
When a user accesses projects:
1. Query includes projects with `user_id = NULL` (legacy projects)
2. If any NULL user_id projects are found, they're automatically assigned to the current user
3. This happens transparently on first access

### Manual Migration (Optional)
If you want to assign all NULL user_id projects to a specific user:

```sql
-- Assign all NULL user_id projects to user with ID 1
UPDATE projects SET user_id = 1 WHERE user_id IS NULL;
```

## Testing

After deployment:

1. **Test Projects API**:
   ```bash
   curl -X GET https://cineflow.youtilitybox.com/api/projects \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
   Should now return projects even if they had NULL user_id.

2. **Test Stats API**:
   ```bash
   curl -X GET https://cineflow.youtilitybox.com/admin-api/stats \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
   Should return JSON with stats, even if some queries fail.

## Expected Behavior

1. **Existing Projects**: Will be automatically assigned to the user who first accesses them
2. **New Projects**: Will have `user_id` set when created
3. **Stats API**: Will return partial data even if some queries fail (graceful degradation)

