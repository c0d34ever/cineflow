# Tags & Episode Content Generation

## ✅ What Was Added

### 1. Tags Management in User Dashboard

**Location**: User Dashboard → Tags Tab

**Features**:
- ✅ Create tags with custom names and colors
- ✅ View all available tags
- ✅ Delete tags
- ✅ Color picker for tag customization

**How to Use**:
1. Go to User Dashboard (click your profile/username)
2. Click on "Tags" tab
3. Enter tag name and select color
4. Click "Create Tag"
5. Tags are now available in the Tags menu when editing projects

### 2. Automatic Hashtag & Caption Generation for Episodes

**Feature**: When creating an episode, hashtags and captions are automatically generated if `project_context` is provided.

**How It Works**:
- When creating an episode via API, include `project_context` in the request
- The system automatically calls Gemini AI to generate:
  - **Hashtags**: 10-15 relevant hashtags (genre, themes, episode-specific)
  - **Caption**: Engaging 2-3 sentence caption for social media

**Example**:
```typescript
import { episodesService } from './apiServices';

// Create episode with automatic content generation
const episode = await episodesService.create({
  project_id: 'project-123',
  episode_number: 1,
  title: 'Pilot Episode',
  description: 'The beginning of our story',
  project_context: {
    title: 'My Series',
    genre: 'Sci-Fi',
    plotSummary: 'A story about...',
    characters: 'Main characters...'
  }
});

// Hashtags and caption are automatically generated and saved!
```

### 3. Manual Content Generation

**Endpoint**: `PUT /api/episodes/:id/generate-content`

**Frontend Service**:
```typescript
import { episodesService } from './apiServices';

// Manually generate hashtags and caption for existing episode
const content = await episodesService.generateContent(episodeId, projectContext);
// Returns: { hashtags: string[], caption: string }
```

## 📋 API Details

### Create Episode with Auto-Generation

**Request**:
```http
POST /api/episodes
Authorization: Bearer <token>
Content-Type: application/json

{
  "project_id": "project-123",
  "episode_number": 1,
  "title": "Pilot",
  "description": "First episode",
  "project_context": {
    "title": "My Series",
    "genre": "Sci-Fi",
    "plotSummary": "...",
    "characters": "..."
  }
}
```

**Response**:
```json
{
  "id": "episode-123",
  "message": "Episode created successfully"
}
```

**Note**: Hashtags and caption are generated in the background and saved to the episode automatically.

### Manual Generation

**Request**:
```http
PUT /api/episodes/:id/generate-content
Authorization: Bearer <token>
Content-Type: application/json

{
  "project_context": {
    "title": "My Series",
    "genre": "Sci-Fi",
    ...
  }
}
```

**Response**:
```json
{
  "hashtags": ["#scifi", "#pilot", "#newseries", ...],
  "caption": "🎬 The beginning of an epic journey..."
}
```

## 🎯 Usage in Frontend

### Creating Episode with Auto-Generation

```typescript
// In your component
const handleCreateEpisode = async () => {
  try {
    const episode = await episodesService.create({
      project_id: storyContext.id,
      episode_number: 1,
      title: 'Pilot',
      description: 'First episode',
      project_context: storyContext // Pass project context for auto-generation
    });
    
    // Hashtags and caption are automatically generated!
    alert('Episode created with auto-generated hashtags and caption!');
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Manual Generation for Existing Episodes

```typescript
const handleGenerateContent = async (episodeId: string) => {
  try {
    const content = await episodesService.generateContent(
      episodeId,
      storyContext
    );
    
    // Update episode with generated content
    await episodesService.update(episodeId, {
      hashtags: content.hashtags,
      caption: content.caption
    });
    
    alert('Hashtags and caption generated!');
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## 🎨 Tags UI

### Creating Tags

1. **Navigate to Dashboard**: Click on your username/profile
2. **Select Tags Tab**: Click "Tags" in the tab bar
3. **Create Tag**:
   - Enter tag name (e.g., "Action", "Drama", "Sci-Fi")
   - Select color using color picker
   - Click "Create Tag"

### Using Tags

1. **In Project Studio**: Click "Tags" button in header
2. **Select Tag**: Click on any available tag to add it to the project
3. **View Tags**: Tags appear with their colors in the project

## 🔧 Backend Implementation

### Automatic Generation Flow

1. Episode is created via `POST /api/episodes`
2. If `project_context` is provided:
   - Calls `generateEpisodeContent()` from Gemini service
   - Generates hashtags and caption using AI
   - Updates episode record with generated content
3. Returns episode ID (generation happens in background)

### Error Handling

- If generation fails, episode is still created
- Error is logged but doesn't fail the request
- User can manually generate content later

## 📊 Database Schema

### Episodes Table
- `hashtags` - JSON array of hashtags
- `caption` - TEXT field for social media caption

### Tags Table
- `id` - Primary key
- `name` - Tag name (unique)
- `color` - Hex color code

## 🚀 Next Steps

To use these features:

1. **Create Tags**: Go to User Dashboard → Tags tab
2. **Create Episodes**: Include `project_context` when creating episodes
3. **View Generated Content**: Check episode details for hashtags and caption
4. **Manual Generation**: Use `generateContent()` for existing episodes

## 💡 Tips

- **Tag Colors**: Use distinct colors for easy visual identification
- **Hashtags**: Generated hashtags are optimized for social media
- **Captions**: Captions include emojis and are formatted for Instagram/Twitter
- **Project Context**: More detailed context = better hashtags and captions

