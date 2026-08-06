# 🎨 GenSticker AI - Automatic AI Sticker Pack Generator

**GenSticker AI** là ứng dụng web & Telegram Bot thông minh cho phép người dùng tải lên 1 bức ảnh chân dung/avatar duy nhất và tự động sinh ra trọn **bộ 20 sticker biểu cảm** sắc nét (Vui, Buồn, Phẫn Nộ, Thả Tim, Cày Code, Quẩy Tiệc...) nhờ quy trình xử lý đồ họa AI 5 bước.

> 📌 **Branch hiện tại**: Các tính năng mới nhất và mã nguồn đã hoàn thiện được đẩy lên nhánh **`kien_v4`**.

---

## 🔥 Các Tính Năng Nổi Bật (Key Features)

1. **🎨 Hệ Thống Giao Diện Sáng/Tối (Light & Dark Theme System)**:
   - **Dark Mode**: Phong cách *Cyber Dark Glassmorphism* (`#0b0f19`) với hiệu ứng Neon rực rỡ (Purple, Pink, Cyan).
   - **Light Mode**: Phong cách *Pastel Starry Ocean* (`#eef2ff`) tươi sáng, dịu mắt với họa tiết nền lưới chấm sao, card trắng floating nổi bật.
   - **Custom ThemeToggle**: Nút chuyển mode công tắc trượt hạt đậu mềm mại kết hợp biểu tượng Mặt Trời ☀️ và Mặt Trăng 🌙.

2. **🤖 Telegram Bot 1-Click Export & Thanh Tiến Độ Kép (Dual Progress Tracking)**:
   - Xuất trọn bộ 20 sticker trực tiếp lên Telegram chỉ với 1 cú click.
   - Hiển thị **2 thanh tiến độ thời gian thực** ngay trên tin nhắn Telegram (Tiến độ tổng thể bộ sticker + Tiến độ load/upload từng sticker cá nhân).
   - Cơ chế chống trùng lặp pack 3 lớp (Persistent offset, memory lock, atomic removal).

3. **⚡ FastAPI & Supabase Backend Core**:
   - Kết nối trực tiếp PostgreSQL và Supabase Storage Bucket `stickers`.
   - API Auth & Session Persistence.
   - Tự động fallback đường dẫn pack Telegram khi gặp lỗi `SHORTNAME_OCCUPY_FAILED`.

---

## 🏗 Kiến Trúc Hệ Thống (Architecture)

```
GenSticker Web & Backend Architecture:
[ React 19 Frontend (Vite + TypeScript) ] 
       │  ├── Theme Engine (useTheme & ThemeToggle)
       │  ├── AuthModal & TelegramExportModal
       │  └── Custom Hooks (useImageUpload, useStickerGenerator)
       ▼ (REST API / Async HTTP)
[ FastAPI Backend Engine (Python 3.11+) ]
       │  ├── Telegram Service (Dual Progress Polling)
       │  ├── Sticker AI Pipeline (5-Step Graphics Engine)
       │  └── Supabase Integration (Auth, Storage & Postgres)
```

---

## 📁 Cấu Trúc Thư Mục Dự Án (File Structure)

```text
GenSticker/
├── backend/                      # Mã nguồn FastAPI Backend Service
│   ├── app/
│   │   ├── api/                  # Routers API (auth, stickers, health)
│   │   ├── services/             # Telegram service, Supabase service & AI pipeline
│   │   ├── database.py           # Kết nối Supabase SDK & Postgres
│   │   └── config.py             # Cấu hình biến môi trường
│   ├── run.py                    # Khởi chạy Uvicorn Backend server
│   └── README.md                 # Tài liệu hướng dẫn Backend
├── frontend/                     # Mã nguồn React Frontend Web App
│   ├── src/
│   │   ├── components/           # Components chia nhỏ (common, upload, processing, gallery)
│   │   ├── hooks/                # Custom hooks (useTheme, useImageUpload, useStickerGenerator)
│   │   ├── services/             # Service API client & Telegram export service
│   │   └── index.css             # CSS Variables (Theme token Sáng/Tối, Glassmorphism)
│   └── README.md                 # Tài liệu hướng dẫn Frontend
├── .env.example                  # Mẫu biến môi trường đồng bộ với .env
├── .env                          # Biến môi trường thực tế (Git ignored)
└── README.md                     # Tài liệu tổng quan dự án
```

---

## ⚡ Hướng Dẫn Khởi Chạy Dự Án Cục Bộ (Local Setup)

### 1. Cấu Hình Biến Môi Trường (`.env`)
Tạo file `.env` tại thư mục gốc bằng cách sao chép từ `.env.example`:
```bash
cp .env.example .env
```
Điền đầy đủ thông tin `SUPABASE_URL`, `SUPABASE_ANON_KEY` và `TELEGRAM_BOT_TOKEN`.

### 2. Khởi Chạy Backend (FastAPI)
```bash
# Di chuyển vào thư mục backend và kích hoạt venv
.venv\Scripts\activate

# Khởi chạy server FastAPI (Port 8000)
python backend/run.py
```
> Swagger UI documentation: **`http://localhost:8000/docs`**

### 3. Khởi Chạy Frontend (React Vite)
```bash
cd frontend
npm install
npm run dev
```
> Web App running at: **`http://localhost:5173/`**

---

## 📝 Nhánh Git & Đóng Góp

Mọi thay đổi mới nhất được cam kết và đẩy lên nhánh:
```bash
git checkout kien_v4
git pull origin kien_v4
```

*Phát triển bởi đội ngũ GenSticker AI Team.*
