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

    console.log('All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();