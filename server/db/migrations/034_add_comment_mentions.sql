-- Migration: 034_add_comment_mentions
-- Description: Add @mentions support to comments
-- Created: 2024-01-01

-- Add mentions column to project_comments
ALTER TABLE project_comments 
ADD COLUMN mentions JSON NULL COMMENT 'Array of mentioned user IDs' AFTER content,
ADD COLUMN parent_comment_id INT NULL COMMENT 'For threaded replies' AFTER mentions,
ADD COLUMN scene_id VARCHAR(255) NULL COMMENT 'For scene-specific comments' AFTER parent_comment_id,
ADD INDEX idx_parent_comment_id (parent_comment_id),
ADD INDEX idx_scene_id (scene_id),
ADD FOREIGN KEY (parent_comment_id) REFERENCES project_comments(id) ON DELETE CASCADE,
ADD FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE;

-- Create comment_mentions table for tracking mentions
CREATE TABLE IF NOT EXISTS comment_mentions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comment_id INT NOT NULL,
  mentioned_user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comment_id) REFERENCES project_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (mentioned_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY idx_unique_mention (comment_id, mentioned_user_id),
  INDEX idx_mentioned_user_id (mentioned_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

