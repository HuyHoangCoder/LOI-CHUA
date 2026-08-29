# Web Lời Chúa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây một website đọc bài viết Cơ Đốc giao diện sạch (kiểu YouVersion) kèm trang quản trị có mật khẩu để đăng bài, chạy trên localhost Windows.

**Architecture:** Một ứng dụng Express duy nhất phục vụ cả trang công khai và trang quản trị. Giao diện render tại server bằng EJS (không bước build). Dữ liệu trong MySQL 8.4 qua `mysql2/promise`; ảnh lưu thành file trong `uploads/`, database chỉ giữ tên file. Logic thuần (slug, tách đoạn) tách vào `lib/`, truy vấn tách vào `models/`, để test được độc lập với HTTP.

**Tech Stack:** Node.js 24 · Express 4 · EJS · MySQL 8.4 (`mysql2`) · `multer` · `cookie-session` · `bcryptjs` · `dotenv` · test bằng `node:test` + `supertest`

**Spec:** `docs/superpowers/specs/2026-08-29-web-loi-chua-design.md`

## Global Constraints

- Node.js 24 (đã cài sẵn). Windows. Shell mặc định là PowerShell; các lệnh `npm` chạy được ở cả hai.
- MySQL 8.4 **chưa được cài trên máy** — đây là việc người dùng phải tự cài (MySQL Community Server, bản Installer cho Windows). Mọi test cần database phải **tự bỏ qua (skip) kèm thông báo tiếng Việt** khi không kết nối được MySQL, không được làm đỏ cả bộ test.
- Bảng chữ MySQL: `utf8mb4` / `utf8mb4_unicode_ci` ở mọi bảng và mọi kết nối.
- Database thật: `loi_chua`. Database cho test: `loi_chua_test` — test **không bao giờ** được đụng vào `loi_chua`.
- Toàn bộ chữ hiển thị cho người dùng (nhãn, nút, thông báo lỗi) viết bằng **tiếng Việt có dấu**.
- Ảnh: chỉ `image/jpeg`, `image/png`, `image/webp`; tối đa **5MB**; tên file lưu là chuỗi ngẫu nhiên hex.
- Mọi truy vấn SQL dùng tham số hóa `?`. Không nối chuỗi SQL bao giờ.
- Nội dung bài (`body`) là **văn bản thuần**, luôn escape khi hiển thị (`<%= %>`), không bao giờ render như HTML (`<%- %>`).
- Không được để người dùng mất nội dung đã gõ khi form báo lỗi — luôn render lại form với dữ liệu cũ.
- `.env`, `uploads/`, `node_modules/` không đưa vào git.
- Không thêm thư viện ngoài danh sách Tech Stack. YAGNI.
- **Về git:** thư mục hiện chưa phải kho git. Nếu người dùng đã đồng ý khởi tạo git thì làm các bước Commit như viết; nếu chưa đồng ý, **bỏ qua mọi bước Commit** và giữ nguyên phần còn lại.

## Sai lệch so với spec (cố ý, đã cân nhắc)

1. **Thêm thư mục `models/`** (spec chỉ liệt kê `lib/` và `routes/`). Lý do: tách truy vấn SQL khỏi tầng HTTP để test được không cần supertest, và giữ file route ngắn.
2. **CSRF token gắn với phiên đăng nhập, không phải dùng một lần.** Spec ghi "dùng một lần"; token một lần làm hỏng thao tác mở nhiều tab và bấm Back. Token theo phiên là cách chuẩn, vẫn chặn đúng nguy cơ CSRF.
3. **`bcryptjs` thay cho `bcrypt`.** `bcrypt` là native module, trên Windows cần Visual Studio Build Tools mới cài được. `bcryptjs` thuần JavaScript, cùng API, không cần gì thêm.

## File Structure

| File | Trách nhiệm |
|---|---|
| `package.json` | Phụ thuộc và các lệnh `npm` |
| `.env.example` / `.env` | Cấu hình: cổng, MySQL, mật khẩu admin đã băm, khóa phiên |
| `.gitignore` | Loại `node_modules/`, `.env`, `uploads/` |
| `start.bat` | Bấm đúp để chạy trên Windows |
| `schema.sql` | Lệnh tạo 2 bảng |
| `db.js` | Tạo connection pool MySQL, kiểm tra kết nối |
| `app.js` | Lắp ráp Express, xuất `createApp()` — không tự `listen` |
| `server.js` | Kiểm tra MySQL rồi `listen` |
| `scripts/db-init.js` | Tạo database `loi_chua` + chạy `schema.sql` |
| `scripts/set-password.js` | Sinh chuỗi băm bcrypt cho mật khẩu admin |
| `lib/slug.js` | Hàm thuần: tiêu đề → slug; sinh slug không trùng |
| `lib/text.js` | Hàm thuần: tách đoạn, cắt tóm tắt |
| `lib/auth.js` | Kiểm tra mật khẩu, chặn route chưa đăng nhập |
| `lib/csrf.js` | Sinh và kiểm tra token CSRF |
| `lib/upload.js` | Cấu hình multer, kiểm tra file, xóa file |
| `models/categories.js` | Truy vấn bảng `categories` |
| `models/posts.js` | Truy vấn bảng `posts` |
| `routes/public.js` | Trang chủ, trang đọc bài, trang chủ đề — chỉ đọc |
| `routes/admin.js` | Đăng nhập, CRUD bài viết, quản lý chủ đề — mọi thao tác ghi |
| `views/partials/*.ejs` | Đầu/cuối trang cho công khai và quản trị |
| `views/public/*.ejs` | `home`, `post`, `404`, `500` |
| `views/admin/*.ejs` | `login`, `list`, `form`, `categories` |
| `public/css/style.css` | Toàn bộ CSS |
| `public/js/fontsize.js` | Nút A- / A+ |
| `test/helpers/env.js` | Đặt biến môi trường cho test — phải require **đầu tiên** |
| `test/helpers/db.js` | Kiểm tra MySQL sống, dựng lại `loi_chua_test` |
| `test/*.test.js` | Các bộ test |

---

### Task 1: Khung dự án chạy được

**Files:**
- Create: `package.json`, `.gitignore`, `.env.example`, `schema.sql`, `db.js`, `app.js`, `server.js`, `start.bat`, `scripts/db-init.js`
- Create: `test/helpers/env.js`, `test/helpers/db.js`, `test/smoke.test.js`

**Interfaces:**
- Consumes: (không có — task đầu tiên)
- Produces:
  - `db.js` → `{ pool, assertConnection() }` — `pool` là `mysql2/promise` Pool; `assertConnection(): Promise<void>` ném `Error` có thông báo tiếng Việt khi không kết nối được.
  - `app.js` → `createApp(): express.Application`
  - `test/helpers/db.js` → `{ TEST_DB: string, isMysqlUp(): Promise<boolean>, resetDatabase(): Promise<void> }`

- [ ] **Step 1: Khởi tạo dự án và cài phụ thuộc**

```bash
cd "D:/web loi chua"
npm init -y
npm install express@4 ejs mysql2 dotenv cookie-session bcryptjs multer
npm install --save-dev supertest
```

- [ ] **Step 2: Sửa `package.json` — phần `scripts` và `name`**

```json
{
  "name": "web-loi-chua",
  "version": "1.0.0",
  "private": true,
  "description": "Trang doc bai viet Co Doc + trang quan tri",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "node --test test/",
    "db:init": "node scripts/db-init.js",
    "set-password": "node scripts/set-password.js"
  }
}
```

Giữ nguyên khối `dependencies` và `devDependencies` mà npm đã ghi.

- [ ] **Step 3: Tạo `.gitignore`**

```
node_modules/
.env
uploads/
*.log
```

- [ ] **Step 4: Tạo `.env.example`**

```
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=loi_chua
ADMIN_PASSWORD_HASH=
SESSION_SECRET=
```

- [ ] **Step 5: Tạo `schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  category_id INT NULL,
  verse_ref VARCHAR(120) NULL,
  verse_text TEXT NULL,
  cover_image VARCHAR(255) NULL,
  body MEDIUMTEXT NOT NULL,
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_posts_category
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  INDEX idx_posts_status_created (status, created_at),
  INDEX idx_posts_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- [ ] **Step 6: Tạo `db.js`**

```js
'use strict';
const mysql = require('mysql2/promise');

function dbConfig(overrides = {}) {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'loi_chua',
    charset: 'utf8mb4_unicode_ci',
    waitForConnections: true,
    connectionLimit: 10,
    ...overrides,
  };
}

const pool = mysql.createPool(dbConfig());

async function assertConnection() {
  const cfg = dbConfig();
  try {
    const conn = await pool.getConnection();
    conn.release();
  } catch (err) {
    throw new Error(
      `Không kết nối được MySQL tại ${cfg.host}:${cfg.port} (database "${cfg.database}").\n` +
      `Hãy bật MySQL rồi chạy lại. Chi tiết: ${err.code || err.message}`
    );
  }
}

module.exports = { pool, dbConfig, assertConnection };
```

- [ ] **Step 7: Tạo `app.js` (khung tối thiểu, các route thêm ở task sau)**

```js
'use strict';
require('dotenv').config();

const path = require('path');
const express = require('express');

function createApp() {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.urlencoded({ extended: false }));
  app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
  app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.get('/khoe-khong', (req, res) => res.json({ ok: true }));

  return app;
}

module.exports = { createApp };
```

- [ ] **Step 8: Tạo `server.js`**

```js
'use strict';
require('dotenv').config();

const { createApp } = require('./app');
const { assertConnection } = require('./db');

async function main() {
  try {
    await assertConnection();
  } catch (err) {
    console.error('\n' + err.message + '\n');
    process.exit(1);
  }

  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, () => {
    console.log(`\n  Web Lời Chúa đang chạy:  http://localhost:${port}`);
    console.log(`  Trang quản trị:          http://localhost:${port}/admin`);
    console.log('\n  Đóng cửa sổ này hoặc bấm Ctrl+C để tắt.\n');
  });
}

main();
```

- [ ] **Step 9: Tạo `scripts/db-init.js`**

```js
'use strict';
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { dbConfig } = require('../db');

async function main() {
  const cfg = dbConfig();
  const name = cfg.database;
  let conn;
  try {
    conn = await mysql.createConnection({
      host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password,
      multipleStatements: true,
    });
  } catch (err) {
    console.error(`\nKhông kết nối được MySQL tại ${cfg.host}:${cfg.port}. Hãy bật MySQL rồi chạy lại.`);
    console.error(`Chi tiết: ${err.code || err.message}\n`);
    process.exit(1);
  }

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.changeUser({ database: name });
  const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  await conn.query(sql);
  await conn.end();

  console.log(`\nĐã tạo xong database "${name}" và các bảng.\n`);
}

main();
```

- [ ] **Step 10: Tạo `start.bat`**

```bat
@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Dang khoi dong Web Loi Chua...
node server.js
echo.
echo Ung dung da dung. Bam phim bat ky de dong cua so.
pause >nul
```

- [ ] **Step 11: Tạo `test/helpers/env.js` (phải được require TRƯỚC mọi module dùng database)**

```js
'use strict';
process.env.DB_NAME = 'loi_chua_test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret-khong-dung-that';
process.env.NODE_ENV = 'test';
```

- [ ] **Step 12: Tạo `test/helpers/db.js`**

```js
'use strict';
require('./env');

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { dbConfig } = require('../../db');

const TEST_DB = 'loi_chua_test';

function rootConfig() {
  const cfg = dbConfig();
  return {
    host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password,
    multipleStatements: true,
  };
}

let upPromise = null;
function isMysqlUp() {
  if (!upPromise) {
    upPromise = (async () => {
      try {
        const conn = await mysql.createConnection(rootConfig());
        await conn.end();
        return true;
      } catch {
        return false;
      }
    })();
  }
  return upPromise;
}

