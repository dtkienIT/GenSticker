# 🎨 GenSticker AI - Automatic AI Sticker Pack Generator

**GenSticker AI** là ứng dụng web cho phép người dùng tải lên 1 bức ảnh chân dung/avatar duy nhất và tự động sinh ra trọn **bộ 20 sticker biểu cảm** sắc nét (Vui, Buồn, Phẫn Nộ, Thả Tim, Cày Code, Quẩy Tiệc...) nhờ quy trình xử lý đồ họa AI 5 bước.

Giao diện ứng dụng được thiết kế theo phong cách **Cyber Dark Glassmorphism** hiện đại, mượt mà và tối ưu trải nghiệm người dùng (UI/UX).

---

## 🏗 Kiến Trúc Frontend (Architecture)

Ứng dụng Frontend được xây dựng bằng **ReactJS (TypeScript) + Vite**, tuân thủ nguyên tắc **Clean Architecture** (Tách biệt hoàn toàn giữa giao diện UI và xử lý nghiệp vụ Business Logic). 

Việc phân tách này giúp mã nguồn vô cùng sạch, dễ bảo trì và có thể **tái sử dụng 90% logic (Hooks, Services, Types, Mock data)** khi chuyển đổi dự án sang **React Native (Expo)** để làm bản Mobile sau này.

```
GenSticker Web Architecture:
[ UI Layer (Components & AuthModal) ] 
       │
       ▼ (gọi)
[ Custom Hooks (useImageUpload, useStickerGenerator, useAuth) ]
       │
       ▼ (gọi)
[ Service Layer (StickerService, AuthService) ]
       │
       ▼ (trả về)
[ Data Types / Session Persistence (localStorage, Types & Mock Pipeline) ]
```

---

## 📁 Cấu Trúc Thư Mục Dự Án (File Structure)

```text
GenSticker/
├── frontend/                     # Thư mục mã nguồn Frontend Web
│   ├── public/                   # Tài nguyên tĩnh (Favicon, Icons)
│   ├── src/
│   │   ├── components/           # Các UI Components được chia nhỏ
│   │   │   ├── common/           # Component dùng chung (Header, Footer, ProgressBar)
│   │   │   ├── upload/           # Giao diện kéo thả tải ảnh (ImageUploader, StyleSelector)
│   │   │   ├── processing/       # Giao diện tiến trình AI 5 bước (ProcessingPipeline)
│   │   │   └── gallery/          # Giao diện bộ sưu tập kết quả (StickerGrid, StickerCard, StickerModal)
│   │   ├── hooks/                # Quản lý State Machine & Logic nghiệp vụ
│   │   │   ├── useImageUpload.ts # Logic validate file, preview ảnh & drag-drop
│   │   │   └── useStickerGenerator.ts # State machine quản lý pipeline sinh sticker
│   │   ├── services/             # Lớp dịch vụ API / Mock async processing
│   │   │   └── stickerService.ts # Giả lập tiến trình AI 5 bước & tải file HD
│   │   ├── mock/                 # Dữ liệu giả lập 20 sticker & 8 phong cách nghệ thuật
│   │   │   └── mockStickers.ts
│   │   ├── types/                # Định nghĩa kiểu dữ liệu TypeScript (Interfaces)
│   │   │   └── sticker.ts
│   │   ├── App.tsx               # Component chính điều phối các màn hình
│   │   ├── index.css             # Design System (CSS Variables, Glassmorphism, Animations)
│   │   └── main.tsx              # Entry point React Vite
│   ├── package.json              # Khai báo Dependencies
│   └── vite.config.ts            # Cấu hình Vite bundler
├── .gitignore                    # Cấu hình git ignore (loại trừ .venv, node_modules, .env)
└── README.md                     # Tài liệu hướng dẫn dự án
```

---

## ⚡ Hướng Dẫn Khởi Chạy Dự Án Cục Bộ (Local Setup)

Dành cho các thành viên trong team sau khi `clone` repository về máy:

### 1. Yêu cầu môi trường (Prerequisites)
- **Node.js**: Phiên bản `>= 18.0.0` (khuyên dùng v20 LTS)
- **npm** hoặc **yarn**

### 2. Các bước cài đặt & Chạy ứng dụng

1. **Mở terminal và di chuyển vào thư mục `frontend`**:
   ```bash
   cd frontend
   ```

2. **Cài đặt các gói phụ thuộc (Dependencies)**:
   ```bash
   npm install
   ```

3. **Khởi chạy ứng dụng ở chế độ Development**:
   ```bash
   npm run dev
   ```
   > 🚀 Ứng dụng sẽ chạy tại địa chỉ: **`http://localhost:5173/`**

4. **Kiểm tra biên dịch & Build bản Production**:
   ```bash
   npm run build
   ```
   > Lệnh này sẽ chạy kiểm tra TypeScript (`tsc -b`) và đóng gói tài nguyên vào thư mục `dist/`.

---

## 🎨 Phong Cách Thiết Kế (Design System)

- **Theme**: Cyber Dark Mode chủ đạo (`#0b0f19`) kết hợp hiệu ứng neon lấp lánh (Purple `#7c3aed`, Pink `#ec4899`, Cyan `#06b6d4`).
- **Glassmorphism**: Sử dụng lớp phủ kính mờ `backdrop-filter: blur(12px)` và viền phản quang `rgba(255, 255, 255, 0.1)`.
- **Typography**: Google Fonts (*Plus Jakarta Sans* & *Outfit*).
- **Phản hồi tương tác (UX)**:
  - Thanh tiến trình động hiển thị 5 bước AI chuyên sâu.
  - Pháo hoa ăn mừng (`canvas-confetti`) khi sinh sticker xong.
  - Modal soi thông số kỹ thuật (Resolution 1024x1024, PNG Transparent, KB size).
  - Tìm kiếm & Lọc sticker theo tag/cảm xúc.

---

## 🔄 Luồng Hoạt Động (Application Workflow)

1. **Upload Màn Hình**: Người dùng kéo thả ảnh hoặc chọn ảnh mẫu (Chibi, Mèo Máy, Anime).
2. **Chọn Style**: Chọn 1 trong 8 phong cách nghệ thuật (3D Chibi Cutie, Anime Kawaii, Cyberpunk Neon, Pixel Art...).
3. **Pipeline Progress**: Bấm nút **"Tạo Bộ 20 Sticker Ngay"** -> Ứng dụng mô phỏng 5 bước AI trong ~12 giây.
4. **Kết Quả**: Hiển thị bộ 20 Sticker -> Hỗ trợ tải từng sticker HD hoặc tải trọn bộ (.PNG zip/batch).

---

## 📝 Đóng Góp & Phát Triển Tiếp Theo

- **Tích hợp Backend API**: Thay thế hàm giả lập trong `src/services/stickerService.ts` bằng lệnh gọi API `axios/fetch` thực tế tới Backend FastAPI/Python.
- **Phát triển Mobile (React Native)**: Copy các thư mục `types/`, `hooks/`, `services/`, `mock/` sang dự án Expo để xây dựng ứng dụng di động iOS/Android.

---

*Phát triển bởi đội ngũ GenSticker AI Team.*
