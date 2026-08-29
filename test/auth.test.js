'use strict';
require('./helpers/env');

const { test } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { isMysqlUp, SKIP_MESSAGE } = require('./helpers/db');

process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('matkhau-test', 8);
const { createApp } = require('../app');

test('chưa đăng nhập vào /admin thì bị chuyển về trang đăng nhập', async () => {
  const res = await request(createApp()).get('/admin');
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/admin/dang-nhap');
});

test('trang đăng nhập mở được mà không cần đăng nhập', async () => {
  const res = await request(createApp()).get('/admin/dang-nhap');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Mật khẩu/);
});

test('mật khẩu sai thì không vào được', async () => {
  const agent = request.agent(createApp());
  const res = await agent.post('/admin/dang-nhap').type('form').send({ password: 'sai-bet' });
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Mật khẩu không đúng/);

  const sau = await agent.get('/admin');
  assert.strictEqual(sau.status, 302);
});

test('mật khẩu đúng thì vào được /admin', async (t) => {
  const agent = request.agent(createApp());
  const res = await agent.post('/admin/dang-nhap').type('form').send({ password: 'matkhau-test' });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/admin');

  // Trang danh sách bài cần database; chỉ kiểm tra khi MySQL đang chạy.
  if (!(await isMysqlUp())) return t.skip(SKIP_MESSAGE);
  const sau = await agent.get('/admin');
  assert.strictEqual(sau.status, 200);
});

test('đăng xuất thì mất quyền vào /admin', async () => {
  const agent = request.agent(createApp());
  await agent.post('/admin/dang-nhap').type('form').send({ password: 'matkhau-test' });
  await agent.post('/admin/dang-xuat').type('form').send({});

  const sau = await agent.get('/admin');
  assert.strictEqual(sau.status, 302);
});

test('chưa cấu hình mật khẩu thì không ai vào được', async () => {
  const cu = process.env.ADMIN_PASSWORD_HASH;
  process.env.ADMIN_PASSWORD_HASH = '';
  try {
    const agent = request.agent(createApp());
    const res = await agent.post('/admin/dang-nhap').type('form').send({ password: 'bat-ky' });
    assert.strictEqual(res.status, 200);
    assert.match(res.text, /chưa đặt mật khẩu/i);
  } finally {
    process.env.ADMIN_PASSWORD_HASH = cu;
  }
});
