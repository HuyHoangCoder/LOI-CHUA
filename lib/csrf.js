'use strict';
const crypto = require('node:crypto');

function attachToken(req, res, next) {
  if (req.session && !req.session.csrf) {
    req.session.csrf = crypto.randomBytes(24).toString('hex');
  }
  res.locals.csrfToken = (req.session && req.session.csrf) || '';
  next();
}

function verifyToken(req, res, next) {
  if (req.method !== 'POST') return next();
  const gui = req.body && req.body._csrf;
  const mong = req.session && req.session.csrf;
  if (!mong || !gui || String(gui) !== String(mong)) {
    // Nếu multer đã kịp lưu ảnh trước khi phát hiện token sai thì dọn file đó đi.
    if (req.file && req.file.filename) {
      require('./upload').removeFile(req.file.filename);
    }
    return res.status(403).render('public/500', { title: 'Yêu cầu không hợp lệ' });
  }
  next();
}

module.exports = { attachToken, verifyToken };
