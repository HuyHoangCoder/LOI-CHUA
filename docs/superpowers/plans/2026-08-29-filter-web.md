[UI/UX] Phát triển thanh tìm kiếm (Search Bar) cho Verses, Topics và Questions

Thêm thanh tìm kiếm vào giao diện để người dùng có thể tra cứu nhanh các câu kinh thánh (verses), chủ đề (topics) và câu hỏi (questions).

2. Yêu cầu giao diện (UI/UX Specifications)
Hình dạng: Khung bo tròn (pill/capsule shape), nền màu xám nhạt.

Placeholder text: "Search verses, topics, and questions..." (Màu chữ xám, hiển thị chìm khi chưa nhập).

Biểu tượng (Icon): Có icon kính lúp (search icon) nằm ở phía bên phải trong khung, có thể bấm vào được.

3. Yêu cầu tính năng & Logic (Functional Requirements)
Hành động kích hoạt tìm kiếm:

Người dùng nhấn phím Enter trên bàn phím.

Hoặc bấm vào icon kính lúp bên phải.

Dữ liệu tìm kiếm: Hệ thống sẽ quét và tìm kiếm từ khóa khớp trong 3 danh mục: verses (câu thơ), topics (chủ đề), và questions (câu hỏi).

Trường hợp để trống: Nếu ô tìm kiếm trống mà người dùng bấm Enter/Search thì xử lý thế nào? (Ví dụ: Không làm gì cả / Hoặc hiện toàn bộ danh sách).

Xử lý chuỗi: Tự động cắt bỏ khoảng trắng thừa ở đầu và cuối từ khóa (trim()).

4. Acceptance Criteria (Tiêu chí nghiệm thu)

[ ] Hiển thị đúng thiết kế (bo tròn, màu sắc, placeholder, icon kính lúp).

[ ] Nhập được văn bản vào ô input.

[ ] Bấm Enter hoặc click icon kính lúp sẽ gọi API/hàm tìm kiếm với từ khóa đã nhập.

[ ] Xử lý tốt các từ khóa có dấu hoặc tiếng Việt (tùy thuộc vào dự án của bạn).

sử dụng Meilisearch 