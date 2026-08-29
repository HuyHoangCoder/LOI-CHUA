'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { slugify, uniqueSlug } = require('../lib/slug');

test('bỏ dấu tiếng Việt và nối bằng gạch ngang', () => {
  assert.strictEqual(slugify('Lời Chúa cho ngày mới'), 'loi-chua-cho-ngay-moi');
});

test('chữ đ thành d', () => {
  assert.strictEqual(slugify('Đức tin'), 'duc-tin');
  assert.strictEqual(slugify('ĐƯỜNG ĐI'), 'duong-di');
});

test('bỏ dấu câu và gạch ngang thừa', () => {
  assert.strictEqual(slugify('  Sự bình an thật!!!  '), 'su-binh-an-that');
  assert.strictEqual(slugify('Ê-sai 1:18'), 'e-sai-1-18');
});

test('tiêu đề không còn ký tự nào thì dùng mặc định', async () => {
  const slug = await uniqueSlug('!!!', async () => false);
  assert.strictEqual(slug, 'bai-viet');
});

test('slug trùng thì thêm số đuôi', async () => {
  const daCo = new Set(['duc-tin', 'duc-tin-2']);
  const slug = await uniqueSlug('Đức tin', async (s) => daCo.has(s));
  assert.strictEqual(slug, 'duc-tin-3');
});

test('cắt tối đa 200 ký tự, không để lại gạch ngang ở cuối', () => {
  const slug = slugify('a'.repeat(150) + ' ' + 'b'.repeat(150));
  assert.ok(slug.length <= 200);
  assert.ok(!slug.endsWith('-'));
});
