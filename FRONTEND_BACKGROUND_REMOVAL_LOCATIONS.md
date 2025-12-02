# Frontend Background Removal - Usage Locations

## 📍 Where Background Removal is Available

### 1. **Characters Panel** 
**Location**: `components/CharactersPanel.tsx`  
**Access**: Click "Characters" button in toolbar → Add/Edit Character

**Available Options**:
- ✅ **"Upload Image"** - Regular image upload
- ✅ **"Upload & Remove BG"** - Upload with automatic background removal
- ✅ **"Bulk Upload"** - Upload multiple images (currently without BG removal option)

**How to Use**:
1. Open Characters Panel
2. Click "Add Character" or edit existing character
3. In the "Character Image" section:
   - Click **"Upload & Remove BG"** button
   - Select your image
   - Background is automatically removed and image is uploaded
   - Preview shows the processed image

**Code Reference**:
```typescript
// Line 350-364: Upload & Remove BG button
<label className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm cursor-pointer">
  {removingBg ? 'Removing BG...' : 'Upload & Remove BG'}
  <input
    type="file"
    accept="image/*"
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) {
        handleImageUpload(file, true); // true = remove background
      }
    }}
  />
</label>
```

---

### 2. **Media Library Sidebar**
**Location**: `components/MediaLibrarySidebar.tsx`  
**Access**: Click media/library icon on scene cards → Right sidebar opens

**Available Options**:
- ✅ **"Upload"** - Single image upload
- ✅ **"Bulk"** - Multiple images upload
- ✅ **"Remove BG"** - Remove background from already selected file

**How to Use**:
1. Open Media Library Sidebar (from scene card)
2. Click **"Remove BG"** button
3. Select an image file
4. Background is removed and processed image is uploaded

**Note**: This requires selecting a file first (different from Characters Panel)

**Code Reference**:
```typescript
// Line 290-315: Remove BG button
<button
  onClick={async () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      const result = await mediaService.removeBackground(file);
      // Upload processed image
    }
  }}
>
  {removingBg ? 'Removing...' : 'Remove BG'}
</button>
```

---

### 3. **Media Library Modal** (NEW)
**Location**: `components/MediaLibrary.tsx`  
**Access**: Full-screen media library modal

**Available Options**:
- ✅ **"Upload"** - Single image upload
- ✅ **"Upload & Remove BG"** - Upload with background removal
- ✅ **"Bulk"** - Multiple images upload

**How to Use**:
1. Open Media Library Modal
2. Click **"Upload & Remove BG"** button
3. Select your image
4. Background is automatically removed

---

## 🔧 API Service Methods

### `mediaService.removeBackground(file: File)`
Removes background from a single image file.

**Returns**:
```typescript
{
  success: true,
  processedPath: "/uploads/image_nobg.png",
  thumbnailPath: "/uploads/thumbnails/thumb-image_nobg.png",
  imagekit_url: "https://...",
  imagekit_thumbnail_url: "https://..."
}
```

### `mediaService.bulkUpload(projectId, files, sceneId?, removeBg?)`
Uploads multiple images with optional background removal.

**Parameters**:
- `projectId`: string (required)
- `files`: File[] (required)
- `sceneId`: string (optional)
- `removeBg`: boolean (optional, default: false)

---

## 📝 Usage Examples

### Example 1: Character Image with BG Removal
```typescript
// In CharactersPanel.tsx
const handleImageUpload = async (file: File, removeBg: boolean = false) => {
  if (removeBg) {
    const result = await mediaService.removeBackground(file);
    // Use result.imagekit_url or result.processedPath
  }
};
```

### Example 2: Bulk Upload with BG Removal
```typescript
// In MediaLibrarySidebar.tsx
const handleBulkUpload = async (files: FileList | null, removeBg: boolean = false) => {
  const fileArray = Array.from(files);
  const results = await mediaService.bulkUpload(
    projectId, 
    fileArray, 
    sceneId, 
    removeBg // true to remove background
  );
};
```

---

## 🎯 Summary

| Location | Single Upload | Bulk Upload | BG Removal |
|----------|--------------|-------------|------------|
| **Characters Panel** | ✅ | ✅ | ✅ |
| **Media Library Sidebar** | ✅ | ✅ | ✅ |
| **Media Library Modal** | ✅ | ✅ | ✅ |

**All three locations now support background removal!**

---

## 💡 Tips

1. **Best Results**: Works best with solid/uniform backgrounds
2. **High Contrast**: Images with clear subject/background separation work best
3. **Processing Time**: Takes ~100-500ms per image
4. **Format**: Output is always PNG with transparency
5. **No API Key Needed**: Fully in-house solution, always available

