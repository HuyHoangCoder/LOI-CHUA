# Web Lời Chúa — Tài liệu thiết kế

Ngày: 2026-08-29

## 1. Mục tiêu

Một website đọc bài viết Cơ Đốc (suy niệm, cầu nguyện, tin tức hội thánh) với
giao diện đọc sạch sẽ, dễ đọc, lấy cảm hứng từ app Kinh Thánh YouVersion; kèm
một trang quản trị để chủ trang tự đăng bài.

Website **không** chứa toàn bộ Kinh Thánh. Nội dung là bài viết do admin đăng.

### Phạm vi

Trong phạm vi:

- Trang công khai: danh sách bài, đọc bài, lọc theo chủ đề
- Trang quản trị có mật khẩu: thêm / sửa / xóa bài, quản lý chủ đề
- Bài viết gồm: tiêu đề, nội dung dài, câu Kinh Thánh trích dẫn, ảnh minh họa,
  chủ đề
- Chạy trên máy cá nhân (localhost), Windows

Ngoài phạm vi (cố tình chưa làm):

- Bình luận, tài khoản người đọc, thẻ tag, đếm lượt xem, tìm kiếm toàn văn
- Nhiều tài khoản quản trị, phân quyền
- Triển khai lên Internet, tên miền riêng, HTTPS

### Tiêu chí thành công

1. Chủ trang đăng được một bài có đủ ảnh bìa, câu Kinh Thánh, chủ đề mà không
   cần ai hướng dẫn.
2. Trang đọc bài hiển thị đúng phong cách ảnh mẫu: nền sáng, cột chữ hẹp, chữ
   to, dòng thưa.
3. Bấm đúp `start.bat` là chạy được, không phải nhớ câu lệnh.
4. Toàn bộ test tự động chạy xanh bằng `npm test`.

## 2. Công nghệ

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Nền tảng | Node.js 24 (đã có sẵn trên máy) | Người dùng chỉ định |
| Web framework | Express | Người dùng chỉ định; đơn giản, nhiều tài liệu |
| Cơ sở dữ liệu | MySQL 8.4, driver `mysql2/promise` | Người dùng chỉ định |
| Giao diện | EJS render tại server | Không cần bước build; sửa HTML là thấy ngay |
| Tải file | `multer` | Chuẩn cho Express |
| Phiên đăng nhập | `cookie-session` | Đủ dùng cho một tài khoản |
| Mật khẩu | `bcrypt` | Không lưu mật khẩu dạng thô |
| Test | `node:test` + `supertest` | Có sẵn trong Node, không thêm phụ thuộc nặng |

Không dùng React / Next.js: site thuần đọc, thêm bước build chỉ làm khó bảo trì.

### Điều kiện tiên quyết

Máy hiện **chưa cài MySQL**. Thư mục `C:\laragon` và `C:\xampp` tồn tại nhưng
rỗng (không còn `mysqld.exe`, chỉ sót `my.ini` và thư mục data cũ).

Bước 0 do người dùng thực hiện: cài **MySQL Community Server 8.4** cho Windows
từ trang chủ Oracle (bản MySQL Installer). Ghi nhớ mật khẩu `root` đặt lúc cài —
sẽ điền vào `.env`.

Việc viết code và chạy test không bị chặn bởi bước này; chỉ khi chạy thật mới
cần MySQL đang bật.

## 3. Kiến trúc

```
Trình duyệt
    |
    +-- localhost:3000/          -> Trang công khai (đọc bài)
    |
    +-- localhost:3000/admin     -> Trang quản trị (cần mật khẩu)
    |
    v
Express (Node.js)  --> MySQL      (bài viết, chủ đề)
                   --> uploads/   (file ảnh trên ổ đĩa)
```

Ảnh lưu thành file trong `uploads/`; MySQL chỉ lưu **tên file**. Không nhét
ảnh nhị phân vào database.

### Cấu trúc thư mục

