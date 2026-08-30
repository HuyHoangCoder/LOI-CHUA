'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { catMau, tachCau, demByte } = require('../public/js/doc-to');

// Bỏ hết khoảng trắng rồi so: cắt mẩu được phép đổi chỗ ngắt dòng,
// nhưng không được phép làm rơi mất chữ nào.
function ruot(chuoi) {
  return chuoi.replace(/\s+/g, '');
}

const DOAN_DAI = [
  'Khải tượng của Ê-sai, con trai A-mốt, mà người đã xem thấy về Giu-đa và Giê-ru-sa-lem.',
  'Hỡi các từng trời, hãy nghe; hỡi đất, hãy lắng tai; vì Đức Giê-hô-va có phán rằng:',
  'Ta đã nuôi nấng con cái, trưởng dưỡng chúng nó, song chúng nó dấy loạn nghịch cùng ta.',
  'Bò biết chủ mình, lừa biết máng của chủ; song Y-sơ-ra-ên chẳng hiểu biết gì.',
].join(' ');

test('đoạn ngắn hơn giới hạn thì giữ nguyên một mẩu', () => {
  assert.deepStrictEqual(catMau('Đức Chúa Trời là tình yêu thương.', 175, false), [
    'Đức Chúa Trời là tình yêu thương.',
  ]);
});

test('nội dung rỗng trả về mảng rỗng', () => {
  assert.deepStrictEqual(catMau('   \n  ', 175, false), []);
  assert.deepStrictEqual(catMau('', 175, false), []);
  assert.deepStrictEqual(catMau(null, 175, false), []);
});

test('không mẩu nào vượt quá giới hạn', () => {
  const mau = catMau(DOAN_DAI, 60, false);
  assert.ok(mau.length > 1);
  mau.forEach((m) => assert.ok(m.length <= 60, `mẩu dài ${m.length}: ${m}`));
});

test('cắt mẩu không làm mất chữ', () => {
  [30, 60, 175].forEach((gioiHan) => {
    const mau = catMau(DOAN_DAI, gioiHan, false);
    assert.strictEqual(ruot(mau.join('')), ruot(DOAN_DAI), `giới hạn ${gioiHan}`);
  });
});

test('ưu tiên cắt ở cuối câu khi câu vừa đủ ngắn', () => {
  const mau = catMau('Một hai ba. Bốn năm sáu. Bảy tám chín.', 15, false);
  assert.deepStrictEqual(mau, ['Một hai ba.', 'Bốn năm sáu.', 'Bảy tám chín.']);
});

test('gộp các câu ngắn liền nhau lại cho đỡ ngắt quãng', () => {
  assert.deepStrictEqual(catMau('Một. Hai. Ba.', 175, false), ['Một. Hai. Ba.']);
});

test('câu quá dài thì lùi về dấu phẩy rồi tới khoảng trắng', () => {
  const cau = 'Hỡi các từng trời, hãy nghe lời Đức Giê-hô-va phán cùng dân sự';
  const mau = catMau(cau, 30, false);
  mau.forEach((m) => assert.ok(m.length <= 30, `mẩu dài ${m.length}: ${m}`));
  assert.strictEqual(mau[0], 'Hỡi các từng trời,');
  assert.strictEqual(ruot(mau.join('')), ruot(cau));
});

test('chuỗi dài không có chỗ ngắt đẹp thì vẫn cắt cứng và dừng lại được', () => {
  const mau = catMau('a'.repeat(500), 175, false);
  assert.strictEqual(mau.length, 3);
  mau.forEach((m) => assert.ok(m.length <= 175));
  assert.strictEqual(mau.join('').length, 500);
});

test('đếm đúng số byte UTF-8 của chữ có dấu', () => {
  assert.strictEqual(demByte('abc'), 3);
  assert.strictEqual(demByte('ế'), 3);
  assert.strictEqual(demByte('Chúa'), 5);
});

test('giới hạn theo byte chặt hơn giới hạn theo ký tự', () => {
  const chu = 'ế'.repeat(100); // 100 ký tự nhưng 300 byte

  assert.deepStrictEqual(catMau(chu, 150, false), [chu]); // đếm ký tự thì vừa
  const mau = catMau(chu, 150, true); // đếm byte thì phải cắt
  assert.ok(mau.length > 1);
  mau.forEach((m) => assert.ok(demByte(m) <= 150, `mẩu nặng ${demByte(m)} byte`));
  assert.strictEqual(ruot(mau.join('')), ruot(chu));
});

test('tách được câu tiếng Việt theo dấu chấm câu', () => {
  assert.deepStrictEqual(tachCau('Chúa là Đấng chăn giữ tôi. Tôi sẽ chẳng thiếu thốn gì.'), [
    'Chúa là Đấng chăn giữ tôi.',
    'Tôi sẽ chẳng thiếu thốn gì.',
  ]);
});

test('câu không có dấu chấm cuối vẫn là một câu', () => {
  assert.deepStrictEqual(tachCau('Hãy yên lặng và biết rằng ta là Đức Chúa Trời'), [
    'Hãy yên lặng và biết rằng ta là Đức Chúa Trời',
  ]);
});
