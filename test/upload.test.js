'use strict';
require('./helpers/env');

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { isMysqlUp, resetDatabase, SKIP_MESSAGE } = require('./helpers/db');

process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('matkhau-test', 8);
const { createApp } = require('../app');
const posts = require('../models/posts');
const { UPLOAD_DIR } = require('../lib/upload');

// PNG 1x1 hợp lệ nhỏ nhất
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

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

test('tải ảnh PNG lên thành công và lưu tên file vào database', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const csrf = await tokenMoi(agent, '/admin/bai-viet/moi');
  const res = await agent.post('/admin/bai-viet')
    .field('_csrf', csrf || '')
    .field('title', 'Bài có ảnh')
    .field('body', 'Nội dung.')
    .field('status', 'published')
    .attach('cover_image', PNG_1X1, { filename: 'anh.png', contentType: 'image/png' });

  assert.strictEqual(res.status, 302);
  const p = await posts.getBySlug('bai-co-anh');
  assert.ok(p.cover_image, 'phải có tên file ảnh');
  assert.match(p.cover_image, /^[0-9a-f]{32}\.png$/);
  assert.ok(fs.existsSync(path.join(UPLOAD_DIR, p.cover_image)), 'file phải nằm trong uploads/');
});

test('file sai định dạng bị từ chối và GIỮ NGUYÊN dữ liệu đã nhập', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const csrf = await tokenMoi(agent, '/admin/bai-viet/moi');
  const res = await agent.post('/admin/bai-viet')
    .field('_csrf', csrf || '')
    .field('title', 'Tiêu đề đã gõ')
    .field('body', 'Nội dung đã gõ.')
    .field('status', 'published')
    .attach('cover_image', Buffer.from('không phải ảnh'), {
      filename: 'ghi-chu.txt', contentType: 'text/plain',
    });

  assert.strictEqual(res.status, 200);
  assert.match(res.text, /JPG\/PNG\/WEBP/);
  assert.match(res.text, /Tiêu đề đã gõ/);
  assert.match(res.text, /Nội dung đã gõ\./);
  assert.strictEqual(await posts.getBySlug('tieu-de-da-go', { includeDrafts: true }), null);
});

test('ảnh quá 5MB bị từ chối', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const csrf = await tokenMoi(agent, '/admin/bai-viet/moi');
  const quaLon = Buffer.alloc(6 * 1024 * 1024, 0);
  const res = await agent.post('/admin/bai-viet')
    .field('_csrf', csrf || '')
    .field('title', 'Ảnh nặng')
    .field('body', 'Nội dung.')
    .field('status', 'published')
    .attach('cover_image', quaLon, { filename: 'to.png', contentType: 'image/png' });

  assert.strictEqual(res.status, 200);
  assert.match(res.text, /dưới 5MB/);
  assert.strictEqual(await posts.getBySlug('anh-nang', { includeDrafts: true }), null);
});

test('xóa bài thì xóa luôn file ảnh', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const csrf = await tokenMoi(agent, '/admin/bai-viet/moi');
  await agent.post('/admin/bai-viet')
    .field('_csrf', csrf || '')
    .field('title', 'Bài sẽ xóa')
    .field('body', 'Nội dung.')
    .field('status', 'published')
    .attach('cover_image', PNG_1X1, { filename: 'anh.png', contentType: 'image/png' });

  const p = await posts.getBySlug('bai-se-xoa');
  const duongDan = path.join(UPLOAD_DIR, p.cover_image);
  assert.ok(fs.existsSync(duongDan));

  const csrf2 = await tokenMoi(agent, '/admin');
  await agent.post(`/admin/bai-viet/${p.id}/xoa`).type('form').send({ _csrf: csrf2 });
  assert.ok(!fs.existsSync(duongDan), 'file ảnh phải bị xóa theo');
});

test('tick “Xóa ảnh bìa” thì gỡ ảnh khỏi bài', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const csrf = await tokenMoi(agent, '/admin/bai-viet/moi');
  await agent.post('/admin/bai-viet')
    .field('_csrf', csrf || '')
    .field('title', 'Bài có ảnh')
    .field('body', 'Nội dung.')
    .field('status', 'published')
    .attach('cover_image', PNG_1X1, { filename: 'anh.png', contentType: 'image/png' });

  const p = await posts.getBySlug('bai-co-anh');
  const csrf2 = await tokenMoi(agent, `/admin/bai-viet/${p.id}/sua`);
  await agent.post(`/admin/bai-viet/${p.id}`).type('form').send({
    _csrf: csrf2, title: 'Bài có ảnh', body: 'Nội dung.', status: 'published', remove_cover: '1',
  });

  assert.strictEqual((await posts.getById(p.id)).cover_image, null);
});
