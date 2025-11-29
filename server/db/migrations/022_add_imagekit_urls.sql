-- Migration: 022_add_imagekit_urls
-- Description: Add ImageKit URL columns to media table for CDN storage
-- Created: 2024-01-01

ALTER TABLE media
ADD COLUMN imagekit_url VARCHAR(500) NULL AFTER thumbnail_path,
ADD COLUMN imagekit_thumbnail_url VARCHAR(500) NULL AFTER imagekit_url,
ADD COLUMN imagekit_file_id VARCHAR(100) NULL AFTER imagekit_thumbnail_url;

CREATE INDEX idx_imagekit_file_id ON media (imagekit_file_id);

