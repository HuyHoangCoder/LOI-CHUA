'use strict';
require('./helpers/env');

const { test } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { isMysqlUp, resetDatabase, SKIP_MESSAGE } = require('./helpers/db');
const { escapeLike, chuanHoa, timKiem, MAX_LENGTH } = require('../models/search');
const posts = require('../models/posts');
const categories = require('../models/categories');

process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('matkhau-test', 8);
const { createApp } = require('../app');

// Dựng sẵn một bộ dữ liệu dùng chung cho các test cần database.
async function duLieuMau(t) {
  if (!(await isMysqlUp())) { t.skip(SKIP_MESSAGE); return false; }
  await resetDatabase();

  const cid = await categories.create('Suy niệm');
  await categories.create('Đường đi');

  await posts.create({ title: 'Đức tin lớn', body: 'Nội dung bài một.', status: 'published' });
  await posts.create({ title: 'Đường đi ngay thẳng', body: 'Nội dung bài hai.', status: 'published' });
  await posts.create({
    title: 'Bài nói về hy vọng',
    body: 'Trong bài này có nhắc tới đức tin ở phần thân bài.',
    status: 'published',
  });
  await posts.create({
    title: 'Bài có câu Kinh Thánh',
    body: 'Nội dung.',
    verse_ref: 'Ê-sai 1:18',
    verse_text: 'Dầu tội các ngươi như hồng điều, sẽ trở nên trắng như tuyết.',
    status: 'published',
  });
  await posts.create({
    title: 'Bài thuộc chủ đề', body: 'Nội dung.', status: 'published', category_id: cid,
  });
  await posts.create({ title: 'Bản nháp về đức tin', body: 'x', status: 'draft' });
  return true;
}

function tieuDe(kq) {
  return kq.rows.map((p) => p.title);
}

test('escapeLike vô hiệu hóa ký tự đại diện', () => {
  assert.strictEqual(escapeLike('100%'), '100\\%');
  assert.strictEqual(escapeLike('a_b'), 'a\\_b');
  assert.strictEqual(escapeLike('c:\\tmp'), 'c:\\\\tmp');
  assert.strictEqual(escapeLike('đức tin'), 'đức tin');
});

test('chuanHoa cắt khoảng trắng hai đầu', () => {
  assert.strictEqual(chuanHoa('  duc tin  '), 'duc tin');
});

test('chuanHoa trả null khi rỗng hoặc toàn khoảng trắng', () => {
  assert.strictEqual(chuanHoa(''), null);
  assert.strictEqual(chuanHoa('   '), null);
  assert.strictEqual(chuanHoa(undefined), null);
  assert.strictEqual(chuanHoa(null), null);
});

test('chuanHoa cắt từ khóa quá dài còn 100 ký tự', () => {
  const dai = 'a'.repeat(500);
  assert.strictEqual(chuanHoa(dai).length, MAX_LENGTH);
});

test('gõ không dấu vẫn tìm được tiêu đề có dấu', async (t) => {
  if (!(await duLieuMau(t))) return;
  const kq = await timKiem({ tuKhoa: 'duc tin' });
  assert.ok(tieuDe(kq).includes('Đức tin lớn'));
});

test('tìm được chữ đ — ca khó nhất', async (t) => {
  if (!(await duLieuMau(t))) return;
  const kq = await timKiem({ tuKhoa: 'duong di' });
  assert.ok(tieuDe(kq).includes('Đường đi ngay thẳng'));
});

test('tìm được theo nội dung bài, không chỉ tiêu đề', async (t) => {
  if (!(await duLieuMau(t))) return;
  const kq = await timKiem({ tuKhoa: 'duc tin' });
  assert.ok(tieuDe(kq).includes('Bài nói về hy vọng'));
});

test('tìm được theo nguồn câu Kinh Thánh', async (t) => {
  if (!(await duLieuMau(t))) return;
  const kq = await timKiem({ tuKhoa: 'e-sai 1:18' });
  assert.deepStrictEqual(tieuDe(kq), ['Bài có câu Kinh Thánh']);
});

test('tìm được theo nội dung câu Kinh Thánh', async (t) => {
  if (!(await duLieuMau(t))) return;
  const kq = await timKiem({ tuKhoa: 'hong dieu' });
  assert.deepStrictEqual(tieuDe(kq), ['Bài có câu Kinh Thánh']);
});

test('gõ tên chủ đề ra cả bài thuộc chủ đề và chủ đề khớp', async (t) => {
  if (!(await duLieuMau(t))) return;
  const kq = await timKiem({ tuKhoa: 'suy niem' });
  assert.ok(tieuDe(kq).includes('Bài thuộc chủ đề'));
  assert.deepStrictEqual(kq.chuDeKhop.map((c) => c.name), ['Suy niệm']);
});

test('bài khớp tiêu đề xếp trên bài chỉ khớp nội dung', async (t) => {
  if (!(await duLieuMau(t))) return;
  const kq = await timKiem({ tuKhoa: 'duc tin' });
  assert.strictEqual(kq.rows[0].title, 'Đức tin lớn');
});

test('bài nháp không bao giờ xuất hiện', async (t) => {
  if (!(await duLieuMau(t))) return;
  const kq = await timKiem({ tuKhoa: 'duc tin' });
  assert.ok(!tieuDe(kq).includes('Bản nháp về đức tin'));
  assert.ok(kq.rows.every((p) => p.status === 'published'));
});

