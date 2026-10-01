-- ====================================================================
-- MapRank Agency — Production MySQL Database Schema
-- Agency: MapRank (GMB & Local SEO Agency)
-- Founder: Arsalan Abbas
-- ====================================================================

-- Create Database (if needed)
CREATE DATABASE IF NOT EXISTS maprank_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE maprank_db;

-- --------------------------------------------------------------------
-- 1. Table: inquiries
-- Stores all client project inquiries and lead submissions
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  business_name VARCHAR(150) NOT NULL,
  website VARCHAR(255) DEFAULT NULL,
  service VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  file_path VARCHAR(255) DEFAULT NULL,
  file_original_name VARCHAR(255) DEFAULT NULL,
  status ENUM('New', 'Contacted', 'In Progress', 'Completed', 'Closed') NOT NULL DEFAULT 'New',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 2. Table: admins
-- Stores agency administrative credentials with secure bcrypt password hashes
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) DEFAULT 'Arsalan Abbas',
  email VARCHAR(150) DEFAULT 'abbasarsalan462@gmail.com',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- Default Admin Account:
-- Username: arsalan
-- Password: MapRank2026!
-- Hash below generated with bcrypt (10 rounds) for "MapRank2026!"
-- --------------------------------------------------------------------
INSERT INTO admins (username, password_hash, full_name, email)
SELECT 'arsalan', '$2a$10$wK1jU8N30oU1qZ5oF6yE5OaO.tPj8qK7G6uB4w0fK9t6t1.rD5Y5G', 'Arsalan Abbas', 'abbasarsalan462@gmail.com'
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE username = 'arsalan');
