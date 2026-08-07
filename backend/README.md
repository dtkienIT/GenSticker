# ⚡ GenSticker AI - FastAPI Backend Engine

Thư mục này chứa mã nguồn **Backend API Service** được viết bằng **FastAPI** và kết nối trực tiếp với **Supabase (PostgreSQL Database & Storage)** cũng như dịch vụ **Telegram Bot Service**.

---

## 🏗 Cấu Trúc File Backend (`backend/`)

```text
backend/
├── app/
│   ├── main.py               # Application Entry Point & CORS Setup
│   ├── config.py             # Đọc biến môi trường từ .env
│   ├── database.py           # Kết nối Supabase SDK & SQLAlchemy Postgres
│   ├── api/                  # Danh sách Router API
│   │   ├── router.py         # Router tổng gom các sub-router
│   │   ├── health.py         # Health Check API (/api/v1/health)
│   │   ├── auth.py           # Đăng nhập / Đăng ký API (/api/v1/auth/*)
│   │   └── stickers.py       # Tải ảnh, sinh sticker & Polling tiến trình (/api/v1/stickers/*)
│   ├── models/               # Schemas Pydantic kiểm tra kiểu dữ liệu
│   │   └── schemas.py
│   └── services/             # Logic xử lý dịch vụ & AI Pipeline
│       ├── supabase_service.py # Upload file lên Supabase Storage 'stickers'
│       ├── telegram_service.py # Xử lý Telegram Bot, Polling & Dual Progress Bars
│       └── sticker_pipeline.py # State machine tiến trình AI 5 bước
├── migrations/               # Migration PostgreSQL/Supabase
│   └── 001_add_sticker_pack_soft_delete.sql # Trạng thái xóa mềm cho lịch sử
├── data/                     # Thư mục dữ liệu cục bộ & trạng thái bot
│   ├── pending_telegram_packs.json # Trạng thái các pack đang chờ tạo
│   └── telegram_last_update_id.txt # Offset ID polling Telegram
├── requirements.txt          # Danh sách gói thư viện Python backend
├── run.py                    # Script khởi chạy Uvicorn server
└── README.md                 # Tài liệu hướng dẫn Backend
```

---

## ⚡ Hướng Dẫn Khởi Chạy Backend Cục Bộ (Cho Máy Mới)

Trước khi chạy backend, sao chép `.env.example` thành `.env` ở thư mục gốc và cấu hình `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` cùng các biến Telegram cần dùng.

1. **Khởi tạo và kích hoạt môi trường Virtualenv (Python)**:
   ```powershell
   # Tạo virtualenv .venv tại thư mục gốc nếu chưa có
   python -m venv .venv

   # Kích hoạt venv
   .venv\Scripts\activate        # Trên Windows
   # source .venv/bin/activate   # Trên macOS / Linux
   ```

2. **Cài đặt thư viện phụ thuộc**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Áp dụng migration lịch sử** bằng Supabase SQL Editor hoặc PostgreSQL CLI:
   ```powershell
   psql "$env:DATABASE_URL" -f backend/migrations/001_add_sticker_pack_soft_delete.sql
   ```

4. **Chạy FastAPI Backend Server**:
   ```bash
   python backend/run.py
   ```
   Hoặc dùng Uvicorn trực tiếp:
   ```bash
   cd backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. **Truy cập tài liệu OpenAPI / Swagger UI**:
   > 🌐 **`http://localhost:8000/docs`** (Giao diện Swagger tương tác trực tiếp các API)

---

## 🔗 Các API Chính

- `GET  /api/v1/health` : Kiểm tra trạng thái Backend & kết nối Supabase.
- `POST /api/v1/auth/login` : Đăng nhập người dùng qua Supabase Auth. Trả về JWT Token & thông tin Profile.
- `POST /api/v1/auth/register` : Đăng ký tài khoản mới với kiểm tra định dạng email và kiểm tra trùng lặp email thời gian thực.
- `GET  /api/v1/stickers/styles` : Lấy danh sách 8 phong cách sticker AI.
- `POST /api/v1/stickers/generate` : Upload ảnh & kích hoạt tiến trình sinh 20 sticker cho tài khoản trong Bearer token.
- `GET  /api/v1/stickers/jobs/{job_id}` : Polling tiến trình AI 5 bước (0% -> 100%).
- `GET  /api/v1/stickers/history` : Lấy các bộ sticker chưa xóa của tài khoản trong Bearer token.
- `DELETE /api/v1/stickers/history/{pack_id}` : Xóa mềm một bộ sticker nếu bộ đó thuộc tài khoản đang đăng nhập.
- `POST /api/v1/telegram/export` : Tạo request xuất sticker set sang Telegram Bot với thanh tiến độ thời gian thực.

Ba API `generate`, `history` và `DELETE history/{pack_id}` yêu cầu header `Authorization: Bearer <supabase_access_token>`. Backend xác thực token và tự lấy `user_id`; không nhận quyền sở hữu lịch sử từ query/body của client.
