-- Migration: 018_add_episode_content
-- Description: Add hashtags and caption fields to episodes
-- Created: 2024-01-01

-- Add hashtags and caption to episodes
ALTER TABLE episodes 
ADD COLUMN hashtags JSON NULL AFTER thumbnail_url,
ADD COLUMN caption TEXT NULL AFTER hashtags;

