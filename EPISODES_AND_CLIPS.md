# Episodes & Clips Management

## 📺 Structure

```
Project/Series
  └── Episodes
       └── Clips (Scenes)
```

## 🗄️ Database Structure

### Episodes Table
- `id` - Unique episode ID
- `project_id` - Parent project/series
- `episode_number` - Episode number in series
- `title` - Episode title
- `description` - Episode description
- `duration_seconds` - Total duration
- `air_date` - Air date
- `status` - draft/production/completed/archived
- `thumbnail_url` - Episode thumbnail

### Clips (Scenes) Table
- `id` - Unique clip ID
- `project_id` - Parent project (for backward compatibility)
- `episode_id` - Parent episode (NEW)
- `sequence_number` - Order in episode
- `raw_idea` - Original idea
- `enhanced_prompt` - AI-enhanced prompt
- `context_summary` - Context for next clip
- `status` - Clip status

## 🔌 API Endpoints

### Episodes

#### Get Episodes for Project
```http
GET /api/episodes/project/:projectId
```

Response:
```json
{
  "episodes": [
    {
      "id": "episode-123",
      "project_id": "project-456",
      "episode_number": 1,
      "title": "Pilot",
      "description": "First episode",
      "clip_count": 15,
      "completed_clips": 12,
      "status": "production"
    }
  ]
}
```

#### Get Single Episode with Clips
```http
GET /api/episodes/:id
```

Response:
```json
{
  "episode": {
    "id": "episode-123",
    "title": "Pilot",
    ...
  },
  "clips": [
    {
      "id": "clip-789",
      "sequence_number": 1,
      "raw_idea": "...",
      ...
    }
  ]
}
```

#### Create Episode
```http
POST /api/episodes
Authorization: Bearer <token>
Content-Type: application/json

{
  "project_id": "project-456",
  "episode_number": 1,
  "title": "Pilot Episode",
  "description": "The beginning",
  "duration_seconds": 1800,
  "air_date": "2024-01-15",
  "status": "draft"
}
```

#### Update Episode
```http
PUT /api/episodes/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "completed"
}
```

#### Delete Episode
```http
DELETE /api/episodes/:id
Authorization: Bearer <token>
```

### Clips

#### Get Clips for Episode
```http
GET /api/clips/episode/:episodeId
```

Response:
```json
{
  "clips": [
    {
      "id": "clip-789",
      "episode_id": "episode-123",
      "sequence_number": 1,
      "raw_idea": "Hero enters the room",
      "enhanced_prompt": "...",
      "status": "completed",
      ...
    }
  ]
}
```

#### Get Single Clip
```http
GET /api/clips/:id
```

#### Create Clip
```http
POST /api/clips
Authorization: Bearer <token>
Content-Type: application/json

{
  "episode_id": "episode-123",
  "sequence_number": 1,
  "raw_idea": "Hero enters the room",
  "enhanced_prompt": "Detailed prompt...",
  "context_summary": "Context for next clip",
  "status": "completed",
  "director_settings": {
    "lens": "35mm",
    "angle": "Eye Level",
    ...
  }
}
```

#### Update Clip
```http
PUT /api/clips/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "raw_idea": "Updated idea",
  "status": "completed"
}
```

#### Delete Clip
```http
DELETE /api/clips/:id
Authorization: Bearer <token>
```

#### Move Clip to Different Episode
```http
POST /api/clips/:id/move
Authorization: Bearer <token>
Content-Type: application/json

{
  "episode_id": "episode-456",
  "sequence_number": 5
}
```

## 🎨 Frontend Usage

### Using Episodes Service

```typescript
import { episodesService, clipsService } from './apiServices';

// Get all episodes for a project
const { episodes } = await episodesService.getByProject(projectId);

// Get episode with clips
const { episode, clips } = await episodesService.getById(episodeId);

// Create episode
const newEpisode = await episodesService.create({
  project_id: projectId,
  episode_number: 1,
  title: 'Pilot',
  description: 'First episode',
  status: 'draft'
});

// Update episode
await episodesService.update(episodeId, {
  status: 'completed',
  duration_seconds: 1800
});
```

### Using Clips Service

```typescript
// Get clips for episode
const { clips } = await clipsService.getByEpisode(episodeId);

// Create clip
const newClip = await clipsService.create({
  episode_id: episodeId,
  sequence_number: 1,
  raw_idea: 'Hero enters',
  enhanced_prompt: '...',
  director_settings: {
    lens: '35mm',
    angle: 'Eye Level',
    ...
  }
});

// Update clip
await clipsService.update(clipId, {
  raw_idea: 'Updated idea',
  status: 'completed'
});

// Move clip to different episode
await clipsService.move(clipId, newEpisodeId, 5);
```

## 📋 Workflow Example

### Creating a Series with Episodes and Clips

```typescript
// 1. Create project
const project = await apiService.saveProject({
  context: { id: 'project-1', title: 'My Series', ... },
  scenes: [],
  settings: {}
});

// 2. Create episode
const episode = await episodesService.create({
  project_id: 'project-1',
  episode_number: 1,
  title: 'Pilot',
  status: 'draft'
});

// 3. Create clips for episode
for (let i = 1; i <= 10; i++) {
  await clipsService.create({
    episode_id: episode.id,
    sequence_number: i,
    raw_idea: `Clip ${i} idea`,
    enhanced_prompt: `Enhanced prompt for clip ${i}`,
    status: 'completed'
  });
}

// 4. Get episode with all clips
const { episode: fullEpisode, clips } = await episodesService.getById(episode.id);
```

## 🔄 Migration

The migration adds:
- `episodes` table
- `episode_id` column to `scenes` table
- Foreign key relationships

Run migrations:
```bash
cd server
npm start  # Migrations run automatically
```

## 📊 Data Model

```
projects (Series/Shows)
  ├── episodes
  │     ├── clips (scenes)
  │     └── clips (scenes)
  └── episodes
        └── clips (scenes)
```

## ✅ Features

- ✅ Organize clips into episodes
- ✅ Episode numbering and ordering
- ✅ Episode status tracking
- ✅ Move clips between episodes
- ✅ Episode metadata (title, description, air date)
- ✅ Clip count per episode
- ✅ Backward compatible (clips can still link to project directly)

