'use strict';
const express = require('express');
const posts = require('../models/posts');
const categories = require('../models/categories');
const { toParagraphs, excerpt } = require('../lib/text');
const { isLoggedIn } = require('../lib/auth');

const PER_PAGE = 10;
const router = express.Router();

function docTrang(req) {
  const n = Number.parseInt(req.query.trang, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

async function renderDanhSach(req, res, { categoryId, heading, baseUrl, splash = false }) {
  const page = docTrang(req);
  const { rows, total } = await posts.listPublished({ page, perPage: PER_PAGE, categoryId });
  res.render('public/home', {
    title: heading || 'Trang chủ',
    heading,
    items: rows.map((p) => ({ ...p, excerpt: excerpt(p.body) })),
    page,
    totalPages: Math.max(1, Math.ceil(total / PER_PAGE)),
    baseUrl,
    splash,
  });
}

router.get('/', async (req, res, next) => {
  try {
    // Màn hình chào chỉ có ở trang chủ, và chỉ ở trang đầu — lật sang trang 2
    // là đang đọc tiếp, không phải vừa vào web.
    await renderDanhSach(req, res, {
      categoryId: null,
      heading: null,
      baseUrl: '/',
      splash: docTrang(req) === 1,
    });
  } catch (err) { next(err); }
});

router.get('/chu-de/:slug', async (req, res, next) => {
  try {
    const cat = await categories.getBySlug(req.params.slug);
    if (!cat) return res.status(404).render('public/404', { title: 'Không tìm thấy' });
    await renderDanhSach(req, res, {
      categoryId: cat.id,
      heading: cat.name,
      baseUrl: `/chu-de/${cat.slug}`,
    });
  } catch (err) { next(err); }
});

router.get('/bai-viet/:slug', async (req, res, next) => {
  try {
    const post = await posts.getBySlug(req.params.slug, { includeDrafts: isLoggedIn(req) });
    if (!post) return res.status(404).render('public/404', { title: 'Không tìm thấy' });

    const { prev, next: sau } = await posts.neighbors(post);
    res.render('public/post', {
      title: post.title,
      post,
      paragraphs: toParagraphs(post.body),
      prev,
      next: sau,
    });
  } catch (err) { next(err); }
});

module.exports = router;
