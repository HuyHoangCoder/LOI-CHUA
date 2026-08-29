# Thanh tìm kiếm — Tài liệu thiết kế

Ngày: 2026-08-30

Yêu cầu gốc: `docs/superpowers/plans/2026-08-29-filter-web.md`

## 1. Mục tiêu

Thêm thanh tìm kiếm vào thanh điều hướng để người đọc tra cứu nhanh nội dung
trên trang, và một trang kết quả tìm kiếm.

### Sai lệch so với yêu cầu gốc (đã thống nhất với người dùng)

Yêu cầu gốc viết cho một sản phẩm có 3 nhóm dữ liệu: *verses*, *topics*,
*questions*. Web này chỉ có **bài viết** và **chủ đề** — không có bảng câu
Kinh Thánh độc lập, không có mục hỏi đáp. Ba điều chỉnh:

1. **Phạm vi tìm:** bài viết + chủ đề. Câu Kinh Thánh được tìm qua hai cột
   `verse_ref` / `verse_text` của bài viết, không phải kho câu riêng.
2. **Công nghệ:** dùng MySQL sẵn có thay cho Meilisearch. Meilisearch cần thêm
   một container Docker luôn phải bật kèm, thêm luồng đồng bộ dữ liệu và thêm
   chỗ hỏng — không tương xứng với quy mô hiện tại. Tầng tìm kiếm được gói sau
   một hàm duy nhất để sau này đổi ruột không phải sửa giao diện.
3. **Chữ gợi ý:** `"Tìm bài viết, câu Kinh Thánh, chủ đề…"` thay cho
   `"Search verses, topics, and questions..."` — trang tiếng Việt, và không có
   mục hỏi đáp.

### Ngoài phạm vi (cố tình chưa làm)

- Tô đậm từ khóa trong kết quả (xem mục 7)
- Gợi ý khi đang gõ (autocomplete), sửa lỗi chính tả, tìm gần đúng
- Tìm kiếm trong trang quản trị
- Lưu lịch sử tìm kiếm, thống kê từ khóa

### Tiêu chí thành công

1. Gõ `duc tin` (không dấu) tìm được bài `Đức tin lớn`.
2. Gõ `duong di` tìm được bài `Đường đi` — chữ `đ` là ca khó nhất.
3. Bài nháp không bao giờ xuất hiện trong kết quả.
4. 64 test hiện có vẫn xanh sau khi thêm tính năng.

## 2. Cách tìm

### Quyết định: dùng collation `utf8mb4_0900_ai_ci` trong câu truy vấn

Đã đo trên chính MySQL 8.4 của máy này:

| Cách | `Lời Chúa` ← "loi chua" | `Đức tin` ← "duc tin" | `Đường đi` ← "duong di" |
|---|---|---|---|
| `LIKE` thường | không | không | không |
| `utf8mb4_unicode_ci` | có | **không** | **không** |
| `utf8mb4_0900_ai_ci` | có | có | có |

`utf8mb4_unicode_ci` xử lý được dấu thanh và các nguyên âm có dấu phụ
(`ơ`, `ư`, `ê`, `à`…) nhưng **không** coi `đ` bằng `d`. `utf8mb4_0900_ai_ci`
(có từ MySQL 8.0) xử lý đúng cả `đ`. Đã kiểm 8 trường hợp tiếng Việt, đúng cả
8 và không có kết quả nhầm.

Hai phương án còn lại bị loại:

- **Thêm cột đã bỏ dấu** (`title_khongdau`…): đánh chỉ mục được, chạy trên mọi
  phiên bản MySQL. Nhưng phải chép lại dữ liệu cũ và **mỗi lần ghi bài phải nhớ
  cập nhật cột phụ** — quên là tìm sai. Thêm trạng thái có thể lệch nhau.
- **FULLTEXT + ngram**: xếp hạng tốt hơn cho bài dài, nhưng phần dấu tiếng Việt
  vẫn kém nên cuối cùng vẫn phải làm thêm một trong hai cách trên.

Đánh đổi đã chấp nhận: `COLLATE` trong mệnh đề `WHERE` làm MySQL không dùng
được chỉ mục, phải quét toàn bảng. Với vài nghìn bài vẫn nhanh. Khi nào chậm
thấy được thì đổi ruột `models/search.js` sang cột đã bỏ dấu hoặc Meilisearch —
route, view và test không phải sửa.

### Trường được tìm

`posts.title` · `posts.body` · `posts.verse_ref` · `posts.verse_text` ·
`categories.name`

### Xếp thứ tự

Bài khớp ở **tiêu đề** lên trước, sau đó tới bài mới nhất (`created_at` giảm dần,
rồi `id` giảm dần cho ổn định).

### Truy vấn