```
web loi chua/
├── start.bat            <- bấm đúp để chạy
├── .env                 <- mật khẩu admin, thông tin MySQL (không commit)
├── .env.example         <- mẫu để copy
├── package.json
├── server.js            <- khởi động Express
├── db.js                <- tạo connection pool MySQL
├── schema.sql           <- lệnh tạo bảng
├── lib/
│   ├── slug.js          <- sinh slug từ tiêu đề tiếng Việt
│   ├── auth.js          <- middleware kiểm tra đăng nhập
│   └── upload.js        <- cấu hình multer + kiểm tra file
├── routes/
│   ├── public.js        <- trang đọc
│   └── admin.js         <- trang quản trị
├── views/
│   ├── layout.ejs
│   ├── public/          <- home, post, category, 404, 500
│   └── admin/           <- login, list, form, categories
├── public/css/style.css
├── uploads/             <- ảnh đã tải lên (không commit)
├── test/
└── docs/superpowers/specs/
```

### Ranh giới các module

Mỗi file một việc, dùng được và test được độc lập:

- `lib/slug.js` — hàm thuần: chuỗi vào, slug ra. Không biết gì về database.
- `lib/auth.js` — chỉ trả lời "phiên này đã đăng nhập chưa". Không biết gì về
  bài viết.
- `lib/upload.js` — nhận file, kiểm tra, trả về tên file đã lưu. Không biết gì
  về bài viết.
- `db.js` — chỉ tạo và xuất connection pool.
- `routes/public.js` — chỉ đọc dữ liệu, không bao giờ ghi.
- `routes/admin.js` — mọi thao tác ghi, luôn nằm sau `lib/auth.js`.

## 4. Cấu trúc dữ liệu

Bảng chữ: `utf8mb4` / `utf8mb4_unicode_ci` (tiếng Việt có dấu).

### Bảng `categories`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | INT AUTO_INCREMENT | khóa chính |
| `name` | VARCHAR(100) NOT NULL | "Suy niệm", "Cầu nguyện"… |
| `slug` | VARCHAR(120) NOT NULL UNIQUE | `suy-niem` |

### Bảng `posts`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | INT AUTO_INCREMENT | khóa chính |
| `title` | VARCHAR(255) NOT NULL | tiêu đề |
| `slug` | VARCHAR(280) NOT NULL UNIQUE | sinh tự động từ tiêu đề |
| `category_id` | INT NULL | FK -> `categories.id`, ON DELETE RESTRICT |
| `verse_ref` | VARCHAR(120) NULL | "Ê-sai 1:18" |
| `verse_text` | TEXT NULL | nội dung câu Kinh Thánh |
| `cover_image` | VARCHAR(255) NULL | tên file trong `uploads/` |
| `body` | MEDIUMTEXT NOT NULL | nội dung bài, văn bản thuần |
| `status` | ENUM('draft','published') NOT NULL DEFAULT 'draft' | |
| `created_at` | DATETIME NOT NULL | |
| `updated_at` | DATETIME NOT NULL | |

Chỉ mục: `slug` (unique), `(status, created_at)` cho trang chủ, `category_id`.

### Quy tắc dữ liệu

**Slug.** Sinh từ tiêu đề: bỏ dấu tiếng Việt (`đ` -> `d`), chuyển chữ thường,
thay ký tự không phải chữ/số bằng `-`, gộp `-` liên tiếp, cắt `-` ở hai đầu,
giới hạn 200 ký tự. Nếu trùng thì thêm `-2`, `-3`… Slug **không đổi** khi sửa
tiêu đề, để địa chỉ cũ không hỏng.

**Nội dung bài.** Văn bản thuần. Khi hiển thị: tách theo dòng trống thành các
đoạn `<p>`, mỗi đoạn escape HTML. Không có in đậm/nghiêng — muốn nhấn mạnh thì
dùng ô câu Kinh Thánh.

