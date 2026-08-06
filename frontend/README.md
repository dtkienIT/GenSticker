# 🚀 GenSticker AI - Frontend Web App (React 19 + TypeScript)

Thư mục này chứa toàn bộ mã nguồn **Frontend Web Application** cho dự án **GenSticker AI**.

---

## 🛠 Công Nghệ Sử Dụng

- **Core Framework**: React 19 + TypeScript
- **Build Tool**: Vite (HMR siêu nhanh)
- **Styling**: Vanilla CSS (Design System phong cách Cyber Dark Glassmorphism & Pastel Starry Light Mode)
- **Icons**: `lucide-react`
- **Effects**: `canvas-confetti`
- **Theme System**: Custom `useTheme` hook với `localStorage` persistence & công tắc trượt `ThemeToggle`.

---

## ⚡ Hướng Dẫn Nhanh Cho Developer

```bash
# 1. Cài đặt thư viện
npm install

# 2. Chạy Dev Server tại http://localhost:5173
npm run dev

# 3. Kiểm tra mã nguồn & Build bản Production
npm run build
```

---

## 🏛 Kiến Trúc & Cấu Trúc File (`src/`)

- `src/types/`: Khai báo kiểu TypeScript (`StickerItem`, `GenerationState`, `ProcessStep`, `StickerStyle`).
- `src/mock/`: Dữ liệu giả lập 20 sticker & 5 bước pipeline xử lý AI.
- `src/services/`: Lớp dịch vụ `StickerService` đóng gói logic async, Telegram export, và tải file.
- `src/hooks/`: Custom hooks (`useTheme`, `useImageUpload`, `useStickerGenerator`) xử lý logic độc lập với UI.
- `src/components/`: Component giao diện chia thành `common`, `upload`, `processing`, `gallery`, `auth`.
- `src/index.css`: Bảng màu CSS Variables (Dark & Light tokens) & hiệu ứng Glassmorphism.

---

> Chi tiết kiến trúc tổng quan xem tại file `../README.md` ở thư mục gốc.
