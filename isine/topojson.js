var connection = require('../database').connection;
var sql_enak = require('../database/mysql_enak.js').connection;
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


router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
router.use(cookieParser());
router.use(session({ secret: 'bhagasitukeren', cookie: { maxAge: 1200000 }, saveUninitialized: true, resave: true }));
router.use(passport.initialize());
router.use(passport.session());

// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  console.log('Time: ', Date.now());
  next();
});



router.get('/json_kec', function (req, res) {
  //connection.connect();
  //console.log(req.query)
  connection.query("SELECT x(centroid(a.SHAPE)) as x, y(centroid(a.SHAPE)) as y, a.wadmkk as kec , kdpkab, wadmkk, shape_leng, shape_area FROM jateng_kemendagri a", function (err, rows, fields) {
    if (err) throw err;

    //console.log("SELECT asWkt(admin_kec.SHAPE) as geometry FROM admin_kec WHERE MBRContains(GeomFromText( 'POLYGON(("+req.query.kiri_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kiri_lat+"))' ),admin_kec.SHAPE");

    //res.end(JSON.stringify(rows))

    // MySQL query...
    //ambil geojson
    res.send(JSON.stringify(rows))
  });

  //connection.end();
})
router.get('/json_center_kel', function (req, res) {
  let kel =''
  if (req.query.kel) {
    kel = ' where a.id_kelurahan = '+req.query.kel
  }
  connection.query("SELECT x(centroid(a.SHAPE)) as x, y(centroid(a.SHAPE)) as y, a.desa as kel  , a.id_kelurahan  FROM kelurahan  a"+kel, function (err, rows, fields) {
    if (err) throw err;
    res.send(JSON.stringify(rows))
  });
})
router.get('/drainase', function (req, res) {
  if (req.query.kd_ruas) {
    var tambahan = "where kd_ruas= '" + req.query.kd_ruas + "'";
  } else {
    var tambahan = "";

  }
  connection.query("SELECT *,asWkt(SHAPE) as geometry  FROM drainase " + tambahan, function (err, rows, fields) {
    if (err) throw err;
    dbgeo.parse({
      "data": rows,
      "outputFormat": "topojson",
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
router.post('/drainase_radius', function (req, res) {
  //connection.connect();
  //console.log(req.query)
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
  //  console.log(tambahan)
// let setup = `(ST_Distance_Sphere(ST_GeomFromText('POINT(${long} ${lat})', 1), ST_StartPoint(a.SHAPE)) < ${jarak} or ST_Distance_Sphere(ST_GeomFromText('POINT(${long} ${lat})', 1), ST_EndPoint(a.SHAPE)) < ${jarak})`
let setup = `MBRIntersects(ST_GeomFromGeoJSON('${JSON.stringify(req.body.geojsonpoint)}', 1 , 4326), a.SHAPE) = 1`  
if (req.query.id_jln) {
  setup =    `(MBRIntersects(ST_GeomFromGeoJSON('${JSON.stringify(req.body.geojsonpoint)}',1,4326), a.SHAPE) = 1`+" or a.id='" + req.query.id + "')";
}
connection.query(`SELECT asWkt(a.SHAPE) as geometry  from drainase a  WHERE ${setup} and a.deletedAt is null order by a.id asc`, function (err, rows, fields) {
    if (err) throw err;
    //console.log("SELECT asWkt(admin_kec.SHAPE) as geometry FROM admin_kec WHERE MBRContains(GeomFromText( 'POLYGON(("+req.query.kiri_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kiri_lat+"))' ),admin_kec.SHAPE");

    //res.end(JSON.stringify(rows))

    // MySQL query...
    //ambil geojson
    dbgeo.parse({
      "data": rows,
      "outputFormat": "geojson",
      "geometryColumn": "geometry",
      "geometryType": "wkt"
    }, function (error, result) {
      if (error) {
        return console.log(error);
      }
      // This will log a valid GeoJSON object
      // console.log(result)  
      res.send(JSON.stringify(result))
    });
  });


  //connection.end();
})
router.get('/drainase_permasalahan', function (req, res) {
  if (req.query.kode_ruas) {
    var tambahan = "where kode_ruas= '" + req.query.kode_ruas + "'";
  } else {
    var tambahan = "";

  }
  connection.query("SELECT *,asWkt(SHAPE) as geometry  FROM drainase_permasalahan " + tambahan, function (err, rows, fields) {
    if (err) throw err;
    dbgeo.parse({
      "data": rows,
      "outputFormat": "topojson",
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
router.get('/drainase_bangunan', function (req, res) {
  if (req.query.kd_ruas) {
    var tambahan = "where kd_ruas= '" + req.query.kd_ruas + "'";
  } else {
    var tambahan = "";

  }
  connection.query("SELECT *,asWkt(SHAPE) as geometry  FROM drainase_bangunan " + tambahan, function (err, rows, fields) {
    if (err) throw err;
    dbgeo.parse({
      "data": rows,
      "outputFormat": "topojson",
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
router.get('/topojson_kec', function (req, res) {
  //connection.connect();
  //console.log(req.query)
  if (req.query.id_kec) {
    var tambahan = "where id_kec= '" + req.query.id_kec + "'";
  } else {
    var tambahan = "";

  }
  connection.query("SELECT asWkt(SHAPE) as geometry, wadmkk FROM jateng_kemendagri " + tambahan, function (err, rows, fields) {
    if (err) throw err;

    //console.log("SELECT asWkt(admin_kec.SHAPE) as geometry FROM admin_kec WHERE MBRContains(GeomFromText( 'POLYGON(("+req.query.kiri_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kiri_lat+"))' ),admin_kec.SHAPE");

    //res.end(JSON.stringify(rows))

    // MySQL query...
    //ambil geojson
    dbgeo.parse({
      "data": rows,
      "outputFormat": "topojson",
      "geometryColumn": "geometry",
      "geometryType": "wkt"
    }, function (error, result) {
      if (error) {
        return console.log(error);
      }
      // This will log a valid GeoJSON object
      // console.log(result)  
      res.send(JSON.stringify(result))
    });
  });

  //connection.end();
})
router.get('/topojson_segmen', function (req, res) {
  //connection.connect();
  //console.log(req.query)
  if (req.query.id) {
    var tambahan = "where id= '" + req.query.id + "'";
  } else  if (req.query.id_jln) {
    var tambahan = "where id_jln= '" + req.query.id_jln + "'";

  } else {
    var tambahan = "";

  }
  connection.query("SELECT asWkt(SHAPE) as geometry FROM drainase " + tambahan, function (err, rows, fields) {
    if (err) throw err;

    //console.log("SELECT asWkt(admin_kec.SHAPE) as geometry FROM admin_kec WHERE MBRContains(GeomFromText( 'POLYGON(("+req.query.kiri_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kiri_lat+"))' ),admin_kec.SHAPE");

    //res.end(JSON.stringify(rows))

    // MySQL query...
    //ambil geojson
    dbgeo.parse({
      "data": rows,
      "outputFormat": "topojson",
      "geometryColumn": "geometry",
      "geometryType": "wkt"
    }, function (error, result) {
      if (error) {
        return console.log(error);
      }
      // This will log a valid GeoJSON object
      // console.log(result)  
      res.send(JSON.stringify(result))
    });
  });

  //connection.end();
})
router.get('/topojson_desa', function (req, res) {
  //connection.connect();
  //console.log(req.query)
  connection.query("SELECT asWkt(a.SHAPE) as geometry, a.desa, a.id_kelurahan FROM kelurahan a  WHERE mbrIntersects(a.SHAPE,  GeomFromText('POLYGON((" + req.query.kiri_lng + " " + req.query.kiri_lat + "," + req.query.kiri_lng + " " + req.query.kanan_lat + "," + req.query.kanan_lng + " " + req.query.kanan_lat + "," + req.query.kanan_lng + " " + req.query.kiri_lat + "," + req.query.kiri_lng + " " + req.query.kiri_lat + "))', 1))", function (err, rows, fields) {
    if (err) throw err;

    //console.log("SELECT asWkt(admin_kec.SHAPE) as geometry FROM admin_kec WHERE MBRContains(GeomFromText( 'POLYGON(("+req.query.kiri_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kiri_lat+"))' ),admin_kec.SHAPE");

    //res.end(JSON.stringify(rows))

    // MySQL query...
    //ambil geojson
    dbgeo.parse({
      "data": rows,
      "outputFormat": "topojson",
      "geometryColumn": "geometry",
      "geometryType": "wkt"
    }, function (error, result) {
      if (error) {
        return console.log(error);
      }
      // This will log a valid GeoJSON object
      // console.log(result)  
      res.send(JSON.stringify(result))
    });
  });

  //connection.end();
})

router.get('/jalan', function (req, res) {
  //connection.connect();
  //console.log(req.query)
  var tambahan = "where a.deleted=0";
  if (req.query.status) {
    tambahan += " and status='" + req.query.status + "'";
  }
  if (req.query.id_jln) {
    tambahan += " and a.id_jln='" + req.query.id_jln + "'";
  }
  if (req.query.id_kec) {
    tambahan += " and b.id_kec='" + req.query.id_kec + "'";
  }
  if (req.query.id_kel) {
    tambahan += " and b.id_kel='" + req.query.id_kel + "'";
  }
  //  console.log(tambahan)

  connection.query("SELECT asWkt(a.SHAPE) as geometry, a.id_jln, a.km_awal, a.km_akhir, a.p_ruas, a.prkrsn, a.l_ruas, a.kdns, a.foto_awal, a.foto_akhir, a.id, b.status from drainase a join daftar_induk2 b on a.id_jln = b.id_jln  " + tambahan, function (err, rows, fields) {
    if (err) throw err;

    //console.log("SELECT asWkt(admin_kec.SHAPE) as geometry FROM admin_kec WHERE MBRContains(GeomFromText( 'POLYGON(("+req.query.kiri_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kiri_lat+"))' ),admin_kec.SHAPE");

    //res.end(JSON.stringify(rows))

    // MySQL query...
    //ambil geojson
    dbgeo.parse({
      "data": rows,
      "outputFormat": "topojson",
      "geometryColumn": "geometry",
      "geometryType": "wkt"
    }, function (error, result) {
      if (error) {
        return console.log(error);
      }
      // This will log a valid GeoJSON object
      // console.log(result)  
      res.send(JSON.stringify(result))
    });
  });


  //connection.end();
})


router.post('/drainase_radius', function (req, res) {
  //connection.connect();
  //console.log(req.query)
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
  //  console.log(tambahan)
// let setup = `(ST_Distance_Sphere(ST_GeomFromText('POINT(${long} ${lat})', 1), ST_StartPoint(a.SHAPE)) < ${jarak} or ST_Distance_Sphere(ST_GeomFromText('POINT(${long} ${lat})', 1), ST_EndPoint(a.SHAPE)) < ${jarak})`
let setup = `MBRIntersects(ST_GeomFromGeoJSON('${JSON.stringify(req.body.geojsonpoint)}', 1, 1), a.SHAPE) = 1`  
if (req.query.id_jln) {
  setup =    `(MBRIntersects(ST_GeomFromGeoJSON('${JSON.stringify(req.body.geojsonpoint)}', 1, 1), a.SHAPE) = 1`+" or a.id_jln='" + req.query.id_jln + "')";
}
connection.query(`SELECT asWkt(a.SHAPE) as geometry, a.id_jln, a.km_awal, a.km_akhir, a.p_ruas, a.prkrsn, a.l_ruas, a.kdns, a.foto_awal, a.foto_akhir, a.id, b.status, b.nm_ruas, b.kd_ruas from drainase a join daftar_induk2 b on a.id_jln = b.id_jln WHERE ${setup} and b.deleted =0 order by a.id_jln asc`, function (err, rows, fields) {
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
    //console.log("SELECT asWkt(admin_kec.SHAPE) as geometry FROM admin_kec WHERE MBRContains(GeomFromText( 'POLYGON(("+req.query.kiri_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kiri_lat+"))' ),admin_kec.SHAPE");

    //res.end(JSON.stringify(rows))

    // MySQL query...
    //ambil geojson
    dbgeo.parse({
      "data": rows,
      "outputFormat": "geojson",
      "geometryColumn": "geometry",
      "geometryType": "wkt"
    }, function (error, result) {
      if (error) {
        return console.log(error);
      }
      // This will log a valid GeoJSON object
      // console.log(result)  
      res.send(JSON.stringify(result))
    });
  });


  //connection.end();
})
router.get('/drainase_radius', function (req, res) {
  //connection.connect();
  //console.log(req.query)
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
  //  console.log(tambahan)
let setup = `(ST_Distance_Sphere(ST_GeomFromText('POINT(${long} ${lat})', 1), ST_StartPoint(a.SHAPE)) < ${jarak} or ST_Distance_Sphere(ST_GeomFromText('POINT(${long} ${lat})', 1), ST_EndPoint(a.SHAPE)) < ${jarak})`
// let setup = `MBRIntersects(ST_GeomFromGeoJSON('${JSON.stringify(req.body.geojsonpoint)}', 1, 1), a.SHAPE) = 1`  
// if (req.query.id_jln) {
//   setup =    `(MBRIntersects(ST_GeomFromGeoJSON('${JSON.stringify(req.body.geojsonpoint)}', 1, 1), a.SHAPE) = 1`+" or a.id_jln='" + req.query.id_jln + "')";
// }
connection.query(`SELECT asWkt(a.SHAPE) as geometry, a.id_jln, a.km_awal, a.km_akhir, a.p_ruas, a.prkrsn, a.l_ruas, a.kdns, a.foto_awal, a.foto_akhir, a.id, b.status, b.nm_ruas, b.kd_ruas from drainase a join daftar_induk2 b on a.id_jln = b.id_jln WHERE ${setup} and b.deleted =0 order by a.id_jln asc`, function (err, rows, fields) {
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
    //console.log("SELECT asWkt(admin_kec.SHAPE) as geometry FROM admin_kec WHERE MBRContains(GeomFromText( 'POLYGON(("+req.query.kiri_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kiri_lat+"))' ),admin_kec.SHAPE");

    //res.end(JSON.stringify(rows))

    // MySQL query...
    //ambil geojson
    dbgeo.parse({
      "data": rows,
      "outputFormat": "geojson",
      "geometryColumn": "geometry",
      "geometryType": "wkt"
    }, function (error, result) {
      if (error) {
        return console.log(error);
      }
      // This will log a valid GeoJSON object
      // console.log(result)  
      res.send(JSON.stringify(result))
    });
  });


  //connection.end();
})
router.get('/detail_jalan/:id_jalan', function (req, res) {
  //connection.connect();
  //console.log(req.query)
  var tambahan = " where id_jln='" + req.params.id_jalan + "'";


  connection.query("SELECT * from daftar_induk2  " + tambahan, function (err, rows, fields) {
    if (err) throw err;

    res.send(JSON.stringify(rows))
  });


  
  //connection.end();
})

router.get('/lapor_jalan', function (req, res) {

  let a = ''
  if(req.user){
    if (req.user[0].role == 2) {
      a+= ` and lj.id_user = ${req.user[0].id_user}`
    }
  }

if (req.query.wadmkk) {
  a+= ` and k2.id_wadmkk = ${req.query.wadmkk}`
}
if (req.query.kelurahan && req.query.kelurahan!='null') {
  a+= ` and k.id_kelurahan = ${req.query.kelurahan}`
}
if (req.query.tahun) {
  a+= `  AND DATE_FORMAT(lj.inserted,'%Y') = ${req.query.tahun} `
}else{
  a+= `  AND DATE_FORMAT(lj.inserted,'%Y') = ${new Date().getFullYear()} `

}

connection.query(`SELECT lj.*,di.status, di.nm_ruas ,di.kd_ruas,u.fullname , k.desa, k2.wadmkk ,k3.desa as user_kel , k4.wadmkk as user_kec,  asWkt(jl.SHAPE) as geometry, jl.km_awal, jl.km_akhir, jl.p_ruas, jl.prkrsn, jl.l_ruas, jl.kdns, jl.foto_awal, jl.foto_akhir FROM lapor_jali lj  left join daftar_induk2 di on di.id_jln = lj.id_jln left join user u on u.id_user = lj.id_user  left join kelurahan k on k.id_kelurahan = di.id_kel left join wadmkk k2 on k2.id_wadmkk = k.id_kec   left join kelurahan k3 on k3.id_kelurahan = u.kel_id left join wadmkk k4 on k4.id_wadmkk = k3.id_kec join drainase jl on  di.id_jln = jl.id_jln WHERE ISNULL(lj.deletedAt) ${a}  order by lj.lapor_jali_id desc`, function (err, rows, fields) {
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
    //console.log("SELECT asWkt(admin_kec.SHAPE) as geometry FROM admin_kec WHERE MBRContains(GeomFromText( 'POLYGON(("+req.query.kiri_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kiri_lat+"))' ),admin_kec.SHAPE");

    //res.end(JSON.stringify(rows))

    // MySQL query...
    //ambil geojson
    dbgeo.parse({
      "data": rows,
      "outputFormat": "geojson",
      "geometryColumn": "geometry",
      "geometryType": "wkt"
    }, function (error, result) {
      if (error) {
        return console.log(error);
      }
      // This will log a valid GeoJSON object
      // console.log(result)  
      res.send(JSON.stringify(result))
    });
  });


  //connection.end();
})


// router.get('/usulan_jalan', function (req, res) {

//   let a = ''
//   if(req.user){
//     if (req.user[0].role == 2) {
//       a+= ` and lj.id_user = ${req.user[0].id_user}`
//     }
//   }

//   if (req.query.wadmkk) {
//     a+= ` and k2.id_wadmkk = ${req.query.wadmkk}`
//   }
//   if (req.query.kelurahan && req.query.kelurahan!='null') {
//     a+= ` and k.id_kelurahan = ${req.query.kelurahan}`
//   }
//   if (req.query.tahun) {
//     a+= `  AND DATE_FORMAT(uj.insertedAt,'%Y') = ${req.query.tahun} `
//   }else{
//     a+= `  AND DATE_FORMAT(uj.insertedAt,'%Y') = ${new Date().getFullYear()} `

//   }

// connection.query(`SELECT uj.* , u.fullname ,k.desa ,k2.wadmkk, asWkt(uj.SHAPE) as geometry  FROM usulan_jali uj left join user u on u.id_user = uj.id_user left join  kelurahan k on k.id_kelurahan = u.kel_id left join wadmkk k2 on k2.id_wadmkk = k.id_kec  WHERE ISNULL(uj.deletedAt) and uj.SHAPE is not null ${a}  ORDER BY uj.usulan_jali_id DESC  `, function (err, rows, fields) {
//     if (err) throw err;
//     for (let i = 0; i < rows.length; i++) {
//       if(rows[i].status=='JALAN LINGKUNGAN'){
//         rows[i].color='#ff6600';
//       }else if(rows[i].status=='JALAN KOTA'){
//         rows[i].color='#00ff00';
//       }else if(rows[i].status=='JALAN NASIONAL'){
//         rows[i].color='#ff0000';
//       }else if(rows[i].status=='JALAN PROVINSI'){
//         rows[i].color='#ffff4d';
//       }else if(rows[i].status=='JALAN TOL'){
//         rows[i].color='#0057A0';
//       }else{
//         rows[i].color='#ff6600';
//       }
      
//     }
//     //console.log("SELECT asWkt(admin_kec.SHAPE) as geometry FROM admin_kec WHERE MBRContains(GeomFromText( 'POLYGON(("+req.query.kiri_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kiri_lat+"))' ),admin_kec.SHAPE");

//     //res.end(JSON.stringify(rows))

//     // MySQL query...
//     //ambil geojson
//     dbgeo.parse({
//       "data": rows,
//       "outputFormat": "geojson",
//       "geometryColumn": "geometry",
//       "geometryType": "wkt"
//     }, function (error, result) {
//       if (error) {
//         return console.log(error);
//       }
//       // This will log a valid GeoJSON object
//       // console.log(result)  
//       res.send(JSON.stringify(result))
//     });
//   });


//   //connection.end();
// })
router.get('/usulan_jalan', function (req, res) {

  let a = ''
  if(req.user){
    if (req.user[0].role == 2) {
      a+= ` and uj.id_user = ${req.user[0].id_user}`
    }
  }

  if (req.query.wadmkk) {
    a+= ` and k2.id_wadmkk = ${req.query.wadmkk}`
  }
  if (req.query.id_survey) {
    a+= ` and uj.survey_id = ${req.query.id_survey}`
  }
  if (req.query.kelurahan && req.query.kelurahan!='null') {
    a+= ` and k.id_kelurahan = ${req.query.kelurahan}`
  }
  if (req.query.tahun) {
    a+= `  AND DATE_FORMAT(uj.insertedAt,'%Y') = ${req.query.tahun} `
  }else{
    a+= `  AND DATE_FORMAT(uj.insertedAt,'%Y') = ${new Date().getFullYear()} `

  }

// connection.query(`SELECT uj.* , u.fullname ,k.desa ,k2.wadmkk, asWkt(uj.SHAPE) as geometry  FROM survey uj left join user u on u.id_user = uj.id_user left join  kelurahan k on k.id_kelurahan = u.kel_id left join wadmkk k2 on k2.id_wadmkk = k.id_kec  WHERE ISNULL(uj.deletedAt) and uj.SHAPE is not null ${a}  ORDER BY uj.usulan_jali_id DESC  `, function (err, rows, fields) {
connection.query(`SELECT  uj.* , u.fullname ,k.desa ,k2.wadmkk, asWkt(uj.SHAPE) as geometry  FROM survey uj left join pembangunan_jali pj on uj.pembangunan_jali_id = pj.pembangunan_jali_id left join user u  on u.id_user = uj.id_user  left join  kelurahan k on k.id_kelurahan = u.kel_id left join wadmkk k2 on k2.id_wadmkk = k.id_kec   WHERE ISNULL(uj.deletedAt) and uj.SHAPE is not null ${a}  ORDER BY uj.pembangunan_jali_id DESC   `, function (err, rows, fields) {
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
    //console.log("SELECT asWkt(admin_kec.SHAPE) as geometry FROM admin_kec WHERE MBRContains(GeomFromText( 'POLYGON(("+req.query.kiri_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kanan_lat+","+req.query.kanan_lng+" "+req.query.kiri_lat+","+req.query.kiri_lng+" "+req.query.kiri_lat+"))' ),admin_kec.SHAPE");

    //res.end(JSON.stringify(rows))

    // MySQL query...
    //ambil geojson
    dbgeo.parse({
      "data": rows,
      "outputFormat": "geojson",
      "geometryColumn": "geometry",
      "geometryType": "wkt"
    }, function (error, result) {
      if (error) {
        return console.log(error);
      }
      // This will log a valid GeoJSON object
      // console.log(result)  
      res.send(JSON.stringify(result))
    });
  });


  //connection.end();
})
router.get('/json_wadmkk', function (req, res) {
  let str = ''
  let val = []
  if (req.query.id_wadmkk) {
    str += ' and id_wadmkk=?'
    val.push(req.query.id_wadmkk)
  }
  console.log('Fetching wadmkk data...');

  connection.query({
    sql: `SELECT a.*,asWkt(a.SHAPE) as geometry FROM jateng_kemendagri a where deleted = 0 ` + str,
    values: val,
    timeout: 60000
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
      console.log('No wadmkk data found');
      return res.status(404).json({
        status: 404,
        message: "No data found"
      });
    }

    console.log('Found ' + rows.length + ' wadmkk rows, parsing to GeoJSON...');

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

      console.log('Successfully parsed wadmkk to GeoJSON');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="data.geojson"'
      );

      // Mengirimkan JSON sebagai file yang dapat diunduh
      res.send(JSON.stringify(result, null, 2));
    });
  });
})
router.get('/json_kelurahan', function (req, res) {
  let str = ''
  let val = []
  if (req.query.id_wadmkk) {
    str += ' and id_wadmkk=?'
    val.push(req.query.id_wadmkk)
  }
  if (req.query.id_kelurahan) {
    str += ' and id_kelurahan=?'
    val.push(req.query.id_kelurahan)
  }

  console.log('Fetching kelurahan data...');

  connection.query({
    sql: `SELECT a.*,asWkt(a.SHAPE) as geometry FROM kelurahan a where deleted = 0 ` + str,
    values: val,
    timeout: 60000
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
      console.log('No kelurahan data found');
      return res.status(404).json({
        status: 404,
        message: "No data found"
      });
    }

    console.log('Found ' + rows.length + ' kelurahan rows, parsing to GeoJSON...');

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

      console.log('Successfully parsed kelurahan to GeoJSON');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="data.geojson"'
      );

      // Mengirimkan JSON sebagai file yang dapat diunduh
      res.send(JSON.stringify(result, null, 2));
    });
  });
})

// Endpoint untuk mengambil data jateng_kemendagri dalam format GeoJSON
router.get('/json_jateng_kemendagri', function (req, res) {
  let str = ''
  let val = []

  if (req.query.kdpkab) {
    str += ' and kdpkab=?'
    val.push(req.query.kdpkab)
  }

  console.log('Fetching jateng_kemendagri data...');

  // Use connection with proper timeout
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

  if (!kode_kota) {
    return res.status(400).json({ status: 400, message: "kode_kota parameter is required" });
  }

  console.log('Fetching anggota data for kode_kota:', kode_kota);

  connection.query({
    sql: `SELECT no_anggota, nama_perusahaan, penanggung_jawab, kualifikasi, kode_kota, kota,
             telepon, nomor_hp_pjbu, email_kta
      FROM anggota
      WHERE kode_kota = ? AND deleted_at IS NULL`,
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
          'Kualifikasi A': [],
          'Kualifikasi B': [],
          'Kualifikasi C': []
        },
        total: 0
      });
    }

    console.log('Found ' + anggota.length + ' anggota for kode_kota:', kode_kota);

    // Group by kualifikasi untuk memudahkan display
    let kualifikasi_groups = {
      'Kualifikasi A': [],
      'Kualifikasi B': [],
      'Kualifikasi C': []
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
