'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { toParagraphs, excerpt } = require('../lib/text');

test('dòng trống tách thành đoạn', () => {
  const body = 'Đoạn một.\n\nĐoạn hai.\n\n\nĐoạn ba.';
  assert.deepStrictEqual(toParagraphs(body), ['Đoạn một.', 'Đoạn hai.', 'Đoạn ba.']);
});

test('xuống dòng đơn vẫn nằm trong cùng một đoạn', () => {
  assert.deepStrictEqual(toParagraphs('dòng một\ndòng hai'), ['dòng một\ndòng hai']);
});

test('xử lý được xuống dòng kiểu Windows', () => {
  assert.deepStrictEqual(toParagraphs('một\r\n\r\nhai'), ['một', 'hai']);
});

test('nội dung rỗng trả về mảng rỗng', () => {
  assert.deepStrictEqual(toParagraphs('   '), []);
});

test('tóm tắt ngắn hơn giới hạn thì giữ nguyên', () => {
  assert.strictEqual(excerpt('Ngắn thôi.'), 'Ngắn thôi.');
});

test('tóm tắt dài thì cắt ở ranh giới từ và thêm dấu ba chấm', () => {
  const body = 'từ '.repeat(100);
  const out = excerpt(body, 20);
  assert.ok(out.length <= 21);
  assert.ok(out.endsWith('…'));
  assert.ok(!out.includes('  '));
});
