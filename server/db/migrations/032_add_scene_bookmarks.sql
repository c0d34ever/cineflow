-- Migration: 032_add_scene_bookmarks
-- Description: Add scene bookmarks system
-- Created: 2024-01-01

-- Scene bookmarks table
CREATE TABLE IF NOT EXISTS scene_bookmarks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  project_id VARCHAR(255) NOT NULL,
  scene_id VARCHAR(255) NOT NULL,
  category VARCHAR(50) DEFAULT 'general', -- 'general', 'important', 'review', 'edit'
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY idx_unique_bookmark (user_id, project_id, scene_id),
  INDEX idx_user_id (user_id),
  INDEX idx_project_id (project_id),
  INDEX idx_scene_id (scene_id),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

