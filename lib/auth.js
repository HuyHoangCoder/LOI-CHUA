'use strict';
const bcrypt = require('bcryptjs');

async function checkPassword(plain, hash) {
  if (!hash || !plain) return false;
  try {
    return await bcrypt.compare(String(plain), String(hash));
  } catch {
    return false;
  }
}

function isLoggedIn(req) {
  return Boolean(req.session && req.session.loggedIn);
}

function requireLogin(req, res, next) {
  if (isLoggedIn(req)) return next();
  return res.redirect('/admin/dang-nhap');
}

module.exports = { checkPassword, isLoggedIn, requireLogin };