async function resetDatabase() {
  const conn = await mysql.createConnection(rootConfig());
  await conn.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
  await conn.query(
    `CREATE DATABASE \`${TEST_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.changeUser({ database: TEST_DB });
  const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'schema.sql'), 'utf8');
  await conn.query(sql);
  await conn.end();
}

const SKIP_MESSAGE = 'MySQL chưa chạy — bỏ qua test cần database';

module.exports = { TEST_DB, isMysqlUp, resetDatabase, SKIP_MESSAGE };
```

- [ ] **Step 13: Viết test khói `test/smoke.test.js`**

```js
'use strict';
require('./helpers/env');

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../app');

test('GET /khoe-khong trả về ok', async () => {
  const res = await request(createApp()).get('/khoe-khong');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { ok: true });
});
```

- [ ] **Step 14: Chạy test — phải XANH**

Run: `npm test`
Expected: PASS, 1 test.

- [ ] **Step 15: Tạo `.env` từ mẫu và chạy thử ứng dụng**

```bash
cp .env.example .env
node server.js
```
Expected (khi chưa cài MySQL): in ra "Không kết nối được MySQL tại 127.0.0.1:3306..." và thoát. **Đây là hành vi đúng** — chứng minh phần xử lý lỗi hoạt động.

- [ ] **Step 16: Commit**

```bash
git init
git add .
git commit -m "chore: khung du an Express + MySQL + test harness"
```

---

### Task 2: Sinh slug và xử lý văn bản

**Files:**
- Create: `lib/slug.js`, `lib/text.js`
- Test: `test/slug.test.js`, `test/text.test.js`

**Interfaces:**
- Consumes: (không)
- Produces:
  - `lib/slug.js` → `{ slugify(title: string): string, uniqueSlug(title: string, exists: (slug: string) => Promise<boolean>): Promise<string> }`
  - `lib/text.js` → `{ toParagraphs(body: string): string[], excerpt(body: string, max?: number): string }`

- [ ] **Step 1: Viết test `test/slug.test.js`**

```js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { slugify, uniqueSlug } = require('../lib/slug');

test('bỏ dấu tiếng Việt và nối bằng gạch ngang', () => {
  assert.strictEqual(slugify('Lời Chúa cho ngày mới'), 'loi-chua-cho-ngay-moi');
});

test('chữ đ thành d', () => {
  assert.strictEqual(slugify('Đức tin'), 'duc-tin');
  assert.strictEqual(slugify('ĐƯỜNG ĐI'), 'duong-di');
});

test('bỏ dấu câu và gạch ngang thừa', () => {
  assert.strictEqual(slugify('  Sự bình an thật!!!  '), 'su-binh-an-that');
  assert.strictEqual(slugify('Ê-sai 1:18'), 'e-sai-1-18');
});

test('tiêu đề không còn ký tự nào thì dùng mặc định', async () => {
  const slug = await uniqueSlug('!!!', async () => false);
  assert.strictEqual(slug, 'bai-viet');
});

test('slug trùng thì thêm số đuôi', async () => {
  const daCo = new Set(['duc-tin', 'duc-tin-2']);
  const slug = await uniqueSlug('Đức tin', async (s) => daCo.has(s));
  assert.strictEqual(slug, 'duc-tin-3');
});

test('cắt tối đa 200 ký tự, không để lại gạch ngang ở cuối', () => {
  const slug = slugify('a'.repeat(150) + ' ' + 'b'.repeat(150));
  assert.ok(slug.length <= 200);
  assert.ok(!slug.endsWith('-'));
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó ĐỎ**

Run: `node --test test/slug.test.js`
Expected: FAIL — `Cannot find module '../lib/slug'`

- [ ] **Step 3: Viết `lib/slug.js`**

```js
'use strict';

const MAX_LENGTH = 200;

function removeDiacritics(str) {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function slugify(title) {
  return removeDiacritics(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH)
    .replace(/-+$/g, '');
}

async function uniqueSlug(title, exists) {
  const base = slugify(title) || 'bai-viet';
  let candidate = base;
  let n = 1;
  while (await exists(candidate)) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

module.exports = { slugify, uniqueSlug };
```

- [ ] **Step 4: Chạy test — phải XANH**

Run: `node --test test/slug.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 5: Viết test `test/text.test.js`**

```js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { toParagraphs, excerpt } = require('../lib/text');

test('dòng trống tách thành đoạn', () => {
  const body = 'Đoạn một.\n\nĐoạn hai.\n\n\nĐoạn ba.';
  assert.deepStrictEqual(toParagraphs(body), ['Đoạn một.', 'Đoạn hai.', 'Đoạn ba.']);
});

test('xuống dòng đơn vẫn nằm trong cùng một đoạn', () => {
  assert.deepStrictEqual(toParagraphs('dòng một\ndòng hai'), ['dòng một\ndòng hai']);
});

test('xử lý được xuống dòng kiểu Windows', () => {
  assert.deepStrictEqual(toParagraphs('một\r\n\r\nhai'), ['một', 'hai']);
});

test('nội dung rỗng trả về mảng rỗng', () => {
  assert.deepStrictEqual(toParagraphs('   '), []);
});

test('tóm tắt ngắn hơn giới hạn thì giữ nguyên', () => {
  assert.strictEqual(excerpt('Ngắn thôi.'), 'Ngắn thôi.');
});

test('tóm tắt dài thì cắt ở ranh giới từ và thêm dấu ba chấm', () => {
  const body = 'từ '.repeat(100);
  const out = excerpt(body, 20);
  assert.ok(out.length <= 21);
  assert.ok(out.endsWith('…'));
  assert.ok(!out.includes('  '));
});
```

- [ ] **Step 6: Chạy test để chắc chắn nó ĐỎ**

Run: `node --test test/text.test.js`
Expected: FAIL — `Cannot find module '../lib/text'`

- [ ] **Step 7: Viết `lib/text.js`**

```js
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
```

- [ ] **Step 8: Chạy test — phải XANH**

Run: `npm test`
Expected: PASS, tất cả test của task 1 và 2.

- [ ] **Step 9: Commit**

```bash
git add lib/slug.js lib/text.js test/slug.test.js test/text.test.js
git commit -m "feat: sinh slug tieng Viet va tach doan van ban"
```

---

### Task 3: Đăng nhập / đăng xuất

**Files:**
- Create: `lib/auth.js`, `scripts/set-password.js`, `routes/admin.js`, `views/partials/admin-header.ejs`, `views/partials/admin-footer.ejs`, `views/admin/login.ejs`
- Modify: `app.js` (thêm `cookie-session` và gắn `routes/admin.js`)
- Test: `test/auth.test.js`

**Interfaces:**
- Consumes: `createApp()` từ `app.js`
- Produces:
  - `lib/auth.js` → `{ checkPassword(plain: string, hash: string): Promise<boolean>, requireLogin(req, res, next): void, isLoggedIn(req): boolean }`
  - `routes/admin.js` → `express.Router` gắn tại `/admin`, có `GET /dang-nhap`, `POST /dang-nhap`, `POST /dang-xuat`, `GET /`

- [ ] **Step 1: Viết test `test/auth.test.js`**

```js
'use strict';
require('./helpers/env');

const { test } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const request = require('supertest');

process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('matkhau-test', 8);
const { createApp } = require('../app');

test('chưa đăng nhập vào /admin thì bị chuyển về trang đăng nhập', async () => {
  const res = await request(createApp()).get('/admin');
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/admin/dang-nhap');
});

test('trang đăng nhập mở được mà không cần đăng nhập', async () => {
  const res = await request(createApp()).get('/admin/dang-nhap');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Mật khẩu/);
});

test('mật khẩu sai thì không vào được', async () => {
  const agent = request.agent(createApp());
  const res = await agent.post('/admin/dang-nhap').type('form').send({ password: 'sai-bet' });
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Mật khẩu không đúng/);

  const sau = await agent.get('/admin');
  assert.strictEqual(sau.status, 302);
});

test('mật khẩu đúng thì vào được /admin', async () => {
  const agent = request.agent(createApp());
  const res = await agent.post('/admin/dang-nhap').type('form').send({ password: 'matkhau-test' });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/admin');

  const sau = await agent.get('/admin');
  assert.strictEqual(sau.status, 200);
});

test('đăng xuất thì mất quyền vào /admin', async () => {
  const agent = request.agent(createApp());
  await agent.post('/admin/dang-nhap').type('form').send({ password: 'matkhau-test' });
  await agent.post('/admin/dang-xuat').type('form').send({});

  const sau = await agent.get('/admin');
  assert.strictEqual(sau.status, 302);
});

test('chưa cấu hình mật khẩu thì không ai vào được', async () => {
  const cu = process.env.ADMIN_PASSWORD_HASH;
  process.env.ADMIN_PASSWORD_HASH = '';
  try {
    const agent = request.agent(createApp());
    const res = await agent.post('/admin/dang-nhap').type('form').send({ password: 'bat-ky' });
    assert.strictEqual(res.status, 200);
    assert.match(res.text, /chưa đặt mật khẩu/i);
  } finally {
    process.env.ADMIN_PASSWORD_HASH = cu;
  }
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó ĐỎ**

Run: `node --test test/auth.test.js`
Expected: FAIL — `/admin` trả 404 vì chưa có route.

- [ ] **Step 3: Viết `lib/auth.js`**

```js
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
```

- [ ] **Step 4: Viết `views/partials/admin-header.ejs`**

```html
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><%= title %> · Quản trị</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body class="admin">
<header class="admin-header">
  <div class="wrap">
    <a class="brand" href="/admin">Quản trị</a>
    <nav>
      <a href="/admin">Bài viết</a>
      <a href="/admin/chu-de">Chủ đề</a>
      <a href="/" target="_blank" rel="noopener">Xem trang web ↗</a>
      <form method="post" action="/admin/dang-xuat" class="inline">
        <input type="hidden" name="_csrf" value="<%= typeof csrfToken !== 'undefined' ? csrfToken : '' %>">
        <button type="submit" class="link-button">Đăng xuất</button>
      </form>
    </nav>
  </div>
</header>
<main class="wrap admin-main">
```

- [ ] **Step 5: Viết `views/partials/admin-footer.ejs`**

```html
</main>
</body>
</html>
```

- [ ] **Step 6: Viết `views/admin/login.ejs`**

```html
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Đăng nhập · Quản trị</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body class="admin login-page">
  <form method="post" action="/admin/dang-nhap" class="login-box">
    <h1>Đăng nhập quản trị</h1>
    <% if (error) { %><p class="error"><%= error %></p><% } %>
    <label for="password">Mật khẩu</label>
    <input type="password" id="password" name="password" autofocus required>
    <button type="submit">Vào</button>
    <p class="hint"><a href="/">← Về trang đọc</a></p>
  </form>
</body>
</html>
```

- [ ] **Step 7: Viết `routes/admin.js` (chỉ phần đăng nhập; CRUD thêm ở task sau)**

```js
'use strict';
const express = require('express');
const { checkPassword, requireLogin } = require('../lib/auth');

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

router.get('/', requireLogin, (req, res) => {
  res.render('admin/list', { title: 'Bài viết', posts: [] });
});

module.exports = router;
```

- [ ] **Step 8: Tạo `views/admin/list.ejs` tạm thời (task 5 sẽ hoàn thiện)**

```html
<%- include('../partials/admin-header') %>
<h1>Bài viết</h1>
<p>Chưa có bài viết nào.</p>
<%- include('../partials/admin-footer') %>
```

- [ ] **Step 9: Sửa `app.js` — thêm phiên đăng nhập và gắn router**

Thay thân hàm `createApp()` bằng:

```js
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

  app.get('/khoe-khong', (req, res) => res.json({ ok: true }));
  app.use('/admin', require('./routes/admin'));

  return app;
}
```

Thêm ở đầu file, sau `const express = require('express');`:

```js
const cookieSession = require('cookie-session');
```

- [ ] **Step 10: Chạy test — phải XANH**

Run: `npm test`
Expected: PASS, tất cả test.

- [ ] **Step 11: Viết `scripts/set-password.js`**

```js
'use strict';
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const matKhau = process.argv[2];

if (!matKhau) {
  console.log('\nCách dùng:  npm run set-password -- "mat khau cua ban"\n');
  process.exit(1);
}

if (matKhau.length < 6) {
  console.log('\nMật khẩu phải dài ít nhất 6 ký tự.\n');
  process.exit(1);
}

const hash = bcrypt.hashSync(matKhau, 10);
const secret = crypto.randomBytes(32).toString('hex');

console.log('\nChép 2 dòng dưới đây vào file .env (thay dòng cũ nếu đã có):\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
console.log(`SESSION_SECRET=${secret}`);
console.log('');
```

- [ ] **Step 12: Chạy thử script**

Run: `npm run set-password -- "loichua2026"`
Expected: in ra 2 dòng `ADMIN_PASSWORD_HASH=$2a$10$...` và `SESSION_SECRET=...`. Chép vào `.env`.

- [ ] **Step 13: Commit**

```bash
git add lib/auth.js routes/admin.js views scripts/set-password.js app.js test/auth.test.js
git commit -m "feat: dang nhap quan tri bang mat khau bcrypt"
```

---

### Task 4: Tầng truy vấn database

**Files:**
- Create: `models/categories.js`, `models/posts.js`
- Test: `test/models.test.js`

**Interfaces:**
- Consumes: `pool` từ `db.js`; `uniqueSlug` từ `lib/slug.js`
- Produces:
  - `models/categories.js` → `{ all(): Promise<Row[]>, getBySlug(slug): Promise<Row|null>, getById(id): Promise<Row|null>, create(name): Promise<number>, rename(id, name): Promise<void>, remove(id): Promise<void>, countPosts(id): Promise<number> }` — `Row = { id, name, slug }`
  - `models/posts.js` → `{ listPublished({page, perPage, categoryId}): Promise<{rows, total}>, listAll(): Promise<Row[]>, getBySlug(slug, {includeDrafts}): Promise<Row|null>, getById(id): Promise<Row|null>, create(data): Promise<number>, update(id, data): Promise<void>, remove(id): Promise<Row|null>, neighbors(post): Promise<{prev, next}> }`
  - `data` cho `create`/`update` = `{ title, category_id, verse_ref, verse_text, cover_image, body, status }`
  - `remove(id)` trả về hàng vừa xóa (để route biết tên file ảnh cần xóa), hoặc `null` nếu không có.

- [ ] **Step 1: Viết test `test/models.test.js`**

```js
'use strict';
require('./helpers/env');

const { test } = require('node:test');
const assert = require('node:assert');
const { isMysqlUp, resetDatabase, SKIP_MESSAGE } = require('./helpers/db');
const categories = require('../models/categories');
const posts = require('../models/posts');

async function chuanBi(t) {
  if (!(await isMysqlUp())) {
    t.skip(SKIP_MESSAGE);
    return false;
  }
  await resetDatabase();
  return true;
}

test('tạo chủ đề sinh slug tự động', async (t) => {
  if (!(await chuanBi(t))) return;
  const id = await categories.create('Suy niệm');
  const c = await categories.getById(id);
  assert.strictEqual(c.name, 'Suy niệm');
  assert.strictEqual(c.slug, 'suy-niem');
});

test('đổi tên chủ đề', async (t) => {
  if (!(await chuanBi(t))) return;
  const id = await categories.create('Suy niệm');
  await categories.rename(id, 'Suy gẫm');
  assert.strictEqual((await categories.getById(id)).name, 'Suy gẫm');
});

test('tạo bài viết sinh slug từ tiêu đề', async (t) => {
  if (!(await chuanBi(t))) return;
  const id = await posts.create({
    title: 'Lời Chúa cho ngày mới', body: 'Nội dung.', status: 'published',
  });
  const p = await posts.getById(id);
  assert.strictEqual(p.slug, 'loi-chua-cho-ngay-moi');
  assert.strictEqual(p.status, 'published');
});

test('hai bài trùng tiêu đề thì slug khác nhau', async (t) => {
  if (!(await chuanBi(t))) return;
  await posts.create({ title: 'Đức tin', body: 'a', status: 'published' });
  const id2 = await posts.create({ title: 'Đức tin', body: 'b', status: 'published' });
  assert.strictEqual((await posts.getById(id2)).slug, 'duc-tin-2');
});

test('sửa tiêu đề không làm đổi slug', async (t) => {
  if (!(await chuanBi(t))) return;
  const id = await posts.create({ title: 'Đức tin', body: 'a', status: 'published' });
  await posts.update(id, { title: 'Đức tin lớn', body: 'a', status: 'published' });
  const p = await posts.getById(id);
  assert.strictEqual(p.slug, 'duc-tin');
  assert.strictEqual(p.title, 'Đức tin lớn');
});

test('listPublished bỏ qua bài nháp và phân trang', async (t) => {
  if (!(await chuanBi(t))) return;
  for (let i = 1; i <= 12; i += 1) {
    await posts.create({ title: `Bài ${i}`, body: 'x', status: 'published' });
  }
  await posts.create({ title: 'Bài nháp', body: 'x', status: 'draft' });

  const trang1 = await posts.listPublished({ page: 1, perPage: 10 });
  assert.strictEqual(trang1.total, 12);
  assert.strictEqual(trang1.rows.length, 10);

  const trang2 = await posts.listPublished({ page: 2, perPage: 10 });
  assert.strictEqual(trang2.rows.length, 2);
  assert.ok(!trang1.rows.concat(trang2.rows).some((p) => p.status === 'draft'));
});

test('getBySlug mặc định không trả bài nháp', async (t) => {
  if (!(await chuanBi(t))) return;
  await posts.create({ title: 'Bài nháp', body: 'x', status: 'draft' });
  assert.strictEqual(await posts.getBySlug('bai-nhap'), null);
  assert.ok(await posts.getBySlug('bai-nhap', { includeDrafts: true }));
});

test('lọc theo chủ đề', async (t) => {
  if (!(await chuanBi(t))) return;
  const cid = await categories.create('Suy niệm');
  await posts.create({ title: 'Có chủ đề', body: 'x', status: 'published', category_id: cid });
  await posts.create({ title: 'Không chủ đề', body: 'x', status: 'published' });

  const kq = await posts.listPublished({ page: 1, perPage: 10, categoryId: cid });
  assert.strictEqual(kq.total, 1);
  assert.strictEqual(kq.rows[0].title, 'Có chủ đề');
});

test('không xóa được chủ đề đang có bài', async (t) => {
  if (!(await chuanBi(t))) return;
  const cid = await categories.create('Suy niệm');
  await posts.create({ title: 'Bài', body: 'x', status: 'published', category_id: cid });
  assert.strictEqual(await categories.countPosts(cid), 1);
  await assert.rejects(() => categories.remove(cid));
});

test('xóa được chủ đề rỗng', async (t) => {
  if (!(await chuanBi(t))) return;
  const cid = await categories.create('Trống');
  await categories.remove(cid);
  assert.strictEqual(await categories.getById(cid), null);
});

test('neighbors trả bài cũ hơn và mới hơn', async (t) => {
  if (!(await chuanBi(t))) return;
  const a = await posts.create({ title: 'Bài A', body: 'x', status: 'published' });
  const b = await posts.create({ title: 'Bài B', body: 'x', status: 'published' });
  const c = await posts.create({ title: 'Bài C', body: 'x', status: 'published' });

  const giua = await posts.getById(b);
  const { prev, next } = await posts.neighbors(giua);
  assert.strictEqual(prev.id, a);
  assert.strictEqual(next.id, c);

  const cuoi = await posts.getById(c);
  assert.strictEqual((await posts.neighbors(cuoi)).next, null);
});

test('remove trả về hàng vừa xóa', async (t) => {
  if (!(await chuanBi(t))) return;
  const id = await posts.create({
    title: 'Bài', body: 'x', status: 'published', cover_image: 'abc.jpg',
  });
  const daXoa = await posts.remove(id);
  assert.strictEqual(daXoa.cover_image, 'abc.jpg');
  assert.strictEqual(await posts.getById(id), null);
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó ĐỎ**

Run: `node --test test/models.test.js`
Expected: FAIL — `Cannot find module '../models/categories'`

- [ ] **Step 3: Viết `models/categories.js`**

```js
'use strict';
const { pool } = require('../db');
const { uniqueSlug } = require('../lib/slug');

async function slugExists(slug, exceptId = null) {
  const [rows] = exceptId
    ? await pool.query('SELECT id FROM categories WHERE slug = ? AND id <> ?', [slug, exceptId])
    : await pool.query('SELECT id FROM categories WHERE slug = ?', [slug]);
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
  const slug = await uniqueSlug(name, (s) => slugExists(s));
  const [result] = await pool.query(
    'INSERT INTO categories (name, slug) VALUES (?, ?)', [String(name).trim(), slug]
  );
  return result.insertId;
}

async function rename(id, name) {
  await pool.query('UPDATE categories SET name = ? WHERE id = ?', [String(name).trim(), id]);
}

async function countPosts(id) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS n FROM posts WHERE category_id = ?', [id]
  );
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
```

- [ ] **Step 4: Viết `models/posts.js`**

```js
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
  const [rows] = await pool.query(`${SELECT_WITH_CATEGORY} ORDER BY p.created_at DESC`);
  return rows;
}

async function listPublished({ page = 1, perPage = 10, categoryId = null } = {}) {
  const offset = (Math.max(1, Number(page)) - 1) * perPage;
  const where = categoryId
    ? `WHERE p.status = 'published' AND p.category_id = ?`
    : `WHERE p.status = 'published'`;
  const params = categoryId ? [categoryId] : [];

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS n FROM posts p ${where}`, params
  );
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
```

- [ ] **Step 5: Chạy test — phải XANH (hoặc SKIP nếu chưa có MySQL)**

Run: `node --test test/models.test.js`
Expected: nếu MySQL đang chạy → PASS toàn bộ. Nếu chưa cài MySQL → tất cả hiện `skipped` kèm "MySQL chưa chạy — bỏ qua test cần database", **không có test nào đỏ**.

- [ ] **Step 6: Commit**

```bash
git add models test/models.test.js
git commit -m "feat: tang truy van posts va categories"
```

---

### Task 5: Quản trị bài viết (thêm / sửa / xóa)

**Files:**
- Modify: `routes/admin.js` (thêm CRUD), `views/admin/list.ejs` (viết lại đầy đủ)
- Create: `views/admin/form.ejs`
- Test: `test/admin-posts.test.js`

**Interfaces:**
- Consumes: `models/posts.js`, `models/categories.js`, `requireLogin` từ `lib/auth.js`
- Produces: các route `GET /admin`, `GET /admin/bai-viet/moi`, `POST /admin/bai-viet`, `GET /admin/bai-viet/:id/sua`, `POST /admin/bai-viet/:id`, `POST /admin/bai-viet/:id/xoa`

- [ ] **Step 1: Viết test `test/admin-posts.test.js`**

```js
'use strict';
require('./helpers/env');

const { test } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { isMysqlUp, resetDatabase, SKIP_MESSAGE } = require('./helpers/db');

process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('matkhau-test', 8);
const { createApp } = require('../app');
const posts = require('../models/posts');

async function dangNhap(t) {
  if (!(await isMysqlUp())) {
    t.skip(SKIP_MESSAGE);
    return null;
  }
  await resetDatabase();
  const agent = request.agent(createApp());
  await agent.post('/admin/dang-nhap').type('form').send({ password: 'matkhau-test' });
  return agent;
}

test('tạo bài viết mới từ form', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const res = await agent.post('/admin/bai-viet').type('form').send({
    title: 'Lời Chúa cho ngày mới',
    body: 'Đoạn một.\n\nĐoạn hai.',
    verse_ref: 'Ê-sai 1:18',
    verse_text: 'Dầu tội các ngươi như hồng điều...',
    status: 'published',
  });
  assert.strictEqual(res.status, 302);

  const p = await posts.getBySlug('loi-chua-cho-ngay-moi');
  assert.strictEqual(p.title, 'Lời Chúa cho ngày mới');
  assert.strictEqual(p.verse_ref, 'Ê-sai 1:18');
});

test('thiếu tiêu đề thì báo lỗi và GIỮ NGUYÊN nội dung đã gõ', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const res = await agent.post('/admin/bai-viet').type('form').send({
    title: '',
    body: 'Nội dung tôi đã gõ rất dài.',
    status: 'draft',
  });
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Vui lòng nhập tiêu đề/);
  assert.match(res.text, /Nội dung tôi đã gõ rất dài\./);
});

test('thiếu nội dung thì báo lỗi và giữ nguyên tiêu đề', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const res = await agent.post('/admin/bai-viet').type('form').send({
    title: 'Tiêu đề của tôi', body: '   ', status: 'draft',
  });
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Vui lòng nhập nội dung/);
  assert.match(res.text, /Tiêu đề của tôi/);
});

