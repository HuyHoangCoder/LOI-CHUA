'use strict';
const { pool } = require('../db');
const { uniqueSlug } = require('../lib/slug');

const SELECT_WITH_CATEGORY = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug
  FROM posts p
  LEFT JOIN categories c ON c.id = p.category_id
`;

function normalize(data) {
  return {
    title: String(data.title || '').trim(),
    category_id: data.category_id ? Number(data.category_id) : null,
    verse_ref: data.verse_ref ? String(data.verse_ref).trim() : null,
    verse_text: data.verse_text ? String(data.verse_text).trim() : null,
    cover_image: data.cover_image || null,
    body: String(data.body || ''),
    status: data.status === 'published' ? 'published' : 'draft',
  };
}

async function slugExists(slug) {
  const [rows] = await pool.query('SELECT id FROM posts WHERE slug = ?', [slug]);
  return rows.length > 0;
}

async function getById(id) {
  const [rows] = await pool.query(`${SELECT_WITH_CATEGORY} WHERE p.id = ?`, [id]);
  return rows[0] || null;
}

async function getBySlug(slug, { includeDrafts = false } = {}) {
  const sql = includeDrafts
    ? `${SELECT_WITH_CATEGORY} WHERE p.slug = ?`
    : `${SELECT_WITH_CATEGORY} WHERE p.slug = ? AND p.status = 'published'`;
  const [rows] = await pool.query(sql, [slug]);
  return rows[0] || null;
}

async function listAll() {
  const [rows] = await pool.query(`${SELECT_WITH_CATEGORY} ORDER BY p.created_at DESC, p.id DESC`);
  return rows;
}

async function listPublished({ page = 1, perPage = 10, categoryId = null } = {}) {
  const offset = (Math.max(1, Number(page)) - 1) * perPage;
  const where = categoryId
    ? `WHERE p.status = 'published' AND p.category_id = ?`
    : `WHERE p.status = 'published'`;
  const params = categoryId ? [categoryId] : [];

  const [countRows] = await pool.query(`SELECT COUNT(*) AS n FROM posts p ${where}`, params);
  const [rows] = await pool.query(
    `${SELECT_WITH_CATEGORY} ${where} ORDER BY p.created_at DESC, p.id DESC LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
  return { rows, total: Number(countRows[0].n) };
}

async function create(data) {
  const d = normalize(data);
  const slug = await uniqueSlug(d.title, slugExists);
  const [result] = await pool.query(
    `INSERT INTO posts
      (title, slug, category_id, verse_ref, verse_text, cover_image, body, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [d.title, slug, d.category_id, d.verse_ref, d.verse_text, d.cover_image, d.body, d.status]
  );
  return result.insertId;
}

async function update(id, data) {
  const d = normalize(data);
  await pool.query(
    `UPDATE posts SET
       title = ?, category_id = ?, verse_ref = ?, verse_text = ?,
       cover_image = ?, body = ?, status = ?, updated_at = NOW()
     WHERE id = ?`,
    [d.title, d.category_id, d.verse_ref, d.verse_text, d.cover_image, d.body, d.status, id]
  );
}

async function remove(id) {
  const row = await getById(id);
  if (!row) return null;
  await pool.query('DELETE FROM posts WHERE id = ?', [id]);
  return row;
}

async function neighbors(post) {
  const [prevRows] = await pool.query(
    `SELECT id, title, slug FROM posts
     WHERE status = 'published' AND (created_at < ? OR (created_at = ? AND id < ?))
     ORDER BY created_at DESC, id DESC LIMIT 1`,
    [post.created_at, post.created_at, post.id]
  );
  const [nextRows] = await pool.query(
    `SELECT id, title, slug FROM posts
     WHERE status = 'published' AND (created_at > ? OR (created_at = ? AND id > ?))
     ORDER BY created_at ASC, id ASC LIMIT 1`,
    [post.created_at, post.created_at, post.id]
  );
  return { prev: prevRows[0] || null, next: nextRows[0] || null };
}

module.exports = {
  listPublished, listAll, getBySlug, getById, create, update, remove, neighbors,
};
