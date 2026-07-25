var connection = require('../database').connection;
var express = require('express');
var router = express.Router();
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , static = require('serve-static')
  , bodyParser = require('body-parser')
  , session = require('express-session')
  , cookieParser = require('cookie-parser');
 var cek_login = require('./login').cek_login;
var dbgeo = require("dbgeo");
var sql_enak = require('../database/mysql_enak.js').connection;


  router.use(bodyParser.urlencoded({ extended: true }));
  router.use(bodyParser.json());
  router.use(cookieParser() );
  router.use(session({ secret: 'bhagasitukeren', cookie: { maxAge : 1200000 },saveUninitialized: true, resave: true }));
  router.use(passport.initialize());
  router.use(passport.session());
  var st = require('knex-postgis')(sql_enak);

// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  console.log('Time: ', Date.now());
  next();
});



      router.get('/json_kec', function(req, res){
  connection.query("SELECT x(centroid(a.the_geom)) as x, y(centroid(a.the_geom)) as y, a.nama_kecamatan as kec FROM master_kecamatan a" , function(err, rows, fields) {
    if (err) throw err;
  res.send(JSON.stringify(rows))
  });

  //connection.end();
  })
  router.get('/detail_jembatan/:id',async function(req, res){
   let data = await sql_enak.raw(`SELECT *, x(centroid(mj.SHAPE)) as x, y(centroid(mj.SHAPE)) as y,asWkt(SHAPE) as geometry FROM master_jembatan mj left join data_umum du on du.master_jembatan_id =mj.master_jembatan_id 
 WHERE  mj.master_jembatan_id = ?  and mj.SHAPE is not null `,[req.params.id])
    dbgeo.parse({
    "data": data[0],
    "outputFormat": "topojson",
    "geometryColumn": "geometry",
    "geometryType": "wkt"
  },function(error, result) {
    if (error) {
      return console.log(error);
    }
    res.send(JSON.stringify(result))
  }); 
  })
   router.get('/topojson_kec', function(req, res){
 if(req.query.id_kec){
   var tambahan = "where id_kec= '"+req.query.id_kec+"'";
 }else{
   var tambahan = "";
     
 }
 connection.query("SELECT asWkt(the_geom) as geometry,  nama_kec as kabupaten FROM kecamatan "+tambahan, function(err, rows, fields) {
   if (err) throw err;
   dbgeo.parse({
   "data": rows,
   "outputFormat": "topojson",
   "geometryColumn": "geometry",
   "geometryType": "wkt"
 },function(error, result) {
   if (error) {
     return console.log(error);
   }  
   res.send(JSON.stringify(result))
 });
 });

 //connection.end();
 })

   router.get('/topojson_desa', function(req, res){
connection.query("SELECT asWkt(a.the_geom) as geometry, a.nama_kelurahan as desa, a.id_kelurahan FROM master_kelurahan a  WHERE mbrIntersects(a.the_geom,  GeomFromText('POLYGON(("+req.query.kiri_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kiri_lat+"))', 1))", function(err, rows, fields) {
  if (err) throw err;
  dbgeo.parse({
  "data": rows,
  "outputFormat": "topojson",
  "geometryColumn": "geometry",
  "geometryType": "wkt"
},function(error, result) {
  if (error) {
    return console.log(error);
  }
  res.send(JSON.stringify(result))
});
});
})
router.post('/jalan_radius', function (req, res) {
  var tambahan = "";
  let long =110.42042833988218;
  let lat = -7.080342556193872;
  let jarak = 100;
  if (req.query.status) {
    tambahan += " and status='" + req.query.status + "'";
  }

  if(req.query.long && req.query.lat){
    long = req.query.long;
    lat = req.query.lat;
  }
  if(req.query.jarak){
      jarak = req.query.jarak;
  }
  let setup = `MBRIntersects(ST_GeomFromGeoJSON('${JSON.stringify(req.body.geojsonpoint)}', 1, 1), a.SHAPE) = 1`  
if (req.query.id_jln) {
  setup =    `(MBRIntersects(ST_GeomFromGeoJSON('${JSON.stringify(req.body.geojsonpoint)}', 1, 1), a.SHAPE) = 1`+" or a.id_jln='" + req.query.id_jln + "')";
}
connection.query(`SELECT asWkt(a.SHAPE) as geometry, a.id_jln, a.km_awal, a.km_akhir, a.p_ruas, a.prkrsn, a.l_ruas, a.kdns, a.foto_awal, a.foto_akhir, a.id, b.status, b.nm_ruas, b.kd_ruas from jalan a join daftar_induk2 b on a.id_jln = b.id_jln WHERE ${setup} and b.deleted =0 order by a.id_jln asc`, function (err, rows, fields) {
    if (err) throw err;
    for (let i = 0; i < rows.length; i++) {
      if(rows[i].status=='JALAN LINGKUNGAN'){
        rows[i].color='#ff6600';
      }else if(rows[i].status=='JALAN KOTA'){
        rows[i].color='#00ff00';
      }else if(rows[i].status=='JALAN NASIONAL'){
        rows[i].color='#ff0000';
      }else if(rows[i].status=='JALAN PROVINSI'){
        rows[i].color='#ffff4d';
      }else if(rows[i].status=='JALAN TOL'){
        rows[i].color='#0057A0';
      }else{
        rows[i].color='#ff6600';
      }
      
    }
    dbgeo.parse({
      "data": rows,
      "outputFormat": "geojson",
      "geometryColumn": "geometry",
      "geometryType": "wkt"
    }, function (error, result) {
      if (error) {
        return console.log(error);
      } 
      res.send(JSON.stringify(result))
    });
  });
})
 router.get('/pola_ruang', function(req, res){
 var tambahan = "";
 if(req.query.id_kab){
    tambahan += " and prs.kdpkab= '"+req.query.id_kab+"'";
 }
 if (req.query.s) {
  tambahan += ` and ST_Intersects(SHAPE,GeomFromText('${req.query.s}', 1)) `
 } 
 connection.query("SELECT asWkt(prs.SHAPE) as geometry, `namobj`, `kdpkab`, wpr.hex as waarna FROM `pola_ruang_sample` prs join warna_pola_ruang wpr on prs.namobj = wpr.ket_warna WHERE 1 "+tambahan, function(err, rows, fields) {
   if (err) throw err;
   dbgeo.parse({
   "data": rows,
   "outputFormat": "topojson",
   "geometryColumn": "geometry",
   "geometryType": "wkt"
 },function(error, result) {
   if (error) {
     return console.log(error);
   }
   res.send(JSON.stringify(result))
 });
 });


 //connection.end();
 })
 router.get('/jalan',async function(req, res){
  var tambahan = "";
  let value = []
if (req.query.id_jalan) {
  tambahan+=' and j.kd_ruas = ?'
  value.push(req.query.id_jalan)
}
 let r = await sql_enak.raw(`SELECT  asWkt(j.SHAPE) as geometry , status FROM jalan j   WHERE j.deletedAt is null and j.SHAPE is not null ${tambahan}`,value)
 let rows = r[0]
    dbgeo.parse({
    "data": rows,
    "outputFormat": "topojson",
    "geometryColumn": "geometry",
    "geometryType": "wkt"
  },function(error, result) {
    if (error) {
      return console.log(error);
    }
    res.send(JSON.stringify(result))
  });
  })
 router.get('/jembatan',async function(req, res){
  var tambahan = "";
  let value = []
if (req.query.master_jembatan_id) {
  tambahan+=' and mj.master_jembatan_id = ?'
  value.push(req.query.master_jembatan_id)
}
if (req.query.id_jalan) {
  tambahan+=' and mj.id_jalan = ?'
  value.push(req.query.id_jalan)
}
 let r = await sql_enak.raw(`SELECT mj.nama_sungai,nama_jembatan,tipe_lintasan, asWkt(mj.SHAPE) as geometry, mj.master_jembatan_id FROM master_jembatan mj left join data_umum du on du.master_jembatan_id =mj.master_jembatan_id   WHERE mj.deletedAt is null and mj.SHAPE is not null ${tambahan}`,value)
 let rows = r[0]
    dbgeo.parse({
    "data": rows,
    "outputFormat": "topojson",
    "geometryColumn": "geometry",
    "geometryType": "wkt"
  },function(error, result) {
    if (error) {
      return console.log(error);
    }
    res.send(JSON.stringify(result))
  });
  })
           router.get('/list_polaruang', function(req, res){
    var a = '';
    if(req.query.x != undefined && req.query.y != undefined){
      a = "where ST_Within(GeomFromText('POINT("+req.query.x+" "+req.query.y+")'),a.SHAPE);";
    }else if(req.query.p != undefined){
      a = "where ST_Intersects(a.SHAPE, GeomFromText('"+req.query.p+"'));";
    }
    connection.query("SELECT distinct(a.SHAPE) as rencana_tg, a.namobj as kode FROM pola_ruang_sample a "+a , function(err, rows, fields) {
      if (err) throw err;

      res.send(JSON.stringify(rows))
    });
    //connection.end();
    })

    
    router.get('/kabupaten', function(req, res){
      var a = '';
      connection.query("SELECT x(ST_Centroid(SHAPE)) as xe ,y(ST_Centroid(SHAPE)) as ye, kdpkab, wadmkk  FROM `kabupaten_kota` WHERE 1 "+a , function(err, rows, fields) {
        if (err) throw err;
  
        res.send(JSON.stringify(rows))
      });
      //connection.end();
      })
      router.get('/get_administrasi',async function(req, res){
        var a = '';
        let count = await sql_enak.raw("SELECT wadmkk   FROM `kabupaten_kota` WHERE 1 and  ST_Intersects(SHAPE,GeomFromText(?, 1)) "+a ,[req.query.wkt])        
      let rows = await sql_enak.raw("SELECT kdpkab, wadmkk as kabupaten ,judul_rencana_tata_ruang , tahun_legalisir_RTR , nomor_peraturan_RTR FROM `kabupaten_kota` WHERE 1 and  ST_Contains(SHAPE,ST_Centroid(GeomFromText(?, 1))) "+a ,[req.query.wkt])
      let rowss =  await   sql_enak.raw("SELECT wadmkd, wadmkc, kdpkab, kdcpum, kdepum  FROM `desa_kelurahan` WHERE 1 and  ST_Contains(SHAPE,ST_Centroid(GeomFromText(?, 1))) "+a ,[req.query.wkt])
      let rowsss =  await   sql_enak.raw("SELECT namobj FROM `pola_ruang_sample` WHERE 1 and  ST_Contains(SHAPE,ST_Centroid(GeomFromText(?, 1))) "+a ,[req.query.wkt])
      let das =  await   sql_enak.raw("SELECT nama_das FROM `das` WHERE 1 and  ST_Contains(SHAPE,ST_Centroid(GeomFromText(?, 1))) "+a ,[req.query.wkt])
            if (rowss[0].length > 0) {
              rows[0][0].status_lintas_kab = count[0].length
              rows[0][0].lintas_kab = ''
              for (let i = 0; i < count[0].length; i++) {
                if (count[0].length>1&&i==count[0].length-1) {
                  rows[0][0].lintas_kab+=' dan '

                }
                rows[0][0].lintas_kab+= count[0][i].wadmkk
                if (count[0].length>1&&i<count[0].length-2) {
                   rows[0][0].lintas_kab+=' , '
                }
                
              }
              
            }else{
              rows[0][0].status_lintas_kab =0
            }
            if (rowss[0].length > 0) {
              rows[0][0].kecamatan = rowss[0][0].wadmkc
              rows[0][0].desa = rowss[0][0].wadmkd
              rows[0][0].kd_kab = rowss[0][0].kdpkab
              rows[0][0].kd_kec = rowss[0][0].kdcpum
              rows[0][0].kd_desa = rowss[0][0].kdepum
            }else{
              rows[0][0].kecamatan = ''
              rows[0][0].desa = ''
              rows[0][0].kd_kab = ''
              rows[0][0].kd_kec = ''
              rows[0][0].kd_desa = ''
            }
            if ( rowsss[0].length >0) {
              rows[0][0].namobj = rowsss[0][0].namobj
            }else{
              rows[0][0].namobj =''
            }
            if ( das[0].length >0) {
              rows[0][0].das = das[0][0].nama_das
            }else{
              rows[0][0].das =''
            }
            res.send(JSON.stringify(rows[0][0]))

        //connection.end();
        })

