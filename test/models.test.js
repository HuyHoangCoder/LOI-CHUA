'use strict';
require('./helpers/env');

const { test } = require('node:test');
const assert = require('node:assert');
const { isMysqlUp, resetDatabase, SKIP_MESSAGE } = require('./helpers/db');
const categories = require('../models/categories');
const posts = require('../models/posts');

async function chuanBi(t) {
  if (!(await isMysqlUp())) {
    t.skip(SKIP_MESSAGE);
    return false;
  }
  await resetDatabase();
  return true;
}

test('tạo chủ đề sinh slug tự động', async (t) => {
  if (!(await chuanBi(t))) return;
  const id = await categories.create('Suy niệm');
  const c = await categories.getById(id);
  assert.strictEqual(c.name, 'Suy niệm');
  assert.strictEqual(c.slug, 'suy-niem');
});

test('đổi tên chủ đề', async (t) => {
  if (!(await chuanBi(t))) return;
  const id = await categories.create('Suy niệm');
  await categories.rename(id, 'Suy gẫm');
  assert.strictEqual((await categories.getById(id)).name, 'Suy gẫm');
});

test('tạo bài viết sinh slug từ tiêu đề', async (t) => {
  if (!(await chuanBi(t))) return;
  const id = await posts.create({
    title: 'Lời Chúa cho ngày mới', body: 'Nội dung.', status: 'published',
  });
  const p = await posts.getById(id);
  assert.strictEqual(p.slug, 'loi-chua-cho-ngay-moi');
  assert.strictEqual(p.status, 'published');
});

test('hai bài trùng tiêu đề thì slug khác nhau', async (t) => {
  if (!(await chuanBi(t))) return;
  await posts.create({ title: 'Đức tin', body: 'a', status: 'published' });
  const id2 = await posts.create({ title: 'Đức tin', body: 'b', status: 'published' });
  assert.strictEqual((await posts.getById(id2)).slug, 'duc-tin-2');
});

test('sửa tiêu đề không làm đổi slug', async (t) => {
  if (!(await chuanBi(t))) return;
  const id = await posts.create({ title: 'Đức tin', body: 'a', status: 'published' });
  await posts.update(id, { title: 'Đức tin lớn', body: 'a', status: 'published' });
  const p = await posts.getById(id);
  assert.strictEqual(p.slug, 'duc-tin');
  assert.strictEqual(p.title, 'Đức tin lớn');
});

test('listPublished bỏ qua bài nháp và phân trang', async (t) => {
  if (!(await chuanBi(t))) return;
  for (let i = 1; i <= 12; i += 1) {
    await posts.create({ title: `Bài ${i}`, body: 'x', status: 'published' });
  }
  await posts.create({ title: 'Bài nháp', body: 'x', status: 'draft' });

  const trang1 = await posts.listPublished({ page: 1, perPage: 10 });
  assert.strictEqual(trang1.total, 12);
  assert.strictEqual(trang1.rows.length, 10);

  const trang2 = await posts.listPublished({ page: 2, perPage: 10 });
  assert.strictEqual(trang2.rows.length, 2);
  assert.ok(!trang1.rows.concat(trang2.rows).some((p) => p.status === 'draft'));
});

test('getBySlug mặc định không trả bài nháp', async (t) => {
  if (!(await chuanBi(t))) return;
  await posts.create({ title: 'Bài nháp', body: 'x', status: 'draft' });
  assert.strictEqual(await posts.getBySlug('bai-nhap'), null);
  assert.ok(await posts.getBySlug('bai-nhap', { includeDrafts: true }));
});

test('lọc theo chủ đề', async (t) => {
  if (!(await chuanBi(t))) return;
  const cid = await categories.create('Suy niệm');
  await posts.create({ title: 'Có chủ đề', body: 'x', status: 'published', category_id: cid });
  await posts.create({ title: 'Không chủ đề', body: 'x', status: 'published' });

  const kq = await posts.listPublished({ page: 1, perPage: 10, categoryId: cid });
  assert.strictEqual(kq.total, 1);
  assert.strictEqual(kq.rows[0].title, 'Có chủ đề');
});

test('không xóa được chủ đề đang có bài', async (t) => {
  if (!(await chuanBi(t))) return;
  const cid = await categories.create('Suy niệm');
  await posts.create({ title: 'Bài', body: 'x', status: 'published', category_id: cid });
  assert.strictEqual(await categories.countPosts(cid), 1);
  await assert.rejects(() => categories.remove(cid));
});

test('xóa được chủ đề rỗng', async (t) => {
  if (!(await chuanBi(t))) return;
  const cid = await categories.create('Trống');
  await categories.remove(cid);
  assert.strictEqual(await categories.getById(cid), null);
});

test('neighbors trả bài cũ hơn và mới hơn', async (t) => {
  if (!(await chuanBi(t))) return;
  const a = await posts.create({ title: 'Bài A', body: 'x', status: 'published' });
  const b = await posts.create({ title: 'Bài B', body: 'x', status: 'published' });
  const c = await posts.create({ title: 'Bài C', body: 'x', status: 'published' });

  const giua = await posts.getById(b);
  const { prev, next } = await posts.neighbors(giua);
  assert.strictEqual(prev.id, a);
  assert.strictEqual(next.id, c);

  const cuoi = await posts.getById(c);
  assert.strictEqual((await posts.neighbors(cuoi)).next, null);
});

test('remove trả về hàng vừa xóa', async (t) => {
  if (!(await chuanBi(t))) return;
  const id = await posts.create({
    title: 'Bài', body: 'x', status: 'published', cover_image: 'abc.jpg',
  });
  const daXoa = await posts.remove(id);
  assert.strictEqual(daXoa.cover_image, 'abc.jpg');
  assert.strictEqual(await posts.getById(id), null);
});
