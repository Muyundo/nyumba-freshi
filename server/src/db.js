const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

if (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  console.warn('Warning: DB credentials are not fully set in environment variables. DB connections may fail.')
}

module.exports = pool
