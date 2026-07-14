const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

// Fail fast with a clear message if the DB is unreachable, instead of
// letting every route throw a cryptic ECONNREFUSED later.
async function verifyConnection() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log('MySQL connection pool ready');
  } catch (err) {
    console.error('Could not connect to MySQL:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, verifyConnection };
