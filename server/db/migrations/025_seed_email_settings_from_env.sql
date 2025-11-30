-- Migration: 025_seed_email_settings_from_env
-- Description: Seed email settings from environment variables if they exist
-- Created: 2024-01-01
-- Note: This migration should be run after 024_add_email_settings
-- Environment variables are read by the application, not this SQL script
-- This is a placeholder migration that documents the seeding process

-- The actual seeding happens in the application code during startup
-- This migration file exists for documentation purposes

-- To seed from environment variables, the application should:
-- 1. Check if settings exist in system_email_settings
-- 2. If not, insert values from environment variables (if available)
-- 3. Encrypt sensitive values (smtp_password) before storing

-- Example application code (pseudo-code):
-- IF NOT EXISTS (SELECT 1 FROM system_email_settings WHERE setting_key = 'smtp_host' AND setting_value IS NOT NULL)
--   AND EXISTS (SELECT 1 FROM environment WHERE key = 'SMTP_HOST')
-- THEN
--   UPDATE system_email_settings SET setting_value = ENV('SMTP_HOST') WHERE setting_key = 'smtp_host';
-- END IF;

-- This migration does nothing but serves as documentation
SELECT 1;

