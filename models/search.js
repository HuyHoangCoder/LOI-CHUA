'use strict';
const { pool } = require('../db');

// Hằng số trong code, không bao giờ lấy từ người dùng — nên nối thẳng vào SQL được.
// Mọi giá trị người dùng nhập vẫn đi qua tham số `?`.
const AI = 'utf8mb4_0900_ai_ci';
const MAX_LENGTH = 100;
const MAX_CHU_DE = 8;

function escapeLike(s) {
  return String(s).replace(/[\\%_]/g, (c) => '\\' + c);
}

function chuanHoa(q) {
  // NFC: gộp chữ và dấu thành một ký tự. Chuỗi copy từ máy Mac hay vài bộ gõ
  // ra dạng tách rời (NFD) — không chuẩn hóa thì "Ê" gõ vào không khớp "Ê" đã lưu.
  const t = String(q == null ? '' : q).normalize('NFC').trim();
  if (!t) return null;
  return t.slice(0, MAX_LENGTH);
}

const CHON = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug
  FROM posts p
  LEFT JOIN categories c ON c.id = p.category_id
`;

const DIEU_KIEN = `
  p.status = 'published' AND (
       p.title      COLLATE ${AI} LIKE ?
    OR p.body       COLLATE ${AI} LIKE ?
    OR p.verse_ref  COLLATE ${AI} LIKE ?
    OR p.verse_text COLLATE ${AI} LIKE ?
    OR c.name       COLLATE ${AI} LIKE ?
  )
`;

async function timKiem({ tuKhoa, page = 1, perPage = 10 }) {
  // Vô hiệu hóa ký tự đại diện TRƯỚC, rồi mới bọc %…% — làm ngược là hỏng.
  const mau = `%${escapeLike(tuKhoa)}%`;
  const nam = [mau, mau, mau, mau, mau];
  const offset = (Math.max(1, Number(page)) - 1) * perPage;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS n
     FROM posts p LEFT JOIN categories c ON c.id = p.category_id
     WHERE ${DIEU_KIEN}`,
    nam
  );

  const [rows] = await pool.query(
    `${CHON}
     WHERE ${DIEU_KIEN}
     ORDER BY (p.title COLLATE ${AI} LIKE ?) DESC, p.created_at DESC, p.id DESC
     LIMIT ? OFFSET ?`,
    [...nam, mau, perPage, offset]
  );

  const [chuDeKhop] = await pool.query(
    `SELECT id, name, slug FROM categories
     WHERE name COLLATE ${AI} LIKE ?
     ORDER BY name ASC LIMIT ?`,
    [mau, MAX_CHU_DE]
  );

  return { rows, total: Number(countRows[0].n), chuDeKhop };
}

module.exports = { escapeLike, chuanHoa, timKiem, MAX_LENGTH, MAX_CHU_DE };
