var express = require('express');
const Console = require("console");
var router = express.Router();
var  db = require("../konekcija.js");
var pg = require('pg');
var bcrypt = require('bcrypt')
var login = require('../fje');
var jwt = require('jsonwebtoken');
const {token} = require("morgan");
const multer = require("multer");
const path = require("path");
var io;


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/slike')
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname))
  }
})
const upload = multer({storage: storage})
/* GET users listing. */
router.get('/',login.provjeri, function(req, res, next) {
  res.send('respond with a resource');
});
router.get("/register",login.provjeri,(req, res) => {
  res.render('register');
});
router.post('/register',function(req, res, next) {
  let str = req.body.username;
  const ime = str.charAt(0).toUpperCase() + str.slice(1);
  let str2 = req.body.username2;
  const prezime = str2.charAt(0).toUpperCase() + str.slice(1);
  let mail = req.body.mail;
  let lozinka1 = req.body.lozinka1;
  let lozinka2 = req.body.lozinka2;

  var greske = [];
  if(!ime && !mail && !lozinka1 && !lozinka2 && !prezime) {
    greske.push("Sva polja moraju biti popunjena!");
    return res.render('register', {niz: greske});
  }
  else {
    if (!ime || !mail || !lozinka1 || !lozinka2 || !prezime) {
      greske.push("Sva polja moraju biti popunjena!");
      return res.render('register', {niz: greske});
    }
    if (lozinka1.length < 6) greske.push("Lozinka moza sadržavati minimalno šest karaktera!");
    if (lozinka2 != lozinka1) greske.push("Lozinke se ne podudaraju");
    if(greske.length>0) return res.render('register', {niz: greske});
    db.pool.connect(function (err, client, done) {
      if (err) {
        return res.send(err);
      }
      client.query('SELECT * FROM korisnici where mail=$1', [mail],async function (err, result) {
        done();
        if (err) {
          return res.send(err);
        } else {
          if (result.rows.length > 0) {
            greske.push("E-mail već postoji!");
            return res.render('register', {niz: greske});
          } else {
            let hesiranpas = await bcrypt.hash(lozinka1, 10);
            db.pool.connect(function (err, client, done) {
              if (err) {
                return res.send(err);
              }
              client.query('INSERT INTO korisnici(ime,prezime,mail,lozinka,titula) VALUES($1,$2,$3,$4,$5)', [ime,prezime, mail, hesiranpas,false], function (err, result) {
                done();
                if (err) {
                  return res.send(err);
                } else {
                  req.flash("uspjeh","Uspješno ste se registrovali. Prijavite se!");
                  res.redirect('/users/login');

                }

              });
            });
          }


        }

      });
    });
  }

});
router.get("/login",login.provjeri, (req, res) => {
  res.render('login');
});
router.post("/login",login.loginuj,function (req,res,next){
  if(req.korisnik.titula === false) {
    let token = jwt.sign( req.korisnik, 'kljuc',{expiresIn:1000 * 60 * 60 * 24});
    res.cookie('token_prijava',token, { maxAge: 1000 * 60 * 60 * 24, httpOnly: true });
    res.redirect('/users/dashboard');
  }
  else {
    let token = jwt.sign( req.korisnik, 'kljuc',{expiresIn:1000 * 60 * 60 * 24});
    res.cookie('token_prijava1',token, { maxAge: 1000 * 60 * 60 * 24, httpOnly: true });
    res.redirect('/users/admin');
  }
});