test('sửa bài viết', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const id = await posts.create({ title: 'Cũ', body: 'x', status: 'draft' });
  const res = await agent.post(`/admin/bai-viet/${id}`).type('form').send({
    title: 'Mới', body: 'y', status: 'published',
  });
  assert.strictEqual(res.status, 302);

  const p = await posts.getById(id);
  assert.strictEqual(p.title, 'Mới');
  assert.strictEqual(p.status, 'published');
});

test('xóa bài viết', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const id = await posts.create({ title: 'Xóa tôi', body: 'x', status: 'draft' });
  const res = await agent.post(`/admin/bai-viet/${id}/xoa`).type('form').send({});
  assert.strictEqual(res.status, 302);
  assert.strictEqual(await posts.getById(id), null);
});

test('danh sách quản trị hiện cả bài nháp', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  await posts.create({ title: 'Bài nháp của tôi', body: 'x', status: 'draft' });
  const res = await agent.get('/admin');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Bài nháp của tôi/);
  assert.match(res.text, /Nháp/);
});

test('chưa đăng nhập thì không tạo được bài', async (t) => {
  if (!(await isMysqlUp())) { t.skip(SKIP_MESSAGE); return; }
  await resetDatabase();

  const res = await request(createApp()).post('/admin/bai-viet').type('form').send({
    title: 'Kẻ lạ', body: 'x', status: 'published',
  });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(await posts.getBySlug('ke-la', { includeDrafts: true }), null);
});

