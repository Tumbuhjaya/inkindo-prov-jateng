-- Modify master_retribusi table to have only kualifikasi and nominal fields
-- First, let's see the current table structure
-- DESCRIBE master_retribusi;

-- Drop existing table if it exists and recreate with new structure
DROP TABLE IF EXISTS master_retribusi;

CREATE TABLE master_retribusi (
  id INT PRIMARY KEY AUTO_INCREMENT,
  kualifikasi ENUM('B', 'M', 'K') NOT NULL COMMENT 'B: Besar, M: Menengah, K: Kecil',
  nominal DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

-- Insert sample data
INSERT INTO master_retribusi (kualifikasi, nominal) VALUES
('B', 5000000.00),
('M', 3000000.00),
('K', 1500000.00);