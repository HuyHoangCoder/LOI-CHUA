'use strict';
require('./helpers/env');

const { test } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { isMysqlUp, resetDatabase, SKIP_MESSAGE } = require('./helpers/db');

process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('matkhau-test', 8);
const { createApp } = require('../app');
const categories = require('../models/categories');
const posts = require('../models/posts');

function layToken(html) {
  const m = html.match(/name="_csrf" value="([^"]+)"/);
  return m ? m[1] : null;
}

async function tokenMoi(agent, duongDan) {
  const res = await agent.get(duongDan);
  return layToken(res.text);
}

async function dangNhap(t) {
  if (!(await isMysqlUp())) { t.skip(SKIP_MESSAGE); return null; }
  await resetDatabase();
  const agent = request.agent(createApp());
  await agent.post('/admin/dang-nhap').type('form').send({ password: 'matkhau-test' });
  return agent;
}

test('thêm chủ đề mới', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const csrf = await tokenMoi(agent, '/admin/chu-de');
  const res = await agent.post('/admin/chu-de').type('form').send({ _csrf: csrf, name: 'Suy niệm' });
  assert.strictEqual(res.status, 302);
  const ds = await categories.all();
  assert.strictEqual(ds.length, 1);
  assert.strictEqual(ds[0].slug, 'suy-niem');
});

test('tên chủ đề rỗng thì báo lỗi', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const csrf = await tokenMoi(agent, '/admin/chu-de');
  const res = await agent.post('/admin/chu-de').type('form').send({ _csrf: csrf, name: '   ' });
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Vui lòng nhập tên chủ đề/);
  assert.strictEqual((await categories.all()).length, 0);
});

test('đổi tên chủ đề', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const id = await categories.create('Suy niệm');
  const csrf = await tokenMoi(agent, '/admin/chu-de');
  const res = await agent.post(`/admin/chu-de/${id}`).type('form').send({
    _csrf: csrf, name: 'Suy gẫm',
  });
  assert.strictEqual(res.status, 302);
  assert.strictEqual((await categories.getById(id)).name, 'Suy gẫm');
});

test('xóa chủ đề rỗng', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const id = await categories.create('Trống');
  const csrf = await tokenMoi(agent, '/admin/chu-de');
  const res = await agent.post(`/admin/chu-de/${id}/xoa`).type('form').send({ _csrf: csrf });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(await categories.getById(id), null);
});

test('không xóa được chủ đề đang có bài, có báo lỗi rõ ràng', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const id = await categories.create('Suy niệm');
  await posts.create({ title: 'Bài', body: 'x', status: 'published', category_id: id });

  const csrf = await tokenMoi(agent, '/admin/chu-de');
  const res = await agent.post(`/admin/chu-de/${id}/xoa`).type('form').send({ _csrf: csrf });
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /còn 1 bài viết, không thể xóa/);
  assert.ok(await categories.getById(id));
});

test('chưa đăng nhập thì không vào được trang chủ đề', async (t) => {
  if (!(await isMysqlUp())) { t.skip(SKIP_MESSAGE); return; }
  await resetDatabase();
  const res = await request(createApp()).get('/admin/chu-de');
  assert.strictEqual(res.status, 302);
});
