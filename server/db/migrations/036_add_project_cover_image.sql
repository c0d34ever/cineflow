-- Add cover_image_id to projects table
-- This stores the media ID of the cover image, or NULL to use auto-generated character composite

ALTER TABLE projects 
ADD COLUMN cover_image_id VARCHAR(255) NULL,
ADD COLUMN cover_image_url VARCHAR(1000) NULL,
ADD COLUMN cover_imagekit_url VARCHAR(1000) NULL,
ADD INDEX idx_cover_image (cover_image_id);

-- Add foreign key constraint if media table exists
-- Note: This will be added after media table is confirmed to exist

