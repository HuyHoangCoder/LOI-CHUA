'use strict';
const mysql = require('mysql2/promise');

function dbConfig(overrides = {}) {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'loi_chua',
    charset: 'utf8mb4_unicode_ci',
    waitForConnections: true,
    connectionLimit: 10,
    ...overrides,
  };
}

const pool = mysql.createPool(dbConfig());

async function assertConnection() {
  const cfg = dbConfig();
  try {
    const conn = await pool.getConnection();
    conn.release();
  } catch (err) {
    throw new Error(
      `Không kết nối được MySQL tại ${cfg.host}:${cfg.port} (database "${cfg.database}").\n` +
      `Hãy bật MySQL rồi chạy lại. Chi tiết: ${err.code || err.message}`
    );
  }
}

module.exports = { pool, dbConfig, assertConnection };
