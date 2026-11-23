# Hệ Thống Quản Lý Thư Viện (Lab 02)

Ứng dụng web quản lý thư viện xây dựng bằng **HTML5, CSS3, Vanilla JavaScript** và lưu trữ dữ liệu bằng **LocalStorage**.

## Nghiệp vụ cốt lõi
- **Mượn sách:** Thời hạn mặc định **7 ngày**, tự động giảm tồn kho (`-1`) và để trống cột **Ngày trả** khi chưa trả.
- **Gia hạn:** Tối đa **1 lần**, cộng thêm **3 ngày** vào hạn trả (chỉ áp dụng khi sách chưa trả và chưa quá hạn).
- **Trả sách:** Ghi nhận **Ngày trả**, đổi trạng thái sang nhãn xanh lá **Đã trả về** và cộng lại tồn kho (`+1`).

## Cấu trúc dự án
- `src/index.html`, `src/style.css`, `src/app.js`, `src/data.js`: Mã nguồn và dữ liệu mẫu.
- `BaoCao_Lab.pdf`: Báo cáo phân tích, thiết kế và kiểm thử.
- `README.md`: Hướng dẫn cài đặt và chạy ứng dụng.

## Cách chạy ứng dụng
1. Mở thư mục dự án trên **Antigravity IDE** hoặc **VS Code**.
2. Chạy bằng **Live Server** (mở `src/index.html`) hoặc mở trực tiếp file `src/index.html` trên trình duyệt web.