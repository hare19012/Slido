var pg = require('pg');
var config={
    user: 'postgres',
    database: 'postgres',
    password: 'HARIS123',
    host: 'localhost',
    port: 5432,
    max: 100,
    idleTimeoutMillis: 3000,

};
var pool = new pg.Pool(config);
module.exports = {pool};