// Endpoint untuk mengambil data jateng_kemendagri dalam format GeoJSON
router.get('/json_jateng_kemendagri', function (req, res) {
  let str = ''
  let val = []
  if (req.query.kdpkab) {
    str += ' and kdpkab=?'
    val.push(req.query.kdpkab)
  }
  connection.query({
    sql: `SELECT OGR_FID, asWkt(SHAPE) as geometry, objectid, kdpkab, wadmkk, shape_leng, shape_area FROM jateng_kemendagri WHERE 1=1 ` + str,
    values: val,
    timeout: 60000 // 60 seconds timeout
  }, function (err, rows, fields) {
    if (err) {
      console.log('Database query error:', err);
      return res.status(500).json({
        status: 500,
        message: "Database query error",
        error: err.message
      });
    }

    if (!rows || rows.length === 0) {
      console.log('No data found');
      return res.status(404).json({
        status: 404,
        message: "No data found"
      });
    }

    console.log('Found ' + rows.length + ' rows, parsing to GeoJSON...');

    dbgeo.parse({
      "data": rows,
      "outputFormat": "geojson",
      "geometryColumn": "geometry",
      "geometryType": "wkt"
    }, function (error, result) {
      if (error) {
        console.log('GeoJSON parsing error:', error);
        return res.status(500).json({
          status: 500,
          message: "Error parsing geojson",
          error: error.message
        });
      }

      console.log('Successfully parsed to GeoJSON');
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(result));
    });
  });
})