**Tóm tắt ở trang chủ.** Cắt 160 ký tự đầu của `body` khi hiển thị. Không lưu
thành cột riêng.

## 5. Các màn hình

### Công khai

| Địa chỉ | Màn hình | Nội dung |
|---|---|---|
| `/` | Trang chủ | Danh sách bài đã đăng, mới nhất trước (`created_at` giảm dần), 10 bài/trang, có phân trang. Mỗi dòng: ảnh nhỏ, tiêu đề, chủ đề, ngày, 160 ký tự đầu. Bài không có ảnh bìa thì bỏ trống chỗ ảnh, chữ chiếm hết chiều ngang. Bài nháp **không** hiện. |
| `/bai-viet/:slug` | Đọc bài | Ảnh bìa rộng (bỏ qua nếu không có), tiêu đề canh giữa, chủ đề + ngày, ô trích dẫn Kinh Thánh (chữ nghiêng, vạch bên trái; ẩn nếu để trống), thân bài cột hẹp ~640px. Nút A- / A+ chỉnh cỡ chữ (lưu trong localStorage). Điều hướng bài trước / bài sau theo `created_at`, chỉ tính bài đã đăng; hết bài thì ẩn nút. |
| `/chu-de/:slug` | Theo chủ đề | Như trang chủ, lọc theo một chủ đề. |

Phong cách: nền trắng ngà, chữ lớn, dòng thưa, không quảng cáo — bám ảnh mẫu.
Thanh điều hướng trên cùng, dính khi cuộn, có menu chủ đề.

### Quản trị

| Địa chỉ | Màn hình | Nội dung |
|---|---|---|
| `/admin/dang-nhap` | Đăng nhập | Một ô mật khẩu. Đúng thì tạo phiên 7 ngày. Sai thì báo lỗi chung ("Mật khẩu không đúng"). |
| `/admin` | Danh sách bài | Bảng: tiêu đề, chủ đề, ngày, trạng thái, nút Sửa/Xóa. Nút "Viết bài mới". Hiện cả bài nháp. |
| `/admin/bai-viet/moi` | Viết bài | Form: tiêu đề, chủ đề (select), ảnh bìa (có xem trước), nguồn câu Kinh Thánh, nội dung câu, thân bài (textarea lớn). Nút: Lưu nháp / Đăng bài / Xem thử. |
| `/admin/bai-viet/:id/sua` | Sửa bài | Như trên, điền sẵn dữ liệu. Đổi ảnh thì xóa file ảnh cũ. |
| `/admin/bai-viet/:id/xoa` | Xóa bài | POST, có hỏi xác nhận. Xóa cả file ảnh kèm theo. |
| `/admin/chu-de` | Chủ đề | Thêm / đổi tên / xóa. Chủ đề đang có bài thì **không cho xóa**, báo lỗi rõ ràng. |
| `/admin/dang-xuat` | Đăng xuất | Hủy phiên. |

"Xem thử" mở trang đọc bài ở tab mới, kể cả khi bài đang là nháp (chỉ khi đã
đăng nhập).

## 6. Xử lý lỗi

| Tình huống | Hành vi |
|---|---|
| MySQL chưa bật lúc khởi động | In tiếng Việt ra console: "Không kết nối được MySQL. Hãy bật MySQL rồi chạy lại." kèm host/port đang thử. Thoát với mã 1. |
| MySQL rớt giữa chừng | Trang 500 thân thiện cho người đọc; chi tiết lỗi ra console. |
| Địa chỉ bài không tồn tại | Trang 404 gọn, có nút về trang chủ. |
| Thiếu tiêu đề hoặc nội dung | Render lại form kèm thông báo tại ô lỗi, **giữ nguyên mọi dữ liệu đã nhập**. |
| Ảnh sai định dạng / quá 5MB | "Ảnh phải là JPG/PNG/WEBP và dưới 5MB", giữ nguyên dữ liệu đã nhập. |
| Xóa chủ đề đang có bài | Báo "Chủ đề này còn N bài viết, không thể xóa." |
| Lỗi bất ngờ | Trang xin lỗi cho người đọc; stack trace ra console. |

