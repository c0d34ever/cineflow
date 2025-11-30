-- Migration: 030_add_project_versions
-- Description: Add project version history for rollback functionality
-- Created: 2024-11-30

-- Project versions table
CREATE TABLE IF NOT EXISTS project_versions (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  version_number INT NOT NULL,
  context JSON NOT NULL,
  scenes JSON NOT NULL,
  settings JSON NOT NULL,
  note TEXT,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_project_id (project_id),
  INDEX idx_created_at (created_at),
  UNIQUE KEY unique_project_version (project_id, version_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

