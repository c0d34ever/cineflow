-- Migration: 001_initial_schema
-- Description: Initial database schema for CineFlow AI
-- Created: 2024-01-01

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  genre VARCHAR(255),
  plot_summary TEXT,
  characters TEXT,
  initial_context TEXT,
  last_updated BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_last_updated (last_updated),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Scenes table
CREATE TABLE IF NOT EXISTS scenes (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  sequence_number INT NOT NULL,
  raw_idea TEXT NOT NULL,
  enhanced_prompt TEXT NOT NULL,
  context_summary TEXT,
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_sequence (project_id, sequence_number),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Director settings table (project-level)
CREATE TABLE IF NOT EXISTS director_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  custom_scene_id VARCHAR(100),
  lens VARCHAR(255),
  angle VARCHAR(255),
  lighting VARCHAR(255),
  movement VARCHAR(255),
  zoom VARCHAR(255),
  sound VARCHAR(500),
  dialogue TEXT,
  stunt_instructions TEXT,
  physics_focus BOOLEAN DEFAULT FALSE,
  style VARCHAR(100),
  transition VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_settings (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Scene director settings table (per-scene)
CREATE TABLE IF NOT EXISTS scene_director_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scene_id VARCHAR(255) NOT NULL,
  custom_scene_id VARCHAR(100),
  lens VARCHAR(255),
  angle VARCHAR(255),
  lighting VARCHAR(255),
  movement VARCHAR(255),
  zoom VARCHAR(255),
  sound VARCHAR(500),
  dialogue TEXT,
  stunt_instructions TEXT,
  physics_focus BOOLEAN DEFAULT FALSE,
  style VARCHAR(100),
  transition VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
  UNIQUE KEY unique_scene_settings (scene_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration tracking table
CREATE TABLE IF NOT EXISTS migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