router.get("/dashboard",login.provjeri1,login.dekodiraj,login.dajPredavanja,(req, res) => {
  res.render("dashboard", { user: req.dekodiran.ime,predavanja:req.predavanja});
});
router.post('/dashboard',upload.single("image"),login.unesiPredavanje,(req,res)=>{

})
router.get('/logout', function(req, res){
  cookie = req.cookies;
  for (var prop in cookie) {
    if (!cookie.hasOwnProperty(prop)) {
      continue;
    }
    res.cookie(prop, '', {expires: new Date(0)});
  }
  res.redirect('/users/login');

});
router.get('/vani', function(req, res){
  cookie = req.cookies;
  for (var prop in cookie) {
    if (!cookie.hasOwnProperty(prop)) {
      continue;
    }
    res.cookie(prop, '', {expires: new Date(0)});
  }
  res.redirect('/users/login');

});
router.get('/kod/:k',login.provjeri1,login.dekodiraj,function(req, res){
  res.render('kod',{user:req.dekodiran.ime,kod:req.params.k});

});
router.get('/brisi/:k',login.provjeri1,login.brisiPredavanje,(req, res)=>{
  res.redirect('/users/dashboard');

});
var K;
var P;
router.get('/edituj/:k',login.provjeri1,(req, res)=>{
  K = req.params.k;
  res.render('edit1');


});
router.get('/sortiraj',login.provjeri1,login.dekodiraj,login.dajPredavanja1,function (req,res,next){

  res.send(req.predavanja);
});
router.get('/sortiraj1',login.provjeri1,login.dekodiraj,login.dajPredavanja2,function (req,res,next){

  res.send(req.predavanja);
});
router.post('/edituj',(req, res)=>{
  const str = req.body.kod;
  db.pool.connect(function (err, client, done) {
    if (err) {
      return res.send(err);
    }
    client.query(`update predavanja set kod = $2 where id = $1 ` , [K,str], function (err, result) {
      done();
      if (err) {
        console.log(err);
        return res.send(err);

      } else{
        return res.redirect('/users/dashboard');


      }

    });
  });

});
router.get('/pitanja/:k',login.provjeri3,login.dajNazivPredavanja,(req, res)=>{
  let str = req.ime[0].ime;
  const ime = str.charAt(0).toUpperCase() + str.slice(1);
  res.cookie('trenutna',req.baseUrl+req.path);
  res.render('pitanja',{kod:req.params.k,naziv:ime});

});
router.get('/odgovorena/:k',login.provjeri1,login.dekodiraj,(req, res)=>{

  res.render('odgovorena',{kod:req.params.k,user:req.dekodiran.ime});

});
router.post('/pitanja',login.loginuj1,(req, res)=>{
  res.cookie('publika',req.publika);
  res.redirect('/users/pitanja/'+req.body.kod);

});
router.get('/admin',login.provjeri2,(req, res)=>{
  res.render('admin');

});
router.get('/predavac/:k',login.provjeri1,login.dekodiraj,function(req, res){
  if(!io){
    io = require('socket.io')(req.connection.server);
    io.sockets.on('connection', function (client) {
      client.on('Joino se klijent',function(kod){
        client.join(kod);
        var pitanja = [];
        var cover=[];
        var odgovori=[];
        var odgovori2 = [];
        db.pool.connect(function (err, client, done) {
          if (err) {
            return res.send(err);
          }


          client.query(`Select * from pitanja where predavanje_id = (select id from predavanja where kod = $1) order by id`, [kod], function (err, result) {
            done();
            if (err) {
              return res.send(err);

            } else {
              pitanja = result.rows;
              db.pool.connect(function (err, client, done) {
                if (err) {
                  return res.send(err);
                }


                client.query('select cover from predavanja where kod = $1', [kod], function (err, result) {
                  done();
                  if (err) {
                    return res.send(err);
                  } else {
                    cover = result.rows;
                    db.pool.connect(function (err, client, done) {
                      if (err) {
                        return res.send(err);
                      }


                      client.query(`SELECT COUNT(*) AS ukupan_broj_odgovora
                            FROM odgovorena
                            WHERE predavanje_id = (SELECT id FROM predavanja WHERE kod = $1)`, [kod], function (err, result) {
                        done();
                        if (err) {
                          return res.send(err);
                        } else {
                          odgovori = result.rows;
                          db.pool.connect(function (err, client, done) {
                            if (err) {
                              return res.send(err);
                            }


                            client.query(`SELECT * FROM odgovorena
                            WHERE predavanje_id = (SELECT id FROM predavanja WHERE kod = $1)`, [kod], function (err, result) {
                              done();
                              if (err) {
                                return res.send(err);
                              } else {
                                odgovori2 = result.rows;
                                console.log(odgovori2);
                                let clientId = "your-client-id"; // Zamijenite sa stvarnim identifikatorom klijenta
                                io.sockets.connected[clientId].emit('Sve_poruke', poruke);


                              }

                            });
                          });



                        }

                      });
                    });




                  }

                });
              });



            }

          });
        });

      });
      client.on('Salje poruku',function (poruka,kod){
        db.pool.connect(function (err, client, done) {
          if (err) {
            return res.send(err);
          }
          client.query(`INSERT INTO pitanja(pitanje,predavanje_id) 
            VALUES ($1, (SELECT id FROM predavanja WHERE kod = $2 ))`, [poruka,kod], function (err, result) {
            done();
            if (err) {
              return res.send(err);
            } else {
              var pitanja = [];
              db.pool.connect(function (err, client, done) {
                if (err) {
                  return res.send(err);
                }


                client.query(`select * from pitanja order by id desc limit 1`, [], function (err, result) {
                  done();
                  if (err) {
                    return res.send(err);

                  } else {
                    pitanja = result.rows;
                    console.log(pitanja);
                    io.sockets.in(kod).emit("Svima poruka",pitanja);

                  }

                });
              });


            }

          });
        });
      });
      client.on('Lajko',function (id,kod){
        db.pool.connect(function (err, client, done) {
          if (err) {
            return res.send(err);
          }
          client.query(`update  pitanja set broj_lajkova= broj_lajkova+1 where id = $1`, [id], function (err, result) {
            done();
            if (err) {
              return res.send(err);
            } else {
              console.log(typeof id);
              io.sockets.in(kod).emit("POVECAJ LAJKOVE",id);


            }

          });
        });

      });
      client.on('Izbriso',function (id,kod){
        db.pool.connect(function (err, client, done) {
          if (err) {
            return res.send(err);
          }
          client.query(`delete from pitanja where id = $1`, [id], function (err, result) {
            done();
            if (err) {
              return res.send(err);
            } else {
              io.sockets.in(kod).emit("IZBRISANO",id);


            }

          });
        });

      });
      client.on('Odgovorio',function (id,kod){
        var poruka = [];
        db.pool.connect(function (err, client, done) {
          if (err) {
            return res.send(err);
          }
          client.query(`insert into odgovorena(pitanje,predavanje_id) values((select pitanje from pitanja where id = $1),(SELECT id FROM predavanja WHERE kod = $2))`, [id,kod], function (err, result) {
            done();
            if (err) {
              return res.send(err);
            } else {
              db.pool.connect(function (err, client, done) {
                if (err) {
                  return res.send(err);
                }
                client.query(`delete from pitanja where id = $1`, [id], function (err, result) {
                  done();
                  if (err) {
                    console.log("ahaaa");
                    return res.send(err);
                  } else {
                    db.pool.connect(function (err, client, done) {
                      if (err) {
                        return res.send(err);
                      }
                      client.query(`select * from odgovorena order by id desc limit 1`, [], function (err, result) {
                        done();
                        if (err) {
                          return res.send(err);
                        } else {
                          poruka = result.rows;
                          io.sockets.in(kod).emit("ODGOVORENO",id,poruka);


                        }

                      });
                    });


                  }

                });
              });


            }

          });
        });

      });


    });
  }

  res.render('predavac',{kod:req.params.k,user:req.dekodiran.ime});

});
module.exports = router;
