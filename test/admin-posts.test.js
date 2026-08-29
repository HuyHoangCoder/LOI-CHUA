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

async function tokenMoi(agent, duongDan) {
  const res = await agent.get(duongDan);
  return layToken(res.text);
}

async function dangNhap(t) {
  if (!(await isMysqlUp())) {
    t.skip(SKIP_MESSAGE);
    return null;
  }
  await resetDatabase();
  const agent = request.agent(createApp());
  await agent.post('/admin/dang-nhap').type('form').send({ password: 'matkhau-test' });
  return agent;
}

test('tạo bài viết mới từ form', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const csrf = await tokenMoi(agent, '/admin/bai-viet/moi');
  const res = await agent.post('/admin/bai-viet').type('form').send({
    _csrf: csrf,
    title: 'Lời Chúa cho ngày mới',
    body: 'Đoạn một.\n\nĐoạn hai.',
    verse_ref: 'Ê-sai 1:18',
    verse_text: 'Dầu tội các ngươi như hồng điều...',
    status: 'published',
  });
  assert.strictEqual(res.status, 302);

  const p = await posts.getBySlug('loi-chua-cho-ngay-moi');
  assert.strictEqual(p.title, 'Lời Chúa cho ngày mới');
  assert.strictEqual(p.verse_ref, 'Ê-sai 1:18');
});

test('thiếu tiêu đề thì báo lỗi và GIỮ NGUYÊN nội dung đã gõ', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const csrf = await tokenMoi(agent, '/admin/bai-viet/moi');
  const res = await agent.post('/admin/bai-viet').type('form').send({
    _csrf: csrf,
    title: '',
    body: 'Nội dung tôi đã gõ rất dài.',
    status: 'draft',
  });
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Vui lòng nhập tiêu đề/);
  assert.match(res.text, /Nội dung tôi đã gõ rất dài\./);
});

test('thiếu nội dung thì báo lỗi và giữ nguyên tiêu đề', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const csrf = await tokenMoi(agent, '/admin/bai-viet/moi');
  const res = await agent.post('/admin/bai-viet').type('form').send({
    _csrf: csrf, title: 'Tiêu đề của tôi', body: '   ', status: 'draft',
  });
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Vui lòng nhập nội dung/);
  assert.match(res.text, /Tiêu đề của tôi/);
});

test('sửa bài viết', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const id = await posts.create({ title: 'Cũ', body: 'x', status: 'draft' });
  const csrf = await tokenMoi(agent, `/admin/bai-viet/${id}/sua`);
  const res = await agent.post(`/admin/bai-viet/${id}`).type('form').send({
    _csrf: csrf, title: 'Mới', body: 'y', status: 'published',
  });
  assert.strictEqual(res.status, 302);

  const p = await posts.getById(id);
  assert.strictEqual(p.title, 'Mới');
  assert.strictEqual(p.status, 'published');
});

test('xóa bài viết', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const id = await posts.create({ title: 'Xóa tôi', body: 'x', status: 'draft' });
  const csrf = await tokenMoi(agent, '/admin');
  const res = await agent.post(`/admin/bai-viet/${id}/xoa`).type('form').send({ _csrf: csrf });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(await posts.getById(id), null);
});

test('danh sách quản trị hiện cả bài nháp', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  await posts.create({ title: 'Bài nháp của tôi', body: 'x', status: 'draft' });
  const res = await agent.get('/admin');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Bài nháp của tôi/);
  assert.match(res.text, /Nháp/);
});

test('chưa đăng nhập thì không tạo được bài', async (t) => {
  if (!(await isMysqlUp())) { t.skip(SKIP_MESSAGE); return; }
  await resetDatabase();

  const res = await request(createApp()).post('/admin/bai-viet').type('form').send({
    title: 'Kẻ lạ', body: 'x', status: 'published',
  });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(await posts.getBySlug('ke-la', { includeDrafts: true }), null);
});

test('sửa bài không tồn tại thì trả 404', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;
  const res = await agent.get('/admin/bai-viet/9999/sua');
  assert.strictEqual(res.status, 404);
});
