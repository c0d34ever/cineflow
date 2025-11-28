-- Migration: 016_add_project_archiving
-- Description: Add project archiving functionality
-- Created: 2024-01-01

-- Add archived flag to projects
ALTER TABLE projects 
ADD COLUMN is_archived BOOLEAN DEFAULT FALSE AFTER visibility,
ADD COLUMN archived_at TIMESTAMP NULL AFTER is_archived,
ADD INDEX idx_is_archived (is_archived);

