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
path.join(__dirname, '/public/foto')
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(cookieParser() );
router.use(passport.initialize());
router.use(passport.session());
let table = 'master_retribusi'
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
// Retribusi
router.get('/retribusi', cek_login, function(req, res) {
  res.render('content-backoffice/master_retribusi/list', {user:req.user[0]});
});

router.get('/retribusi/insert', cek_login, function(req, res) {
  res.render('content-backoffice/master_retribusi/insert', {user:req.user[0]});
});

router.get('/retribusi/edit/:id', cek_login, function(req, res) {
  res.render('content-backoffice/master_retribusi/edit', {id : req.params.id, user:req.user[0]});
});

router.post('/retribusi/insert', upload.fields([{ name: 'foto_1', maxCount: 1 }]), async function(req, res) {

  let post = req.body
  console.log(post);
       try {

  let sql2 = `SELECT  *  FROM master_retribusi p where nama_retribusi = ? `
  let retribusi_cek =await sql_enak.raw(sql2,[post["nama_retribusi"]])
  console.log(retribusi_cek);

  if (retribusi_cek[0].length==0) {

    await sql_enak.insert(post).into('master_retribusi').then(data=>{
    res.status(200).json({ status: 200, message: "sukses", data: data})
 })
 .catch(err=>{
          console.log('error err');

  console.log(err,'err');
    res.status(500).json({ status: 500, message: "gagal", data: err})
 })

}else{
      console.log('error else');

  res.status(201).json({ status: 201, message: "gagal", data: 'Nama Retribusi Telah Terpakai'})

}
} catch (error) {
  console.log('error_chatch');

      console.log(error,'error');

        res.status(500).json({ status: 500, message: "gagal", data: error})

}
});

router.post('/retribusi/edit', upload.fields([{ name: 'foto_1', maxCount: 1 }]), async function(req, res) {

  let post = req.body

  if (post.nama_retribusi) {
      let sql2 = `SELECT  *  FROM master_retribusi p where nama_retribusi = ? and id != ?`
      let retribusi_cek =await sql_enak.raw(sql2,[post["nama_retribusi"],post['id']])
          if (retribusi_cek[0].length > 0) {
                res.status(500).json({ status: 500, message: "gagal", data: 'Nama Retribusi Telah Terpakai'})
                return
          }
  }
  try {
    console.log('data');

    await sql_enak('master_retribusi').where('id','=',post.id).update(post).then(data=>{
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
router.get('/retribusi/hapus/:id',async function(req, res) {
  await sql_enak('master_retribusi').where('id','=',req.params.id).update({deleted_at: new Date()}).then(data=>{
    res.status(200).json({ status: 200, message: "sukses", data: data[0]})
 })
 .catch(err=>{
    res.status(500).json({ status: 500, message: "gagal", data: err})
 })
})
router.get('/retribusi/list',async function(req, res) {
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

  let sql = `SELECT  ${a}  FROM master_retribusi p WHERE p.deleted_at is null  `+str
  await sql_enak.raw(sql,value).then(data=>{
      res.status(200).json({ status: 200, message: "sukses", data: data[0]})
   })
   .catch(err=>{
    console.log(err);
      res.status(500).json({ status: 500, message: "gagal", data: err})
   })
})

// Spesialisasi
router.get('/spesialisasi', cek_login, function(req, res) {
  res.render('content-backoffice/master_spesialisasi/list', {user:req.user[0]});
});

router.get('/spesialisasi/insert', cek_login, function(req, res) {
  res.render('content-backoffice/master_spesialisasi/insert', {user:req.user[0]});
});

router.get('/spesialisasi/edit/:id', cek_login, function(req, res) {
  res.render('content-backoffice/master_spesialisasi/edit', {id : req.params.id, user:req.user[0]});
});

module.exports = router;