```sql
SELECT p.*, c.name AS category_name, c.slug AS category_slug
FROM posts p
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.status = 'published' AND (
      p.title      COLLATE utf8mb4_0900_ai_ci LIKE ?
   OR p.body       COLLATE utf8mb4_0900_ai_ci LIKE ?
   OR p.verse_ref  COLLATE utf8mb4_0900_ai_ci LIKE ?
   OR p.verse_text COLLATE utf8mb4_0900_ai_ci LIKE ?
   OR c.name       COLLATE utf8mb4_0900_ai_ci LIKE ?
)
ORDER BY (p.title COLLATE utf8mb4_0900_ai_ci LIKE ?) DESC,
         p.created_at DESC, p.id DESC
LIMIT ? OFFSET ?
```

Chủ đề khớp lấy riêng:

```sql
SELECT * FROM categories
WHERE name COLLATE utf8mb4_0900_ai_ci LIKE ?
ORDER BY name ASC LIMIT 8
```

**Bài nháp không bao giờ xuất hiện**, kể cả khi đang đăng nhập quản trị — tìm
kiếm là chức năng của trang công khai.

## 3. Chuẩn hóa từ khóa

Theo thứ tự:

0. **Chuẩn hóa Unicode về dạng NFC** (`normalize('NFC')`) — gộp chữ và dấu
   thành một ký tự. Chuỗi copy từ máy Mac hoặc từ vài bộ gõ ra dạng tách rời
   (NFD: `E` + dấu mũ riêng); MySQL không tự gộp lại, nên không chuẩn hóa thì
   gõ `Ê` sẽ không khớp `Ê` đã lưu. Đã đo: trước khi sửa, NFD cho 0 kết quả.
1. Cắt khoảng trắng thừa hai đầu (`trim()`).
2. Rỗng sau khi cắt → không tìm (xem mục 6).
3. Cắt còn tối đa **100 ký tự**.
4. **Vô hiệu hóa ký tự đại diện**: `\` → `\\`, `%` → `\%`, `_` → `\_`.
   Không làm bước này thì gõ `%` sẽ khớp toàn bộ bài viết.
5. Bọc thành `%<từ khóa>%`.

Bước 4 phải chạy **trước** bước 5, nếu không sẽ vô hiệu luôn cả hai dấu `%` bao
ngoài.

## 4. Ranh giới module

| File | Trách nhiệm | Mới/Sửa |
|---|---|---|
| `models/search.js` | Toàn bộ truy vấn tìm kiếm. Không biết gì về HTTP | mới |
| `routes/public.js` | Thêm `GET /tim-kiem` | sửa |
| `views/public/search.ejs` | Trang kết quả | mới |
| `views/partials/header.ejs` | Thêm form tìm kiếm | sửa |
| `public/css/style.css` | Kiểu thanh tìm kiếm + trang kết quả | sửa |
| `public/js/search.js` | Chặn gửi khi ô trống | mới |
| `test/search.test.js` | Bộ test | mới |

`models/search.js` xuất:

- `escapeLike(s: string): string` — vô hiệu hóa `\`, `%`, `_`
- `chuanHoa(q: string): string | null` — trả `null` nếu rỗng sau khi cắt
- `timKiem({ tuKhoa, page, perPage }): Promise<{ rows, total, chuDeKhop }>`

Không sửa `schema.sql`, không sửa `models/posts.js`, không sửa trang quản trị.

## 5. Giao diện

### Thanh tìm kiếm (trong `views/partials/header.ejs`)

```
┌──────────────────────────────────────────────────────────────────┐
│ ✝ Lời Chúa   Trang chủ  Sách Ê SAI    ╭─────────────────────╮   │
│                                        │ Tìm bài viết, câu…  🔍│  │
│                                        ╰─────────────────────╯   │
└──────────────────────────────────────────────────────────────────┘
```

- Khung bo tròn kiểu viên thuốc, nền `#f0eee9`, chữ gợi ý màu xám chìm.
- Icon kính lúp **bên phải, bấm được** — nó là nút `type="submit"`.
- Là `<form method="get" action="/tim-kiem">` với `<input name="q">`, nên
  **Enter** gửi đi theo cơ chế sẵn có của trình duyệt. Không có JavaScript
  vẫn dùng được.
- Từ khóa hiện tại được điền sẵn lại vào ô sau khi ra kết quả.
- Màn hình dưới 640px: thanh tìm kiếm xuống dòng riêng, rộng hết chiều ngang.

### Trang kết quả — `/tim-kiem?q=duc+tin&trang=1`

```
  Kết quả cho “duc tin”
  Tìm thấy 3 bài viết

  Chủ đề khớp:  [ Đức tin ]  [ Đường đi ]      ← chỉ hiện khi có
  ─────────────────────────────────────────
  ┌────────┐  Đức tin lớn của người đàn bà
  │ [ảnh]  │  Suy niệm · 29/08/2026
  └────────┘  Ngài phán cùng nàng rằng...
  ─────────────────────────────────────────
  ...
              ‹ Trước    1 2    Sau ›          ← link giữ nguyên ?q=
```

