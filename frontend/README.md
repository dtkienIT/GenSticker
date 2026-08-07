# 🚀 GenSticker AI - Frontend Web App (React 19 + TypeScript)

Thư mục này chứa toàn bộ mã nguồn **Frontend Web Application** cho dự án **GenSticker AI**.

---

## 🛠 Công Nghệ Sử Dụng

- **Core Framework**: React 19 + TypeScript
- **Build Tool**: Vite (HMR siêu nhanh)
- **Styling**: Vanilla CSS (Design System phong cách Cyber Dark Glassmorphism & Modern High-Contrast Light Mode)
- **Icons**: `lucide-react`
- **Effects**: `canvas-confetti`
- **Theme System**: Custom `useTheme` hook với `localStorage` persistence, bảng màu High-Contrast cho Light Mode & công tắc trượt `ThemeToggle`.
- **Auth Flow**: Supabase Auth Integration với Real API Login, Register, Duplicate Email Check & Demo VIP Fast Login.
- **Account History**: Chỉ tải lịch sử sau đăng nhập; đăng xuất sẽ xóa dữ liệu lịch sử khỏi state và đóng modal.
- **History Actions**: Xem lại đầy đủ sticker đã lưu để tiếp tục tải/xuất Telegram và xóa từng bộ qua hộp thoại xác nhận.


---

## ⚡ Hướng Dẫn Nhanh Cho Developer

```bash
# 1. Cài đặt thư viện
npm install

# 2. Chạy Dev Server tại http://localhost:5173
npm run dev

# 3. Kiểm tra mã nguồn & Build bản Production
npm run lint
npm run build
```

---

## 🏛 Kiến Trúc & Cấu Trúc File (`src/`)

- `src/types/`: Khai báo kiểu TypeScript (`StickerItem`, `GenerationState`, `ProcessStep`, `StickerStyle`).
- `src/mock/`: Dữ liệu giả lập 20 sticker & 5 bước pipeline xử lý AI.
- `src/services/`: Lớp dịch vụ `StickerService` đóng gói API có Bearer token, chuẩn hóa dữ liệu lịch sử, Telegram export và tải file.
- `src/hooks/`: Custom hooks (`useTheme`, `useImageUpload`, `useStickerGenerator`) xử lý logic độc lập với UI.
- `src/components/`: Component giao diện chia thành `common`, `upload`, `processing`, `gallery`, `auth`, `history`.
- `src/index.css`: Bảng màu CSS Variables (Dark & Light tokens) & hiệu ứng Glassmorphism.

## 🕘 Luồng Lịch Sử Sticker

- Khách chưa đăng nhập không gọi API lịch sử; bấm **Lịch Sử** sẽ mở form đăng nhập.
- Frontend gửi Supabase access token cho API và chuẩn hóa `image_url`, `style_name`, kích thước cùng các trường API khác sang model TypeScript trước khi hiển thị.
- **Xem Lại** nạp bộ sticker vào gallery hiện tại; **Xóa** yêu cầu xác nhận, hiển thị trạng thái đang xử lý và chỉ bỏ card khỏi danh sách sau khi backend trả thành công.

---

> Chi tiết kiến trúc tổng quan xem tại file `../README.md` ở thư mục gốc.
