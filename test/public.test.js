'use strict';
require('./helpers/env');

const { test } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { isMysqlUp, resetDatabase, SKIP_MESSAGE } = require('./helpers/db');

process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('matkhau-test', 8);
const { createApp } = require('../app');
const posts = require('../models/posts');
const categories = require('../models/categories');

async function chuanBi(t) {
  if (!(await isMysqlUp())) { t.skip(SKIP_MESSAGE); return false; }
  await resetDatabase();
  return true;
}

test('trang chủ hiện bài đã đăng, ẩn bài nháp', async (t) => {
  if (!(await chuanBi(t))) return;
  await posts.create({ title: 'Bài đã đăng', body: 'x', status: 'published' });
  await posts.create({ title: 'Bài còn nháp', body: 'x', status: 'draft' });

  const res = await request(createApp()).get('/');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Bài đã đăng/);
  assert.ok(!res.text.includes('Bài còn nháp'));
});

test('đọc được bài đã đăng, nội dung tách thành đoạn', async (t) => {
  if (!(await chuanBi(t))) return;
  await posts.create({
    title: 'Lời Chúa cho ngày mới',
    body: 'Đoạn một.\n\nĐoạn hai.',
    verse_ref: 'Ê-sai 1:18',
    verse_text: 'Dầu tội các ngươi như hồng điều',
    status: 'published',
  });

  const res = await request(createApp()).get('/bai-viet/loi-chua-cho-ngay-moi');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /<p>Đoạn một\.<\/p>/);
  assert.match(res.text, /<p>Đoạn hai\.<\/p>/);
  assert.match(res.text, /Ê-sai 1:18/);
});

test('trang đọc bài có nút nghe và script kèm theo', async (t) => {
  if (!(await chuanBi(t))) return;
  await posts.create({ title: 'Bài để nghe', body: 'Một đoạn.', status: 'published' });

  const res = await request(createApp()).get('/bai-viet/bai-de-nghe');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /src="\/js\/doc-to\.js"/);
  assert.match(res.text, /id="nut-doc-bao" role="status"/);

  // Nút phải vừa ẩn vừa khoá sẵn: chỉ script mới được mở nó ra, và chỉ sau khi đã
  // dò xong giọng đọc. Bắt đúng trong thẻ mở của nút, đừng để khớp nhầm sang
  // aria-hidden của thẻ svg bên trong.
  const the = res.text.match(/<button[^>]*id="nut-doc"[^>]*>/);
  assert.ok(the, 'không thấy thẻ mở của nút nghe bài');
  assert.match(the[0], /\shidden[\s>]/);
  assert.match(the[0], /\sdisabled[\s>]/);
});

test('bài nháp trả 404 với khách, nhưng xem được khi đã đăng nhập', async (t) => {
  if (!(await chuanBi(t))) return;
  await posts.create({ title: 'Bài còn nháp', body: 'x', status: 'draft' });

  const khach = await request(createApp()).get('/bai-viet/bai-con-nhap');
  assert.strictEqual(khach.status, 404);

  const agent = request.agent(createApp());
  await agent.post('/admin/dang-nhap').type('form').send({ password: 'matkhau-test' });
  const admin = await agent.get('/bai-viet/bai-con-nhap');
  assert.strictEqual(admin.status, 200);
});

test('địa chỉ bài không tồn tại trả 404', async (t) => {
  if (!(await chuanBi(t))) return;
  const res = await request(createApp()).get('/bai-viet/khong-co-that');
  assert.strictEqual(res.status, 404);
  assert.match(res.text, /Không tìm thấy/);
});

test('trang chủ đề chỉ hiện bài thuộc chủ đề đó', async (t) => {
  if (!(await chuanBi(t))) return;
  const cid = await categories.create('Suy niệm');
  await posts.create({ title: 'Bài suy niệm', body: 'x', status: 'published', category_id: cid });
  await posts.create({ title: 'Bài khác', body: 'x', status: 'published' });

  const res = await request(createApp()).get('/chu-de/suy-niem');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Bài suy niệm/);
  assert.ok(!res.text.includes('Bài khác'));
});

test('chủ đề không tồn tại trả 404', async (t) => {
  if (!(await chuanBi(t))) return;
  const res = await request(createApp()).get('/chu-de/khong-co-that');
  assert.strictEqual(res.status, 404);
});

test('nội dung chứa thẻ HTML thì hiện ra thành chữ, không chạy', async (t) => {
  if (!(await chuanBi(t))) return;
  await posts.create({
    title: 'Thử XSS', body: '<script>alert(1)</script>', status: 'published',
  });

  const res = await request(createApp()).get('/bai-viet/thu-xss');
  assert.strictEqual(res.status, 200);
  assert.ok(!res.text.includes('<script>alert(1)</script>'));
  assert.match(res.text, /&lt;script&gt;/);
});

test('phân trang: trang 2 hiện bài thứ 11', async (t) => {
  if (!(await chuanBi(t))) return;
  for (let i = 1; i <= 11; i += 1) {
    await posts.create({ title: `Bài số ${i}`, body: 'x', status: 'published' });
  }
  const res = await request(createApp()).get('/?trang=2');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Bài số 1</);
});

test('địa chỉ lạ trả 404', async (t) => {
  if (!(await chuanBi(t))) return;
  const res = await request(createApp()).get('/khong-ton-tai-dau');
  assert.strictEqual(res.status, 404);
});
