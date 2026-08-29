'use strict';
require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { dbConfig } = require('../db');

async function main() {
  const cfg = dbConfig();
  const name = cfg.database;
  let conn;
  try {
    conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      multipleStatements: true,
    });
  } catch (err) {
    console.error(`\nKhông kết nối được MySQL tại ${cfg.host}:${cfg.port}. Hãy bật MySQL rồi chạy lại.`);
    console.error(`Chi tiết: ${err.code || err.message}\n`);
    process.exit(1);
  }

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.changeUser({ database: name });
  const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  await conn.query(sql);
  await conn.end();

  console.log(`\nĐã tạo xong database "${name}" và các bảng.\n`);
}

main();
