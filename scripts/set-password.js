'use strict';
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const matKhau = process.argv[2];

if (!matKhau) {
  console.log('\nCách dùng:  npm run set-password -- "mat khau cua ban"\n');
  process.exit(1);
}

if (matKhau.length < 6) {
  console.log('\nMật khẩu phải dài ít nhất 6 ký tự.\n');
  process.exit(1);
}

const hash = bcrypt.hashSync(matKhau, 10);
const secret = crypto.randomBytes(32).toString('hex');

console.log('\nChép 2 dòng dưới đây vào file .env (thay dòng cũ nếu đã có):\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
console.log(`SESSION_SECRET=${secret}`);
console.log('');
