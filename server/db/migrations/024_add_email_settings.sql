-- Migration: 024_add_email_settings
-- Description: Add system email settings table for SMTP configuration
-- Created: 2024-01-01

CREATE TABLE IF NOT EXISTS system_email_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NULL,
  description VARCHAR(500) NULL,
  is_encrypted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default email settings (will be populated from env if available)
INSERT INTO system_email_settings (setting_key, description, is_encrypted) VALUES
('smtp_host', 'SMTP server hostname (e.g., smtp.gmail.com)', FALSE),
('smtp_port', 'SMTP server port (e.g., 587)', FALSE),
('smtp_user', 'SMTP username/email', FALSE),
('smtp_password', 'SMTP password (encrypted)', TRUE),
('smtp_from', 'From email address (e.g., noreply@cineflow.com)', FALSE),
('smtp_service', 'SMTP service type (e.g., gmail) - optional', FALSE),
('smtp_encryption', 'SMTP encryption type (ssl, tls, or empty)', FALSE),
('frontend_url', 'Frontend URL for email links', FALSE),
('email_enabled', 'Enable/disable email functionality', FALSE)
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- Set default values if not provided
UPDATE system_email_settings SET setting_value = '587' WHERE setting_key = 'smtp_port' AND setting_value IS NULL;
UPDATE system_email_settings SET setting_value = 'noreply@cineflow.com' WHERE setting_key = 'smtp_from' AND setting_value IS NULL;
UPDATE system_email_settings SET setting_value = 'http://localhost:5173' WHERE setting_key = 'frontend_url' AND setting_value IS NULL;
UPDATE system_email_settings SET setting_value = 'false' WHERE setting_key = 'email_enabled' AND setting_value IS NULL;