test('sửa bài không tồn tại thì trả 404', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;
  const res = await agent.get('/admin/bai-viet/9999/sua');
  assert.strictEqual(res.status, 404);
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó ĐỎ**

Run: `node --test test/admin-posts.test.js`
Expected: FAIL — `POST /admin/bai-viet` trả 404.

- [ ] **Step 3: Viết `views/admin/list.ejs` (thay file tạm ở Task 3)**

```html
<%- include('../partials/admin-header') %>
<div class="page-head">
  <h1>Bài viết</h1>
  <a class="button" href="/admin/bai-viet/moi">+ Viết bài mới</a>
</div>

<% if (flash) { %><p class="flash"><%= flash %></p><% } %>

<% if (posts.length === 0) { %>
  <p class="empty">Chưa có bài viết nào. Bấm “Viết bài mới” để bắt đầu.</p>
<% } else { %>
<table class="admin-table">
  <thead>
    <tr><th>Tiêu đề</th><th>Chủ đề</th><th>Ngày</th><th>Trạng thái</th><th></th></tr>
  </thead>
  <tbody>
  <% posts.forEach(function (p) { %>
    <tr>
      <td><a href="/admin/bai-viet/<%= p.id %>/sua"><%= p.title %></a></td>
      <td><%= p.category_name || '—' %></td>
      <td><%= new Date(p.created_at).toLocaleDateString('vi-VN') %></td>
      <td>
        <% if (p.status === 'published') { %>
          <span class="badge published">● Đã đăng</span>
        <% } else { %>
          <span class="badge draft">○ Nháp</span>
        <% } %>
      </td>
      <td class="actions">
        <a href="/admin/bai-viet/<%= p.id %>/sua">Sửa</a>
        <form method="post" action="/admin/bai-viet/<%= p.id %>/xoa" class="inline"
              onsubmit="return confirm('Xóa bài “<%= p.title %>”? Không khôi phục lại được.');">
          <input type="hidden" name="_csrf" value="<%= csrfToken %>">
          <button type="submit" class="link-button danger">Xóa</button>
        </form>
      </td>
    </tr>
  <% }); %>
  </tbody>
</table>
<% } %>
<%- include('../partials/admin-footer') %>
```

- [ ] **Step 4: Viết `views/admin/form.ejs`**

Ô chọn file ảnh đặt **cuối** các trường văn bản là cố ý: multer đọc form theo thứ tự, để file sau cùng thì khi có lỗi ảnh, `req.body` đã có đủ dữ liệu chữ để render lại.

```html
<%- include('../partials/admin-header') %>
<h1><%= post.id ? 'Sửa bài viết' : 'Viết bài mới' %></h1>

<% if (error) { %><p class="error"><%= error %></p><% } %>

<form method="post" action="<%= post.id ? '/admin/bai-viet/' + post.id : '/admin/bai-viet' %>"
      enctype="multipart/form-data" class="post-form">
  <input type="hidden" name="_csrf" value="<%= csrfToken %>">

  <label for="title">Tiêu đề</label>
  <input type="text" id="title" name="title" value="<%= post.title || '' %>" autofocus>

  <label for="category_id">Chủ đề</label>
  <select id="category_id" name="category_id">
    <option value="">— Không chọn —</option>
    <% categories.forEach(function (c) { %>
      <option value="<%= c.id %>" <%= String(post.category_id) === String(c.id) ? 'selected' : '' %>>
        <%= c.name %>
      </option>
    <% }); %>
  </select>

  <fieldset>
    <legend>Câu Kinh Thánh (không bắt buộc)</legend>
    <label for="verse_ref">Nguồn</label>
    <input type="text" id="verse_ref" name="verse_ref" placeholder="Ê-sai 1:18"
           value="<%= post.verse_ref || '' %>">
    <label for="verse_text">Nội dung câu</label>
    <textarea id="verse_text" name="verse_text" rows="3"><%= post.verse_text || '' %></textarea>
  </fieldset>

  <label for="body">Nội dung bài</label>
  <p class="hint">Gõ bình thường. Enter 2 lần để sang đoạn mới.</p>
  <textarea id="body" name="body" rows="20"><%= post.body || '' %></textarea>

  <label for="cover_image">Ảnh bìa (JPG/PNG/WEBP, tối đa 5MB)</label>
  <% if (post.cover_image) { %>
    <div class="cover-preview">
      <img src="/uploads/<%= post.cover_image %>" alt="Ảnh bìa hiện tại">
      <label class="checkbox">
        <input type="checkbox" name="remove_cover" value="1"> Xóa ảnh bìa này
      </label>
    </div>
  <% } %>
  <input type="file" id="cover_image" name="cover_image" accept="image/jpeg,image/png,image/webp">

  <div class="form-actions">
    <button type="submit" name="status" value="draft" class="secondary">Lưu nháp</button>
    <button type="submit" name="status" value="published">Đăng bài</button>
    <% if (post.slug) { %>
      <a class="link" href="/bai-viet/<%= post.slug %>" target="_blank" rel="noopener">Xem thử ↗</a>
    <% } %>
    <a class="link" href="/admin">Hủy</a>
  </div>
</form>
<%- include('../partials/admin-footer') %>
```

- [ ] **Step 5: Viết lại `routes/admin.js` đầy đủ**

`csrfToken` ở bước này tạm để chuỗi rỗng — Task 9 sẽ nối vào thật.

```js
'use strict';
const express = require('express');
const { checkPassword, requireLogin } = require('../lib/auth');
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

router.post('/bai-viet', async (req, res, next) => {
  try {
    const data = docForm(req);
    const loi = kiemTra(data);
    if (loi) {
      return res.status(200).render('admin/form', {
        title: 'Viết bài mới', post: data, categories: await categories.all(), error: loi,
      });
    }
    await posts.create(data);
    res.redirect('/admin?tb=' + encodeURIComponent('Đã lưu bài viết.'));
  } catch (err) { next(err); }
});

router.get('/bai-viet/:id/sua', async (req, res, next) => {
  try {
    const post = await posts.getById(req.params.id);
    if (!post) return res.status(404).render('public/404', { title: 'Không tìm thấy' });
    res.render('admin/form', {
      title: 'Sửa bài viết', post, categories: await categories.all(), error: null,
    });
  } catch (err) { next(err); }
});

router.post('/bai-viet/:id', async (req, res, next) => {
  try {
    const cu = await posts.getById(req.params.id);
    if (!cu) return res.status(404).render('public/404', { title: 'Không tìm thấy' });

    const data = docForm(req);
    const loi = kiemTra(data);
    if (loi) {
      return res.status(200).render('admin/form', {
        title: 'Sửa bài viết',
        post: { ...cu, ...data },
        categories: await categories.all(),
        error: loi,
      });
    }
    await posts.update(cu.id, { ...data, cover_image: cu.cover_image });
    res.redirect('/admin?tb=' + encodeURIComponent('Đã cập nhật bài viết.'));
  } catch (err) { next(err); }
});

router.post('/bai-viet/:id/xoa', async (req, res, next) => {
  try {
    await posts.remove(req.params.id);
    res.redirect('/admin?tb=' + encodeURIComponent('Đã xóa bài viết.'));
  } catch (err) { next(err); }
});

module.exports = router;
```

- [ ] **Step 6: Thêm `csrfToken` rỗng vào `res.locals` trong `app.js`**

Ngay sau `app.use(cookieSession({...}))`:

```js
  app.use((req, res, next) => {
    res.locals.csrfToken = '';
    next();
  });
```

- [ ] **Step 7: Tạo `views/public/404.ejs` (route quản trị đang dùng)**

```html
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Không tìm thấy · Lời Chúa</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <main class="wrap message-page">
    <h1>Không tìm thấy trang này</h1>
    <p>Có thể địa chỉ đã thay đổi hoặc bài viết đã bị xóa.</p>
    <p><a class="button" href="/">Về trang chủ</a></p>
  </main>
</body>
</html>
```

- [ ] **Step 8: Chạy test — phải XANH (hoặc SKIP nếu chưa có MySQL)**

Run: `npm test`
Expected: PASS toàn bộ, hoặc các test cần database hiện `skipped`.

- [ ] **Step 9: Commit**

```bash
git add routes/admin.js views app.js test/admin-posts.test.js
git commit -m "feat: them sua xoa bai viet trong trang quan tri"
```

---

### Task 6: Trang công khai

**Files:**
- Create: `routes/public.js`, `views/partials/header.ejs`, `views/partials/footer.ejs`, `views/public/home.ejs`, `views/public/post.ejs`, `views/public/500.ejs`
- Modify: `app.js` (gắn router công khai, middleware nạp chủ đề, xử lý 404 và 500)
- Test: `test/public.test.js`

**Interfaces:**
- Consumes: `models/posts.js`, `models/categories.js`, `lib/text.js`, `isLoggedIn` từ `lib/auth.js`
- Produces: `routes/public.js` → `express.Router` gắn tại `/`, có `GET /`, `GET /bai-viet/:slug`, `GET /chu-de/:slug`

- [ ] **Step 1: Viết test `test/public.test.js`**

```js
'use strict';
require('./helpers/env');

const { test } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { isMysqlUp, resetDatabase, SKIP_MESSAGE } = require('./helpers/db');

process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('matkhau-test', 8);
const { createApp } = require('../app');
const posts = require('../models/posts');
const categories = require('../models/categories');

async function chuanBi(t) {
  if (!(await isMysqlUp())) { t.skip(SKIP_MESSAGE); return false; }
  await resetDatabase();
  return true;
}

test('trang chủ hiện bài đã đăng, ẩn bài nháp', async (t) => {
  if (!(await chuanBi(t))) return;
  await posts.create({ title: 'Bài đã đăng', body: 'x', status: 'published' });
  await posts.create({ title: 'Bài còn nháp', body: 'x', status: 'draft' });

  const res = await request(createApp()).get('/');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Bài đã đăng/);
  assert.ok(!res.text.includes('Bài còn nháp'));
});

test('đọc được bài đã đăng, nội dung tách thành đoạn', async (t) => {
  if (!(await chuanBi(t))) return;
  await posts.create({
    title: 'Lời Chúa cho ngày mới',
    body: 'Đoạn một.\n\nĐoạn hai.',
    verse_ref: 'Ê-sai 1:18',
    verse_text: 'Dầu tội các ngươi như hồng điều',
    status: 'published',
  });

  const res = await request(createApp()).get('/bai-viet/loi-chua-cho-ngay-moi');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /<p>Đoạn một\.<\/p>/);
  assert.match(res.text, /<p>Đoạn hai\.<\/p>/);
  assert.match(res.text, /Ê-sai 1:18/);
});

test('bài nháp trả 404 với khách, nhưng xem được khi đã đăng nhập', async (t) => {
  if (!(await chuanBi(t))) return;
  await posts.create({ title: 'Bài còn nháp', body: 'x', status: 'draft' });

  const khach = await request(createApp()).get('/bai-viet/bai-con-nhap');
  assert.strictEqual(khach.status, 404);

  const agent = request.agent(createApp());
  await agent.post('/admin/dang-nhap').type('form').send({ password: 'matkhau-test' });
  const admin = await agent.get('/bai-viet/bai-con-nhap');
  assert.strictEqual(admin.status, 200);
});

test('địa chỉ bài không tồn tại trả 404', async (t) => {
  if (!(await chuanBi(t))) return;
  const res = await request(createApp()).get('/bai-viet/khong-co-that');
  assert.strictEqual(res.status, 404);
  assert.match(res.text, /Không tìm thấy/);
});

test('trang chủ đề chỉ hiện bài thuộc chủ đề đó', async (t) => {
  if (!(await chuanBi(t))) return;
  const cid = await categories.create('Suy niệm');
  await posts.create({ title: 'Bài suy niệm', body: 'x', status: 'published', category_id: cid });
  await posts.create({ title: 'Bài khác', body: 'x', status: 'published' });

  const res = await request(createApp()).get('/chu-de/suy-niem');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Bài suy niệm/);
  assert.ok(!res.text.includes('Bài khác'));
});

test('chủ đề không tồn tại trả 404', async (t) => {
  if (!(await chuanBi(t))) return;
  const res = await request(createApp()).get('/chu-de/khong-co-that');
  assert.strictEqual(res.status, 404);
});

test('nội dung chứa thẻ HTML thì hiện ra thành chữ, không chạy', async (t) => {
  if (!(await chuanBi(t))) return;
  await posts.create({
    title: 'Thử XSS', body: '<script>alert(1)</script>', status: 'published',
  });

  const res = await request(createApp()).get('/bai-viet/thu-xss');
  assert.strictEqual(res.status, 200);
  assert.ok(!res.text.includes('<script>alert(1)</script>'));
  assert.match(res.text, /&lt;script&gt;/);
});

test('phân trang: trang 2 hiện bài thứ 11', async (t) => {
  if (!(await chuanBi(t))) return;
  for (let i = 1; i <= 11; i += 1) {
    await posts.create({ title: `Bài số ${i}`, body: 'x', status: 'published' });
  }
  const res = await request(createApp()).get('/?trang=2');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Bài số 1</);
});

test('địa chỉ lạ trả 404', async (t) => {
  if (!(await chuanBi(t))) return;
  const res = await request(createApp()).get('/khong-ton-tai-dau');
  assert.strictEqual(res.status, 404);
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó ĐỎ**

Run: `node --test test/public.test.js`
Expected: FAIL — `GET /` trả 404.

- [ ] **Step 3: Viết `views/partials/header.ejs`**

```html
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><%= title %> · Lời Chúa</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/">✝ Lời Chúa</a>
    <nav class="site-nav">
      <a href="/">Trang chủ</a>
      <% navCategories.forEach(function (c) { %>
        <a href="/chu-de/<%= c.slug %>"><%= c.name %></a>
      <% }); %>
    </nav>
  </div>
</header>
<main>
```

- [ ] **Step 4: Viết `views/partials/footer.ejs`**

```html
</main>
<footer class="site-footer">
  <div class="wrap">
    <p>Lời Chúa · Khích lệ bạn tìm kiếm sự thân mật với Đức Chúa Trời mỗi ngày.</p>
  </div>
</footer>
</body>
</html>
```

- [ ] **Step 5: Viết `views/public/home.ejs`**

```html
<%- include('../partials/header') %>
<div class="wrap">
  <% if (heading) { %><h1 class="list-heading"><%= heading %></h1><% } %>

  <% if (items.length === 0) { %>
    <p class="empty">Chưa có bài viết nào.</p>
  <% } %>

  <ul class="post-list">
  <% items.forEach(function (p) { %>
    <li class="post-card">
      <% if (p.cover_image) { %>
        <a class="thumb" href="/bai-viet/<%= p.slug %>">
          <img src="/uploads/<%= p.cover_image %>" alt="">
        </a>
      <% } %>
      <div class="card-body">
        <h2><a href="/bai-viet/<%= p.slug %>"><%= p.title %></a></h2>
        <p class="meta">
          <% if (p.category_name) { %>
            <a href="/chu-de/<%= p.category_slug %>"><%= p.category_name %></a> ·
          <% } %>
          <%= new Date(p.created_at).toLocaleDateString('vi-VN') %>
        </p>
        <p class="excerpt"><%= p.excerpt %></p>
      </div>
    </li>
  <% }); %>
  </ul>

  <% if (totalPages > 1) { %>
  <nav class="pagination">
    <% if (page > 1) { %>
      <a href="<%= baseUrl %>?trang=<%= page - 1 %>">‹ Trước</a>
    <% } %>
    <% for (let i = 1; i <= totalPages; i += 1) { %>
      <% if (i === page) { %>
        <span class="current"><%= i %></span>
      <% } else { %>
        <a href="<%= baseUrl %>?trang=<%= i %>"><%= i %></a>
      <% } %>
    <% } %>
    <% if (page < totalPages) { %>
      <a href="<%= baseUrl %>?trang=<%= page + 1 %>">Sau ›</a>
    <% } %>
  </nav>
  <% } %>
</div>
<%- include('../partials/footer') %>
```

- [ ] **Step 6: Viết `views/public/post.ejs`**

```html
<%- include('../partials/header') %>
<article class="reader">
  <% if (post.status === 'draft') { %>
    <p class="draft-banner">Bài này đang là bản nháp — chỉ bạn nhìn thấy.</p>
  <% } %>

  <% if (post.cover_image) { %>
    <img class="cover" src="/uploads/<%= post.cover_image %>" alt="">
  <% } %>

  <header class="reader-head">
    <h1><%= post.title %></h1>
    <p class="meta">
      <% if (post.category_name) { %>
        <a href="/chu-de/<%= post.category_slug %>"><%= post.category_name %></a> ·
      <% } %>
      <%= new Date(post.created_at).toLocaleDateString('vi-VN') %>
    </p>
    <div class="font-controls">
      <button type="button" id="font-smaller" aria-label="Giảm cỡ chữ">A−</button>
      <button type="button" id="font-larger" aria-label="Tăng cỡ chữ">A+</button>
    </div>
  </header>

  <% if (post.verse_text || post.verse_ref) { %>
    <blockquote class="verse">
      <% if (post.verse_text) { %><p><%= post.verse_text %></p><% } %>
      <% if (post.verse_ref) { %><cite>— <%= post.verse_ref %></cite><% } %>
    </blockquote>
  <% } %>

  <div class="prose" id="prose">
    <% paragraphs.forEach(function (p) { %><p><%= p %></p><% }); %>
  </div>

  <nav class="post-nav">
    <% if (prev) { %>
      <a class="prev" href="/bai-viet/<%= prev.slug %>">‹ <%= prev.title %></a>
    <% } else { %><span></span><% } %>
    <% if (next) { %>
      <a class="next" href="/bai-viet/<%= next.slug %>"><%= next.title %> ›</a>
    <% } %>
  </nav>
</article>
<script src="/js/fontsize.js"></script>
<%- include('../partials/footer') %>
```

- [ ] **Step 7: Viết `views/public/500.ejs`**

```html
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Có lỗi xảy ra · Lời Chúa</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <main class="wrap message-page">
    <h1>Xin lỗi, có lỗi xảy ra</h1>
    <p>Trang này tạm thời chưa hiển thị được. Vui lòng thử lại sau ít phút.</p>
    <p><a class="button" href="/">Về trang chủ</a></p>
  </main>
</body>
</html>
```

- [ ] **Step 8: Viết `public/js/fontsize.js`**

```js
(function () {
  'use strict';
  var KEY = 'loichua-font-size';
  var MIN = 16, MAX = 26, BUOC = 2;
  var prose = document.getElementById('prose');
  if (!prose) return;

  function apDung(size) {
    prose.style.fontSize = size + 'px';
    try { localStorage.setItem(KEY, String(size)); } catch (e) { /* bỏ qua */ }
  }

  var hienTai = 19;
  try {
    var luu = parseInt(localStorage.getItem(KEY), 10);
    if (luu >= MIN && luu <= MAX) hienTai = luu;
  } catch (e) { /* bỏ qua */ }
  apDung(hienTai);

  document.getElementById('font-smaller').addEventListener('click', function () {
    hienTai = Math.max(MIN, hienTai - BUOC);
    apDung(hienTai);
  });
  document.getElementById('font-larger').addEventListener('click', function () {
    hienTai = Math.min(MAX, hienTai + BUOC);
    apDung(hienTai);
  });
})();
```

- [ ] **Step 9: Viết `routes/public.js`**

```js
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

async function renderDanhSach(req, res, { categoryId, heading, baseUrl }) {
  const page = docTrang(req);
  const { rows, total } = await posts.listPublished({ page, perPage: PER_PAGE, categoryId });
  res.render('public/home', {
    title: heading || 'Trang chủ',
    heading,
    items: rows.map((p) => ({ ...p, excerpt: excerpt(p.body) })),
    page,
    totalPages: Math.max(1, Math.ceil(total / PER_PAGE)),
    baseUrl,
  });
}

router.get('/', async (req, res, next) => {
  try {
    await renderDanhSach(req, res, { categoryId: null, heading: null, baseUrl: '/' });
  } catch (err) { next(err); }
});

router.get('/chu-de/:slug', async (req, res, next) => {
  try {
    const cat = await categories.getBySlug(req.params.slug);
    if (!cat) return res.status(404).render('public/404', { title: 'Không tìm thấy' });
    await renderDanhSach(req, res, {
      categoryId: cat.id, heading: cat.name, baseUrl: `/chu-de/${cat.slug}`,
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
```

- [ ] **Step 10: Viết lại `app.js` đầy đủ**

```js
'use strict';
require('dotenv').config();

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

  app.use((req, res, next) => {
    res.locals.csrfToken = '';
    next();
  });

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
```

- [ ] **Step 11: Thêm `navCategories` vào các view quản trị**

Trong `views/partials/admin-header.ejs` không dùng `navCategories`, nên không cần sửa. Nhưng `views/public/404.ejs` và `500.ejs` là HTML độc lập, cũng không dùng — không cần sửa.

Kiểm tra: chạy `npm test`. Nếu có lỗi `navCategories is not defined`, tìm view đang `include('../partials/header')` mà route không truyền — middleware ở Step 10 đã đặt vào `res.locals` nên mọi view đều có.

- [ ] **Step 12: Chạy test — phải XANH (hoặc SKIP nếu chưa có MySQL)**

Run: `npm test`
Expected: PASS toàn bộ.

- [ ] **Step 13: Commit**

```bash
git add routes/public.js views public/js app.js test/public.test.js
git commit -m "feat: trang chu, trang doc bai, trang chu de"
```

---

### Task 7: Quản lý chủ đề

**Files:**
- Create: `views/admin/categories.ejs`
- Modify: `routes/admin.js` (thêm route chủ đề)
- Test: `test/admin-categories.test.js`

**Interfaces:**
- Consumes: `models/categories.js`
- Produces: `GET /admin/chu-de`, `POST /admin/chu-de`, `POST /admin/chu-de/:id`, `POST /admin/chu-de/:id/xoa`

- [ ] **Step 1: Viết test `test/admin-categories.test.js`**

```js
'use strict';
require('./helpers/env');

const { test } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { isMysqlUp, resetDatabase, SKIP_MESSAGE } = require('./helpers/db');

process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('matkhau-test', 8);
const { createApp } = require('../app');
const categories = require('../models/categories');
const posts = require('../models/posts');

async function dangNhap(t) {
  if (!(await isMysqlUp())) { t.skip(SKIP_MESSAGE); return null; }
  await resetDatabase();
  const agent = request.agent(createApp());
  await agent.post('/admin/dang-nhap').type('form').send({ password: 'matkhau-test' });
  return agent;
}

test('thêm chủ đề mới', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const res = await agent.post('/admin/chu-de').type('form').send({ name: 'Suy niệm' });
  assert.strictEqual(res.status, 302);
  const ds = await categories.all();
  assert.strictEqual(ds.length, 1);
  assert.strictEqual(ds[0].slug, 'suy-niem');
});

test('tên chủ đề rỗng thì báo lỗi', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const res = await agent.post('/admin/chu-de').type('form').send({ name: '   ' });
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Vui lòng nhập tên chủ đề/);
  assert.strictEqual((await categories.all()).length, 0);
});

test('đổi tên chủ đề', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const id = await categories.create('Suy niệm');
  const res = await agent.post(`/admin/chu-de/${id}`).type('form').send({ name: 'Suy gẫm' });
  assert.strictEqual(res.status, 302);
  assert.strictEqual((await categories.getById(id)).name, 'Suy gẫm');
});

test('xóa chủ đề rỗng', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const id = await categories.create('Trống');
  const res = await agent.post(`/admin/chu-de/${id}/xoa`).type('form').send({});
  assert.strictEqual(res.status, 302);
  assert.strictEqual(await categories.getById(id), null);
});

test('không xóa được chủ đề đang có bài, có báo lỗi rõ ràng', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const id = await categories.create('Suy niệm');
  await posts.create({ title: 'Bài', body: 'x', status: 'published', category_id: id });

  const res = await agent.post(`/admin/chu-de/${id}/xoa`).type('form').send({});
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /còn 1 bài viết, không thể xóa/);
  assert.ok(await categories.getById(id));
});

