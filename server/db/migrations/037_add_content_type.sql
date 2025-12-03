-- Migration: 037_add_content_type
-- Description: Add content_type field to projects table for different content types (film, news, sports, etc.)
-- Created: 2024-12-02

ALTER TABLE projects
ADD COLUMN content_type VARCHAR(50) NULL AFTER genre,
ADD INDEX idx_content_type (content_type);

-- Update existing projects to have 'film' as default content type
UPDATE projects SET content_type = 'film' WHERE content_type IS NULL;

