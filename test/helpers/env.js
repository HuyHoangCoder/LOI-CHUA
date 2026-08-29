'use strict';
// Nạp .env trước để test dùng đúng thông tin MySQL của máy,
// rồi ép database sang bản dành riêng cho test.
require('dotenv').config({ quiet: true });

process.env.DB_NAME = 'loi_chua_test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret-khong-dung-that';
process.env.NODE_ENV = 'test';

// Pool giữ kết nối mở sẽ làm tiến trình test không bao giờ thoát.
// Mọi file test đều require helper này, nên đóng pool ở đây là đủ.
const { after } = require('node:test');
const { pool } = require('../../db');

after(async () => {
  try {
    await pool.end();
  } catch {
    // pool đã đóng rồi thì thôi
  }
});
