# Duhat Gen Sticker MVP

Ứng dụng mobile độc lập theo PRD/SRS trong [`docs`](./docs). MVP gồm Expo SDK 54,
React Native 0.81, FastAPI và Supabase; phần AI/image processing hiện là mock có
nhãn rõ ràng.

## Cấu trúc

- `mobile/`: Expo Router, camera/thư viện, consent, job progress, preview 6–8
  sticker, chọn/lưu, native share, gỡ saved pack khỏi thư viện và hỗ trợ đa ngôn ngữ
  (i18n: Tiếng Việt 🇻🇳 & Tiếng Anh 🇬🇧 với nút chuyển đổi tức thì).
- `backend/`: FastAPI, SQLite local fallback, Supabase adapter, mock pipeline và
  test. Môi trường Python nằm tại `backend/.venv` và không được commit.
- `supabase/migrations/`: schema PostgreSQL, migration nâng cấp contract 6–8,
  transaction, RLS và private buckets.
- `docs/MVP_IMPLEMENTATION_HANDOFF.md`: tài liệu bàn giao đầy đủ cho người tiếp
  quản, đặc biệt là boundary AI và các quyết định SRS còn `TBD`.

## Chạy nhanh local

Tạo một file cấu hình dùng chung cho cả backend và mobile:

```bash
cp .env.example .env
```

Chỉnh `EXPO_PUBLIC_API_URL` trong `.env` thành địa chỉ backend mà simulator hoặc
điện thoại truy cập được. Không đặt secret backend vào biến có prefix
`EXPO_PUBLIC_` vì các biến này được đưa vào bundle mobile.

Backend:

```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
python -m pip install -r backend/requirements-dev.txt
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Mobile, ở terminal khác:

```bash
cd mobile
npm install
npm start
```

Xem [hướng dẫn backend](./backend/README.md), [hướng dẫn mobile](./mobile/README.md) và
[tài liệu bàn giao](./docs/MVP_IMPLEMENTATION_HANDOFF.md) để biết chi tiết.

> Mock hiện không xử lý ảnh nguồn và không chứng minh moderation, safety,
> fidelity hoặc chất lượng AI. Không dùng bản này cho ảnh nhạy cảm hay phát hành
> công khai trước khi hoàn tất các release blocker trong SRS.
