const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Ativa SSL se DB_SSL for 'true' ou 'required' no .env
    ssl: (process.env.DB_SSL === 'true' || process.env.DB_SSL === 'required') ? { rejectUnauthorized: false } : undefined
});

// Testa a conexão
pool.getConnection()
    .then(conn => {
        console.log('✅ Conectado ao banco de dados MySQL com sucesso!');
        conn.release();
    })
    .catch(err => {
        console.error('❌ Erro ao conectar ao banco de dados MySQL:', err.message);
    });

module.exports = pool;
