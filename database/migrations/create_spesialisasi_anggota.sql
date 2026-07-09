-- Migration untuk membuat tabel spesialisasi_anggota
-- File ini menjalankan pembuatan tabel spesialisasi_anggota

-- Drop tabel jika sudah ada
DROP TABLE IF EXISTS spesialisasi_anggota;

-- Buat tabel spesialisasi_anggota
CREATE TABLE spesialisasi_anggota (
  id INT PRIMARY KEY AUTO_INCREMENT,
  anggota_id INT NOT NULL,
  spesialisasi_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (anggota_id) REFERENCES anggota(id) ON DELETE CASCADE,
  FOREIGN KEY (spesialisasi_id) REFERENCES master_spesialisasi(id) ON DELETE CASCADE,
  INDEX idx_anggota_id (anggota_id),
  INDEX idx_spesialisasi_id (spesialisasi_id),
  UNIQUE KEY unique_anggota_spesialisasi (anggota_id, spesialisasi_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert data sample (optional)
-- INSERT INTO spesialisasi_anggota (anggota_id, spesialisasi_id) VALUES
-- (1, 1),
-- (1, 2);