test('chưa đăng nhập thì không vào được trang chủ đề', async (t) => {
  if (!(await isMysqlUp())) { t.skip(SKIP_MESSAGE); return; }
  await resetDatabase();
  const res = await request(createApp()).get('/admin/chu-de');
  assert.strictEqual(res.status, 302);
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó ĐỎ**

Run: `node --test test/admin-categories.test.js`
Expected: FAIL — `/admin/chu-de` trả 404.

- [ ] **Step 3: Viết `views/admin/categories.ejs`**

```html
<%- include('../partials/admin-header') %>
<h1>Chủ đề</h1>

<% if (error) { %><p class="error"><%= error %></p><% } %>
<% if (flash) { %><p class="flash"><%= flash %></p><% } %>

<form method="post" action="/admin/chu-de" class="inline-form">
  <input type="hidden" name="_csrf" value="<%= csrfToken %>">
  <input type="text" name="name" placeholder="Tên chủ đề mới" value="<%= newName || '' %>">
  <button type="submit">Thêm</button>
</form>

<% if (items.length === 0) { %>
  <p class="empty">Chưa có chủ đề nào.</p>
<% } else { %>
<table class="admin-table">
  <thead><tr><th>Tên</th><th>Địa chỉ</th><th>Số bài</th><th></th></tr></thead>
  <tbody>
  <% items.forEach(function (c) { %>
    <tr>
      <td>
        <form method="post" action="/admin/chu-de/<%= c.id %>" class="inline-form">
          <input type="hidden" name="_csrf" value="<%= csrfToken %>">
          <input type="text" name="name" value="<%= c.name %>">
          <button type="submit" class="link-button">Lưu</button>
        </form>
      </td>
      <td><code>/chu-de/<%= c.slug %></code></td>
      <td><%= c.postCount %></td>
      <td class="actions">
        <form method="post" action="/admin/chu-de/<%= c.id %>/xoa" class="inline"
              onsubmit="return confirm('Xóa chủ đề “<%= c.name %>”?');">
          <input type="hidden" name="_csrf" value="<%= csrfToken %>">
          <button type="submit" class="link-button danger">Xóa</button>
        </form>
      </td>
    </tr>
  <% }); %>
  </tbody>
</table>
<% } %>
<%- include('../partials/admin-footer') %>
```

- [ ] **Step 4: Thêm route chủ đề vào `routes/admin.js`**

Chèn ngay trước dòng `module.exports = router;`:

```js
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

router.post('/chu-de', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) {
      return res.status(200).then
        ? renderChuDe(res, { error: 'Vui lòng nhập tên chủ đề.' })
        : renderChuDe(res, { error: 'Vui lòng nhập tên chủ đề.' });
    }
    await categories.create(name);
    res.redirect('/admin/chu-de?tb=' + encodeURIComponent('Đã thêm chủ đề.'));
  } catch (err) { next(err); }
});

router.post('/chu-de/:id', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return renderChuDe(res, { error: 'Vui lòng nhập tên chủ đề.' });
    await categories.rename(req.params.id, name);
    res.redirect('/admin/chu-de?tb=' + encodeURIComponent('Đã đổi tên chủ đề.'));
  } catch (err) { next(err); }
});

router.post('/chu-de/:id/xoa', async (req, res, next) => {
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
```

**Chú ý:** đoạn `res.status(200).then ? ... : ...` ở trên là thừa — viết lại cho gọn thành:

```js
router.post('/chu-de', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return await renderChuDe(res, { error: 'Vui lòng nhập tên chủ đề.' });
    await categories.create(name);
    res.redirect('/admin/chu-de?tb=' + encodeURIComponent('Đã thêm chủ đề.'));
  } catch (err) { next(err); }
});
```

- [ ] **Step 5: Chạy test — phải XANH (hoặc SKIP)**

Run: `npm test`
Expected: PASS toàn bộ.

- [ ] **Step 6: Commit**

```bash
git add routes/admin.js views/admin/categories.ejs test/admin-categories.test.js
git commit -m "feat: quan ly chu de"
```

---

### Task 8: Tải ảnh bìa

**Files:**
- Create: `lib/upload.js`
- Modify: `routes/admin.js` (gắn middleware upload vào route tạo/sửa/xóa bài)
- Test: `test/upload.test.js`

**Interfaces:**
- Consumes: `multer`
- Produces: `lib/upload.js` → `{ UPLOAD_DIR: string, handleCover(req, res, next): void, removeFile(filename: string): void }`
  - `handleCover` không bao giờ ném lỗi; khi file sai nó đặt `req.uploadError` là chuỗi tiếng Việt và gọi `next()`.

- [ ] **Step 1: Viết test `test/upload.test.js`**

```js
'use strict';
require('./helpers/env');

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { isMysqlUp, resetDatabase, SKIP_MESSAGE } = require('./helpers/db');

process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('matkhau-test', 8);
const { createApp } = require('../app');
const posts = require('../models/posts');
const { UPLOAD_DIR } = require('../lib/upload');

// PNG 1x1 hợp lệ nhỏ nhất
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

async function dangNhap(t) {
  if (!(await isMysqlUp())) { t.skip(SKIP_MESSAGE); return null; }
  await resetDatabase();
  const agent = request.agent(createApp());
  await agent.post('/admin/dang-nhap').type('form').send({ password: 'matkhau-test' });
  return agent;
}

test('tải ảnh PNG lên thành công và lưu tên file vào database', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const res = await agent.post('/admin/bai-viet')
    .field('title', 'Bài có ảnh')
    .field('body', 'Nội dung.')
    .field('status', 'published')
    .attach('cover_image', PNG_1X1, { filename: 'anh.png', contentType: 'image/png' });

  assert.strictEqual(res.status, 302);
  const p = await posts.getBySlug('bai-co-anh');
  assert.ok(p.cover_image, 'phải có tên file ảnh');
  assert.match(p.cover_image, /^[0-9a-f]{32}\.png$/);
  assert.ok(fs.existsSync(path.join(UPLOAD_DIR, p.cover_image)), 'file phải nằm trong uploads/');
});

test('file sai định dạng bị từ chối và GIỮ NGUYÊN dữ liệu đã nhập', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const res = await agent.post('/admin/bai-viet')
    .field('title', 'Tiêu đề đã gõ')
    .field('body', 'Nội dung đã gõ.')
    .field('status', 'published')
    .attach('cover_image', Buffer.from('không phải ảnh'), {
      filename: 'ghi-chu.txt', contentType: 'text/plain',
    });

  assert.strictEqual(res.status, 200);
  assert.match(res.text, /JPG\/PNG\/WEBP/);
  assert.match(res.text, /Tiêu đề đã gõ/);
  assert.match(res.text, /Nội dung đã gõ\./);
  assert.strictEqual(await posts.getBySlug('tieu-de-da-go', { includeDrafts: true }), null);
});

test('ảnh quá 5MB bị từ chối', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const qua_lon = Buffer.alloc(6 * 1024 * 1024, 0);
  const res = await agent.post('/admin/bai-viet')
    .field('title', 'Ảnh nặng')
    .field('body', 'Nội dung.')
    .field('status', 'published')
    .attach('cover_image', qua_lon, { filename: 'to.png', contentType: 'image/png' });

  assert.strictEqual(res.status, 200);
  assert.match(res.text, /dưới 5MB/);
  assert.strictEqual(await posts.getBySlug('anh-nang', { includeDrafts: true }), null);
});

test('xóa bài thì xóa luôn file ảnh', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  await agent.post('/admin/bai-viet')
    .field('title', 'Bài sẽ xóa')
    .field('body', 'Nội dung.')
    .field('status', 'published')
    .attach('cover_image', PNG_1X1, { filename: 'anh.png', contentType: 'image/png' });

  const p = await posts.getBySlug('bai-se-xoa');
  const duongDan = path.join(UPLOAD_DIR, p.cover_image);
  assert.ok(fs.existsSync(duongDan));

  await agent.post(`/admin/bai-viet/${p.id}/xoa`).type('form').send({});
  assert.ok(!fs.existsSync(duongDan), 'file ảnh phải bị xóa theo');
});

test('tick “Xóa ảnh bìa” thì gỡ ảnh khỏi bài', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  await agent.post('/admin/bai-viet')
    .field('title', 'Bài có ảnh')
    .field('body', 'Nội dung.')
    .field('status', 'published')
    .attach('cover_image', PNG_1X1, { filename: 'anh.png', contentType: 'image/png' });

  const p = await posts.getBySlug('bai-co-anh');
  await agent.post(`/admin/bai-viet/${p.id}`).type('form').send({
    title: 'Bài có ảnh', body: 'Nội dung.', status: 'published', remove_cover: '1',
  });

  assert.strictEqual((await posts.getById(p.id)).cover_image, null);
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó ĐỎ**

Run: `node --test test/upload.test.js`
Expected: FAIL — `Cannot find module '../lib/upload'`

- [ ] **Step 3: Viết `lib/upload.js`**

```js
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

function handleCover(req, res, next) {
  single(req, res, (err) => {
    if (err) {
      req.uploadError = THONG_BAO_LOI;
      if (req.file && req.file.filename) removeFile(req.file.filename);
    }
    next();
  });
}

function removeFile(filename) {
  if (!filename) return;
  const base = path.basename(String(filename));
  try {
    fs.unlinkSync(path.join(UPLOAD_DIR, base));
  } catch {
    // file không còn thì thôi
  }
}

module.exports = { UPLOAD_DIR, MAX_BYTES, handleCover, removeFile };
```

- [ ] **Step 4: Gắn upload vào `routes/admin.js`**

Thêm ở đầu file:

```js
const { handleCover, removeFile } = require('../lib/upload');
```

Thay route `POST /bai-viet` bằng:

```js
router.post('/bai-viet', handleCover, async (req, res, next) => {
  try {
    const data = docForm(req);
    const loi = req.uploadError || kiemTra(data);
    if (loi) {
      if (req.file) removeFile(req.file.filename);
      return res.status(200).render('admin/form', {
        title: 'Viết bài mới', post: data, categories: await categories.all(), error: loi,
      });
    }
    data.cover_image = req.file ? req.file.filename : null;
    await posts.create(data);
    res.redirect('/admin?tb=' + encodeURIComponent('Đã lưu bài viết.'));
  } catch (err) { next(err); }
});
```

Thay route `POST /bai-viet/:id` bằng:

```js
router.post('/bai-viet/:id', handleCover, async (req, res, next) => {
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
```

Thay route `POST /bai-viet/:id/xoa` bằng:

```js
router.post('/bai-viet/:id/xoa', async (req, res, next) => {
  try {
    const daXoa = await posts.remove(req.params.id);
    if (daXoa && daXoa.cover_image) removeFile(daXoa.cover_image);
    res.redirect('/admin?tb=' + encodeURIComponent('Đã xóa bài viết.'));
  } catch (err) { next(err); }
});
```

- [ ] **Step 5: Chạy test — phải XANH (hoặc SKIP)**

Run: `npm test`
Expected: PASS toàn bộ.

- [ ] **Step 6: Dọn file rác trong `uploads/` sinh ra khi test**

```bash
git status --short
```
`uploads/` đã nằm trong `.gitignore` nên không lọt vào commit. Xóa thủ công các file test nếu muốn.

- [ ] **Step 7: Commit**

```bash
git add lib/upload.js routes/admin.js test/upload.test.js
git commit -m "feat: tai anh bia cho bai viet"
```

---

### Task 9: Chống giả mạo biểu mẫu (CSRF)

**Files:**
- Create: `lib/csrf.js`
- Modify: `app.js` (đặt `csrfToken` thật vào `res.locals`), `routes/admin.js` (kiểm tra token trên mọi POST sau đăng nhập)
- Test: `test/csrf.test.js`

**Interfaces:**
- Consumes: `req.session` từ `cookie-session`
- Produces: `lib/csrf.js` → `{ attachToken(req, res, next): void, verifyToken(req, res, next): void }`

- [ ] **Step 1: Viết test `test/csrf.test.js`**

```js
'use strict';
require('./helpers/env');

const { test } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { isMysqlUp, resetDatabase, SKIP_MESSAGE } = require('./helpers/db');

process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('matkhau-test', 8);
const { createApp } = require('../app');
const posts = require('../models/posts');

function layToken(html) {
  const m = html.match(/name="_csrf" value="([^"]+)"/);
  return m ? m[1] : null;
}

async function dangNhap(t) {
  if (!(await isMysqlUp())) { t.skip(SKIP_MESSAGE); return null; }
  await resetDatabase();
  const agent = request.agent(createApp());
  await agent.post('/admin/dang-nhap').type('form').send({ password: 'matkhau-test' });
  return agent;
}

test('form quản trị có gắn token', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const res = await agent.get('/admin/bai-viet/moi');
  const token = layToken(res.text);
  assert.ok(token && token.length >= 32, 'form phải có token đủ dài');
});

test('POST thiếu token bị từ chối', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const res = await agent.post('/admin/bai-viet').type('form').send({
    title: 'Bài gian lận', body: 'x', status: 'published',
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(await posts.getBySlug('bai-gian-lan', { includeDrafts: true }), null);
});

test('POST sai token bị từ chối', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const res = await agent.post('/admin/bai-viet').type('form').send({
    _csrf: 'token-bia-dat', title: 'Bài gian lận', body: 'x', status: 'published',
  });
  assert.strictEqual(res.status, 403);
});

test('POST đúng token thì chạy bình thường', async (t) => {
  const agent = await dangNhap(t);
  if (!agent) return;

  const form = await agent.get('/admin/bai-viet/moi');
  const token = layToken(form.text);

  const res = await agent.post('/admin/bai-viet').type('form').send({
    _csrf: token, title: 'Bài hợp lệ', body: 'x', status: 'published',
  });
  assert.strictEqual(res.status, 302);
  assert.ok(await posts.getBySlug('bai-hop-le'));
});

test('trang đăng nhập không cần token', async (t) => {
  if (!(await isMysqlUp())) { t.skip(SKIP_MESSAGE); return; }
  await resetDatabase();

  const agent = request.agent(createApp());
  const res = await agent.post('/admin/dang-nhap').type('form').send({ password: 'matkhau-test' });
  assert.strictEqual(res.status, 302);
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó ĐỎ**

Run: `node --test test/csrf.test.js`
Expected: FAIL — token rỗng, POST thiếu token vẫn trả 302 thay vì 403.

- [ ] **Step 3: Cập nhật các test cũ đang POST không kèm token**

Trong `test/admin-posts.test.js`, `test/admin-categories.test.js`, `test/upload.test.js`: thêm hàm lấy token và gửi kèm. Thêm vào đầu mỗi file (sau các `require`):

```js
function layToken(html) {
  const m = html.match(/name="_csrf" value="([^"]+)"/);
  return m ? m[1] : null;
}

async function tokenMoi(agent, duongDan) {
  const res = await agent.get(duongDan);
  return layToken(res.text);
}
```

Rồi ở mỗi lệnh POST sau khi đã đăng nhập, thêm trường `_csrf`. Ví dụ trong `test/admin-posts.test.js`:

```js
const csrf = await tokenMoi(agent, '/admin/bai-viet/moi');
const res = await agent.post('/admin/bai-viet').type('form').send({
  _csrf: csrf,
  title: 'Lời Chúa cho ngày mới',
  body: 'Đoạn một.\n\nĐoạn hai.',
  verse_ref: 'Ê-sai 1:18',
  verse_text: 'Dầu tội các ngươi như hồng điều...',
  status: 'published',
});
```

Với `.attach()` trong `test/upload.test.js`, token đi kèm bằng `.field('_csrf', csrf)` — **đặt trước** `.attach()`:

```js
const csrf = await tokenMoi(agent, '/admin/bai-viet/moi');
const res = await agent.post('/admin/bai-viet')
  .field('_csrf', csrf)
  .field('title', 'Bài có ảnh')
  .field('body', 'Nội dung.')
  .field('status', 'published')
  .attach('cover_image', PNG_1X1, { filename: 'anh.png', contentType: 'image/png' });
```

Với các POST xóa (`/xoa`), lấy token từ `/admin` hoặc `/admin/chu-de` tương ứng.

Riêng test "chưa đăng nhập thì không tạo được bài" giữ nguyên không token — nó phải bị chặn ở tầng đăng nhập (302) **trước** tầng CSRF; đảm bảo `router.use(requireLogin)` đứng trước `router.use(verifyToken)`.

- [ ] **Step 4: Viết `lib/csrf.js`**

```js
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
    return res.status(403).render('public/500', { title: 'Yêu cầu không hợp lệ' });
  }
  next();
}

module.exports = { attachToken, verifyToken };
```

- [ ] **Step 5: Cập nhật `app.js`**

Thay khối:

```js
  app.use((req, res, next) => {
    res.locals.csrfToken = '';
    next();
  });
```

bằng:

```js
  app.use(require('./lib/csrf').attachToken);
```

- [ ] **Step 6: Cập nhật `routes/admin.js`**

Thêm ở đầu file:

```js
const { verifyToken } = require('../lib/csrf');
```

Ngay **sau** dòng `router.use(requireLogin);`, thêm:

```js
router.use(verifyToken);
```

Route `POST /dang-nhap` nằm phía trên `router.use(requireLogin)` nên không bị kiểm tra token — đúng ý: lúc đó người dùng chưa có phiên.

Route `POST /dang-xuat` cũng nằm phía trên, nên bỏ luôn ô `_csrf` trong `views/partials/admin-header.ejs` hay giữ đều được; giữ lại cho nhất quán.

- [ ] **Step 7: Chạy test — phải XANH (hoặc SKIP)**

Run: `npm test`
Expected: PASS toàn bộ, kể cả các test cũ đã cập nhật token.

- [ ] **Step 8: Commit**

```bash
git add lib/csrf.js app.js routes/admin.js views test
git commit -m "feat: chong gia mao bieu mau bang token CSRF"
```

---

### Task 10: Giao diện

**Files:**
- Create: `public/css/style.css`
- Test: kiểm tra bằng mắt trên trình duyệt (không có test tự động cho CSS)

**Interfaces:**
- Consumes: các class trong view đã viết ở Task 3, 5, 6, 7
- Produces: (không có API)

- [ ] **Step 1: Viết `public/css/style.css`**

```css
/* ===== Nền tảng ===== */
:root {
  --nen: #fdfcfa;
  --nen-phu: #f5f3ef;
  --chu: #23201c;
  --chu-nhat: #6b665e;
  --vien: #e3ded6;
  --nhan: #b23b3b;
  --rong-doc: 640px;
  --rong-trang: 1080px;
}

* { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  background: var(--nen);
  color: var(--chu);
  font-family: "Segoe UI", system-ui, -apple-system, "Noto Sans", Arial, sans-serif;
  font-size: 16px;
  line-height: 1.65;
}

a { color: inherit; }
a:hover { color: var(--nhan); }

.wrap {
  max-width: var(--rong-trang);
  margin: 0 auto;
  padding: 0 20px;
}

/* ===== Thanh trên ===== */
.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(253, 252, 250, 0.94);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid var(--vien);
}
.header-inner {
  display: flex;
  align-items: center;
  gap: 24px;
  height: 58px;
}
.brand {
  font-weight: 700;
  font-size: 18px;
  text-decoration: none;
  white-space: nowrap;
}
.site-nav {
  display: flex;
  gap: 18px;
  overflow-x: auto;
  font-size: 14px;
}
.site-nav a { text-decoration: none; color: var(--chu-nhat); white-space: nowrap; }
.site-nav a:hover { color: var(--nhan); }

/* ===== Danh sách bài ===== */
.list-heading { font-size: 26px; margin: 32px 0 8px; }

.post-list { list-style: none; padding: 0; margin: 32px 0; }

.post-card {
  display: flex;
  gap: 20px;
  padding: 24px 0;
  border-bottom: 1px solid var(--vien);
}
.post-card .thumb { flex: 0 0 160px; }
.post-card .thumb img {
  width: 160px;
  height: 110px;
  object-fit: cover;
  border-radius: 6px;
  display: block;
}
.post-card h2 { margin: 0 0 6px; font-size: 21px; line-height: 1.35; }
.post-card h2 a { text-decoration: none; }
.meta { margin: 0 0 8px; font-size: 13px; color: var(--chu-nhat); }
.meta a { color: var(--nhan); text-decoration: none; }
.excerpt { margin: 0; color: var(--chu-nhat); }

.empty { color: var(--chu-nhat); padding: 40px 0; }

/* ===== Phân trang ===== */
.pagination {
  display: flex;
  gap: 10px;
  justify-content: center;
  align-items: center;
  padding: 32px 0 56px;
  font-size: 14px;
}
.pagination a, .pagination .current {
  padding: 6px 12px;
  border: 1px solid var(--vien);
  border-radius: 4px;
  text-decoration: none;
}
.pagination .current { background: var(--chu); color: var(--nen); border-color: var(--chu); }

/* ===== Trang đọc bài ===== */
.reader {
  max-width: var(--rong-doc);
  margin: 0 auto;
  padding: 40px 20px 64px;
}
.reader .cover {
  width: 100%;
  border-radius: 8px;
  margin-bottom: 32px;
  display: block;
}
.reader-head { text-align: center; margin-bottom: 32px; }
.reader-head h1 {
  font-size: 30px;
  line-height: 1.3;
  margin: 0 0 10px;
  letter-spacing: -0.01em;
}

.font-controls { display: flex; gap: 6px; justify-content: center; margin-top: 14px; }
.font-controls button {
  border: 1px solid var(--vien);
  background: transparent;
  color: var(--chu-nhat);
  border-radius: 4px;
  padding: 3px 10px;
  cursor: pointer;
  font-size: 13px;
}
.font-controls button:hover { border-color: var(--chu); color: var(--chu); }

.verse {
  margin: 0 0 32px;
  padding: 4px 0 4px 20px;
  border-left: 3px solid var(--nhan);
  font-style: italic;
  color: #443f38;
}
.verse p { margin: 0 0 6px; }
.verse cite { font-style: normal; font-size: 14px; color: var(--chu-nhat); }

.prose { font-size: 19px; line-height: 1.85; }
.prose p { margin: 0 0 1.3em; white-space: pre-wrap; }

.draft-banner {
  background: #fff6e0;
  border: 1px solid #e8d49a;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 14px;
  margin-bottom: 24px;
}

.post-nav {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-top: 56px;
  padding-top: 24px;
  border-top: 1px solid var(--vien);
  font-size: 14px;
}
.post-nav a { text-decoration: none; color: var(--chu-nhat); max-width: 45%; }
.post-nav a:hover { color: var(--nhan); }

/* ===== Chân trang ===== */
.site-footer {
  background: var(--nen-phu);
  border-top: 1px solid var(--vien);
  margin-top: 40px;
  padding: 32px 0;
  font-size: 14px;
  color: var(--chu-nhat);
}

/* ===== Trang thông báo ===== */
.message-page { padding: 80px 20px; text-align: center; }

/* ===== Nút ===== */
.button {
  display: inline-block;
  background: var(--chu);
  color: var(--nen);
  padding: 9px 18px;
  border-radius: 5px;
  text-decoration: none;
  font-size: 14px;
}
.button:hover { background: var(--nhan); color: #fff; }

button, .admin input[type="submit"] {
  font: inherit;
  background: var(--chu);
  color: var(--nen);
  border: 0;
  border-radius: 5px;
  padding: 9px 18px;
  cursor: pointer;
}
button.secondary { background: transparent; color: var(--chu); border: 1px solid var(--vien); }
button:hover { background: var(--nhan); color: #fff; }

.link-button {
  background: none;
  border: 0;
  color: var(--chu-nhat);
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  font-size: inherit;
}
.link-button:hover { background: none; color: var(--nhan); }
.link-button.danger { color: #a32020; }

/* ===== Quản trị ===== */
.admin { background: #fff; }
.admin-header {
  background: #23201c;
  color: #f3f1ee;
  border: 0;
}
.admin-header .wrap { display: flex; align-items: center; gap: 24px; height: 56px; }
.admin-header a { color: #f3f1ee; text-decoration: none; font-size: 14px; }
.admin-header .brand { font-size: 17px; }
.admin-header nav { display: flex; align-items: center; gap: 18px; margin-left: auto; }
.admin-header .link-button { color: #f3f1ee; }

.admin-main { padding: 32px 20px 80px; }

.page-head { display: flex; align-items: center; justify-content: space-between; gap: 20px; }

.admin-table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 15px; }
.admin-table th, .admin-table td {
  text-align: left;
  padding: 12px 10px;
  border-bottom: 1px solid var(--vien);
  vertical-align: middle;
}
.admin-table th { font-size: 13px; color: var(--chu-nhat); font-weight: 600; }
.admin-table .actions { text-align: right; white-space: nowrap; }
.admin-table .actions a { margin-right: 12px; font-size: 14px; }

.badge { font-size: 13px; white-space: nowrap; }
.badge.published { color: #1f7a3d; }
.badge.draft { color: var(--chu-nhat); }

.inline { display: inline; }
.inline-form { display: inline-flex; gap: 8px; align-items: center; margin: 16px 0; }
.inline-form input[type="text"] { margin: 0; }

/* ===== Biểu mẫu ===== */
.post-form { max-width: 760px; margin-top: 24px; }
.post-form label,
.login-box label {
  display: block;
  margin: 18px 0 6px;
  font-size: 14px;
  font-weight: 600;
}
.post-form input[type="text"],
.post-form select,
.post-form textarea,
.login-box input {
  width: 100%;
  font: inherit;
  padding: 10px 12px;
  border: 1px solid var(--vien);
  border-radius: 5px;
  background: #fff;
}
.post-form textarea { resize: vertical; line-height: 1.7; }
.post-form fieldset {
  border: 1px solid var(--vien);
  border-radius: 6px;
  padding: 4px 18px 18px;
  margin: 24px 0;
}
.post-form legend { font-size: 14px; font-weight: 600; padding: 0 6px; }
.post-form .hint { margin: 0 0 6px; font-size: 13px; color: var(--chu-nhat); }
.post-form .checkbox { font-weight: 400; display: inline-flex; gap: 6px; align-items: center; }
.post-form input[type="checkbox"] { width: auto; }

.cover-preview { margin: 10px 0; }
.cover-preview img {
  max-width: 280px;
  border-radius: 6px;
  display: block;
  margin-bottom: 8px;
}

.form-actions { display: flex; gap: 12px; align-items: center; margin-top: 32px; }
.form-actions .link { font-size: 14px; color: var(--chu-nhat); }

.error {
  background: #fdecec;
  border: 1px solid #e9b5b5;
  color: #8c1f1f;
  padding: 10px 14px;
  border-radius: 6px;
}
.flash {
  background: #eaf6ec;
  border: 1px solid #b6dcc0;
  color: #1f5c31;
  padding: 10px 14px;
  border-radius: 6px;
}

/* ===== Trang đăng nhập ===== */
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--nen-phu);
}
.login-box {
  background: #fff;
  border: 1px solid var(--vien);
  border-radius: 10px;
  padding: 32px;
  width: 340px;
}
.login-box h1 { margin: 0 0 20px; font-size: 20px; }
.login-box button { width: 100%; margin-top: 20px; }
.login-box .hint { margin: 18px 0 0; font-size: 13px; text-align: center; }
.login-box .hint a { color: var(--chu-nhat); }

/* ===== Màn hình hẹp ===== */
@media (max-width: 640px) {
  .post-card { flex-direction: column; gap: 12px; }
  .post-card .thumb, .post-card .thumb img { width: 100%; flex: none; }
  .post-card .thumb img { height: 180px; }
  .reader-head h1 { font-size: 25px; }
  .prose { font-size: 18px; }
  .page-head { flex-direction: column; align-items: flex-start; }
  .admin-header .wrap { height: auto; padding-top: 10px; padding-bottom: 10px; flex-wrap: wrap; }
}
```

- [ ] **Step 2: Chạy test — phải XANH**

Run: `npm test`
Expected: PASS toàn bộ (CSS không ảnh hưởng test).

- [ ] **Step 3: Kiểm tra bằng mắt (cần MySQL đang chạy)**

```bash
npm run db:init
npm start
```
Mở `http://localhost:3000/admin`, đăng nhập, thêm 1 chủ đề, đăng 1 bài có ảnh và câu Kinh Thánh, rồi xem `http://localhost:3000`.

Đối chiếu với ảnh mẫu: nền trắng ngà, cột chữ hẹp, chữ to dòng thưa, ô trích dẫn có vạch đỏ bên trái, nút A−/A+ hoạt động và nhớ cỡ chữ sau khi tải lại trang.

- [ ] **Step 4: Commit**

```bash
git add public/css/style.css
git commit -m "feat: giao dien bam theo mau YouVersion"
```

---

## Hướng dẫn cho người dùng sau khi xong

Viết vào `README.md`:

```markdown
# Web Lời Chúa

## Cài lần đầu

1. Cài MySQL Community Server 8.4 cho Windows. Ghi nhớ mật khẩu `root`.
2. Mở thư mục dự án, chạy: `npm install`
3. Tạo file cấu hình: `copy .env.example .env`
4. Mở `.env`, điền `DB_PASSWORD` bằng mật khẩu root của MySQL.
5. Đặt mật khẩu quản trị: `npm run set-password -- "mat khau cua ban"`
   rồi chép 2 dòng nó in ra vào `.env`.
6. Tạo database và bảng: `npm run db:init`

## Dùng hằng ngày

- Bật MySQL (nếu chưa chạy nền).
- Bấm đúp `start.bat`.
- Trang đọc: http://localhost:3000
- Trang quản trị: http://localhost:3000/admin

## Sao lưu

Copy cả thư mục `uploads/` và sao lưu database bằng lệnh:
`mysqldump -u root -p loi_chua > sao-luu.sql`
```

---

## Self-Review

**1. Spec coverage**

| Mục trong spec | Task |
|---|---|
| Mục tiêu, phạm vi | toàn bộ |
| Công nghệ | Task 1 |
| Điều kiện tiên quyết (cài MySQL) | Global Constraints + README |
| Kiến trúc, cấu trúc thư mục | Task 1, File Structure |
| Ranh giới module | File Structure |
| Bảng `categories`, `posts`, chỉ mục | Task 1 Step 5 |
| Quy tắc slug (bỏ dấu, trùng thì thêm số, không đổi khi sửa tiêu đề) | Task 2, Task 4 |
| Nội dung văn bản thuần, tách đoạn | Task 2 (`lib/text.js`), Task 6 |
| Tóm tắt 160 ký tự | Task 2, Task 6 |
| Trang chủ, phân trang, ẩn bài nháp | Task 6 |
| Trang đọc bài, ô trích dẫn, A−/A+, bài trước/sau | Task 6 |
| Trang chủ đề | Task 6 |
| Đăng nhập / đăng xuất | Task 3 |
| Danh sách bài quản trị | Task 5 |
| Viết / sửa / xóa bài | Task 5, Task 8 |
| Xem thử bài nháp | Task 5 (nút), Task 6 (`includeDrafts`) |
| Quản lý chủ đề, chặn xóa khi còn bài | Task 7 |
| MySQL chưa bật → thông báo tiếng Việt | Task 1 (`db.js`, `server.js`) |
| 404 / 500 | Task 5, Task 6 |
| Giữ dữ liệu khi form lỗi | Task 5, Task 8 |
| Mật khẩu bcrypt trong `.env`, script sinh hash | Task 3 |
| Phiên cookie ký, httpOnly, 7 ngày | Task 3 |
| Tham số hóa SQL | Task 4 |
| Chống XSS | Task 6 (test), mọi view dùng `<%= %>` |
| Kiểm tra file tải lên | Task 8 |
| CSRF | Task 9 |
| `.gitignore` | Task 1 |
| 9 test trong spec | Task 2 (#1), 3 (#2,#3), 5 (#4), 6 (#5,#8), 7 (#7), 8 (#6), 9 (#9) |
| Giao diện bám ảnh mẫu | Task 10 |

Không còn mục nào của spec chưa có task.

**2. Placeholder scan** — không có "TBD"/"TODO"/"tương tự Task N". Mọi bước code đều có mã thật. Task 7 Step 4 có một đoạn viết dở đã được sửa lại ngay trong cùng bước.

**3. Type consistency** — đã đối chiếu:
- `posts.remove(id)` trả về hàng đã xóa ở Task 4, và Task 8 dùng đúng như vậy (`daXoa.cover_image`).
- `posts.getBySlug(slug, { includeDrafts })` khai báo ở Task 4, dùng đúng ở Task 6.
- `categories.remove(id)` ném lỗi `code === 'CATEGORY_IN_USE'` ở Task 4, bắt đúng ở Task 7.
- `handleCover` đặt `req.uploadError` (chuỗi) ở Task 8, đọc đúng ở `routes/admin.js`.
- `res.locals.csrfToken` đặt rỗng ở Task 5, thay bằng token thật ở Task 9; mọi view dùng tên `csrfToken`.
- `res.locals.navCategories` đặt ở Task 6, dùng đúng tên trong `views/partials/header.ejs`.
- View `admin/form.ejs` cần `{ post, categories, error, csrfToken }` — mọi lệnh `render('admin/form')` đều truyền đủ.
- View `admin/list.ejs` cần `{ posts, flash, csrfToken }` — route truyền đủ.
- View `public/home.ejs` cần `{ heading, items, page, totalPages, baseUrl, navCategories }` — `renderDanhSach` truyền đủ.
