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

router.get('/pembayaran/:id', cek_login, async function(req, res) {
    try {
        const anggotaId = req.params.id;

        // Get data anggota
        const anggota = await sql_enak('anggota')
            .where('id', anggotaId)
            .where('deleted_at', null)
            .first();

        if (!anggota) {
            return res.status(404).render('error', { message: 'Anggota not found' });
        }

        res.render('content-backoffice/anggota/pembayaran', {
            user: req.user[0],
            anggota: anggota,
            anggotaId: anggotaId
        });
    } catch (err) {
        console.error('Error in pembayaran route:', err);
        res.status(500).render('error', { message: err.message });
    }
})

// ==================== ANGGOTA DETAIL API (Frontend) ====================

// API untuk search anggota by nama perusahaan (untutk frontend)
router.get('/search', async function(req, res) {
    try {
        const searchQuery = req.query.q;

        if (!searchQuery) {
            return res.status(400).json({
                status: 400,
                message: "Search query is required",
                data: []
            });
        }

        const data = await sql_enak('anggota')
            .where('deleted_at', null)
            .where('nama_perusahaan', 'like', '%' + searchQuery + '%')
            .orderBy('nama_perusahaan', 'asc')
            .limit(20); // Limit results for better performance

        if (data.length === 0) {
            return res.status(200).json({
                status: 200,
                message: "sukses",
                data: []
            });
        }

        // Get spesialisasi for each anggota
        for (let anggota of data) {
            const spesialisasi = await sql_enak('spesialisasi_anggota as sa')
                .join('master_spesialisasi as ms', 'sa.spesialisasi_id', 'ms.id')
                .select('ms.nama_spesialisasi')
                .where('sa.anggota_id', anggota.id)
                .where('sa.deleted_at', null);

            // Format spesialisasi
            if (spesialisasi.length > 0) {
                anggota.spesialisasi = spesialisasi.map(s => s.nama_spesialisasi).join(', ');
            } else {
                anggota.spesialisasi = '-';
            }
        }

        // Calculate status for each anggota
        for (let anggota of data) {
            const lastPaymentYearResult = await sql_enak.raw(
                'SELECT MAX(tahun) as max_year FROM pembayaran WHERE anggota_id = ? AND status = 1 AND deleted_at IS NULL',
                [anggota.id]
            );

            const lastPaymentYear = lastPaymentYearResult[0][0]?.max_year;

            if (lastPaymentYear) {
                const currentYear = new Date().getFullYear();
                const yearsSinceLastPayment = currentYear - lastPaymentYear;
                anggota.status = yearsSinceLastPayment >= 5 ? 'Non Aktif' : 'Aktif';
            } else {
                anggota.status = 'Pending';
            }
        }

        res.status(200).json({
            status: 200,
            message: "sukses",
            data: data
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 500,
            message: "gagal",
            data: err.message
        });
    }
});

// ==================== PEMBAYARAN CRUD ====================

// API untuk get list pembayaran anggota
router.get('/pembayaran/:id/list', async function(req, res) {
    try {
        const anggotaId = req.params.id;

        const data = await sql_enak('pembayaran')
            .where('anggota_id', anggotaId)
            .where('deleted_at', null)
            .orderBy('tahun', 'desc');

        res.status(200).json({
            status: 200,
            message: "sukses",
            data: data
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 500,
            message: "gagal",
            data: err.message
        });
    }
});

// API untuk get detail pembayaran by ID
router.get('/pembayaran-detail/:id', async function(req, res) {
    try {
        const id = req.params.id;

        const pembayaran = await sql_enak('pembayaran')
            .where('id', id)
            .where('deleted_at', null)
            .first();

        if (!pembayaran) {
            return res.status(404).json({
                status: 404,
                message: "Pembayaran not found",
                data: null
            });
        }

        res.status(200).json({
            status: 200,
            message: "sukses",
            data: pembayaran
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 500,
            message: "gagal",
            data: err.message
        });
    }
});

