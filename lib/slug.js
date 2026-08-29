'use strict';

const MAX_LENGTH = 200;
const DAU_THANH = /[̀-ͯ]/g;

function removeDiacritics(str) {
  return String(str)
    .normalize('NFD')
    .replace(DAU_THANH, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function slugify(title) {
  return removeDiacritics(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH)
    .replace(/-+$/g, '');
}

async function uniqueSlug(title, exists) {
  const base = slugify(title) || 'bai-viet';
  let candidate = base;
  let n = 1;
  while (await exists(candidate)) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

module.exports = { slugify, uniqueSlug };
