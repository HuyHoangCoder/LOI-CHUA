'use strict';

function toParagraphs(body) {
  return String(body || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function excerpt(body, max = 160) {
  const flat = String(body || '').replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return flat.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

module.exports = { toParagraphs, excerpt };