Dùng lại đúng kiểu thẻ bài (`.post-card`) của trang chủ. 10 kết quả một trang.

Dòng **"Chủ đề khớp"** là cách xử lý phần *topics*: gõ tên chủ đề thì vừa hiện
chủ đề để bấm sang, vừa hiện các bài thuộc chủ đề đó.

Không có kết quả:

```
  Kết quả cho “xyz”
  Không tìm thấy bài viết nào.

  Thử bỏ bớt từ, hoặc xem [ toàn bộ bài viết ].
```

## 6. Xử lý biên

| Tình huống | Hành vi |
|---|---|
| Bấm Enter khi ô trống | `public/js/search.js` chặn gửi. Không chuyển trang |
| Gõ thẳng `/tim-kiem?q=` hoặc `?q=%20%20` | Chuyển hướng 302 về `/` |
| `  đức tin  ` | Cắt hai đầu, tìm như `đức tin` |
| Gõ `%` hoặc `_` | Coi là chữ thường, không phải ký tự đại diện |
| Từ khóa dài hơn 100 ký tự | Cắt còn 100 rồi mới tìm |
| Gõ `<script>alert(1)</script>` | Hiện thành chữ trong dòng "Kết quả cho…" (EJS `<%= %>` tự escape) |
| `?trang=99` khi chỉ có 2 trang | Danh sách trống, không lỗi |
| MySQL rớt | Trang 500 thân thiện; chi tiết ra console |

## 7. Không tô đậm từ khóa trong kết quả — và tại sao

Tô đậm đòi hỏi chèn thẻ `<b>` vào giữa nội dung rồi render dạng HTML thô
(`<%- %>`). Đó đúng là điều toàn hệ thống đang tránh: nội dung bài luôn hiển thị
dạng văn bản thuần, không bao giờ chạy như HTML. Đổi một lỗ hổng chèn mã độc
lấy chút tô đậm là không đáng.

Nếu sau này cần, cách làm an toàn là: escape trước → chèn `<b>` sau, trong một
hàm riêng có bộ test riêng cho trường hợp từ khóa chứa thẻ HTML.

## 8. Kiểm thử

`test/search.test.js`, chạy trên database `loi_chua_test` như các bộ test hiện có.

**Tìm đúng thứ cần tìm**

1. Gõ không dấu `duc tin` → ra bài `Đức tin lớn`
2. Gõ `duong di` → ra bài `Đường đi` (chữ `đ`)
3. Tìm được theo **nội dung** bài, không chỉ tiêu đề
4. Tìm được theo **nguồn câu Kinh Thánh** (`Ê-sai 1:18`)
5. Tìm được theo **nội dung câu Kinh Thánh**
6. Gõ tên chủ đề → ra bài thuộc chủ đề đó, và chủ đề hiện ở dòng "Chủ đề khớp"
7. Bài khớp **tiêu đề** xếp trên bài chỉ khớp nội dung

**Không tìm nhầm**

8. Bài nháp không xuất hiện — kể cả khi đã đăng nhập quản trị
9. Gõ `%` → không ra toàn bộ bài
10. Gõ `_` → không khớp bừa
11. Từ khóa không liên quan → 0 kết quả, hiện thông báo trống

**Xử lý đầu vào**

12. `  duc tin  ` cho kết quả y hệt `duc tin`
13. `q` rỗng → 302 về `/`
14. `q` toàn khoảng trắng → 302 về `/`

**Giao diện & an toàn**

15. Link phân trang giữ nguyên `?q=`; ô tìm kiếm điền sẵn lại từ khóa
16. Từ khóa `<script>alert(1)</script>` hiện thành chữ, không chạy
17. `chuanHoa` đưa chuỗi NFD về NFC
18. Gõ từ khóa dạng NFD vẫn tìm được bài đã lưu dạng NFC

## 10. Đã biết nhưng chưa làm

Việc chuẩn hóa NFC mới làm ở **phía từ khóa**. Nếu một bài viết được lưu vào
database ở dạng NFD (dán từ nguồn lạ), thì gõ từ khóa NFC sẽ không tìm ra bài
đó. Cách sửa triệt để là chuẩn hóa NFC luôn lúc ghi bài trong `models/posts.js`
kèm một lần chép lại dữ liệu cũ — chưa làm vì nằm ngoài phạm vi lần này và
chưa gặp trên thực tế.

Cách làm: viết test trước (đỏ), viết code cho xanh, rồi dọn dẹp.

## 9. Thứ tự triển khai

1. `models/search.js` — `escapeLike`, `chuanHoa` + test thuần (không cần database)
2. `timKiem()` + test có database
3. `GET /tim-kiem` + `views/public/search.ejs` + test HTTP
4. Form tìm kiếm trong `header.ejs` + `public/js/search.js` + CSS
