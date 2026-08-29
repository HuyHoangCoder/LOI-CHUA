'use strict';
require('dotenv').config({ quiet: true });

const path = require('path');
const express = require('express');
const cookieSession = require('cookie-session');
const categories = require('./models/categories');

function createApp() {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.urlencoded({ extended: false }));
  app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
  app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.use(cookieSession({
    name: 'loichua',
    keys: [process.env.SESSION_SECRET || 'doi-khoa-nay-trong-file-env'],
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
  }));

  app.use(require('./lib/csrf').attachToken);

  // Nạp danh sách chủ đề cho thanh điều hướng. MySQL hỏng thì để rỗng,
  // không làm sập cả trang.
  app.use(async (req, res, next) => {
    try {
      res.locals.navCategories = await categories.all();
    } catch {
      res.locals.navCategories = [];
    }
    next();
  });

  app.get('/khoe-khong', (req, res) => res.json({ ok: true }));
  app.use('/admin', require('./routes/admin'));
  app.use('/', require('./routes/public'));

  app.use((req, res) => {
    res.status(404).render('public/404', { title: 'Không tìm thấy' });
  });

  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error('[LỖI]', err);
    res.status(500).render('public/500', { title: 'Có lỗi xảy ra' });
  });

  return app;
}

module.exports = { createApp };
