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

## Khi code thay đổi thì phải khởi động lại

Node nạp toàn bộ file `.js` vào bộ nhớ lúc khởi động. Sửa file trên ổ đĩa
**không** ảnh hưởng tiến trình đang chạy — phải Ctrl+C rồi chạy lại `start.bat`.

Chỗ dễ gây hiểu nhầm: file giao diện `.ejs` và `.css` thì lại được đọc lại mỗi
lần vẽ trang. Nên có thể **thấy giao diện mới** trong khi **chức năng phía sau
vẫn là bản cũ** — biểu hiện thường là trang 404 ở một địa chỉ vừa mới thêm.
Gặp cảnh đó thì khởi động lại trước khi đi tìm lỗi.

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
| `public/css`, `public/js` | CSS, nút chỉnh cỡ chữ, nút nghe bài |
| `uploads/` | Ảnh đã tải lên |
| `docs/superpowers/` | Tài liệu thiết kế và kế hoạch |
