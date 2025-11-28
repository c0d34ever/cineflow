# How Clips are Stored for Episodes

## 📺 Current Structure

### Database Hierarchy
```
Projects (Series/Shows)
  └── Episodes
       └── Clips (Scenes)
```

### Storage Details

**Clips are stored in the `scenes` table** with the following structure:

1. **Primary Storage**: `scenes` table
   - Each clip is a row in the `scenes` table
   - Clips are linked to episodes via `episode_id`
   - Also linked to projects via `project_id` (for backward compatibility)

2. **Clip Data Includes**:
   - `id` - Unique clip identifier
   - `episode_id` - Which episode this clip belongs to
   - `project_id` - Parent project (for backward compatibility)
   - `sequence_number` - Order within the episode
   - `raw_idea` - Original clip idea
   - `enhanced_prompt` - AI-enhanced production prompt
   - `context_summary` - Context for continuity
   - `status` - Clip status (planning/generating/completed/failed)

3. **Director Settings**: Stored in `scene_director_settings` table
   - Technical specifications per clip
   - Camera, lighting, sound, etc.

## 🔌 Endpoints for Clips

### ✅ All Endpoints Configured

#### Get Clips for Episode
```http
GET /api/clips/episode/:episodeId
```
Returns all clips for a specific episode, ordered by sequence number.

#### Get Single Clip
```http
GET /api/clips/:id
```
Returns a single clip with all its data and director settings.

#### Create Clip
```http
POST /api/clips
Authorization: Bearer <token>
Content-Type: application/json

{
  "episode_id": "episode-123",
  "sequence_number": 1,
  "raw_idea": "Hero enters the room",
  "enhanced_prompt": "Detailed production prompt...",
  "context_summary": "Context for next clip",
  "status": "completed",
  "director_settings": {
    "lens": "35mm",
    "angle": "Eye Level",
    "lighting": "Natural Cinematic",
    ...
  }
}
```

#### Update Clip
```http
PUT /api/clips/:id
Authorization: Bearer <token>
```
Update any clip properties including director settings.

#### Delete Clip
```http
DELETE /api/clips/:id
Authorization: Bearer <token>
```

#### Move Clip Between Episodes
```http
POST /api/clips/:id/move
Authorization: Bearer <token>
Content-Type: application/json

{
  "episode_id": "episode-456",
  "sequence_number": 5
}
```

## 📊 Example Workflow

### 1. Create Project (Series)
```typescript
const project = await apiService.saveProject({
  context: {
    id: 'series-1',
    title: 'My Series',
    genre: 'Sci-Fi',
    ...
  },
  scenes: [],
  settings: {}
});
```

### 2. Create Episode
```typescript
const episode = await episodesService.create({
  project_id: 'series-1',
  episode_number: 1,
  title: 'Pilot',
  description: 'First episode',
  status: 'draft'
});
```

### 3. Create Clips for Episode
```typescript
// Create multiple clips
for (let i = 1; i <= 10; i++) {
  await clipsService.create({
    episode_id: episode.id,
    sequence_number: i,
    raw_idea: `Clip ${i} idea`,
    enhanced_prompt: `Enhanced prompt for clip ${i}`,
    context_summary: `Context after clip ${i}`,
    status: 'completed',
    director_settings: {
      lens: '35mm',
      angle: 'Eye Level',
      lighting: 'Natural',
      ...
    }
  });
}
```

### 4. Retrieve Episode with All Clips
```typescript
const { episode, clips } = await episodesService.getById(episode.id);
// clips array contains all clips for this episode
```

## 🎨 Frontend Services

All clip operations are available in `apiServices.ts`:

```typescript
import { clipsService, episodesService } from './apiServices';

// Get all clips for an episode
const { clips } = await clipsService.getByEpisode(episodeId);

// Create a new clip
const newClip = await clipsService.create({
  episode_id: episodeId,
  sequence_number: 1,
  raw_idea: 'Hero enters',
  enhanced_prompt: '...',
  director_settings: { ... }
});

// Update clip
await clipsService.update(clipId, {
  raw_idea: 'Updated idea',
  status: 'completed'
});

// Move clip to different episode
await clipsService.move(clipId, newEpisodeId, 5);
```

## 📋 Data Flow

```
1. User creates Project (Series)
   ↓
2. User creates Episodes within Project
   ↓
3. User creates Clips within Episodes
   ↓
4. Clips stored in `scenes` table with `episode_id`
   ↓
5. Director settings stored in `scene_director_settings` table
```

## ✅ Summary

- ✅ **Clips are stored** in the `scenes` table
- ✅ **Linked to episodes** via `episode_id` column
- ✅ **All endpoints configured** for CRUD operations
- ✅ **Frontend services ready** in `apiServices.ts`
- ✅ **Can move clips** between episodes
- ✅ **Director settings** stored per clip
- ✅ **Sequence ordering** maintained per episode

## 🔄 Migration

The migration `010_add_episodes_table.sql` adds:
- `episodes` table
- `episode_id` column to `scenes` table
- Foreign key relationships

Run automatically on server start, or manually:
```bash
cd server
npm start
```

Everything is ready to use! 🚀

