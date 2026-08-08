# 🎨 GenSticker AI - Automatic AI Sticker Pack Generator

**GenSticker AI** là ứng dụng web & Telegram Bot thông minh cho phép người dùng tải lên 1 bức ảnh chân dung/avatar duy nhất và tự động sinh ra trọn **bộ 20 sticker biểu cảm** sắc nét (Vui, Buồn, Phẫn Nộ, Thả Tim, Cày Code, Quẩy Tiệc...) nhờ quy trình xử lý đồ họa AI 5 bước.

> 📌 **Branch hiện tại**: Các tính năng mới nhất và mã nguồn đã hoàn thiện được đẩy lên nhánh **`kien_v4`**.

---

## 🔥 Các Tính Năng Nổi Bật (Key Features)

1. **🎨 Hệ Thống Giao Diện Sáng/Tối Đậm Nét (High-Contrast Light & Dark Theme)**:
   - **Dark Mode**: Phong cách *Cyber Dark Glassmorphism* (`#0b0f19`) với hiệu ứng Neon rực rỡ (Purple, Pink, Cyan).
   - **Light Mode**: Phong cách *Pastel Starry Ocean* (`#eef2ff`) với độ tương phản cao (High Contrast). Chữ đậm nét, màu thông báo lỗi đỏ sẫm (#991b1b), khung viền input slate rõ nét, dễ đọc trên mọi màn hình.
   - **Custom ThemeToggle**: Nút chuyển mode công tắc trượt hạt đậu mềm mại kết hợp biểu tượng Mặt Trời ☀️ và Mặt Trăng 🌙.

2. **🔐 Hệ Thống Xác Thực Supabase Auth Bảo Mật (Strict Auth & Duplicate Check)**:
   - Kiểm tra định dạng email hợp lệ & kiểm tra trùng lặp email thời gian thực qua Supabase Admin API trước khi đăng ký.
   - Chặn hoàn toàn đăng nhập tài khoản chưa đăng ký. Trả về mã lỗi chuẩn HTTP `409 Conflict`, `422 Unprocessable Entity` và `401 Unauthorized`.
   - Khôi phục nút **"Đăng Nhập Nhanh (Demo VIP User)"** chạy bằng API xác thực thật (`demo@gensticker.ai`).

3. **🤖 Telegram Bot 1-Click Export & Thanh Tiến Độ Kép (Dual Progress Tracking)**:
   - Xuất trọn bộ 20 sticker trực tiếp lên Telegram chỉ với 1 cú click.
   - Hiển thị **2 thanh tiến độ thời gian thực** ngay trên tin nhắn Telegram (Tiến độ tổng thể bộ sticker + Tiến độ load/upload từng sticker cá nhân).
   - Cơ chế chống trùng lặp pack 3 lớp (Persistent offset, memory lock, atomic removal) + **Atomic `_claim_pending_pack`** đảm bảo an toàn luồng khi nhiều Telegram update đến cùng lúc.
   - **Chống bấm đôi (Double-Launch Lock)**: Frontend khóa nút xuất Telegram bằng `useRef` lock, ngăn người dùng kích hoạt đồng thời nhiều lần request export.

4. **🕘 Lịch Sử Sticker Theo Tài Khoản & Quản Lý Xóa**:
   - Chỉ tải và hiển thị lịch sử sau khi người dùng đăng nhập; khách chưa đăng nhập sẽ được yêu cầu đăng nhập và không nhìn thấy dữ liệu cũ.
   - Nút **"Xem Lại"** khôi phục đúng bộ sticker đã lưu. Dữ liệu ảnh từ API được chuẩn hóa để xem, tải HD và xuất Telegram đều dùng đúng URL.
   - Cho phép xóa từng bộ không muốn giữ với hộp thoại xác nhận. Hệ thống dùng **soft delete** (`is_deleted`, `deleted_at`) nên không xóa nhầm dữ liệu vật lý.
   - Mọi thao tác tạo, xem và xóa lịch sử đều lấy chủ sở hữu từ Supabase JWT; client không thể tự truyền `user_id` của tài khoản khác.

5. **🌠 Hiệu Ứng Nền Sao Băng Động (Meteor Shower Background)**:
   - Component `MeteorBackground` render 10 sao băng bay chéo liên tục trên nền tối, tạo hiệu ứng không gian sống động.
   - Mỗi sao băng được cấu hình riêng biệt về vị trí, độ dài, tốc độ và độ trễ qua CSS custom properties.
   - Tự động ẩn trong Light Mode, chỉ hiển thị ở Dark Mode để giữ phong cách *Cyber Dark Glassmorphism*.

6. **⚡ FastAPI & Supabase Backend Core**:
   - Kết nối trực tiếp PostgreSQL và Supabase Storage Bucket `stickers`.
   - Quản lý người dùng qua **Supabase Auth** với cơ chế tự động xác thực email (Auto-confirm).
   - Tự động lưu bộ sticker đã tạo vào PostgreSQL (`public.sticker_packs` & `public.stickers`) theo đúng tài khoản đang đăng nhập.
   - API lịch sử có bảo vệ Bearer token: `GET /api/v1/stickers/history` và `DELETE /api/v1/stickers/history/{pack_id}`.


---

## 🏗 Kiến Trúc Hệ Thống (Architecture)

```
GenSticker Web & Backend Architecture:
[ React 19 Frontend (Vite + TypeScript) ] 
       │  ├── MeteorBackground (Shooting Star Animation Layer)
       │  ├── Theme Engine (useTheme & ThemeToggle)
       │  ├── AuthModal, HistoryModal & TelegramExportModal
       │  ├── History DTO Normalizer (snake_case → camelCase)
       │  └── Custom Hooks (useImageUpload, useStickerGenerator)
       ▼ (REST API / Async HTTP)
[ FastAPI Backend Engine (Python 3.11+) ]
       │  ├── Supabase JWT Authentication Guard
       │  ├── Telegram Service (Dual Progress Polling + Atomic Claim)
       │  ├── Sticker AI Pipeline (5-Step Graphics Engine)
       │  └── Supabase Integration (Auth, Storage, History & Postgres)
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
│   ├── migrations/               # Migration CSDL, gồm soft delete lịch sử sticker
│   ├── run.py                    # Khởi chạy Uvicorn Backend server
│   ├── requirements.txt          # Danh sách thư viện Python
│   └── README.md                 # Tài liệu hướng dẫn Backend
├── frontend/                     # Mã nguồn React Frontend Web App
│   ├── src/
│   │   ├── components/           # Components (auth, common, history, upload, processing, gallery)
│   │   │   └── common/MeteorBackground.tsx   # Hiệu ứng sao băng nền trang
│   │   ├── hooks/                # Custom hooks (useTheme, useImageUpload, useStickerGenerator)
│   │   ├── services/             # Service API client & Telegram export service
│   │   └── index.css             # CSS Variables (Theme token Sáng/Tối, Glassmorphism)
│   └── README.md                 # Tài liệu hướng dẫn Frontend
├── .env.example                  # Mẫu biến môi trường đồng bộ với .env
├── .env                          # Biến môi trường thực tế (Git ignored)
├── requirements.txt              # Danh sách thư viện Python chính
└── README.md                     # Tài liệu tổng quan dự án
```

---

## ⚡ Hướng Dẫn Khởi Chạy Dự Án Cục Bộ (Local Setup cho Máy Mới)

Dành cho người mới clone dự án về máy:

### 1. Cấu Hình Biến Môi Trường (`.env`)
Tạo file `.env` tại thư mục gốc bằng cách sao chép từ `.env.example`:
```powershell
Copy-Item .env.example .env
```
Điền tối thiểu `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` và `OPENAI_API_KEY`. Khóa OpenAI chỉ được đặt ở
backend, không dùng biến `VITE_*` để tránh lộ khóa trong bundle frontend.

### 2. Áp Dụng Migration Lịch Sử

Chạy file [`backend/migrations/001_add_sticker_pack_soft_delete.sql`](backend/migrations/001_add_sticker_pack_soft_delete.sql) trong **Supabase SQL Editor**, hoặc dùng PostgreSQL CLI:

```powershell
psql "$env:DATABASE_URL" -f backend/migrations/001_add_sticker_pack_soft_delete.sql
```

Migration có thể chạy lại an toàn và bổ sung trạng thái xóa mềm cho `public.sticker_packs`.

### 3. Khởi Tạo Môi Trường & Chạy Backend (FastAPI)
```powershell
# a. Tạo và kích hoạt môi trường ảo Python .venv
python -m venv .venv
.venv\Scripts\activate        # Trên Windows
# source .venv/bin/activate   # Trên macOS / Linux

# b. Cài đặt các thư viện Python
pip install -r requirements.txt

# c. Khởi chạy server FastAPI Backend (Port 8000)
python backend/run.py
```
> Swagger UI documentation: **`http://localhost:8000/docs`**

### 4. Cài Đặt & Khởi Chạy Frontend (React Vite)

Mở một terminal mới:

```powershell
cd frontend
npm install
npm run dev
```
> Web App running at: **`http://localhost:5173/`**

> Lưu ý: tạo sticker và lịch sử là tính năng theo tài khoản. Người dùng cần đăng nhập để tạo, xem lại hoặc xóa một bộ sticker.

---

## 📝 Nhánh Git & Đóng Góp

Mọi thay đổi mới nhất được cam kết và đẩy lên nhánh:
```bash
git checkout kien_v4
git pull origin kien_v4
```

*Phát triển bởi đội ngũ GenSticker AI Team.*
