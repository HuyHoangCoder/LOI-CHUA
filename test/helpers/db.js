'use strict';
require('./env');

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { dbConfig } = require('../../db');

const TEST_DB = 'loi_chua_test';
const SKIP_MESSAGE = 'MySQL chưa chạy — bỏ qua test cần database';

function rootConfig() {
  const cfg = dbConfig();
  return {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    multipleStatements: true,
  };
}

let upPromise = null;
function isMysqlUp() {
  if (!upPromise) {
    upPromise = (async () => {
      try {
        const conn = await mysql.createConnection(rootConfig());
        await conn.end();
        return true;
      } catch {
        return false;
      }
    })();
  }
  return upPromise;
}

async function resetDatabase() {
  const conn = await mysql.createConnection(rootConfig());
  await conn.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
  await conn.query(
    `CREATE DATABASE \`${TEST_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.changeUser({ database: TEST_DB });
  const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'schema.sql'), 'utf8');
  await conn.query(sql);
  await conn.end();
}

module.exports = { TEST_DB, isMysqlUp, resetDatabase, SKIP_MESSAGE };
