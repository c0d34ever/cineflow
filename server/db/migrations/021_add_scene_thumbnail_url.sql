-- Migration: 021_add_scene_thumbnail_url
-- Description: Add thumbnail_url column to scenes table for quick access to primary image
-- Created: 2024-01-01

ALTER TABLE scenes
ADD COLUMN thumbnail_url VARCHAR(1000) NULL AFTER context_summary,
ADD INDEX idx_thumbnail_url (thumbnail_url(255));

