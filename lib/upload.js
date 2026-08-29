'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MAX_BYTES = 5 * 1024 * 1024;
const PHAN_MO_RONG = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
const THONG_BAO_LOI = 'Ảnh phải là JPG/PNG/WEBP và dưới 5MB.';

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = PHAN_MO_RONG[file.mimetype];
    cb(null, crypto.randomBytes(16).toString('hex') + ext);
  },
});

const single = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (PHAN_MO_RONG[file.mimetype]) return cb(null, true);
    cb(new Error(THONG_BAO_LOI));
  },
}).single('cover_image');

function removeFile(filename) {
  if (!filename) return;
  const base = path.basename(String(filename));
  try {
    fs.unlinkSync(path.join(UPLOAD_DIR, base));
  } catch {
    // file không còn thì thôi
  }
}

function handleCover(req, res, next) {
  single(req, res, (err) => {
    if (err) {
      req.uploadError = THONG_BAO_LOI;
      if (req.file && req.file.filename) removeFile(req.file.filename);
    }
    next();
  });
}

module.exports = { UPLOAD_DIR, MAX_BYTES, handleCover, removeFile };
