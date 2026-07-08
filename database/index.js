
/*
 * GET home page.
 */
// import database

 var mysql      = require('mysql');

module.exports.connection = mysql.createPool({
  host     : '147.139.167.33',
  user     : 'root',
  port	   : '3306',
  password : 'Grafika9',
  database : '2026_inkindo_prov_jateng',
  connectionLimit: 100, // Maksimum koneksi
  waitForConnections: true, // Tunggu koneksi tersedia
  queueLimit: 0, // Unlimited queue
  connectTimeout: 60000, // 60 seconds untuk koneksi
  acquireTimeout: 60000, // 60 seconds untuk mendapatkan koneksi dari pool
  timeout: 60000, // 60 seconds untuk query
  enableKeepAlive: true, // TCP Keep-alive
  keepAliveInitialDelay: 30000 // 30 seconds initial delay
});
