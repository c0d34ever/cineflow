-- Migration: 007_add_favorites_and_sharing
-- Description: Add favorites and project sharing
-- Created: 2024-01-01

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  project_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_project (user_id, project_id),
  INDEX idx_user_id (user_id),
  INDEX idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project sharing
CREATE TABLE IF NOT EXISTS project_shares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  shared_by_user_id INT NOT NULL,
  shared_with_user_id INT NULL,
  share_token VARCHAR(255) NOT NULL UNIQUE,
  access_level ENUM('view', 'edit', 'comment') DEFAULT 'view',
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_project_id (project_id),
  INDEX idx_share_token (share_token),
  INDEX idx_shared_with_user_id (shared_with_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add visibility to projects
ALTER TABLE projects 
ADD COLUMN visibility ENUM('private', 'public', 'shared') DEFAULT 'private' AFTER user_id,
ADD COLUMN is_featured BOOLEAN DEFAULT FALSE AFTER visibility,
ADD INDEX idx_visibility (visibility);

