# Enhanced Features Documentation

## 🆕 New Features Added

### 1. API Key Management
- Individual API keys for each user
- Key generation, regeneration, and management
- Usage tracking and expiration
- Admin view of all API keys

### 2. Tags & Categories
- Tag system for organizing projects
- Color-coded tags
- Categories for project classification
- Tag filtering and search

### 3. Comments & Notes
- Project comments with pinning
- Scene notes (note, todo, issue, idea types)
- User attribution
- Edit/delete functionality

### 4. Favorites & Bookmarks
- Favorite projects
- Quick access to bookmarked projects
- Favorite status checking

### 5. Project Sharing
- Share projects with other users
- Public/private/shared visibility
- Share tokens for link sharing
- Access level control (view/edit/comment)

### 6. Export History
- Track all exports (JSON, PDF, CSV, Markdown)
- File size tracking
- Export analytics

### 7. User Settings
- Theme preferences (dark/light)
- Language settings
- Timezone configuration
- Notification preferences
- Auto-save settings
- Custom preferences (JSON)

### 8. Notifications
- In-app notifications
- Email notifications (optional)
- Notification types
- Read/unread status

### 9. Analytics
- Project view counts
- Edit tracking
- Share analytics
- Usage statistics

## 📊 Database Tables

### New Tables Created

1. **api_keys** - User API keys
2. **tags** - Tag definitions
3. **project_tags** - Project-tag relationships
4. **categories** - Project categories
5. **project_comments** - Project comments
6. **scene_notes** - Scene notes
7. **favorites** - User favorites
8. **project_shares** - Project sharing
9. **export_history** - Export tracking
10. **project_analytics** - Project analytics
11. **user_settings** - User preferences
12. **notifications** - User notifications

## 🔌 API Endpoints

### API Keys
```
GET    /api/api-keys              - Get user's API keys
POST   /api/api-keys              - Create API key
PUT    /api/api-keys/:id          - Update API key
DELETE /api/api-keys/:id          - Delete API key
POST   /api/api-keys/:id/regenerate - Regenerate key
```

### Tags
```
GET    /api/tags                  - Get all tags
POST   /api/tags                  - Create tag
PUT    /api/tags/:id               - Update tag
DELETE /api/tags/:id               - Delete tag
POST   /api/tags/:tagId/projects/:projectId - Add tag to project
DELETE /api/tags/:tagId/projects/:projectId - Remove tag
```

### Favorites
```
GET    /api/favorites             - Get user's favorites
POST   /api/favorites/:projectId  - Add to favorites
DELETE /api/favorites/:projectId  - Remove from favorites
GET    /api/favorites/check/:projectId - Check favorite status
```

### Comments
```
GET    /api/comments/project/:projectId - Get project comments
POST   /api/comments/project/:projectId - Add comment
PUT    /api/comments/:id          - Update comment
DELETE /api/comments/:id           - Delete comment
```

### Settings
```
GET    /api/settings              - Get user settings
PUT    /api/settings              - Update settings
```

## 🎨 Frontend Services

All services are available in `apiServices.ts`:

```typescript
import { 
  apiKeysService,
  tagsService,
  favoritesService,
  commentsService,
  settingsService,
  authService
} from './apiServices';

// Example usage
const keys = await apiKeysService.getAll();
const tags = await tagsService.getAll();
const favorites = await favoritesService.getAll();
```

## 🔐 Authentication

All endpoints (except public ones) require JWT authentication:

```typescript
// Login first
const { token } = await authService.login('username', 'password');
localStorage.setItem('auth_token', token);

// Then use authenticated endpoints
const keys = await apiKeysService.getAll();
```

## 📝 Usage Examples

### Create API Key
```typescript
const newKey = await apiKeysService.create({
  key_name: 'My API Key',
  expires_at: '2024-12-31T23:59:59Z'
});
console.log(newKey.api_key); // Save this!
```

### Add Tag to Project
```typescript
await tagsService.addToProject(tagId, projectId);
```

### Add to Favorites
```typescript
await favoritesService.add(projectId);
```

### Add Comment
```typescript
await commentsService.create(projectId, {
  content: 'Great project!',
  is_pinned: false
});
```

### Update Settings
```typescript
await settingsService.update({
  theme: 'dark',
  language: 'en',
  auto_save: true
});
```

## 🚀 Migration

Run migrations to create new tables:

```bash
cd server
npm run build
npm start  # Migrations run automatically
```

Or manually:
```bash
npm run migrate
```

## 🔧 Configuration

Add to `.env`:
```env
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
```

## 📚 Admin Features

Admin microservice now includes:
- API key management view
- API key statistics
- User API key monitoring
- Enhanced analytics

## 🎯 Next Steps

1. Run migrations: `npm start` (auto-runs)
2. Install dependencies: `npm install`
3. Use frontend services: Import from `apiServices.ts`
4. Build UI components using services
5. Test all endpoints

## 📖 Full Documentation

- **Migrations**: `MIGRATIONS_GUIDE.md`
- **Admin Service**: `ADMIN_MICROSERVICE.md`
- **API Services**: See `apiServices.ts` for all available methods

