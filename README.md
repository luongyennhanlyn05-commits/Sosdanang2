# 🆘 SOS ĐÀ NẴNG / SOS VIETNAM - HỆ THỐNG ĐIỀU PHỐI CỨU TRỢ KHẨN CẤP THÔNG MINH

Dự án Web hiện đại được tái cấu trúc hoàn toàn tối ưu (loại bỏ hoàn toàn sự phụ thuộc vào Apache Tomcat, Java JSP và máy chủ cơ sở dữ liệu cồng kềnh). Dự án sử dụng mô hình web chuẩn:
- **Frontend:** React 19, Vite, Tailwind CSS, Leaflet & React-Leaflet, Lucide Icons.
- **Backend:** Node.js + Express REST API (Cổng 5000), tự động lưu trữ dữ liệu bền vững tại `data/requests.json`.
- **Cơ chế hoạt động:** Hỗ trợ thời gian thực (Real-time Polling 2s), tự động định vị GPS hoặc chọn nhanh quận huyện tại Đà Nẵng, tích hợp chỉ đường trực tiếp tới Google Maps, và có chế độ lưu trữ Offline dự phòng.

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY (CHỈ CẦN 1 CÂU LỆNH)

### 1. Mở Terminal / PowerShell tại thư mục này:
```bash
cd "d:\LaptrinhWeb\code full\SOS Dang Nang\sos-vietnam"
```

### 2. Khởi chạy toàn bộ hệ thống (Frontend + Backend):
```bash
npm start
```
> Câu lệnh `npm start` sẽ tự động khởi động đồng thời cả máy chủ Backend (Port 5000) và giao diện Vite Frontend (Port 5173).

Hoặc bạn có thể chạy riêng từng phần nếu muốn:
- **Chỉ chạy Backend API:** `npm run server`
- **Chỉ chạy Frontend:** `npm run dev`

---

## 🌐 TRUY CẬP ỨNG DỤNG
Mở trình duyệt truy cập:
👉 **http://localhost:5173**

### Các tính năng chính:
1. **Tôi cần giúp đỡ (Dành cho người dân):**
   - Tự động lấy vị trí GPS hoặc dùng vị trí trung tâm Đà Nẵng.
   - Chọn loại hỗ trợ: Y tế gấp, Thiếu lương thực, Nhà bị cô lập.
   - Nhập thông tin & gửi tín hiệu SOS khẩn cấp.
   - Màn hình theo dõi tiến độ cứu hộ cập nhật theo thời gian thực (Chờ tiếp nhận ➔ Đang cứu hộ ➔ Đã hoàn thành).

2. **Trung tâm Điều hành (Dành cho Đội cứu hộ / Admin):**
   - **Mật khẩu đăng nhập mặc định:** `admin123`
   - **Bản đồ trực quan (Live Map):** Xem chấm cứu trợ theo màu sắc và icon riêng biệt; bấm vào chấm để xem chi tiết, đổi trạng thái cứu hộ, hoặc bấm **"Chỉ đường (Google Maps)"** để dẫn đường trực tiếp tới nạn nhân.
   - **Bảng dữ liệu toàn diện (Thay thế hoàn toàn JSP):** Tìm kiếm theo tên/SĐT/mô tả, lọc theo trạng thái/loại tin, sửa/xóa tin báo nhanh chóng.
