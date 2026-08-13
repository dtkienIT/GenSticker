# Duhat Gen Sticker — Backend MVP

FastAPI backend cho bản demo mobile độc lập. Chế độ mặc định dùng SQLite và
private local assets. Pipeline mock **không đọc, tách nền hay biến đổi ảnh nguồn**;
nó chỉ tạo đúng 8 SVG placeholder để hoàn thiện luồng sản phẩm.

> Bản mock chưa đáp ứng moderation, kiểm tra chủ thể/khuôn mặt, fidelity, bias hay
> quality gate của SRS và không đủ điều kiện phát hành công khai.

## Chạy local trong `.venv`

Từ thư mục repository `GenSticker/`:

```bash
cp .env.example .env
python3 -m venv backend/.venv
source backend/.venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend/requirements-dev.txt
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Service đọc file `.env` dùng chung ở root repository. Các đường dẫn local tương
đối như `data/gensticker.sqlite3` vẫn được resolve bên trong `backend/`.
Swagger có tại `http://localhost:8000/docs` ngoài production.

Local demo auth yêu cầu header ổn định theo lần cài app:

```text
X-Device-ID: your-device-install-id
```

ID thô được băm và chuyển thành UUID trước khi dùng làm owner/path. Đây chỉ là
auth cho demo; Supabase mode dùng Bearer JWT đã được backend xác minh.

`PIPELINE_BACKEND=mock` là pipeline duy nhất đã triển khai. Backend chủ động từ
chối khởi động khi `APP_ENV=production` còn dùng mock. Interface
`StickerPipeline` chỉ là boundary nhỏ để bạn phụ trách AI cắm adapter thật sau
này; repository Supabase không đồng nghĩa pipeline AI/moderation đã hoàn thiện.

## API

Tất cả resource route có prefix `/api/v1`:

- `POST /source-images` — multipart `file`, `consent_accepted`, `consent_version`.
- `GET /source-images/{id}`.
- `POST /generation-jobs` — JSON `{ "source_image_id": "...", "mock_scenario": "success" }`.
- `GET /generation-jobs?active=false` và `GET /generation-jobs/{id}`.
- `POST /generation-jobs/{id}/regenerate`.
- `GET /sticker-sets/{id}` và `POST /sticker-sets/{id}/save` với `sticker_ids`.
- `GET /saved-packs`, `GET /saved-packs/{id}`, `DELETE /saved-packs/{id}`.
- `GET /stickers/{id}/asset` — owner-protected SVG, không phải public static URL.
- `GET /health/live`, `GET /health/ready`.

`Idempotency-Key` 8–128 ký tự được khuyến nghị cho create job, regenerate và
save. Nếu không gửi, API tạo key mới nên retry phía client có thể tạo request mới.

`mock_scenario` hỗ trợ `failure`, `timeout`, `blocked` chỉ trong
`APP_ENV=development|test`. Production không được khởi động với mock, kể cả
scenario `success`. State của mock job được suy ra từ timestamp lưu trong DB khi
poll nên vẫn tiếp tục sau khi API restart. Không dùng in-memory background task.

Mọi lỗi dự kiến trả `application/problem+json` gồm `code`, `detail`, `retryable`
và `request_id`; response/log không chứa source filename, storage path hoặc JWT.

## Supabase mode

1. Tạo **project test riêng, sạch** và áp dụng `supabase/migrations/001_mvp.sql`
   ở root repository. Migration chủ động fail nếu `storage.objects` đã có policy,
   vì policy từ tính năng khác có thể bypass boundary FastAPI.
2. Điền biến `SUPABASE_*` trong `.env` ở root và đặt `DATA_BACKEND=supabase`.
3. Mobile đăng nhập Supabase (anonymous account cũng được cho MVP) và gửi
   `Authorization: Bearer <access-token>`.

Migration tạo bảng, deferred constraint 6–8 output, RPC transaction cho complete
job/save subset, bật RLS nhưng không tạo policy cho `anon`/`authenticated`, và tạo
hai bucket private không có client policy. Mobile không đọc PostgREST hoặc Storage
trực tiếp; mọi resource và asset phải đi qua FastAPI. Chỉ service role ở backend
truy cập dữ liệu, đồng thời mọi query vẫn lọc `owner_id`. Không áp migration này
vào project dùng chung nếu chưa tách/audit toàn bộ Storage policy.

JWT được xác minh signature, issuer, audience và expiry; project legacy HS256 cần
cấu hình riêng `SUPABASE_JWT_SECRET`, không dùng service-role key làm JWT secret.

## Giới hạn xóa và retention của prototype

`DELETE /saved-packs/{id}` hiện chỉ xóa metadata pack và các dòng selection liên
quan. Source image, generation job, preview set, sticker variants và asset file
vẫn còn. Retention và cascade deletion vẫn là `TBD-004`/`TBD-018` trong SRS; MVP
không tuyên bố thao tác này là hard-delete hoặc đáp ứng SLA xóa dữ liệu production.

## Kiểm thử

```bash
cd backend
source .venv/bin/activate
pytest
ruff check app tests
```

Test bao phủ happy path 6/7/8 output, selection/save/delete, asset ownership,
IDOR, idempotency, consent/upload validation, failure scenarios và resume job sau
restart, production mock guard, ánh xạ lỗi RPC và response 500 không lộ lỗi thô.
Test Supabase integration thật cần project test riêng và không nằm trong suite
local mặc định.
