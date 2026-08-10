# 🚀 GenSticker AI - Frontend Web App (React 19 + TypeScript)

Thư mục này chứa toàn bộ mã nguồn **Frontend Web Application** cho dự án **GenSticker AI**.

---

## 🛠 Công Nghệ Sử Dụng

- **Core Framework**: React 19 + TypeScript
- **Build Tool**: Vite (HMR siêu nhanh)
- **Styling**: Vanilla CSS (Design System phong cách Cyber Dark Glassmorphism & Modern High-Contrast Light Mode)
- **Icons**: `lucide-react`
- **Effects**: `canvas-confetti`, `MeteorBackground` (10 sao băng bay chéo liên tục ở Dark Mode)
- **Theme System**: Custom `useTheme` hook với `localStorage` persistence, bảng màu High-Contrast cho Light Mode & công tắc trượt `ThemeToggle`.
- **Exact-One-Face Gate**: `@mediapipe/tasks-vision@1.0.1` + BlazeFace short-range chạy bằng CPU/WASM trong Web Worker; chỉ nhận ảnh có đúng một khuôn mặt được detector phát hiện.
- **Auth Flow**: Supabase Auth Integration với Real API Login, Register, Duplicate Email Check & Demo VIP Fast Login.
- **Account History**: Chỉ tải lịch sử sau đăng nhập; đăng xuất sẽ xóa dữ liệu lịch sử khỏi state và đóng modal.
- **History Actions**: Xem lại đầy đủ sticker đã lưu để tiếp tục tải và xóa từng bộ qua hộp thoại xác nhận.
- **Telegram Export Guard**: Nút xuất Telegram có cơ chế khóa chống bấm đôi (`useRef` lock) và conditional rendering, tránh gửi nhiều request trùng lặp.


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
- `src/services/`: Lớp dịch vụ API/Telegram và `faceDetectionService.ts`, quản lý Web Worker, request đang chờ và timeout 45 giây.
- `src/workers/faceDetector.worker.ts`: Khởi tạo MediaPipe FaceDetector, tải model same-origin và trả về số khuôn mặt ngoài UI thread.
- `src/hooks/`: Custom hooks (`useTheme`, `useImageUpload`, `useStickerGenerator`); `useImageUpload` chỉ cập nhật preview/file sau khi gate đạt.
- `src/components/`: Component giao diện chia thành `common`, `upload`, `processing`, `gallery`, `auth`, `history`.
  - `common/MeteorBackground.tsx`: 10 sao băng CSS với custom properties (vị trí, tốc độ, góc bay) – hiển thị ở Dark Mode.
- `public/models/`: Model `blaze_face_short_range.tflite` cùng README nguồn, SHA-256 và license.
- `src/index.css`: Bảng màu CSS Variables (Dark & Light tokens), hiệu ứng Glassmorphism & hoạt ảnh sao băng `@keyframes meteor-fly`.

## 👤 Luồng Gate Ảnh Đúng Một Khuôn Mặt

1. `useImageUpload` kiểm tra định dạng/kích thước file rồi chuyển `ImageBitmap` sang Web Worker.
2. Worker dùng BlazeFace với `minDetectionConfidence=0.6`, `minSuppressionThreshold=0.3` và delegate CPU để đếm detection.
3. `faceCount === 1` mới cho phép giữ file/preview và tiếp tục luồng tạo sticker. `0`, `>1`, lỗi worker/model, trình duyệt thiếu `createImageBitmap` hoặc quá 45 giây đều fail closed trước generation.

Model TFLite được phục vụ tại `/models`, còn WASM tải từ URL jsDelivr đã ghim `@mediapipe/tasks-vision@1.0.1`. Gate chạy trên thiết bị người dùng nên phù hợp Vercel Free, không cần GPU server và không gọi API Gemini/DeepSeek trả phí.

Giới hạn cần hiểu đúng: đây là gate UX phía client, chỉ đếm khuôn mặt mà detector nhận ra; nó không chứng minh ảnh có đúng một người, không xác minh danh tính/liveness và có thể bị bỏ qua bởi client tự gọi API backend. Nếu cần ràng buộc an ninh, phải bổ sung semantic gate phía server độc lập.

## 🕘 Luồng Lịch Sử Sticker

- Khách chưa đăng nhập không gọi API lịch sử; bấm **Lịch Sử** sẽ mở form đăng nhập.
- Frontend gửi Supabase access token cho API và chuẩn hóa `image_url`, `style_name`, kích thước cùng các trường API khác sang model TypeScript trước khi hiển thị.
- **Xem Lại** nạp bộ sticker vào gallery hiện tại; **Xóa** yêu cầu xác nhận, hiển thị trạng thái đang xử lý và chỉ bỏ card khỏi danh sách sau khi backend trả thành công.

---

> Chi tiết kiến trúc tổng quan xem tại file `../README.md` ở thư mục gốc.
