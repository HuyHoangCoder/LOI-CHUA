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
  const cid = await categories.create('Suy niệm');
  await posts.create({
    title: 'Bài mẫu', body: 'Nội dung.', status: 'published', category_id: cid,
  });
  return true;
}

test('trang chủ có màn hình chào', async (t) => {
  if (!(await chuanBi(t))) return;
  const res = await request(createApp()).get('/');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /id="splash"/);
});

test('trang chủ tải lại lần nào cũng có màn hình chào', async (t) => {
  if (!(await chuanBi(t))) return;
  const agent = request.agent(createApp());

  for (let lan = 1; lan <= 3; lan += 1) {
    const res = await agent.get('/');
    assert.strictEqual(res.status, 200);
    assert.match(res.text, /id="splash"/, `lần tải thứ ${lan} phải có màn hình chào`);
  }
});

test('chỉ trang chủ mới có — các trang khác thì không', async (t) => {
  if (!(await chuanBi(t))) return;
  const app = createApp();

  for (const duongDan of ['/bai-viet/bai-mau', '/chu-de/suy-niem', '/?trang=2']) {
    const res = await request(app).get(duongDan);
    assert.strictEqual(res.status, 200, `${duongDan} phải trả 200`);
    assert.ok(!res.text.includes('id="splash"'), `${duongDan} không được có màn hình chào`);
  }
});

test('trang quản trị KHÔNG có màn hình chào', async (t) => {
  if (!(await chuanBi(t))) return;

  const dangNhap = await request(createApp()).get('/admin/dang-nhap');
  assert.ok(!dangNhap.text.includes('id="splash"'));

  const agent = request.agent(createApp());
  await agent.post('/admin/dang-nhap').type('form').send({ password: 'matkhau-test' });
  const ds = await agent.get('/admin');
  assert.strictEqual(ds.status, 200);
  assert.ok(!ds.text.includes('id="splash"'));
});

test('màn hình chào vẽ bằng chữ và SVG, không dùng ảnh', async (t) => {
  if (!(await chuanBi(t))) return;
  const res = await request(createApp()).get('/');

  assert.match(res.text, /LỜI CHÚA/, 'phải có tên vẽ bằng chữ');
  assert.match(res.text, /Mỗi ngày với Lời Hằng Sống/, 'phải có dòng phụ đề');
  assert.match(res.text, /Thi Thiên 119:105/, 'phải có nguồn câu Kinh Thánh');
  assert.match(res.text, /Đang tải/, 'phải có dòng đang tải');

  const khoiSplash = res.text.slice(
    res.text.indexOf('id="splash"'),
    res.text.indexOf('<header')
  );
  assert.match(khoiSplash, /<svg/, 'hình cuốn sách phải là SVG');
  assert.ok(!/\.jpg|\.png/.test(khoiSplash), 'không được dùng file ảnh nữa');
});
