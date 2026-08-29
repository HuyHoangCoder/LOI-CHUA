'use strict';
require('dotenv').config({ quiet: true });

const { createApp } = require('./app');
const { assertConnection } = require('./db');

async function main() {
  try {
    await assertConnection();
  } catch (err) {
    console.error('\n' + err.message + '\n');
    process.exit(1);
  }

  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, () => {
    console.log(`\n  Web Lời Chúa đang chạy:  http://localhost:${port}`);
    console.log(`  Trang quản trị:          http://localhost:${port}/admin`);
    console.log('\n  Đóng cửa sổ này hoặc bấm Ctrl+C để tắt.\n');
  });
}

main();
