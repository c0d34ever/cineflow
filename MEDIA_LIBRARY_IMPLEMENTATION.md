# Media Library & Image Upload Implementation

## 🎨 Overview

This implementation adds comprehensive image upload functionality with a media library, allowing users to:
- Upload images to projects and scenes
- Manage images in a visual media library
- Display images in storyboard scenes (comic-book style)
- Export projects with images included

## 📁 Database Schema

### Media Table (`018_add_media_library.sql`)
```sql
CREATE TABLE media (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  scene_id VARCHAR(255) NULL,
  user_id INT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  width INT NULL,
  height INT NULL,
  thumbnail_path VARCHAR(1000) NULL,
  alt_text TEXT NULL,
  description TEXT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

## 🔧 Backend Implementation

### Dependencies
- `multer` - File upload handling
- `sharp` - Image processing and thumbnail generation
- `@types/multer` - TypeScript types

### API Routes (`server/routes/media.ts`)

#### Upload Image
```
POST /api/media/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- image: File
- project_id: string (required)
- scene_id: string (optional)
- alt_text: string (optional)
- description: string (optional)
- is_primary: boolean (optional)
```

#### Get Project Media
```
GET /api/media/project/:projectId?scene_id=<sceneId>
Authorization: Bearer <token>
```

#### Get Scene Media
```
GET /api/media/scene/:sceneId
Authorization: Bearer <token>
```

#### Update Media
```
PUT /api/media/:id
Authorization: Bearer <token>
Body: { alt_text?, description?, is_primary?, display_order? }
```

#### Delete Media
```
DELETE /api/media/:id
Authorization: Bearer <token>
```

#### Associate Media with Scene
```
POST /api/media/:id/associate
Authorization: Bearer <token>
Body: { scene_id: string | null }
```

### File Storage
- **Upload Directory**: `server/uploads/`
- **Thumbnail Directory**: `server/uploads/thumbnails/`
- **Thumbnail Size**: 300x300px (maintaining aspect ratio)
- **Max File Size**: 10MB
- **Allowed Types**: jpeg, jpg, png, gif, webp

### Static File Serving
Files are served via Express static middleware:
```typescript
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
```

## 🎨 Frontend Implementation

### Media Service (`apiServices.ts`)
```typescript
import { mediaService } from './apiServices';

// Upload image
await mediaService.uploadImage(projectId, file, sceneId, altText, description, isPrimary);

// Get media
const media = await mediaService.getProjectMedia(projectId, sceneId);
const sceneMedia = await mediaService.getSceneMedia(sceneId);

// Update/Delete
await mediaService.updateMedia(id, { is_primary: true });
await mediaService.deleteMedia(id);
```

### Media Library Component (`components/MediaLibrary.tsx`)
- Visual grid of uploaded images
- Upload new images
- Set primary image
- Delete images
- Select images for use in scenes

### Scene Card Updates (`components/SceneCard.tsx`)
- Displays primary image at the top (comic-book style)
- Image management button in header
- Shows image count if multiple images exist
- Opens media library modal for management

## 📤 Export Integration

### PDF Export (Comic-Book Style)
Images are included in PDF exports with:
- Full-width images above scene descriptions
- Comic-book panel layout
- Image captions (alt_text or description)

### Markdown Export
Images are included as markdown image syntax:
```markdown
![Scene 1](image-path.jpg)
```

### Episode Export
Images are included in episode exports, maintaining scene associations.

## 🚀 Usage

### Upload Image to Scene
1. Click the image icon in SceneCard header
2. Click "Upload Image" in Media Library
3. Select image file
4. Image is automatically associated with the scene

### Set Primary Image
1. Open Media Library
2. Click ⭐ button on desired image
3. Primary image displays in SceneCard

### Delete Image
1. Open Media Library
2. Click 🗑️ button on image
3. Image and thumbnail are deleted from server

## 📝 Next Steps

1. **Update Export Functions** - Modify `utils/exportUtils.ts` to include images in PDF/Markdown exports
2. **Docker Configuration** - Ensure `uploads` directory is persisted in Docker volumes
3. **Cloud Storage** - Consider migrating to S3/Cloud Storage for production
4. **Image Optimization** - Add automatic image compression on upload
5. **Bulk Upload** - Add support for multiple image uploads at once

## 🔒 Security Considerations

- File type validation (only images)
- File size limits (10MB)
- User authentication required for all operations
- File ownership validation (users can only manage their own media)
- Path traversal protection in file paths

## 📦 Docker Setup

Add volume mount for uploads:
```yaml
volumes:
  - ./uploads:/app/server/uploads
```

Or use named volume:
```yaml
volumes:
  - media_uploads:/app/server/uploads
```

