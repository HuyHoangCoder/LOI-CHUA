Vị trí và Thiết kế Giao diện (UI)
Vị trí: Đặt một icon loa (ví dụ: VolumeUp hoặc Speaker) nằm ngang hàng ngay sát cạnh nút A+

Lý do: Khu vực này tập trung các công cụ tùy chỉnh trải nghiệm đọc (thay đổi cỡ chữ, nay có thêm tùy chọn nghe âm thanh). Người dùng sẽ dễ dàng tìm thấy thói quen tương tác.

Đồng bộ style: Icon loa cần có kích thước, màu sắc và độ bo góc (nếu có khung) tương đồng với cụm A- A+ để giao diện trông liền mạch, chuyên nghiệp.

2. Các trạng thái của Icon Loa
Để người dùng biết hệ thống đang hoạt động hay đã dừng, icon cần có ít nhất 3 trạng thái:

Trạng thái 1 (Bình thường - Idle): Icon loa tĩnh, sẵn sàng bấm.

Trạng thái 2 (Đang đọc - Playing): Icon có thể chuyển sang hiệu ứng sóng âm (sound waves) hoặc đổi màu (ví dụ màu điểm nhấn của web) kèm hiệu ứng nhịp nhàng để báo hiệu âm thanh đang phát.

Trạng thái 3 (Đang tạm dừng - Paused): Quay lại icon loa có dấu gạch hoặc icon pause nhỏ tùy biến.

3. Xử lý Kỹ thuật (Technical Implementation)
Thu thập dữ liệu văn bản (Text Extraction): Khi người dùng bấm vào icon loa, hàm xử lý (JavaScript/TypeScript) sẽ tự động quét và lấy toàn bộ nội dung văn bản Kinh thánh của chương đó (ví dụ nội dung "Ê-sai Chương 1" và các đoạn bên dưới).

Giải pháp đọc văn bản ("Giọng trầm uy nghiêm"):

Web Speech API (Cơ bản): Trình duyệt có hỗ trợ sẵn window.speechSynthesis. Bạn có thể lọc danh sách giọng đọc (voices) để tìm giọng tiếng Việt (vi-VN) của nam, sau đó giảm tốc độ đọc (rate = 0.85 - 0.9) và hạ cao độ (pitch = 0.8) để tạo cảm giác trầm ấm, từ tốn, trang nghiêm.

Cloud TTS (Nâng cao - Khuyên dùng cho chất lượng cao): Sử dụng giọng đọc AI chuyên biệt (như Google Cloud TTS, FPT.AI, Viettel AI...) cấu hình sẵn giọng nam trầm (Deep Male Voice) để đạt độ uy nghiêm tốt nhất.

4. Luồng trải nghiệm (User Flow)
Người dùng vào trang chi tiết "Ê-sai Chương 1".

Thấy icon loa cạnh nút A+, bấm vào.

Icon chuyển sang trạng thái đang đọc (có hiệu ứng sóng âm).

Hệ thống phát giọng đọc trầm ấm đọc từ trên xuống dưới.

Người dùng bấm lại vào icon lần nữa để Dừng (Stop/Pause) nếu muốn nghe dừng giữa chừng.