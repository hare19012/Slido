var LocalStrategy = require("passport-local").Strategy;
var db = require("./konekcija");
var bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Console = require("console");
var pmf= {
    loginuj: function (req, res, next) {
        let email = req.body.email;
        if(!req.body.email || !req.body.password){
            req.flash("uspjeh1","Sva polja moraju biti popunjena!");
            return res.render('login');
        }
        db.pool.connect(function (err, client, done) {
            if (err) {
                return res.send(err);
            }
            client.query(
                `SELECT * FROM korisnici WHERE mail = $1 and titula=$2`,
                [email,false],
                async (err, results) => {
                    done();
                    if (err) {
                        throw err;
                    }

                    if (results.rows.length > 0) {
                        var user = results.rows[0];

                        await bcrypt.compare(req.body.password, user.lozinka, (err, isMatch) => {
                            if (err) {
                                return res.send(err);
                            }
                            if (isMatch) {
                                req.korisnik={
                                    id: user.id,
                                    username: user.mail,
                                    ime: user.ime,
                                    prezime: user.prezime,
                                    titula:  user.titula
                                }
                                next();
                            } else {
                                //password is incorrect
                                req.flash("uspjeh1","Pogrešna lozinka");
                                return res.render('login');

                            }
                        });
                    }
                    else {
                        db.pool.connect(function (err, client, done) {
                            if (err) {
                                return res.send(err);
                            }
                            client.query(
                                `SELECT * FROM korisnici WHERE mail = $1 and titula=$2`,
                                [email,true],
                                async (err, results) => {
                                    done();
                                    if (err) {
                                        throw err;
                                    }

                                    if (results.rows.length > 0) {
                                        var user = results.rows[0];

                                        await bcrypt.compare(req.body.password, user.lozinka, (err, isMatch) => {
                                            if (err) {
                                                return res.send(err);
                                            }
                                            if (isMatch) {
                                                req.korisnik={
                                                    id: user.id,
                                                    username: user.mail,
                                                    ime: user.ime,
                                                    prezime: user.prezime,
                                                    titula: user.titula
                                                }
                                                next();
                                            } else {
                                                //password is incorrect
                                                req.flash("uspjeh1","Pogrešna lozinka administratora");
                                                return res.render('login');

                                            }
                                        });
                                    }
                                    else {

                                        // No user
                                        req.flash("uspjeh1","Ne postoji korisnik");
                                        return res.render('login');
                                    }
                                }
                            );
                        });

                    }
                }
            );
        });

    },
    provjeri: function(req,res,next){
    if (req.cookies.publika!=undefined) {
            return res.redirect(req.cookies.trenutna);

        }
    if (req.cookies.token_prijava1!=undefined) {
            return res.redirect('/users/admin');
        }
    if (req.cookies.token_prijava!=undefined) {
            return res.redirect("/users/dashboard");

    }
    next();
    },
    provjeri1: function(req,res,next){
    if (req.cookies.token_prijava!=undefined) {

        return next();
    }

    res.redirect('/users/login');
    },
    provjeri2: function(req,res,next){
        if (req.cookies.token_prijava1!=undefined) {

            return next();
        }
        res.redirect('/users/login');
    },
    provjeri3: function(req,res,next){
        if (req.cookies.publika!=undefined) {
            return next();
        }
        res.redirect('/users/login');
    },
    
    dekodiraj:function (req,res,next){
        let decode = jwt.verify(req.cookies.token_prijava,'kljuc');
        req.dekodiran = decode;
        next();
    },
    dajPredavanja: function (req, res, next) {
        db.pool.connect(function (err, client, done) {
            if (err) {
                return res.send(err);
            }

            client.query(`SELECT predavanja.*, COALESCE(SUM(pitanja.broj_lajkova), 0) AS ukupan_broj_lajkova, (SELECT COUNT(*) FROM odgovorena WHERE odgovorena.predavanje_id = predavanja.id) AS ukupan_broj_odgovorenih
                FROM predavanja
                LEFT JOIN pitanja ON predavanja.id = pitanja.predavanje_id
                WHERE predavanja.predavac_id = $1
                GROUP BY predavanja.id`, [req.dekodiran.id], function (err, result) {
                done();
                if (err) {
                    return res.send(err);
                } else {
                    req.predavanja = result.rows;
                    next();


                }

            });
        });
    },
    unesiPredavanje: function (req,res,next){
        let kod = req.body.kod;
        let ime = req.body.ime;
        let vrijeme = req.body.vrijeme;
        let slika = req.file.path;
        db.pool.connect(async function (err, client, done) {
            if (err) {
                return res.send(err);
            }
            let dekod =  jwt.verify(req.cookies.token_prijava,'kljuc');
            await client.query('INSERT INTO predavanja(kod,ime,vrijeme,predavac_id,cover) VALUES($1,$2,$3,$4,$5)', [kod,ime, vrijeme, dekod.id,slika], function (err, result) {
                done();
                if (err) {
                    return res.send(err);
                } else {
                    return res.redirect('/users/dashboard');

                }

            });
        });
    },
    brisiPredavanje:function (req,res,next){
        db.pool.connect(function (err, client, done) {
            if (err) {
                return res.send(err);
            }


            client.query('DELETE FROM pitanja WHERE predavanje_id = $1', [req.params.k], function (err, result) {
                done();
                if (err) {
                    return res.send(err);
                } else {
                    db.pool.connect(function (err, client, done) {
                        if (err) {
                            return res.send(err);
                        }


                        client.query('DELETE FROM odgovorena WHERE predavanje_id = $1', [req.params.k], function (err, result) {
                            done();
                            if (err) {
                                return res.send(err);
                            } else {
                                db.pool.connect(function (err, client, done) {
                                    if (err) {
                                        return res.send(err);
                                    }


                                    client.query('DELETE FROM predavanja WHERE id = $1', [req.params.k], function (err, result) {
                                        done();
                                        if (err) {
                                            return res.send(err);
                                        } else {
                                            return res.redirect('/users/dashboard');


                                        }

                                    });
                                });
                                


                            }

                        });
                    });



                }

            });
        });
    },
    editujKod: function (req,res,next){
        let novi = req.body.kod;

        db.pool.connect(function (err, client, done) {
            if (err) {
                return res.send(err);
            }


            client.query('UPDATE predavanja SET kod = novi WHERE id = $1', [req.params.k], function (err, result) {
                done();
                if (err) {
                    return res.send(err);
                } else {
                    return res.redirect('/users/dashboard');


                }

            });
        });


    },
    dajNazivPredavanja: function (req,res,next){
        db.pool.connect(function (err, client, done) {
            if (err) {
                return res.send(err);
            }


            client.query('select ime,cover from predavanja where kod = $1', [req.params.k], function (err, result) {
                done();
                if (err) {
                    return res.send(err);
                } else {
                    if(result.rows < 1) return res.redirect(req.cookies.trenutna);
                    req.ime = result.rows;
                    next();


                }

            });
        });


    },
    dajPredavanja1: function (req, res, next) {
        db.pool.connect(function (err, client, done) {
            if (err) {
                return res.send(err);
            }

            client.query(`SELECT predavanja.*, COALESCE(SUM(pitanja.broj_lajkova), 0) AS ukupan_broj_lajkova, (SELECT COUNT(*) FROM odgovorena WHERE odgovorena.predavanje_id = predavanja.id) AS ukupan_broj_odgovorenih
                FROM predavanja
                LEFT JOIN pitanja ON predavanja.id = pitanja.predavanje_id
                WHERE predavanja.predavac_id = $1
                GROUP BY predavanja.id order by ukupan_broj_lajkova`, [req.dekodiran.id], function (err, result) {
                done();
                if (err) {
                    return res.send(err);
                } else {
                    req.predavanja = result.rows;
                    next();


                }

            });
        });
    },
    dajPredavanja2: function (req, res, next) {
        db.pool.connect(function (err, client, done) {
            if (err) {
                return res.send(err);
            }

            client.query(`SELECT predavanja.*, COALESCE(SUM(pitanja.broj_lajkova), 0) AS ukupan_broj_lajkova, (SELECT COUNT(*) FROM odgovorena WHERE odgovorena.predavanje_id = predavanja.id) AS ukupan_broj_odgovorenih
                FROM predavanja
                LEFT JOIN pitanja ON predavanja.id = pitanja.predavanje_id
                WHERE predavanja.predavac_id = $1
                GROUP BY predavanja.id order by ukupan_broj_odgovorenih`, [req.dekodiran.id], function (err, result) {
                done();
                if (err) {
                    return res.send(err);
                } else {
                    req.predavanja = result.rows;
                    next();


                }

            });
        });
    },
    loginuj1: function (req, res, next) {
        let kod = req.body.kod;
        if(!req.body.kod) {
            req.flash("uspjeh5","Unesite kod");
            return res.render('login');
        }
        db.pool.connect(function (err, client, done) {
            if (err) {
                return res.send(err);
            }
            client.query(
                `SELECT * FROM predavanja WHERE kod = $1`,
                [kod],
                async (err, results) => {
                    done();
                    if (err) {
                        throw err;
                    }

                    if (results.rows.length > 0) {
                        req.publika = {
                            kod: kod
                        }
                        next();
                    }
                    else {
                        req.flash("uspjeh5","Ne postoji predavanje sa tim kodom");
                        return res.render('login');

                    }
                });
        });

    }



}


module.exports = pmf;