// API untuk insert pembayaran
router.post('/pembayaran/:id/save', upload.fields([{ name: 'foto_1', maxCount: 1 }]), async function(req, res) {
    try {
        const anggotaId = req.params.id;
        let post = req.body;

        // Check if pembayaran for this year already exists
        const exists = await sql_enak('pembayaran')
            .where('anggota_id', anggotaId)
            .where('tahun', post.tahun)
            .where('deleted_at', null)
            .first();

        if (exists) {
            return res.status(201).json({
                status: 201,
                message: "Pembayaran untuk tahun ini sudah ada",
                data: exists
            });
        }

        // Handle file upload
        if (req.files && req.files['foto_1']) {
            post['foto_1'] = req.files['foto_1'][0].filename;
        }

        // Set default values
        post.anggota_id = anggotaId;
        post.created_at = new Date();

        // Insert pembayaran
        const result = await sql_enak('pembayaran').insert(post);

        res.status(200).json({
            status: 200,
            message: "sukses",
            data: result
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 500,
            message: "gagal",
            data: err.message
        });
    }
});

// API untuk update pembayaran
router.post('/pembayaran/:id/update', upload.fields([{ name: 'foto_1', maxCount: 1 }]), async function(req, res) {
    try {
        const id = req.params.id;
        let post = req.body;

        // Handle file upload
        if (req.files && req.files['foto_1']) {
            post['foto_1'] = req.files['foto_1'][0].filename;
        }

        // Update pembayaran
        await sql_enak('pembayaran')
            .where('id', id)
            .update(post);

        res.status(200).json({
            status: 200,
            message: "sukses",
            data: "Pembayaran berhasil diupdate"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 500,
            message: "gagal",
            data: err.message
        });
    }
});