Nguyên tắc: **không bao giờ để người dùng mất nội dung đã gõ vì một lỗi biểu
mẫu.**

## 7. Bảo mật

- Mật khẩu admin nằm trong `.env` dưới dạng **băm bcrypt** (`ADMIN_PASSWORD_HASH`).
  Kèm script nhỏ `npm run set-password` để sinh chuỗi băm.
- Phiên đăng nhập: cookie có ký (`SESSION_SECRET` trong `.env`), `httpOnly`,
  `sameSite: lax`, hạn 7 ngày.
- Mọi truy vấn MySQL dùng tham số hóa (`?`). Không nối chuỗi SQL.
- Chống XSS: EJS escape mặc định; thân bài luôn hiển thị dạng văn bản, không
  bao giờ render như HTML.
- Tải file: chỉ nhận `image/jpeg`, `image/png`, `image/webp`; tối đa 5MB; tên
  file lưu là chuỗi ngẫu nhiên + phần mở rộng đúng loại; `uploads/` phục vụ
  tĩnh, không thực thi.
- CSRF: mỗi form quản trị mang một token dùng một lần, kiểm tra ở phía server.
- `.env` và `uploads/` nằm trong `.gitignore`.

Bốn mục cuối chưa cần thiết trên localhost nhưng gần như miễn phí lúc này, còn
thêm sau khi đã đưa lên mạng thì phải sửa khắp nơi.

### Biến môi trường (`.env.example`)

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

## 8. Kiểm thử

Chạy bằng `npm test` (`node --test`). Database riêng `loi_chua_test`, tạo lại
bảng trước mỗi lần chạy, không đụng dữ liệu thật.

Danh sách test:

1. `slug.js`: "Lời Chúa cho ngày mới" -> `loi-chua-cho-ngay-moi`; "Đức tin" ->
   `duc-tin`; trùng slug -> `-2`.
2. Chưa đăng nhập vào `/admin` -> chuyển hướng về `/admin/dang-nhap`.
3. Mật khẩu sai -> không tạo phiên; mật khẩu đúng -> vào được `/admin`.
4. Tạo bài -> có trong database; sửa -> cập nhật đúng; xóa -> mất khỏi database.
5. **Bài `draft` không xuất hiện ở `/`, `/chu-de/:slug`, và trả 404 ở
   `/bai-viet/:slug` khi chưa đăng nhập.**
6. Upload file `.txt` -> bị từ chối; file > 5MB -> bị từ chối; cả hai trường hợp
   dữ liệu form được giữ lại.
7. Xóa chủ đề đang có bài -> bị từ chối kèm thông báo.
8. Thân bài chứa `<script>alert(1)</script>` -> hiển thị ra thành chữ.
9. POST form quản trị thiếu token CSRF -> bị từ chối.

Cách làm: viết test trước (đỏ), viết code cho xanh, rồi dọn dẹp (TDD).

## 9. Thứ tự triển khai

1. Khung dự án: `package.json`, `.env.example`, `db.js`, `schema.sql`,
   `server.js` chạy được trang trắng, `start.bat`.
2. `lib/slug.js` + test.
3. Script `npm run set-password`, đăng nhập / đăng xuất + `lib/auth.js` + test.
4. CRUD bài viết trong `/admin` (chưa có ảnh) + test.
5. Trang công khai: trang chủ, trang đọc bài + test bài nháp bị ẩn.
6. Chủ đề: quản trị + lọc công khai + test.
7. Ảnh: `lib/upload.js`, ảnh bìa, xem trước, xóa ảnh cũ + test.
8. CSRF + test.
9. Giao diện: CSS bám ảnh mẫu, chỉnh cỡ chữ, phân trang, trang 404/500.
