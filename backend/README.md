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
├── data/                     # Thư mục dữ liệu cục bộ & trạng thái bot
│   ├── pending_telegram_packs.json # Trạng thái các pack đang chờ tạo
│   └── telegram_last_update_id.txt # Offset ID polling Telegram
├── run.py                    # Script khởi chạy Uvicorn server
└── README.md                 # Tài liệu hướng dẫn Backend
```

---

## ⚡ Hướng Dẫn Khởi Chạy Backend Cục Bộ

1. **Khởi động môi trường Virtualenv (Python)**:
   ```powershell
   .venv\Scripts\activate
   ```

2. **Chạy FastAPI Backend Server**:
   ```bash
   python backend/run.py
   ```
   Hoặc dùng Uvicorn trực tiếp:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Truy cập tài liệu OpenAPI / Swagger UI**:
   > 🌐 **`http://localhost:8000/docs`** (Giao diện Swagger tương tác trực tiếp các API)

---

## 🔗 Các API Chính

- `GET  /api/v1/health` : Kiểm tra trạng thái Backend & kết nối Supabase.
- `POST /api/v1/auth/login` : Đăng nhập người dùng qua Supabase Auth.
- `POST /api/v1/auth/register` : Đăng ký người dùng mới.
- `GET  /api/v1/stickers/styles` : Lấy danh sách 8 phong cách sticker AI.
- `POST /api/v1/stickers/generate` : Upload ảnh & kích hoạt tiến trình sinh 20 sticker.
- `GET  /api/v1/stickers/jobs/{job_id}` : Polling tiến trình AI 5 bước (0% -> 100%).
- `POST /api/v1/stickers/telegram-export` : Tạo request xuất sticker set sang Telegram Bot với thanh tiến độ thời gian thực.
