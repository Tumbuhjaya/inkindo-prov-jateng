var connection = require('../database').connection;
var express = require('express');
var router = express.Router();
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , static = require('serve-static')
  , bodyParser = require('body-parser')
  , cookieParser = require('cookie-parser')
  , path = require('path');
  var sql_enak = require('../database/mysql_enak.js').connection;
  var cek_login = require('./login').cek_login;
var dbgeo = require("dbgeo");
var multer = require("multer");
var st = require('knex-postgis')(sql_enak);
var deasync = require('deasync');
const importExcel = require("convert-excel-to-json");
path.join(__dirname, '/public/foto')
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(cookieParser() );
router.use(passport.initialize());
router.use(passport.session());
let table = 'anggota'
let primary_key = 'id'
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

router.get('/',cek_login, function(req, res) {
           res.render('content-backoffice/anggota/list',{user:req.user[0]});
});

router.get('/insert', cek_login, function(req, res) {
    res.render('content-backoffice/anggota/insert',{user:req.user[0]});
});

router.get('/edit/:id', cek_login, function(req, res) {
     res.render('content-backoffice/anggota/edit', {id : req.params.id,user:req.user[0]});
  })

  router.post('/insert', upload.fields([{ name: 'foto', maxCount: 1 }]),async function(req, res) {

    let post = req.body
    console.log(post);
         try {



    let sql2 = `SELECT  *  FROM anggota p where no_anggota = ? `
    let anggota_cek =await sql_enak.raw(sql2,[post["no_anggota"]])
    console.log(anggota_cek);

    if (anggota_cek[0].length==0) {

   if (req.files) {
    if (req.files['foto']) {
      var nama_file = req.files['foto'][0].filename;
      post['foto'] = nama_file;
    }
  }
      await sql_enak.insert(post).into('anggota').then(data=>{
      res.status(200).json({ status: 200, message: "sukses", data: data})
   })
   .catch(err=>{
            console.log('error err');

    console.log(err,'err');
      res.status(500).json({ status: 500, message: "gagal", data: err})
   })

  }else{
        console.log('error else');

    res.status(201).json({ status: 201, message: "gagal", data: 'No Anggota Telah Terpakai'})

  }
  } catch (error) {
    console.log('error_chatch');

        console.log(error,'error');

          res.status(500).json({ status: 500, message: "gagal", data: error})

  }
  });

  router.post('/edit', upload.fields([{ name: 'foto', maxCount: 1 }]),async function(req, res) {

    let post = req.body

    if (post.no_anggota) {
        let sql2 = `SELECT  *  FROM anggota p where no_anggota = ? and id != ?`
        let anggota_cek =await sql_enak.raw(sql2,[post["no_anggota"],post['id']])
            if (anggota_cek[0].length > 0) {
                  res.status(500).json({ status: 500, message: "gagal", data: 'No Anggota Telah Terpakai'})
                  return
            }
    }
    if (req.files) {
      if (req.files['foto']) {
        var nama_file = req.files['foto'][0].filename;
        post['foto'] = nama_file;
      }
    }
    try {
      console.log('data');

      await sql_enak('anggota').where('id','=',post.id).update(post).then(data=>{
        console.log('data2');

        console.log(data);

        res.status(200).json({ status: 200, message: "sukses", data: data})
     })
    } catch (error) {
      console.log('error');

      console.log(error);

      res.status(500).json({ status: 500, message: "gagal", data: error})
    }

  })
  router.get('/hapus/:id',async function(req, res) {
    await sql_enak('anggota').where('id','=',req.params.id).update({deleted_at: new Date()}).then(data=>{
      res.status(200).json({ status: 200, message: "sukses", data: data[0]})
   })
   .catch(err=>{
      res.status(500).json({ status: 500, message: "gagal", data: err})
   })
  })
  router.get('/list',async function(req, res) {
    let value = []
    let str =''
    let a = `  *   `
    if (req.query.id) {
        str += ' and p.id = ?'
        value.push(req.query.id)
    }
      str+='  ORDER BY p.id DESC '

    if (req.query.limit) {
      str += ` limit ? `
      value.push(req.query.limit)

    }
    if (req.query.offset) {
      str += ` offset ? `
      value.push(req.query.offset)
    }

    let sql = `SELECT  ${a}  FROM anggota p WHERE p.deleted_at is null  `+str
    await sql_enak.raw(sql,value).then(data=>{
        res.status(200).json({ status: 200, message: "sukses", data: data[0]})
     })
     .catch(err=>{
      console.log(err);
        res.status(500).json({ status: 500, message: "gagal", data: err})
     })
  })
  router.post('/import', upload.fields([{ name: 'file_excel', maxCount: 1 }]), async function(req, res){
    console.log(req.files, req.body);

    try {
      if (req.files) {
        if (req.files['file_excel']) {
          let file = req.files.file_excel[0];
          let hasil = await importExcel({
            sourceFile: file.path,
            header: { rows: 1 },
            columnToKey: {
              C: "no_anggota",
              D: "nama_perusahaan",
              E: "penanggung_jawab",
              F: "tanggal_lahir",
              G: "gelar_pjbu",
              H: "alamat",
              I: "kota",
              J: "kode_kota",
              K: "korwil",
              L: "telepon",
              M: "fax",
              N: "status_keanggotaan",
              O: "disyahkan",
              R: "yang_hadir",
              S: "di_undang",
              T: "pelantikan",
              Z: "nomor_hp_pjbu",
              AA: "email_kta",
              AC: "no_sertifikat",
              AD: "waktu_penataran",
              AE: "memiliki_sertifikat_kode_etik",
              AF: "kta_2020",
              AG: "kualifikasi",
              AO: "jumlah_tunggakan",
              AQ: "ket_tunggakan",
              U: "iuran2021",
              V: "iuran2022",
              W: "iuran2023",
              X: "iuran2024",
              Y: "iuran2025"
            },
            sheets: ["JUNI"],
          });

          let result = hasil["JUNI"];
          let arr = [];
          let pesan = 'Sukses';
          let successCount = 0;
          let errorCount = 0;

          for (let i = 0; i < result.length; i++) {
            let row = result[i];

            // Skip jika no_anggota kosong
            if (!row.no_anggota) {
              console.log('Skip row ' + (i + 1) + ' - no_anggota kosong');
              errorCount++;
              continue;
            }

            // Skip jika nama_perusahaan kosong
            if (!row.nama_perusahaan) {
              console.log('Skip row ' + (i + 1) + ' - nama_perusahaan kosong');
              errorCount++;
              continue;
            }

            let post = {};
            post.no_anggota = row.no_anggota;
            post.nama_perusahaan = row.nama_perusahaan;
            post.penanggung_jawab = row.penanggung_jawab;
            post.gelar_pjbu = row.gelar_pjbu;
            post.tanggal_lahir = row.tanggal_lahir;
            post.alamat = row.alamat;
            post.kota = row.kota;
            post.kode_kota = row.kode_kota;
            post.korwil = row.korwil;
            post.telepon = row.telepon;
            post.fax = row.fax;
            post.status_keanggotaan = row.status_keanggotaan;
            post.disyahkan = row.disyahkan;
            post.yang_hadir = row.yang_hadir;
            post.di_undang = row.di_undang;
            post.pelantikan = row.pelantikan;
            post.nomor_hp_pjbu = row.nomor_hp_pjbu;
            post.email_kta = row.email_kta;
            post.no_sertifikat = row.no_sertifikat;
            post.waktu_penataran = row.waktu_penataran;
            post.memiliki_sertifikat_kode_etik = row.memiliki_sertifikat_kode_etik;
            post.kta_2020 = row.kta_2020;
            post.kualifikasi = row.kualifikasi;
            post.jumlah_tunggakan = row.jumlah_tunggakan || 0;
            post.ket_tunggakan = row.ket_tunggakan;

            let anggotaId;

            // Cek apakah anggota sudah ada
            let existing = await sql_enak("anggota")
              .where("no_anggota", row.no_anggota)
              .first();

            if (existing) {
              // Update anggota yang sudah ada
              await sql_enak("anggota")
                .where("id", existing.id)
                .update(post).then(function() {
                  successCount++;
                  anggotaId = existing.id;

                  // Update iuran tahunan
                  for (let tahun = 2021; tahun <= 2025; tahun++) {
                    let iuranKey = 'iuran' + tahun;
                    let statusIuran = row[iuranKey];

                    if (statusIuran) {
                      sql_enak("iuran_tahunan")
                        .where({
                          anggota_id: anggotaId,
                          tahun: tahun
                        })
                        .first()
                        .then(function(cek) {
                          if (cek) {
                            return sql_enak("iuran_tahunan")
                              .where("id", cek.id)
                              .update({status_pembayaran: statusIuran});
                          } else {
                            return sql_enak.insert({
                              anggota_id: anggotaId,
                              tahun: tahun,
                              status_pembayaran: statusIuran
                            }).into("iuran_tahunan");
                          }
                        })
                        .catch(function(err) {
                          console.log('Error update iuran:', err);
                        });
                    }
                  }
                })
                .catch(function(err) {
                  console.log('Error update anggota:', err);
                  errorCount++;
                });
            } else {
              // Insert anggota baru
              await sql_enak.insert(post).into("anggota").then(async function(hsl) {
                anggotaId = hsl[0];
                arr.push(anggotaId);
                successCount++;

                // Insert iuran tahunan
                for (let tahun = 2021; tahun <= 2025; tahun++) {
                  let iuranKey = 'iuran' + tahun;
                  let statusIuran = row[iuranKey];

                  if (statusIuran) {
                    await sql_enak.insert({
                      anggota_id: anggotaId,
                      tahun: tahun,
                      status_pembayaran: statusIuran
                    }).into("iuran_tahunan").catch(function(err) {
                      console.log('Error insert iuran:', err);
                    });
                  }
                }
              }).catch(function(err) {
                console.log('Error insert anggota:', err);
                pesan = 'Error, terjadi kesalahan upload pada baris ' + (i + 1);
                errorCount++;
              });
            }
          }

          console.log('Import selesai: ' + successCount + ' berhasil, ' + errorCount + ' error');

          if (pesan == 'Sukses') {
            res.json({status: 200, message: 'Import berhasil. ' + successCount + ' data diproses, ' + errorCount + ' error'});
          } else {
            // Rollback data yang sudah diinsert
            for (let k = 0; k < arr.length; k++) {
              await sql_enak('anggota').where('id', arr[k]).del();
              await sql_enak('iuran_tahunan').where('anggota_id', arr[k]).del();
            }
            res.json({status: 500, message: pesan});
          }
        } else {
          res.json({status: 400, message: 'File tidak ditemukan'});
        }
      } else {
        res.json({status: 400, message: 'Error upload'});
      }
    } catch (error) {
      console.log(error);
      res.status(500).send('Internal Server Error: ' + error.message);
    }
  });
module.exports = router;