'use strict';
const express = require('express');
const { checkPassword, requireLogin } = require('../lib/auth');
const { handleCover, removeFile } = require('../lib/upload');
const { verifyToken } = require('../lib/csrf');
const posts = require('../models/posts');
const categories = require('../models/categories');

const router = express.Router();

router.get('/dang-nhap', (req, res) => {
  res.render('admin/login', { title: 'Đăng nhập', error: null });
});

router.post('/dang-nhap', async (req, res) => {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    return res.render('admin/login', {
      title: 'Đăng nhập',
      error: 'Hệ thống chưa đặt mật khẩu quản trị. Chạy lệnh: npm run set-password',
    });
  }

  const ok = await checkPassword(req.body.password, hash);
  if (!ok) {
    return res.render('admin/login', { title: 'Đăng nhập', error: 'Mật khẩu không đúng.' });
  }

  req.session.loggedIn = true;
  res.redirect('/admin');
});

router.post('/dang-xuat', (req, res) => {
  req.session = null;
  res.redirect('/admin/dang-nhap');
});

router.use(requireLogin);

router.get('/', async (req, res, next) => {
  try {
    res.render('admin/list', {
      title: 'Bài viết',
      posts: await posts.listAll(),
      flash: req.query.tb || null,
    });
  } catch (err) { next(err); }
});

router.get('/bai-viet/moi', async (req, res, next) => {
  try {
    res.render('admin/form', {
      title: 'Viết bài mới',
      post: {},
      categories: await categories.all(),
      error: null,
    });
  } catch (err) { next(err); }
});

function docForm(req) {
  return {
    title: req.body.title || '',
    category_id: req.body.category_id || null,
    verse_ref: req.body.verse_ref || '',
    verse_text: req.body.verse_text || '',
    body: req.body.body || '',
    status: req.body.status === 'published' ? 'published' : 'draft',
  };
}

function kiemTra(data) {
  if (!data.title.trim()) return 'Vui lòng nhập tiêu đề bài viết.';
  if (!data.body.trim()) return 'Vui lòng nhập nội dung bài viết.';
  return null;
}

router.post('/bai-viet', handleCover, verifyToken, async (req, res, next) => {
  try {
    const data = docForm(req);
    const loi = req.uploadError || kiemTra(data);
    if (loi) {
      if (req.file) removeFile(req.file.filename);
      return res.status(200).render('admin/form', {
        title: 'Viết bài mới',
        post: data,
        categories: await categories.all(),
        error: loi,
      });
    }
    data.cover_image = req.file ? req.file.filename : null;
    await posts.create(data);
    res.redirect('/admin?tb=' + encodeURIComponent('Đã lưu bài viết.'));
  } catch (err) { next(err); }
});

router.get('/bai-viet/:id/sua', async (req, res, next) => {
  try {
    const post = await posts.getById(req.params.id);
    if (!post) return res.status(404).render('public/404', { title: 'Không tìm thấy' });
    res.render('admin/form', {
      title: 'Sửa bài viết',
      post,
      categories: await categories.all(),
      error: null,
    });
  } catch (err) { next(err); }
});

router.post('/bai-viet/:id', handleCover, verifyToken, async (req, res, next) => {
  try {
    const cu = await posts.getById(req.params.id);
    if (!cu) {
      if (req.file) removeFile(req.file.filename);
      return res.status(404).render('public/404', { title: 'Không tìm thấy' });
    }

    const data = docForm(req);
    const loi = req.uploadError || kiemTra(data);
    if (loi) {
      if (req.file) removeFile(req.file.filename);
      return res.status(200).render('admin/form', {
        title: 'Sửa bài viết',
        post: { ...cu, ...data },
        categories: await categories.all(),
        error: loi,
      });
    }

    let anh = cu.cover_image;
    if (req.file) {
      if (anh) removeFile(anh);
      anh = req.file.filename;
    } else if (req.body.remove_cover === '1') {
      if (anh) removeFile(anh);
      anh = null;
    }

    await posts.update(cu.id, { ...data, cover_image: anh });
    res.redirect('/admin?tb=' + encodeURIComponent('Đã cập nhật bài viết.'));
  } catch (err) { next(err); }
});

router.post('/bai-viet/:id/xoa', verifyToken, async (req, res, next) => {
  try {
    const daXoa = await posts.remove(req.params.id);
    if (daXoa && daXoa.cover_image) removeFile(daXoa.cover_image);
    res.redirect('/admin?tb=' + encodeURIComponent('Đã xóa bài viết.'));
  } catch (err) { next(err); }
});

async function renderChuDe(res, { error = null, flash = null, newName = '' } = {}) {
  const items = await categories.all();
  for (const c of items) {
    c.postCount = await categories.countPosts(c.id);
  }
  return res.render('admin/categories', { title: 'Chủ đề', items, error, flash, newName });
}

router.get('/chu-de', async (req, res, next) => {
  try {
    await renderChuDe(res, { flash: req.query.tb || null });
  } catch (err) { next(err); }
});

router.post('/chu-de', verifyToken, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return await renderChuDe(res, { error: 'Vui lòng nhập tên chủ đề.' });
    await categories.create(name);
    res.redirect('/admin/chu-de?tb=' + encodeURIComponent('Đã thêm chủ đề.'));
  } catch (err) { next(err); }
});

router.post('/chu-de/:id', verifyToken, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return await renderChuDe(res, { error: 'Vui lòng nhập tên chủ đề.' });
    await categories.rename(req.params.id, name);
    res.redirect('/admin/chu-de?tb=' + encodeURIComponent('Đã đổi tên chủ đề.'));
  } catch (err) { next(err); }
});

router.post('/chu-de/:id/xoa', verifyToken, async (req, res, next) => {
  try {
    await categories.remove(req.params.id);
    res.redirect('/admin/chu-de?tb=' + encodeURIComponent('Đã xóa chủ đề.'));
  } catch (err) {
    if (err.code === 'CATEGORY_IN_USE') {
      try {
        return await renderChuDe(res, { error: err.message });
      } catch (e2) { return next(e2); }
    }
    next(err);
  }
});

module.exports = router;