test('ký tự % không thành ký tự đại diện', async (t) => {
  if (!(await duLieuMau(t))) return;
  const kq = await timKiem({ tuKhoa: '%' });
  assert.strictEqual(kq.total, 0);
});

test('ký tự _ không thành ký tự đại diện', async (t) => {
  if (!(await duLieuMau(t))) return;
  const kq = await timKiem({ tuKhoa: '_' });
  assert.strictEqual(kq.total, 0);
});

test('từ khóa không liên quan cho 0 kết quả', async (t) => {
  if (!(await duLieuMau(t))) return;
  const kq = await timKiem({ tuKhoa: 'xyzkhongcothat' });
  assert.strictEqual(kq.total, 0);
  assert.strictEqual(kq.rows.length, 0);
});

test('khoảng trắng thừa không đổi kết quả', async (t) => {
  if (!(await duLieuMau(t))) return;
  const a = await timKiem({ tuKhoa: chuanHoa('  duc tin  ') });
  const b = await timKiem({ tuKhoa: 'duc tin' });
  assert.deepStrictEqual(tieuDe(a), tieuDe(b));
});

test('trang kết quả hiện bài tìm được', async (t) => {
  if (!(await duLieuMau(t))) return;
  const res = await request(createApp()).get('/tim-kiem?q=duc+tin');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Đức tin lớn/);
  assert.match(res.text, /Kết quả cho/);
});

test('q rỗng thì chuyển về trang chủ', async (t) => {
  if (!(await duLieuMau(t))) return;
  const res = await request(createApp()).get('/tim-kiem?q=');
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/');
});

test('q toàn khoảng trắng thì chuyển về trang chủ', async (t) => {
  if (!(await duLieuMau(t))) return;
  const res = await request(createApp()).get('/tim-kiem?q=%20%20%20');
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/');
});

test('không có q cũng chuyển về trang chủ', async (t) => {
  if (!(await duLieuMau(t))) return;
  const res = await request(createApp()).get('/tim-kiem');
  assert.strictEqual(res.status, 302);
});

test('không tìm thấy thì hiện thông báo trống', async (t) => {
  if (!(await duLieuMau(t))) return;
  const res = await request(createApp()).get('/tim-kiem?q=xyzkhongcothat');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Không tìm thấy bài viết nào/);
});

test('bài nháp không hiện dù đã đăng nhập quản trị', async (t) => {
  if (!(await duLieuMau(t))) return;
  const agent = request.agent(createApp());
  await agent.post('/admin/dang-nhap').type('form').send({ password: 'matkhau-test' });

  const res = await agent.get('/tim-kiem?q=duc+tin');
  assert.strictEqual(res.status, 200);
  assert.ok(!res.text.includes('Bản nháp về đức tin'));
});

test('phân trang giữ nguyên q', async (t) => {
  if (!(await duLieuMau(t))) return;
  for (let i = 1; i <= 12; i += 1) {
    await posts.create({ title: `Bài đức tin số ${i}`, body: 'x', status: 'published' });
  }
  const res = await request(createApp()).get('/tim-kiem?q=duc+tin');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /\/tim-kiem\?q=duc%20tin&amp;trang=2/);
});

test('từ khóa chứa thẻ HTML hiện thành chữ, không chạy', async (t) => {
  if (!(await duLieuMau(t))) return;
  const res = await request(createApp()).get('/tim-kiem?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
  assert.strictEqual(res.status, 200);
  assert.ok(!res.text.includes('<script>alert(1)</script>'));
  assert.match(res.text, /&lt;script&gt;/);
});

test('thanh tìm kiếm có mặt trên mọi trang công khai', async (t) => {
  if (!(await duLieuMau(t))) return;
  const app = createApp();

  for (const duongDan of ['/', '/bai-viet/duc-tin-lon', '/chu-de/suy-niem']) {
    const res = await request(app).get(duongDan);
    assert.strictEqual(res.status, 200, `${duongDan} phải trả 200`);
    assert.match(res.text, /action="\/tim-kiem"/, `${duongDan} phải có form tìm kiếm`);
    assert.match(res.text, /Tìm bài viết, câu Kinh Thánh, chủ đề/, `${duongDan} phải có chữ gợi ý`);
  }
});

test('ô tìm kiếm trên trang khác trang kết quả thì để trống', async (t) => {
  if (!(await duLieuMau(t))) return;
  const res = await request(createApp()).get('/');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /name="q"[\s\S]*?value=""/);
});

test('trang kết quả điền sẵn lại từ khóa vào ô tìm kiếm', async (t) => {
  if (!(await duLieuMau(t))) return;
  const res = await request(createApp()).get('/tim-kiem?q=duc+tin');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /value="duc tin"/);
});

test('chuanHoa đưa chữ có dấu về dạng NFC', () => {
  const nfd = 'Ê-sai'.normalize('NFD');
  assert.notStrictEqual(nfd, 'Ê-sai'.normalize('NFC'));
  assert.strictEqual(chuanHoa(nfd), 'Ê-sai'.normalize('NFC'));
});

test('gõ chữ dạng tách rời (NFD) vẫn tìm được', async (t) => {
  if (!(await duLieuMau(t))) return;
  const nfd = 'Đức tin'.normalize('NFD');
  const kq = await timKiem({ tuKhoa: chuanHoa(nfd) });
  assert.ok(tieuDe(kq).includes('Đức tin lớn'));
});
