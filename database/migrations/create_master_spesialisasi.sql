-- Create master_spesialisasi table
DROP TABLE IF EXISTS master_spesialisasi;

CREATE TABLE master_spesialisasi (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nama_spesialisasi VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

-- Insert sample data
INSERT INTO master_spesialisasi (nama_spesialisasi) VALUES
('Perencanaan Struktural'),
('Perencanaan Arsitektur'),
('Perencanaan MEP'),
('Perencanaan Transportasi'),
('Perencanaan Sipil'),
('Perencanaan Interior'),
('Konservasi Bangunan'),
('Perencanaan Lansekap');