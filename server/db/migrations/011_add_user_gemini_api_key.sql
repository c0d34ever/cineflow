-- Migration: 011_add_user_gemini_api_key
-- Description: Add user-specific Gemini API key storage
-- Created: 2024-01-01

-- Add user_gemini_api_key to user_settings table
ALTER TABLE user_settings 
ADD COLUMN user_gemini_api_key VARCHAR(255) NULL AFTER preferences,
ADD INDEX idx_user_gemini_api_key (user_gemini_api_key);

-- Alternative: Add directly to users table if preferred
-- ALTER TABLE users 
-- ADD COLUMN gemini_api_key VARCHAR(255) NULL AFTER password_hash;

