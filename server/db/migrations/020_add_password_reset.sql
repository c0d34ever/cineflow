-- Migration: 020_add_password_reset
-- Description: Add password reset functionality to users table
-- Created: 2024-01-01

ALTER TABLE users 
ADD COLUMN password_reset_token VARCHAR(255) NULL AFTER password_hash,
ADD COLUMN password_reset_expires TIMESTAMP NULL AFTER password_reset_token,
ADD INDEX idx_password_reset_token (password_reset_token);

