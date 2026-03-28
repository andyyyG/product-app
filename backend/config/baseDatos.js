const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USUARIO,
    password: process.env.DB_CONTRASENA,
    database: process.env.DB_NOMBRE,
    waitForConnections: true,
    connectionLimit: 10,
});

module.exports = pool;