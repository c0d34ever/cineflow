-- Migration: 012_add_project_templates
-- Description: Add project templates system
-- Created: 2024-01-01

-- Project templates table
CREATE TABLE IF NOT EXISTS project_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  genre VARCHAR(255),
  plot_summary TEXT,
  characters TEXT,
  initial_context TEXT,
  director_settings JSON,
  is_system_template BOOLEAN DEFAULT FALSE,
  created_by_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_is_system_template (is_system_template),
  INDEX idx_created_by_user_id (created_by_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