// Endpoint untuk mengambil data anggota berdasarkan kode kota (kdpkab)
router.get('/anggota_by_kota', function (req, res) {
  let kode_kota = req.query.kode_kota;
  let g = req.query.g;
console.log('anggota_by_kota');

  if (!kode_kota) {
    return res.status(400).json({ status: 400, message: "kode_kota parameter is required" });
  }

  console.log('Fetching anggota data for kode_kota:', kode_kota);
  let a = `no_anggota, nama_perusahaan, penanggung_jawab, kualifikasi, kode_kota, kota,
             telepon, nomor_hp_pjbu, email_kta`


  connection.query({
    sql: `SELECT ${a}
      FROM anggota
      WHERE kode_kota = ? AND deleted_at IS NULL `,
    values: [kode_kota],
    timeout: 30000 // 30 seconds timeout
  }, function (err, anggota) {    
    if (err) {
      console.log('Database query error for anggota:', err);
      return res.status(500).json({
        status: 500,
        message: "Database query error",
        error: err.message
      });
    }

    if (!anggota || anggota.length === 0) {
      console.log('No anggota found for kode_kota:', kode_kota);
      return res.status(200).json({
        status: 200,
        message: "No anggota found",
        data: {
      'Kualifikasi K': [],
      'Kualifikasi M': [],
      'Kualifikasi B': []
        },
        total: 0
      });
    }

    console.log('Found ' + anggota.length + ' anggota for kode_kota:', kode_kota);

    // Group by kualifikasi untuk memudahkan display
    let kualifikasi_groups = {
      'Kualifikasi K': [],
      'Kualifikasi M': [],
      'Kualifikasi B': []
    };

    anggota.forEach(function(item) {      
      let kualifikasi = item.kualifikasi || ' lainnya';
      if (kualifikasi_groups['Kualifikasi ' + kualifikasi]) {
        kualifikasi_groups['Kualifikasi ' + kualifikasi].push(item);
      } else {
        // Jika kualifikasi tidak sesuai format, masukkan ke array lainnya
        if (!kualifikasi_groups['Lainnya']) {
          kualifikasi_groups['Lainnya'] = [];
        }
        kualifikasi_groups['Lainnya'].push(item);
      }
    });

    console.log('Successfully grouped anggota by kualifikasi');

    res.status(200).json({
      status: 200,
      message: "sukses",
      data: kualifikasi_groups,
      total: anggota.length
    });
  });
})


module.exports = router;
