'use strict';
const { pool } = require('../db');
const { uniqueSlug } = require('../lib/slug');

async function slugExists(slug) {
  const [rows] = await pool.query('SELECT id FROM categories WHERE slug = ?', [slug]);
  return rows.length > 0;
}

async function all() {
  const [rows] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
  return rows;
}

async function getById(id) {
  const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
  return rows[0] || null;
}

async function getBySlug(slug) {
  const [rows] = await pool.query('SELECT * FROM categories WHERE slug = ?', [slug]);
  return rows[0] || null;
}

async function create(name) {
  const slug = await uniqueSlug(name, slugExists);
  const [result] = await pool.query(
    'INSERT INTO categories (name, slug) VALUES (?, ?)',
    [String(name).trim(), slug]
  );
  return result.insertId;
}

async function rename(id, name) {
  await pool.query('UPDATE categories SET name = ? WHERE id = ?', [String(name).trim(), id]);
}

async function countPosts(id) {
  const [rows] = await pool.query('SELECT COUNT(*) AS n FROM posts WHERE category_id = ?', [id]);
  return Number(rows[0].n);
}

async function remove(id) {
  const n = await countPosts(id);
  if (n > 0) {
    const err = new Error(`Chủ đề này còn ${n} bài viết, không thể xóa.`);
    err.code = 'CATEGORY_IN_USE';
    throw err;
  }
  await pool.query('DELETE FROM categories WHERE id = ?', [id]);
}

module.exports = { all, getById, getBySlug, create, rename, remove, countPosts };
