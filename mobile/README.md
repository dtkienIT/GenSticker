# Duhat Gen Sticker Mobile MVP

Ứng dụng độc lập Expo SDK 54/Expo Router/React Native cho Android và iOS. MVP
hiện dùng pipeline mock của backend: đủ 8 SVG có nhãn `MOCK`; chưa tích hợp AI
hoặc image processing.

## Chạy local

Yêu cầu Node.js 20.19+ và backend FastAPI đang chạy. Tạo file cấu hình dùng chung
một lần từ root repository:

```bash
cp .env.example .env
cd mobile
npm install
npm start
```

Sửa `EXPO_PUBLIC_API_URL` trong root `.env` thành origin mà thiết bị truy cập được,
ví dụ IP LAN của máy phát triển. Android Emulator mặc định có thể dùng
`http://10.0.2.2:8000`; iOS Simulator dùng `http://127.0.0.1:8000`. Các npm
script của mobile nạp file này trước khi chạy Expo.

```bash
npm run android
npm run ios
npm run web
```

## Xác thực API

- Mặc định: ứng dụng tạo UUID, lưu trong SecureStore và gửi `X-Device-ID`.
- Nếu điền cả `EXPO_PUBLIC_SUPABASE_URL` và `EXPO_PUBLIC_SUPABASE_ANON_KEY`: ứng dụng dùng Supabase anonymous session, lưu access/refresh session trong SecureStore và gửi Bearer token.
- Không đưa Supabase service-role key vào ứng dụng.

Chỉ `activeJobId` (metadata khôi phục giao diện, không phải token hay URI ảnh) được lưu trong AsyncStorage. Token/session và device ID không dùng AsyncStorage.

## Luồng đã có

- Home và thư viện các pack riêng tư.
- Camera/thư viện, xem ảnh nguồn, consent và validation upload multipart.
- Hành động tạo chủ động, job polling và khôi phục `activeJobId` sau điều hướng/restart.
- Preview chỉ mở khi full-set có đúng 8 sticker; chọn/bỏ, lưu, tạo lại toàn bộ.
- Chia sẻ từng output qua native share sheet; asset được tải tạm với auth rồi xóa cache.
- Xóa pack với xác nhận và failure/loading/empty state an toàn.
- Đa ngôn ngữ (i18n): Chuyển đổi linh hoạt giữa Tiếng Việt 🇻🇳 và Tiếng Anh 🇬🇧 thông qua `LanguageToggle` pill component, hỗ trợ lưu thiết lập bằng SecureStore (`duhat.app_language`).

Ảnh nguồn không được ghi log hoặc persist vào AsyncStorage/SecureStore. Bản crop/copy tạm do ImagePicker tạo chỉ tồn tại trong state bộ nhớ; app cố gắng xóa file thuộc cache riêng sau upload thành công, khi thay ảnh hoặc rời màn hình và không xóa khi upload còn chạy. Đây là best-effort: hệ điều hành/thư viện ảnh có thể giữ cache hoặc ảnh gốc ngoài phạm vi app; backend quyết định retention sau upload.

## Kiểm tra

```bash
npm run typecheck
npm run lint
npm test
npx expo config --type public
```

Test hiện bao phủ contract dữ liệu/invariant exact-8, suy luận MIME upload, key
idempotency theo user intent, ánh xạ lỗi API an toàn, lifecycle file ảnh nguồn
và hệ thống đa ngôn ngữ i18n (dịch thuật vi/en, tham số động và fallback dictionary).
Kiểm thử native camera/share sheet vẫn cần thiết bị hoặc simulator Android/iOS.
