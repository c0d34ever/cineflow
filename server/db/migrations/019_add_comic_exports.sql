-- Migration: 019_add_comic_exports
-- Description: Add table to store generated comic book exports
-- Created: 2024-01-15

CREATE TABLE IF NOT EXISTS comic_exports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  episode_id VARCHAR(255) NULL,
  comic_content TEXT NOT NULL,
  html_content LONGTEXT NOT NULL,
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id),
  INDEX idx_episode_id (episode_id),
  INDEX idx_created_at (created_at),
  UNIQUE KEY unique_project_episode (project_id, episode_id, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

