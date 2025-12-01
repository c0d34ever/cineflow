-- Migration: 035_add_ai_generated_flag
-- Description: Add flag to track AI-generated content
-- Created: 2024-01-01

-- Add is_ai_generated column to scenes table
ALTER TABLE scenes 
ADD COLUMN is_ai_generated BOOLEAN DEFAULT FALSE COMMENT 'Indicates if content was AI-generated' AFTER status,
ADD INDEX idx_is_ai_generated (is_ai_generated);

-- Update existing scenes: mark as AI-generated if enhanced_prompt was generated (not just raw_idea)
-- This is a heuristic - if enhanced_prompt is significantly different/longer than raw_idea, it's likely AI-generated
UPDATE scenes 
SET is_ai_generated = TRUE 
WHERE LENGTH(enhanced_prompt) > LENGTH(raw_idea) * 1.5 
   OR enhanced_prompt LIKE '%VISUAL ACTION%'
   OR enhanced_prompt LIKE '%CAMERA & LENS%'
   OR enhanced_prompt LIKE '%LIGHTING & ATMOSPHERE%';

