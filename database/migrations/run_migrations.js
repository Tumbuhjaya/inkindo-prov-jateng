var sql_enak = require('../mysql_enak.js').connection;
var fs = require('fs');

async function runMigrations() {
  try {
    console.log('Running migrations...');

    // Run master_retribusi migration
    console.log('Running master_retribusi migration...');

    // Drop and recreate master_retribusi table
    await sql_enak.raw('DROP TABLE IF EXISTS master_retribusi');
    await sql_enak.raw(`
      CREATE TABLE master_retribusi (
        id INT PRIMARY KEY AUTO_INCREMENT,
        kualifikasi ENUM('B', 'M', 'K') NOT NULL COMMENT 'B: Besar, M: Menengah, K: Kecil',
        nominal DECIMAL(15, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL
      )
    `);
    await sql_enak.raw(`
      INSERT INTO master_retribusi (kualifikasi, nominal) VALUES
      ('B', 5000000.00),
      ('M', 3000000.00),
      ('K', 1500000.00)
    `);
    console.log('master_retribusi migration completed.');

    // Run master_spesialisasi migration
    console.log('Running master_spesialisasi migration...');

    // Drop and recreate master_spesialisasi table
    await sql_enak.raw('DROP TABLE IF EXISTS master_spesialisasi');
    await sql_enak.raw(`
      CREATE TABLE master_spesialisasi (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nama_spesialisasi VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL
      )
    `);
    await sql_enak.raw(`
      INSERT INTO master_spesialisasi (nama_spesialisasi) VALUES
      ('Perencanaan Struktural'),
      ('Perencanaan Arsitektur'),
      ('Perencanaan MEP'),
      ('Perencanaan Transportasi'),
      ('Perencanaan Sipil'),
      ('Perencanaan Interior'),
      ('Konservasi Bangunan'),
      ('Perencanaan Lansekap')
    `);
    console.log('master_spesialisasi migration completed.');

    // Run spesialisasi_anggota migration
    console.log('Running spesialisasi_anggota migration...');

    // Drop and recreate spesialisasi_anggota table
    await sql_enak.raw('DROP TABLE IF EXISTS spesialisasi_anggota');
    await sql_enak.raw(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('spesialisasi_anggota migration completed.');

    console.log('All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();