// API untuk delete pembayaran (soft delete)
router.get('/pembayaran/hapus/:id', async function(req, res) {
    try {
        const id = req.params.id;

        await sql_enak('pembayaran')
            .where('id', id)
            .update({ deleted_at: new Date() });

        res.status(200).json({
            status: 200,
            message: "sukses",
            data: "Pembayaran berhasil dihapus"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 500,
            message: "gagal",
            data: err.message
        });
    }
});

  


  router.post('/insert', upload.fields([{ name: 'foto_1', maxCount: 1 }]),async function(req, res) {

    let post = req.body
         try {



    let sql2 = `SELECT  *  FROM anggota p where no_anggota = ? `
    let anggota_cek =await sql_enak.raw(sql2,[post["no_anggota"]])

    if (anggota_cek[0].length==0) {

   if (req.files) {
    if (req.files['foto_1']) {
      var nama_file = req.files['foto_1'][0].filename;
      post['foto_1'] = nama_file;
    }
  }
      await sql_enak.insert(post).into('anggota').then(data=>{
      res.status(200).json({ status: 200, message: "sukses", data: data})
   })
   .catch(err=>{
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

  router.post('/edit', upload.fields([{ name: 'foto_1', maxCount: 1 }]),async function(req, res) {

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
      if (req.files['foto_1']) {
        var nama_file = req.files['foto_1'][0].filename;
        post['foto_1'] = nama_file;
      }
    }
    try {
      await sql_enak('anggota').where('id','=',post.id).update(post).then(data=>{
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
        str += ' and a.id = ?'
        value.push(req.query.id)
    }

    // Filter parameters for advance search
    if (req.query.nama_perusahaan) {
        str += ' and a.nama_perusahaan LIKE ?'
        value.push('%' + req.query.nama_perusahaan + '%')
    }

    if (req.query.kota) {
        str += ' and a.kode_kota = ?'
        value.push(req.query.kota)
    }

    if (req.query.kualifikasi) {
        str += ' and a.kualifikasi = ?'
        value.push(req.query.kualifikasi)
    }
let str2 = ''
    if (req.query.status) {
        str2 += ' HAVING status = ?'
        value.push(req.query.status)
    }

    if (req.query.spesialisasi) {
        if (Array.isArray(req.query.spesialisasi)) {
            // Multiple spesialisasi (OR logic)
            let spesialisasiConditions = req.query.spesialisasi.map(() => 'EXISTS (SELECT 1 FROM spesialisasi_anggota sa2 LEFT JOIN master_spesialisasi ms2 ON ms2.id = sa2.spesialisasi_id WHERE sa2.anggota_id = a.id AND sa2.deleted_at IS NULL AND ms2.deleted_at IS NULL AND ms2.id = ?)').join(' OR ');
            str += ' AND (' + spesialisasiConditions + ')';
            req.query.spesialisasi.forEach(spes => {
                value.push(spes);
            });
        } else {
            // Single spesialisasi
            str += ' AND EXISTS (SELECT 1 FROM spesialisasi_anggota sa2 LEFT JOIN master_spesialisasi ms2 ON ms2.id = sa2.spesialisasi_id WHERE sa2.anggota_id = a.id AND sa2.deleted_at IS NULL AND ms2.deleted_at IS NULL AND ms2.id = ?)';
            value.push(req.query.spesialisasi);
        }
    }

    if (req.query.limit) {
      str += ` limit ? `
      value.push(req.query.limit)

    }
    if (req.query.offset) {
      str += ` offset ? `
      value.push(req.query.offset)
    }

    let sql = `SELECT
                    a.*,b.spesialisasi,c.tunggakan,
                    CASE
                        WHEN YEAR(CURRENT_DATE()) - COALESCE(d.max_tahun, 0) >= 5 THEN 'Non Aktif'
                        ELSE 'Aktif'
                    END as status
                FROM anggota a
                left join (select GROUP_CONCAT(ms.nama_spesialisasi ) as spesialisasi  , sa.anggota_id  from spesialisasi_anggota sa left join master_spesialisasi ms on ms.id = sa.spesialisasi_id and ms.deleted_at is null where sa.deleted_at is null GROUP  by sa.anggota_id )
               b on b.anggota_id = a.id
               left join (select SUM(p.retribusi ) as tunggakan ,p.anggota_id  from pembayaran p where p.deleted_at  is null and p.status = 0 group by p.anggota_id ) c
               on c.anggota_id = a.id
               left join (select MAX(p.tahun) as max_tahun, p.anggota_id from pembayaran p where p.deleted_at is null and p.status = 1 group by p.anggota_id) d
               on d.anggota_id = a.id
                WHERE a.deleted_at IS NULL  ${str}
                GROUP BY a.id ${str2} `                
    await sql_enak.raw(sql,value).then(data=>{
        res.status(200).json({ status: 200, message: "sukses", data: data[0]})
     })
     .catch(err=>{
      console.log(err);
        res.status(500).json({ status: 500, message: "gagal", data: err})
     })
  })
  router.get('/statistics/simple', async function(req, res) {
    try {
        // Query 1: Total, Aktif, Nonaktif
        const statsSql = `
            SELECT
                COUNT(*) as total_anggota,
                SUM(CASE WHEN status = 'Aktif' THEN 1 ELSE 0 END) as aktif,
                SUM(CASE WHEN status = 'Non Aktif' THEN 1 ELSE 0 END) as non_aktif
            FROM (
                SELECT
                    a.id,
                    CASE
                        WHEN YEAR(CURRENT_DATE()) - COALESCE(MAX_YEAR.max_tahun, 0) >= 5 THEN 'Non Aktif'
                        ELSE 'Aktif'
                    END as status
                FROM anggota a
                LEFT JOIN (
                    SELECT MAX(p.tahun) as max_tahun, p.anggota_id
                    FROM pembayaran p
                    WHERE p.deleted_at IS NULL
                    AND p.status = 1
                    GROUP BY p.anggota_id
                ) MAX_YEAR ON MAX_YEAR.anggota_id = a.id
                WHERE a.deleted_at IS NULL
                GROUP BY a.id
            ) a
        `;
        
        // Query 2: Kualifikasi
        const kualifikasiSql = `
            SELECT 
                kualifikasi,
                COUNT(*) as jumlah
            FROM anggota 
            WHERE deleted_at IS NULL 
            GROUP BY kualifikasi
        `;
        
        const [statsResult, kualifikasiResult] = await Promise.all([
            sql_enak.raw(statsSql),
            sql_enak.raw(kualifikasiSql)
        ]);
        
        const stats = statsResult[0][0];

        res.status(200).json({
            status: 200,
            message: "sukses",
            data: {
                total_anggota: stats.total_anggota || 0,
                aktif: stats.aktif || 0,
                non_aktif: stats.non_aktif || 0,
                berdasarkan_kualifikasi: kualifikasiResult[0]
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 500,
            message: "gagal",
            data: err.message
        });
    }
});
  router.get('/statistics/retribusi/:tahun', async function(req, res) {
    try {
        let tahun = new Date().getFullYear()
        if (req.params.tahun!='undefined') {
            tahun = req.params.tahun
        }
        
        const target = `
select sum(p.retribusi ) as jumlah from anggota a 
left join pembayaran p on p .anggota_id = a.id and p.deleted_at is null 
where a.deleted_at  is null and p.tahun = ?`;
        
        const realisasi = `
           select sum(p.retribusi ) as jumlah from anggota a 
left join pembayaran p on p .anggota_id = a.id and p.deleted_at is null and status = 1
where a.deleted_at  is null and p.tahun =?  `;
        const tunggakan = `select sum(p.retribusi ) as jumlah from anggota a 
left join pembayaran p on p .anggota_id = a.id and p.deleted_at is null 
where a.deleted_at  is null and p.status =0 and p.tahun = ?`
        const [hasil_target, hasil_realisasi , hasil_tunggakan] = await Promise.all([
            sql_enak.raw(target,[tahun]),
            sql_enak.raw(realisasi,[tahun]),
            sql_enak.raw(tunggakan,[tahun])

        ]);
        
        const data_target = hasil_target[0][0];
        const data_realisasi = hasil_realisasi[0][0];
        const data_tunggakan = hasil_tunggakan[0][0];

        res.status(200).json({
            status: 200,
            message: "sukses",
            data: {
               data_target, data_realisasi, data_tunggakan
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 500,
            message: "gagal",
            data: err.message
        });
    }
});
  router.get('/statistics/chart',  async function(req, res) {
    let sql = ` select sum(p.retribusi ) as y , p.tahun label from anggota a 
left join pembayaran p on p .anggota_id = a.id and p.deleted_at is null
where a.deleted_at  is null and p.tahun is not null and status = 1
group by p.tahun 
  `
      let sql2 = ` select sum(p.retribusi ) as y , p.tahun label from anggota a 
left join pembayaran p on p .anggota_id = a.id and p.deleted_at is null
where a.deleted_at  is null and p.tahun is not null 
group by p.tahun 
  `
      let sql3 = ` select sum(p.retribusi ) as y , p.tahun label from anggota a 
left join pembayaran p on p .anggota_id = a.id and p.deleted_at is null
where a.deleted_at  is null and p.tahun is not null and status = 0
group by p.tahun 
  `
  try {
      let data = await sql_enak.raw(sql)
      let data2 = await sql_enak.raw(sql2)
      let data3 = await sql_enak.raw(sql3)

    res.status(200).json({
            status: 200,
            message: "sukses",
            data: data [0], data2: data2 [0], data3: data3 [0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 500,
            message: "gagal",
            data: err.message
        });
    }
});

router.post('/import', upload.fields([{ name: 'file_excel', maxCount: 1 }]), async function (req, res) {

    try {

        if (!req.files || !req.files.file_excel) {
            return res.json({
                status: 400,
                message: 'File tidak ditemukan'
            });
        }

        let file = req.files.file_excel[0];

        let hasil = await importExcel({
            sourceFile: file.path,
            header: {
                rows: 1
            },
            sheets: ["Sheet1"],
            columnToKey: {

    C: 'no_anggota',
    D: 'nama_perusahaan',
    E: 'penanggung_jawab',
    F: 'tanggal_lahir',
    G: 'gelar_pjbu',
    H: 'alamat',
    I: 'kota',
    J: 'kode_kota',
    K: 'korwil',
    L: 'telepon',
    M: 'fax',
    N: 'status_keanggotaan',
    O: 'disyahkan',
    P: 'kode_etik',

    R: 'yang_hadir',
    S: 'di_undang',
    T: 'pelantikan',

    U: 'baru2021',
    V: 'baru2022',
    W: 'baru2023',
    X: 'baru2024',
    Y: 'baru2025',
    Z: 'baru2026',

    AA: 'nomor_hp_pjbu',
    AB: 'email_kta',
    AC: 'no_sertifikat',
    AD: 'waktu_penataran',
    AE: 'memiliki_sertifikat_kode_etik',
    AF: 'kta_2020',
    AG: 'kualifikasi',

    AH: 'bayar2020',
    AI: 'bayar2021',
    AJ: 'bayar2022',
    AK: 'bayar2023',
    AL: 'bayar2024',
    AM: 'bayar2025',
    AN: 'bayar2026'

}
        });

        let result = hasil["Sheet1"];

        let arr = [];
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < result.length; i++) {

            let row = result[i];

            if (!row.no_anggota || !row.nama_perusahaan) {
                errorCount++;
                continue;
            }

            //--------------------------------------
            // cari tahun masuk
            //--------------------------------------

            let tahun_masuk = null;

            if (row.baru2021 && String(row.baru2021).toUpperCase() == "BARU") tahun_masuk = 2021;
            else if (row.baru2022 && String(row.baru2022).toUpperCase() == "BARU") tahun_masuk = 2022;
            else if (row.baru2023 && String(row.baru2023).toUpperCase() == "BARU") tahun_masuk = 2023;
            else if (row.baru2024 && String(row.baru2024).toUpperCase() == "BARU") tahun_masuk = 2024;
            else if (row.baru2025 && String(row.baru2025).toUpperCase() == "BARU") tahun_masuk = 2025;
            else if (row.baru2026 && String(row.baru2026).toUpperCase() == "BARU") tahun_masuk = 2026;

            //--------------------------------------
            // data anggota
            //--------------------------------------

            let post = {

                no_anggota: row.no_anggota,
                nama_perusahaan: row.nama_perusahaan,
                penanggung_jawab: row.penanggung_jawab,
                gelar_pjbu: row.gelar_pjbu,
                tanggal_lahir: row.tanggal_lahir,
                alamat: row.alamat,
                kota: row.kota,
                kode_kota: row.kode_kota,
                korwil: row.korwil,
                telepon: row.telepon,
                fax: row.fax,
                nomor_hp_pjbu: row.nomor_hp_pjbu,
                email_kta: row.email_kta,
                status_keanggotaan: row.status_keanggotaan,
                disyahkan: row.disyahkan,
                kode_etik: row.kode_etik,
                yang_hadir: row.yang_hadir,
                di_undang: row.di_undang,
                pelantikan: row.pelantikan,
                no_sertifikat: row.no_sertifikat,
                waktu_penataran: row.waktu_penataran,
                memiliki_sertifikat_kode_etik: row.memiliki_sertifikat_kode_etik,
                kta_2020: row.kta_2020,
                kualifikasi: row.kualifikasi,
                tahun_masuk: tahun_masuk

            };

            //--------------------------------------
            // cek anggota
            //--------------------------------------

            let anggota = await sql_enak("anggota")
                .where("no_anggota", row.no_anggota)
                .first();

            let anggotaId;

            if (anggota) {

                anggotaId = anggota.id;

                await sql_enak("anggota")
                    .where("id", anggotaId)
                    .update(post);

            } else {

                let hsl = await sql_enak("anggota")
                    .insert(post);

                anggotaId = hsl[0];

                arr.push(anggotaId);

            }

            //--------------------------------------
            // pembayaran
            //--------------------------------------

            const pembayaran = [
                 row.bayar2020,
                 row.bayar2021,
                 row.bayar2022,
                 row.bayar2023,
                 row.bayar2024,
                 row.bayar2025,
                 row.bayar2026
            ]

            for (let i = 0; i <pembayaran.length; i++) {
let tahun = i+2020

                let status = pembayaran[i];

                if (!status) continue;

                let cek = await sql_enak("pembayaran")
                    .where({
                        anggota_id: anggotaId,
                        tahun: tahun
                    })
                    .first();

                if (cek) {

                    await sql_enak("pembayaran")
                        .where("id", cek.id)
                        .update({
                            status: status
                        });

                } else {

                    await sql_enak("pembayaran")
                        .insert({
                            anggota_id: anggotaId,
                            tahun: tahun,
                            status: status
                        });

                }

            }

            successCount++;

        }

        res.json({
            status: 200,
            message: `Import selesai. ${successCount} berhasil, ${errorCount} gagal`
        });

    } catch (err) {

        console.log(err);

        res.json({
            status: 500,
            message: err.message
        });

    }

});

// ==================== SPESIALISASI ANGGOTA CRUD ====================

// Route untuk menampilkan halaman spesialisasi anggota
router.get('/spesialisasi/:id', cek_login, async function(req, res) {
    try {
        const anggotaId = req.params.id;
        // Get data anggota
        const anggota = await sql_enak('anggota')
            .where('id', anggotaId)
            .where('deleted_at', null)
            .first();


        if (!anggota) {
            console.log('Anggota not found');
            return res.status(404).render('error', { message: 'Anggota not found' });
        }

        res.render('content-backoffice/anggota/spesialisasi', {
            user: req.user[0],
            anggota: anggota,
            anggotaId: anggotaId
        });
    } catch (err) {
        console.error('Error in spesialisasi route:', err);
        res.status(500).render('error', { message: err.message });
    }
});

// API untuk get list spesialisasi anggota
router.get('/spesialisasi/:id/list', cek_login, async function(req, res) {
    try {
        const anggotaId = req.params.id;

        const data = await sql_enak('spesialisasi_anggota as sa')
            .join('master_spesialisasi as ms', 'sa.spesialisasi_id', 'ms.id')
            .select(
                'sa.id',
                'ms.nama_spesialisasi',
                'sa.spesialisasi_id'
            )
            .where('sa.anggota_id', anggotaId)
            .where('sa.deleted_at', null);

        res.status(200).json({
            status: 200,
            message: "sukses",
            data: data
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 500,
            message: "gagal",
            data: err.message
        });
    }
});

// API untuk insert spesialisasi anggota
router.post('/spesialisasi/:id/save', cek_login, async function(req, res) {
    try {
        const anggotaId = req.params.id;
        const { spesialisasi_id } = req.body;

        if (!spesialisasi_id) {
            return res.status(400).json({
                status: 400,
                message: "Spesialisasi ID is required"
            });
        }

        // Check if already exists
        const exists = await sql_enak('spesialisasi_anggota')
            .where('anggota_id', anggotaId)
            .where('spesialisasi_id', spesialisasi_id)
            .where('deleted_at', null)
            .first();

        if (exists) {
            return res.status(201).json({
                status: 201,
                message: "Spesialisasi already exists for this anggota"
            });
        }

        // Insert spesialisasi anggota
        await sql_enak('spesialisasi_anggota').insert({
            anggota_id: anggotaId,
            spesialisasi_id: spesialisasi_id
        });

        res.status(200).json({
            status: 200,
            message: "sukses",
            data: "Spesialisasi berhasil ditambahkan"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 500,
            message: "gagal",
            data: err.message
        });
    }
});

// API untuk delete spesialisasi anggota
router.get('/spesialisasi/:anggota_id/hapus/:id', cek_login, async function(req, res) {
    try {
        const id = req.params.id;

        await sql_enak('spesialisasi_anggota')
            .where('id', id)
            .update({ deleted_at: new Date() });

        res.status(200).json({
            status: 200,
            message: "sukses",
            data: "Spesialisasi berhasil dihapus"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 500,
            message: "gagal",
            data: err.message
        });
    }
});

// ==================== ANGGOTA DETAIL API (Frontend) ====================

// API untuk get detail anggota by ID (untuk frontend) - ROUTE INI DITEMPATKAN PALING AKHIR UNTUK MENGHINDARI KONFLIK
router.get('/:id', async function(req, res) {
    try {
        const id = req.params.id;

        // Cek jika ID adalah path yang sudah didefinisikan
        if (isNaN(id)) {
            return res.status(404).json({
                status: 404,
                message: "Not found",
                data: null
            });
        }

        const anggota = await sql_enak('anggota')
            .where('id', id)
            .where('deleted_at', null)
            .first();

        if (!anggota) {
            return res.status(404).json({
                status: 404,
                message: "Anggota not found",
                data: null
            });
        }

        // Get spesialisasi
        const spesialisasi = await sql_enak('spesialisasi_anggota as sa')
            .join('master_spesialisasi as ms', 'sa.spesialisasi_id', 'ms.id')
            .select('ms.nama_spesialisasi')
            .where('sa.anggota_id', id)
            .where('sa.deleted_at', null);

        // Get tunggakan using raw query
        const tunggakanResult = await sql_enak.raw(
            'SELECT COALESCE(SUM(retribusi), 0) as total FROM pembayaran WHERE anggota_id = ? AND status = 0 AND deleted_at IS NULL',
            [id]
        );

        // Format spesialisasi
        if (spesialisasi.length > 0) {
            anggota.spesialisasi = spesialisasi.map(s => s.nama_spesialisasi).join(', ');
        } else {
            anggota.spesialisasi = '-';
        }

        // Add tunggakan to anggota object
        anggota.tunggakan = tunggakanResult[0][0]?.total || 0;

        res.status(200).json({
            status: 200,
            message: "sukses",
            data: anggota
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 500,
            message: "gagal",
            data: err.message
        });
    }
});

module.exports = router;