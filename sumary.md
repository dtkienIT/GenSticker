# Tóm tắt triển khai GenSticker Mobile

## Phạm vi đã thực hiện

Dự án được phát triển trên nền `kien_v6` (Expo/React Native, FastAPI và
Supabase), đồng thời kế thừa có chọn lọc định hướng pipeline từ bản web
`kien_v5`. Kế hoạch kiến trúc và lộ trình đầy đủ nằm trong `plan_app.md`.

## Thay đổi sản phẩm

- Chuyển contract từ đúng 8 output sang tạo 8 ứng viên và publish 6–8 sticker
  vượt quality/safety gate.
- Bổ sung bốn style: Chibi 2D, Chibi 3D, Plush và Pixel.
- Chuẩn bị catalog biểu cảm riêng cho người, thú cưng và đồ vật.
- Bổ sung các stage pipeline: validation, canonical, generation, split,
  quality check và moderation.
- Mobile hỗ trợ chọn style, progress/resume, preview động 6–8 sticker,
  chọn/lưu/share và giao diện Việt/Anh.

## Backend và xử lý ảnh

- Mở rộng domain/API contract với `subject_type`, `style_id`, `locale`,
  `catalog_version`, `target_count`, `published_count` và `rejected_count`.
- Thêm interface pipeline độc lập provider để sau này cắm OpenAI, Gemini hoặc
  FAL mà không làm lộ type của vendor ra API/mobile.
- Thêm kiểm tra kỹ thuật ảnh: magic bytes, loại ảnh, dung lượng, kích thước,
  normalize orientation/màu và các metric blur/ánh sáng cơ bản.
- Thêm catalog 8 semantic pose, mock scenario trả 6/7/8 output và giới hạn
  regenerate tối đa hai lần trên mỗi source.
- Thêm TTL 24 giờ cho source/intermediate và production guard đối với mock,
  quality baseline, safety policy và retention policy.
- Health readiness của Supabase kiểm tra đúng các cột product contract, tránh
  báo `ready` khi database vẫn còn schema cũ.

## Supabase và xác thực

- Cập nhật migration gốc cho contract 6–8.
- Thêm `supabase/migrations/002_product_contract.sql` để nâng cấp database
  `kien_v6` đã tồn tại mà không dựa vào `CREATE TABLE IF NOT EXISTS`.
- Giữ service-role key ở backend; mobile chỉ dùng public/publishable key.
- Thêm `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, ưu tiên key mới và vẫn tương
  thích `EXPO_PUBLIC_SUPABASE_ANON_KEY` cũ.
- Thêm `EXPO_PUBLIC_AUTH_MODE=local` cho development test qua LAN trong lúc
  Supabase thật chưa sẵn sàng.

## Kiểm thử đã chạy

- Backend: 41 test pass và Ruff pass.
- Mobile: 25 test pass, TypeScript pass và Expo lint pass.
- Android bundle từ Metro build thành công.
- Smoke test bằng `C:/Users/Admin/Downloads/test.jpg` đi hết luồng local:
  upload source, tạo job, poll đến `succeeded` và nhận 6 sticker pass / 2
  rejected.
- OpenAI-compatible endpoint và Gemini endpoint đã kết nối thành công.
- Không commit `.env`, API key, service-role key hoặc publishable key.

## Trạng thái test điện thoại

- Backend local chạy tại `http://192.168.11.214:8000`.
- Expo LAN chạy tại `exp://192.168.11.214:8081` khi máy và điện thoại cùng
  Wi-Fi.
- Chế độ hiện tại là local + mock, dùng để kiểm tra UI và toàn bộ product flow;
  chưa phải pipeline AI production.

## Việc còn lại trước khi test Supabase/AI thật

1. Áp `supabase/migrations/002_product_contract.sql` lên đúng Supabase project.
2. Bật Anonymous Sign-ins hoặc triển khai một phương thức đăng nhập người dùng
   khác; hiện Supabase trả `anonymous_provider_disabled`.
3. Chuyển `EXPO_PUBLIC_AUTH_MODE=supabase` sau khi Auth và schema đã sẵn sàng.
4. Cài provider adapter thật phía sau pipeline port; cấu hình hiện tại vẫn là
   `PIPELINE_BACKEND=mock`.
5. Chạy provider bake-off và khóa quality/safety threshold trước production.
6. Xử lý các cảnh báo dependency Expo/Metro khi có lộ trình nâng Expo phù hợp;
   không dùng `npm audit fix --force` vì sẽ gây breaking upgrade.
