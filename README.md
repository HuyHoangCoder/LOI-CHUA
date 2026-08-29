# Web Lời Chúa

Trang đọc bài viết Cơ Đốc + trang quản trị để đăng bài. Chạy trên máy cá nhân.

## MySQL

Máy này đang chạy MySQL 8.4 bằng Docker (không cài gì vào Windows):

```
docker start loichua-mysql          # bật (chạy 1 lần mỗi khi khởi động máy)
docker stop  loichua-mysql          # tắt
```

Container tên `loichua-mysql`, cổng 3306, user `root`, mật khẩu `loichua`
(khớp với `DB_PASSWORD` trong `.env`). Dữ liệu nằm trong container — muốn
giữ lâu dài thì nhớ sao lưu (xem mục Sao lưu bên dưới).

Nếu container bị xóa, dựng lại bằng:

```
docker run -d --name loichua-mysql -e MYSQL_ROOT_PASSWORD=loichua -p 3306:3306 mysql:8.4
npm run db:init
```

Muốn dùng MySQL cài thẳng vào Windows thay cho Docker: tải MySQL Community
Server 8.4 (bản MySQL Installer) từ https://dev.mysql.com/downloads/installer/,
rồi sửa `DB_PASSWORD` trong `.env` cho khớp mật khẩu `root`.

## Cài lần đầu

1. Bật MySQL (xem mục trên).
2. Cài thư viện: `npm install`
3. Tạo file cấu hình: `copy .env.example .env`
4. Mở `.env`, điền `DB_PASSWORD` bằng mật khẩu root của MySQL.
5. Đặt mật khẩu quản trị:

   ```
   npm run set-password -- "mat khau cua ban"
   ```

   rồi chép 2 dòng nó in ra (`ADMIN_PASSWORD_HASH` và `SESSION_SECRET`) vào `.env`.
6. Tạo database và bảng: `npm run db:init`

## Dùng hằng ngày

- Bật MySQL: `docker start loichua-mysql` (chỉ cần 1 lần sau khi khởi động máy).
- Bấm đúp **`start.bat`**.
- Trang đọc: http://localhost:3000
- Trang quản trị: http://localhost:3000/admin

## Màn hình chào (splash screen)

Hiện 3 giây rồi mờ dần. Bấm chuột hoặc phím bất kỳ để bỏ qua ngay.

**Chỉ có ở trang chủ `/`, và lần nào vào cũng hiện** — kể cả bấm F5, hoặc từ
bài viết quay về trang chủ. Trang bài viết, trang chủ đề, trang chủ từ trang 2
trở đi và toàn bộ trang quản trị đều không có.

Vẽ hoàn toàn bằng CSS và SVG, không dùng file ảnh nào — nên chữ sắc nét ở mọi
cỡ màn hình và không phải tải thêm gì. Ảnh gốc dùng làm mẫu nằm ở `images/`.

Sửa ở đâu:

| Muốn đổi | Sửa file |
|---|---|
| Chữ, câu Kinh Thánh, hình vẽ | `views/partials/header.ejs` (khối `id="splash"`) |
| Màu nền, cỡ chữ, tia sáng, đốm sáng | `public/css/style.css` (mục "Màn hình chào") |
| Thời gian chờ | `public/css/style.css`: `animation: splash-out 0.5s ease 3s forwards` — số `3s` |
| Trang nào được hiện | `routes/public.js` — cờ `splash` |

Việc ẩn do CSS lo chứ không phải JavaScript, để JavaScript có hỏng thì lớp
phủ vẫn tự biến mất chứ không che mất cả web.

## Chạy test

```
npm test
```

Các test cần database sẽ tự bỏ qua nếu MySQL chưa chạy. Test dùng database
riêng `loi_chua_test`, không đụng vào dữ liệu thật.

## Sao lưu

Copy thư mục `uploads/` (ảnh) và xuất database:

```
docker exec loichua-mysql mysqldump -uroot -ploichua loi_chua > sao-luu.sql
```

Phục hồi:

```
docker exec -i loichua-mysql mysql -uroot -ploichua loi_chua < sao-luu.sql
```

## Cấu trúc

| Đường dẫn | Việc |
|---|---|
| `server.js` | Khởi động, kiểm tra MySQL |
| `app.js` | Lắp ráp Express |
| `db.js` | Kết nối MySQL |
| `schema.sql` | Cấu trúc 2 bảng |
| `lib/` | slug, tách đoạn, đăng nhập, CSRF, tải ảnh |
| `models/` | Truy vấn `posts` và `categories` |
| `routes/public.js` | Trang chủ, đọc bài, chủ đề |
| `routes/admin.js` | Đăng nhập, CRUD bài, chủ đề |
| `views/` | Giao diện EJS |
| `public/css`, `public/js` | CSS và nút chỉnh cỡ chữ |
| `uploads/` | Ảnh đã tải lên |
| `docs/superpowers/` | Tài liệu thiết kế và kế hoạch |
