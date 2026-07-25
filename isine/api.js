var connection = require('../database').connection;
var express = require('express');
var router = express.Router();
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , static = require('serve-static')
  , bodyParser = require('body-parser')
  , cookieParser = require('cookie-parser')
  , path = require('path')
  ,  sha1 = require('sha1');
  var sql_enak = require('../database/mysql_enak.js').connection;
  var cek_login = require('./login').cek_login;
  var cek_login_google = require('./login').cek_login_google;
  var dbgeo = require("dbgeo");
  var multer = require("multer");
  var st = require('knex-postgis')(sql_enak);
  var deasync = require('deasync');
  path.join(__dirname, '/public/foto')
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({ extended: true }));
  router.use(cookieParser() );
  router.use(passport.initialize());
  router.use(passport.session());
  let table = 'kategori'
  router.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});
// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  console.log('Time: ', Date.now());
  next();
});

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/foto/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now()+'-'+file.originalname)
  }
})

var upload = multer({ storage: storage })

//start-------------------------------------


router.post('/tagihan',async function(req, res) {
    let {tahun,g,s} = req.body
let sql = `select sum(p.retribusi ) as y  from pembayaran p where p.deleted_at is null `
  let v = []
  if (tahun) {
    sql += ' and p.tahun = ? '
    v.push(tahun)
  }
  if (s) {
    sql += ' and p.status = ? '
    v.push(s)
  }
try {
    let data = await sql_enak.raw(sql,v)
  
    res.json({status:200,pesan:'sukses',data:data[0]}) 
  } catch (error) {
    console.log(error);
    res.json({status:500,pesan:'gagal',data:error}) 
  }
})
// Di router endpoint
router.post('/chart_tagihan', async function(req, res) {
    let {tahun, g, s} = req.body;
    
    // Jika tahun tidak diberikan, gunakan tahun sekarang
    if (!tahun) {
        tahun = new Date().getFullYear();
    }

    let baseSql = `select COALESCE(sum(p.retribusi), 0) as y, 
                   month(p.tanggal_pembayaran) as label 
                   from pembayaran p 
                   left join anggota a on a.id = p.anggota_id and a.deleted_at is null 
                   where p.deleted_at is null 
                   and a.id is not null 
                   and status = 1 
                   and year(p.tanggal_pembayaran) = ?`;

    let v = [tahun];

    // Tambahkan filter tambahan jika ada
    if (g) {
        baseSql += ' and a.golongan = ? ';
        v.push(g);
    }
    if (s) {
        baseSql += ' and a.sektor = ? ';
        v.push(s);
    }

    let K = baseSql + ` and a.kualifikasi = 'K' group by label order by label`;
    let M = baseSql + ` and a.kualifikasi = 'M' group by label order by label`;
    let B = baseSql + ` and a.kualifikasi = 'B' group by label order by label`;

    try {
        let dataK = await sql_enak.raw(K, v);
        let dataM = await sql_enak.raw(M, v);
        let dataB = await sql_enak.raw(B, v);

        // Pastikan semua 12 bulan ada
        let months = Array.from({length: 12}, (_, i) => i + 1);
        
        dataK[0] = fillMissingMonths(dataK[0], months);
        dataM[0] = fillMissingMonths(dataM[0], months);
        dataB[0] = fillMissingMonths(dataB[0], months);

        res.json({
            status: 200,
            pesan: 'sukses',
            dataB: dataB[0],
            dataM: dataM[0],
            dataK: dataK[0]
        });
    } catch (error) {
        console.log(error);
        res.json({
            status: 500,
            pesan: 'gagal',
            data: error
        });
    }
});

// Fungsi untuk mengisi bulan yang hilang
function fillMissingMonths(data, allMonths) {
    let dataMap = {};
    data.forEach(item => {
        dataMap[item.label] = item.y;
    });

    return allMonths.map(month => ({
        label: month,
        y: dataMap[month] || 0
    }));
}
module.exports = router;
