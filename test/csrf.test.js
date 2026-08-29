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

function layToken(html) {
  const m = html.match(/name="_csrf" value="([^"]+)"/);
  return m ? m[1] : null;
}

async function dangNhap(t) {
  if (!(await isMysqlUp())) { t.skip(SKIP_MESSAGE); return null; }
  await resetDatabase();
  const agent = request.agent(createApp());
  await agent.post('/admin/dang-nhap').type('form').send({ password: 'matkhau-test' });
  return agent;
}

test('form quản trị có gắn token', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const res = await agent.get('/admin/bai-viet/moi');
  const token = layToken(res.text);
  assert.ok(token && token.length >= 32, 'form phải có token đủ dài');
});

test('POST thiếu token bị từ chối', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const res = await agent.post('/admin/bai-viet').type('form').send({
    title: 'Bài gian lận', body: 'x', status: 'published',
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(await posts.getBySlug('bai-gian-lan', { includeDrafts: true }), null);
});

test('POST sai token bị từ chối', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const res = await agent.post('/admin/bai-viet').type('form').send({
    _csrf: 'token-bia-dat', title: 'Bài gian lận', body: 'x', status: 'published',
  });
  assert.strictEqual(res.status, 403);
});

test('POST đúng token thì chạy bình thường', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const form = await agent.get('/admin/bai-viet/moi');
  const token = layToken(form.text);

  const res = await agent.post('/admin/bai-viet').type('form').send({
    _csrf: token, title: 'Bài hợp lệ', body: 'x', status: 'published',
  });
  assert.strictEqual(res.status, 302);
  assert.ok(await posts.getBySlug('bai-hop-le'));
});

test('trang đăng nhập không cần token', async (t) => {
  if (!(await isMysqlUp())) { t.skip(SKIP_MESSAGE); return; }
  await resetDatabase();

  const agent = request.agent(createApp());
  const res = await agent.post('/admin/dang-nhap').type('form').send({ password: 'matkhau-test' });
  assert.strictEqual(res.status, 302);
});
