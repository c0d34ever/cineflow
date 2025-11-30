-- Migration: 031_add_character_relationships_table
-- Description: Add table to store AI-analyzed character relationships
-- Created: 2024-11-30

-- Character relationships table
CREATE TABLE IF NOT EXISTS character_relationships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  character1 VARCHAR(255) NOT NULL,
  character2 VARCHAR(255) NOT NULL,
  relationship_type ENUM('allies', 'enemies', 'neutral', 'romantic', 'family') NOT NULL DEFAULT 'neutral',
  strength DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  description TEXT,
  scenes JSON,
  analysis_method ENUM('ai', 'keyword') NOT NULL DEFAULT 'keyword',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id),
  INDEX idx_characters (character1, character2),
  UNIQUE KEY unique_relationship (project_id, character1, character2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

