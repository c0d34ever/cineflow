-- Migration: 010_add_episodes_table
-- Description: Add episodes table to organize clips/scenes into episodes
-- Created: 2024-01-01

-- Episodes table
CREATE TABLE IF NOT EXISTS episodes (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  episode_number INT NOT NULL,
  title VARCHAR(500),
  description TEXT,
  duration_seconds INT DEFAULT 0,
  air_date DATE NULL,
  status ENUM('draft', 'production', 'completed', 'archived') DEFAULT 'draft',
  thumbnail_url VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id),
  INDEX idx_episode_number (project_id, episode_number),
  INDEX idx_status (status),
  UNIQUE KEY unique_project_episode (project_id, episode_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add episode_id to scenes table (clips belong to episodes)
ALTER TABLE scenes 
ADD COLUMN episode_id VARCHAR(255) NULL AFTER project_id,
ADD FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL,
ADD INDEX idx_episode_id (episode_id);

-- Update sequence_number to be per-episode
-- Note: sequence_number is already per-project, we'll use it per-episode now

