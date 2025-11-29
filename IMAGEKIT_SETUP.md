# ImageKit Integration Setup

## Overview
The application now uses ImageKit for image storage with automatic fallback to local file system storage. This provides:
- **CDN delivery** for faster image loading
- **Automatic image optimization** via ImageKit transformations
- **Scalable storage** without server disk space concerns
- **Automatic fallback** to local storage if ImageKit is unavailable

## Configuration

### Environment Variables
Add these to your `.env` file or Docker environment:

```env
# ImageKit Configuration
IMAGEKIT_PUBLIC_KEY=public_bH2QtMc9E/U08Hzj2PN7tkoTD7o=
IMAGEKIT_PRIVATE_KEY=private_+PmUqowiTKhJc1E0hSgwpMtF6J8=
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/hkorgalju
```

**Note**: The private key should be kept confidential and never exposed in client-side code.

### Default Values
If environment variables are not set, the system uses the provided credentials as defaults:
- Public Key: `public_bH2QtMc9E/U08Hzj2PN7tkoTD7o=`
- Private Key: `private_+PmUqowiTKhJc1E0hSgwpMtF6J8=`
- URL Endpoint: `https://ik.imagekit.io/hkorgalju`

## Database Migration

Run the migration to add ImageKit URL columns:

```bash
cd server
npm run migrate
```

This adds:
- `imagekit_url` - Full image URL from ImageKit
- `imagekit_thumbnail_url` - Thumbnail URL from ImageKit
- `imagekit_file_id` - ImageKit file ID for deletion

## How It Works

### Upload Flow
1. **ImageKit First**: When an image is uploaded, the system attempts to upload to ImageKit
2. **Automatic Fallback**: If ImageKit upload fails, the system automatically falls back to local storage
3. **Dual Storage**: Both ImageKit URLs and local paths are stored in the database
4. **Thumbnail Generation**: Thumbnails are generated using ImageKit transformations (for ImageKit) or Sharp (for local)

### Image Serving
- **Frontend**: Automatically prefers ImageKit URLs when available
- **Fallback Chain**: ImageKit thumbnail → ImageKit full → Local thumbnail → Local full
- **Backward Compatible**: Existing local images continue to work

### Deletion
- **ImageKit Files**: Deleted from ImageKit when media is removed
- **Local Files**: Also deleted from local storage (if they exist)
- **Database**: Media record is removed

## Installation

1. **Install Dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Run Migration**:
   ```bash
   npm run migrate
   ```

3. **Configure Environment** (optional):
   - Add ImageKit credentials to `.env` file
   - Or rely on default values (already configured)

4. **Rebuild Backend**:
   ```bash
   npm run build
   ```

## Usage

### Uploading Images
Images are automatically uploaded to ImageKit when:
- User uploads via Media Library
- User uploads via Scene Gallery
- Any image upload endpoint is called

### Accessing Images
The frontend automatically uses ImageKit URLs when available. No code changes needed in components - they use the `getImageUrl()` utility function.

### ImageKit Transformations
ImageKit automatically provides:
- **Thumbnails**: 300x300px, 80% quality, JPEG format
- **Optimization**: Automatic format conversion and compression
- **CDN Delivery**: Fast global delivery via ImageKit CDN

## Troubleshooting

### Images Not Uploading to ImageKit
1. Check environment variables are set correctly
2. Verify ImageKit credentials are valid
3. Check server logs for ImageKit errors
4. System will automatically fallback to local storage

### Images Not Displaying
1. Check if ImageKit URLs are in database (`imagekit_url` column)
2. Verify ImageKit account is active
3. Check browser console for CORS errors
4. System will fallback to local images automatically

### Migration Issues
If migration fails:
```sql
-- Manually add columns if needed
ALTER TABLE media
ADD COLUMN imagekit_url VARCHAR(500) NULL,
ADD COLUMN imagekit_thumbnail_url VARCHAR(500) NULL,
ADD COLUMN imagekit_file_id VARCHAR(100) NULL;

CREATE INDEX idx_imagekit_file_id ON media (imagekit_file_id);
```

## Benefits

1. **Performance**: CDN delivery means faster image loading globally
2. **Scalability**: No server disk space concerns
3. **Reliability**: Automatic fallback ensures images always work
4. **Optimization**: ImageKit automatically optimizes images
5. **Cost-Effective**: Pay only for what you use

## Notes

- Local storage is still used as a fallback
- Existing images continue to work (backward compatible)
- New uploads prefer ImageKit but fallback to local if needed
- Both ImageKit and local paths are stored for maximum compatibility

## Admin Service

**Note**: The admin microservice (`server/admin`) does NOT handle media uploads. It only manages:
- User administration
- Project administration
- System statistics
- API key management

Since the admin service shares the same `package.json` with the main backend, the ImageKit dependency will be installed but is not used. This is harmless and keeps the codebase consistent.

