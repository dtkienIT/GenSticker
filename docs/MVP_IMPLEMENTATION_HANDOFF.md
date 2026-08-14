# Bàn giao triển khai MVP — Duhat Gen Sticker V1

## 0. Quy ước bàn giao

| Trường | Giá trị |
| --- | --- |
| Phiên bản | 1.0 |
| Ngày chốt chuẩn | 14/08/2026 |
| Yêu cầu | `SRS_Sticker_Generation_V1_VI.md` v1.0 |
| Kiến trúc | `Software_Architecture_Technical_Design.md` v1.0 |
| Mức dịch vụ | `SLA_Duhat_Gen_Sticker_V1_VI.md` v1.0 |
| Nguồn sản phẩm | PRD tiếng Việt, bất biến |
| Trạng thái bàn giao | Bản mẫu hoạt động; Mục tiêu V1 chưa đạt điều kiện phát hành |

Tài liệu này bàn giao mã nguồn hiện tại và đường triển khai đã chốt. Yêu cầu,
ranh giới Gemini/dịch vụ tạo ảnh, cách chọn dịch vụ tạo ảnh, ngưỡng, thời hạn lưu
giữ, nền tảng và chiến lược kiểm thử không còn là quyết định mở. Phần chưa tồn tại
trong mã nguồn được gọi rõ là **phần triển khai còn thiếu**.

## 1. Kết quả cần đạt và điều kiện sản phẩm bất biến

Mục tiêu V1 phải chứng minh xuyên suốt toàn bộ luồng:

1. Chụp/chọn một ảnh tĩnh JPEG/PNG/WebP/HEIC/HEIF.
2. Đồng ý theo `consent-v1.1`, gồm xác nhận tuổi và quyền sử dụng, cho đúng ảnh nguồn hiện tại.
3. Kiểm tra kỹ thuật/chất lượng/an toàn có thẩm quyền.
4. Đúng một chủ thể chính thuộc loại người/thú cưng/vật thể; ảnh người có đúng
   một khuôn mặt rõ và đủ xác nhận từ 18 tuổi/quyền sử dụng; dấu hiệu rõ ràng của
   nhân vật có thương hiệu/bản quyền bị chặn, còn nhân vật công chúng đi qua báo cáo/gỡ bỏ.
5. Người dùng chủ động gửi một tác vụ tạo ảnh bền vững.
6. Khi thành công, trả đúng 8 PNG Chibi 3D theo `catalog-chibi-v1`.
7. Ảnh đầu ra đạt hợp đồng định dạng/mã kiểm tra và kiểm duyệt ảnh/chữ trước khi xem trước.
8. Người dùng xem kỹ/chọn/lưu một phần và tạo lại toàn bộ.
9. Phần đã lưu nằm trong thư viện Supabase riêng tư và có thể mở lại theo chủ sở hữu.
10. Người dùng tải từng PNG đã lưu hoặc chia sẻ một PNG qua bảng chia sẻ của hệ điều hành.
11. Người dùng xóa gói và báo cáo ảnh đầu ra; thời hạn lưu giữ/gỡ bỏ chạy đúng SLA.

Không được phá các điều kiện bất biến: thiếu đồng ý/xác nhận tuổi-quyền → không tải lên/tạo ảnh; chưa
đạt toàn bộ bước kiểm tra đầu vào → không tạo tác vụ; chưa kiểm duyệt đầu ra/không
đủ đúng 8 ảnh → không công bố; sai chủ sở hữu → 404; tác vụ lỗi → không có bộ/gói;
thao tác lưu chỉ nhận phần đã chọn không rỗng.

## 2. Hiện trạng kho mã nguồn

### 2.1 Đã triển khai

| Hạng mục | Hiện trạng triển khai | Vị trí bằng chứng |
| --- | --- | --- |
| Khung ứng dụng di động | Ứng dụng Expo Router, các màn hình Trang chủ/Tạo/Tác vụ/Xem trước/Thư viện/Gói | `mobile/src/app/` |
| Trải nghiệm đầu vào | Máy ảnh/thư viện, một ảnh, đặt lại đồng ý, dọn bộ nhớ đệm ảnh nguồn | `mobile/src/app/create.tsx` |
| Xác thực hiện có | Chế độ phát triển cục bộ bằng X-Device-ID hoặc phiên/JWT Supabase ẩn danh; đây là nợ chuyển đổi, không phải kiến trúc phát hành | `mobile/src/auth/`, `backend/app/security.py` |
| API | Điểm cuối ảnh nguồn/tác vụ/tạo lại/bộ/lưu/danh sách/chi tiết/xóa/ảnh | `backend/app/api/routes.py` |
| Kiểm tra sớm khi tải lên | Không rỗng, 10 MiB, MIME/chữ ký JPEG/PNG/WebP/HEIC/HEIF | `backend/app/api/routes.py` |
| Trải nghiệm tác vụ | Thăm dò, tiến độ, ID tác vụ đang hoạt động, thử lại | mã tác vụ/nhà cung cấp phía di động |
| Quy trình mô phỏng | Đúng 8 SVG xác định và các kịch bản thành công/lỗi/quá hạn/bị chặn | `backend/app/mock_pipeline.py` |
| Lưu trữ bền vững | Bộ chuyển đổi SQLite/hệ tệp cục bộ và kho Supabase | `backend/app/adapters/` |
| Thư viện | Lưu phần đã chọn, liệt kê/xem chi tiết/xóa liên kết | tuyến/kho dữ liệu máy chủ và thư viện di động |
| Ảnh/chia sẻ | Truyền ảnh có kiểm tra chủ sở hữu/kiểm duyệt; tải tạm, chia sẻ qua hệ điều hành và dọn dẹp | tuyến ảnh máy chủ, `mobile/src/features/share.ts` |
| Bảo mật cơ bản | Xác minh JWT hiện có, điều kiện chủ sở hữu, Problem Details, tính lũy đẳng cho tác vụ/lưu | bảo mật/kho dữ liệu/kiểm thử máy chủ |
| Chốt chặn khi chạy | Môi trường sản xuất từ chối quy trình mô phỏng | `backend/app/config.py` |

### 2.2 Chưa triển khai nhưng đã đặc tả đầy đủ

| Phần còn thiếu | Nội dung phải triển khai |
| --- | --- |
| Giải mã ảnh | Pillow/pillow-heif giải mã toàn bộ, một khung hình, kích thước/điểm ảnh, EXIF/sRGB/siêu dữ liệu. |
| Danh tính cài đặt | API đăng ký/làm mới, JWT truy cập 15 phút, token làm mới băm/xoay vòng 90 ngày; gỡ Supabase Auth khỏi ứng dụng phát hành. |
| Chất lượng/chủ thể | Chỉ số OpenCV và bộ chuyển đổi Gemini theo JSON Schema `input-assessment-v1`; không nhận dạng danh tính hoặc suy luận tuổi. |
| An toàn/sở hữu trí tuệ | `consent-v1.1`, chốt dấu hiệu thương hiệu/bản quyền rõ ràng, kiểm duyệt bằng Gemini và quy trình báo cáo/gỡ bỏ. |
| Tạo ảnh thật | Bộ chuyển đổi tạo ảnh tương thích OpenAI dùng URL/khóa/mô hình trong bốn biến AI, chuẩn hóa ảnh raster/mặt nạ thành PNG. |
| Thực thi bền vững | Bảng `generation_jobs`, tiến trình Python nhận việc bằng `FOR UPDATE SKIP LOCKED`, phiên thuê/tín hiệu sống và cơ chế đối soát. |
| Lược đồ mục tiêu | Kiểm duyệt, báo cáo, phân tích, xóa, phiên thuê/lần thử/tải lên lũy đẳng. |
| Giao diện tải xuống | `expo-media-library`, nút chỉ có với ảnh đã lưu, quyền/lỗi/album/dọn dẹp. |
| Báo cáo | API/bảng/trạng thái báo cáo và vận hành Tin cậy & An toàn. |
| Phân tích sản phẩm | Nhận/lưu giữ sự kiện do hệ thống tự quản lý sau khi đồng ý; danh sách trường riêng tư được phép. |
| Lưu giữ/xóa | Dọn dẹp theo lịch, xóa cứng Storage, bằng chứng sao lưu/SLA. |
| Triển khai MVP | Docker Compose trên một máy chủ Linux, HTTPS, tệp môi trường bảo vệ, nhật ký JSON xoay vòng và CI/CD tối giản. |

## 3. Bản đồ mã nguồn và ngăn xếp công nghệ

### 3.1 Hiện trạng ứng dụng di động

- Expo `~54.0.0`, React Native `0.81.5`, React `19.1.0`.
- Expo Router `~6.0.24`, TanStack Query `^5.101.4`, Zod `^4.4.3`.
- Supabase JS `^2.112.3` đang tồn tại chỉ để lấy phiên Supabase; phải gỡ khỏi bản
  phát hành sau khi thay bằng token truy cập/làm mới của cài đặt lưu trong SecureStore. AsyncStorage tiếp tục giữ trạng thái không nhạy cảm.
- ImagePicker/FileSystem/Sharing đã được cài đặt.
- Bổ sung `expo-media-library ~18.2.1` để tải ảnh về thiết bị.

Hành vi quan trọng:

- `acceptAsset()` đặt lại sự đồng ý, kết quả kiểm tra, kết quả tạo và ý định lũy đẳng.
- `SourceCacheLifecycle` chỉ xóa tệp đệm do ứng dụng sở hữu, không bao giờ xóa ảnh
  gốc trong thư viện người dùng; không xóa khi ảnh đang được tải lên.
- Hợp đồng truyền dữ liệu chủ động loại `asset_url` từ máy chủ và dựng lại URL API
  ảnh có xác thực từ ID.
- Tệp tạm chia sẻ hiện đang cố định phần mở rộng `.svg`; đổi thành `.png`, đồng
  thời kiểm tra MIME/tên tệp phản hồi khi tích hợp ảnh đầu ra thật.
- `IS_DEMO=true` hiện được chốt lúc biên dịch; bản phát hành phải suy ra năng lực
  không mô phỏng đã được duyệt từ cấu hình dựng và không được che thông báo bản mẫu.

### 3.2 Hiện trạng máy chủ

- Python 3.11+, FastAPI/Pydantic Settings/Uvicorn.
- Lớp trừu tượng `Repository` có bộ chuyển đổi cục bộ và Supabase.
- Điểm nối `StickerPipeline` hiện công bố `snapshot()` và `render_placeholder()`
  theo hình dạng mô phỏng; cần tái cấu trúc, không gắn trực tiếp nhà cung cấp vào các phương thức này.
- Chỉ quy trình mô phỏng mới được hoàn tất đồng bộ trong tuyến/kho dữ liệu. Công
  việc thật phải rời tiến trình xử lý yêu cầu và chạy trong tiến trình nhận phiên thuê từ bảng `generation_jobs`.
- `SUPPORTED_UPLOADS` chỉ là chốt kiểm tra sớm; không phải bước kiểm tra ảnh có
  thẩm quyền và không được tự chuyển ảnh nguồn sang `ready`.

### 3.3 Hiện trạng Supabase

Tệp chuyển đổi `supabase/migrations/001_mvp.sql` tạo các bảng ảnh nguồn/sự đồng ý/
kiểm tra/tác vụ/bộ/biến thể/gói lưu, các RPC và kho riêng tư. Cần thêm một tệp
chuyển đổi tiến về trước, không sửa tệp đã chạy ở sản xuất, để bổ sung trường/bảng/
ràng buộc Mục tiêu V1, danh tính cài đặt, phiên thuê tác vụ và hàm dọn dẹp/báo cáo/phân tích.

Tệp hiện tại liên kết `owner_id` với `auth.users` và ứng dụng dùng Supabase JS để
lấy JWT. Kiến trúc mục tiêu phải chuyển khóa ngoại sang `installations`, thu hồi
quyền di động và gỡ Supabase JS/Auth. Sau chuyển đổi, Supabase chỉ giữ PostgreSQL,
Storage riêng tư và sao lưu; chỉ FastAPI/tiến trình xử lý có thông tin kết nối máy chủ.

## 4. Luồng dữ liệu và nhà cung cấp mục tiêu

```text
Ảnh nguồn từ ứng dụng di động
 -> FastAPI truyền theo luồng/mã băm/chốt kiểm tra sớm
 -> Pillow+pillow-heif xác minh/giải mã toàn bộ/kiểm tra một khung hình
 -> xoay EXIF/sRGB/loại siêu dữ liệu
 -> OpenCV kiểm tra mờ/sáng
 -> kiểm tra consent-v1.1 và xác nhận tuổi/quyền
 -> Gemini kiểm tra chủ thể/mặt/dấu hiệu thương hiệu rõ ràng
 -> Gemini kiểm duyệt đầu vào
 -> ảnh nguồn Supabase riêng tư + các kết quả kiểm tra đạt
 -> hàng generation_jobs trạng thái queued
 -> tiến trình Python trên máy chủ MVP
 -> dịch vụ tạo ảnh tại OPENAI_BASE_URL tạo 8 vị trí cố định
 -> kiểm tra PNG/alpha/dung lượng/chữ/mã kiểm tra
 -> Gemini kiểm duyệt đầu ra
 -> công bố nguyên tử đúng 8 ảnh vào Supabase riêng tư
 -> ranh giới FastAPI cho xem trước/lưu/truy cập ảnh
 -> tải xuống qua MediaLibrary hoặc chia sẻ qua hệ điều hành
```

### 4.1 Cấu hình nhà cung cấp

| Thành phần | Cấu hình cố định |
| --- | --- |
| Supabase | Dự án Singapore; chỉ PostgreSQL, Storage riêng tư và sao lưu; không Auth/Queues/Edge/AI. |
| Gemini | `GEMINI_API_KEY`; đánh giá ảnh theo `input-assessment-v1` và kiểm duyệt đầu vào/đầu ra. Model Gemini được ghim trong mã, không cấu hình qua `.env`. |
| Tạo ảnh | `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_IMAGE_MODEL`; bộ chuyển đổi ưu tiên giữ đặc trưng, khung 1024×1024 và nhận raster có alpha/mặt nạ để chuẩn hóa thành PNG trong suốt. |
| Hằng số | Lược đồ đánh giá, thời gian lưu tối đa 30 ngày, phiên bản đồng ý/danh mục/câu lệnh và thời gian chờ nằm trong mã/chính sách. |

Đây là toàn bộ bốn biến môi trường dành cho AI. Tiền tố `OPENAI_` biểu thị giao
diện tương thích, không bắt buộc dịch vụ phía sau do OpenAI vận hành. Trước phát
hành, so sánh các dịch vụ tạo ảnh bằng cùng bộ dữ liệu; cấu hình dịch vụ có chi
phí kỳ vọng thấp nhất trong số các ứng viên đạt hợp đồng, chất lượng, an toàn, SLO,
DPA, không huấn luyện và lưu giữ tối đa 30 ngày. Không có sổ đăng ký, tệp hồ sơ hay
chọn/chuyển nhà cung cấp động. Đổi URL/mô hình phải chạy lại các cổng và duyệt lại
thông báo quyền riêng tư/phiên bản đồng ý trước khi gửi dữ liệu.

### 4.2 Hợp đồng trung lập với nhà cung cấp

Kết quả đánh giá đầu vào trả về:

- `passed`, `subject_type`, `primary_subject_count`, `secondary_subject_present`;
- `visible_face_count`, `face_clear`, `face_occluded`, `face_too_small`,
  `obvious_branded_or_copyrighted_character`, `assessment_uncertain`;
- kết quả có phiên bản cho kỹ thuật, chất lượng, chủ thể, khuôn mặt, quyền xác nhận và an toàn;
- mã lý do nội bộ ổn định; phiên bản nhà cung cấp/mô hình/chính sách;
- không có phản hồi thô của nhà cung cấp trong lược đồ công khai.

Yêu cầu tạo ảnh chứa ID tác vụ/ảnh nguồn, luồng ảnh chuẩn riêng tư, phong cách,
ngôn ngữ, phiên bản danh mục/câu lệnh và tám vị trí cố định. Kết quả chứa số thứ
tự, khóa biểu cảm, siêu dữ liệu ảnh nhị phân và ID yêu cầu nhà cung cấp. API công
khai không bao giờ chứa kiểu riêng của nhà cung cấp hoặc câu lệnh.

Đánh giá đầu ra trả quyết định cho từng ảnh và cho cả bộ. Chỉ được công bố bộ khi
tám số thứ tự duy nhất đều đạt mọi bước kiểm tra.

## 5. Bàn giao API

### 5.1 Điểm cuối hiện có cần giữ

`POST /source-images`, `GET /source-images/{id}`, `POST/GET /generation-jobs`,
`GET /generation-jobs/{id}`, `POST /generation-jobs/{id}/regenerate`,
`GET /sticker-sets/{id}`, `POST /sticker-sets/{id}/save`,
`GET /saved-packs`, `GET/DELETE /saved-packs/{id}` và
`GET /stickers/{id}/asset`.

### 5.2 Điểm cuối cần bổ sung

- `POST /installations` và `POST /installations/refresh`.
- `POST /generation-jobs/{id}/cancel`.
- `POST /reports` và `GET /reports/{id}`.
- `POST /analytics/events`.
- Tách `/health/live` và `/health/ready`.

### 5.3 Quy tắc tương thích

- Tiền tố API giữ là `/api/v1` và các trường dùng `snake_case`.
- `POST /source-images` bổ sung bắt buộc `adult_or_no_person_attested=true` và
  `rights_attested=true`, đồng thời chỉ nhận `consent_version=consent-v1.1`.
- Giữ bí danh trường hiện có của ứng dụng di động trong giai đoạn chuyển đổi; chỉ
  xóa ở một phiên bản API riêng.
- Mọi thao tác thay đổi dữ liệu cần `Idempotency-Key`; tải lên hiện còn thiếu khóa này.
- Phát lại cùng khóa/nội dung trả phản hồi gốc; xung đột khóa/nội dung trả 409.
- Chéo chủ sở hữu trả 404; lỗi dùng RFC 9457 và mã SRS §5.4.
- Ảnh chuyển từ SVG trình diễn sang PNG theo hợp đồng; ứng dụng di động phải suy
  ra phần mở rộng từ `Content-Type` đã xác minh, không dùng giá trị cố định cũ.

## 6. Bàn giao chuyển đổi dữ liệu

Tạo `002_target_v1.sql` với:

1. `installations` và `installation_sessions`; chuyển `owner_id` khỏi `auth.users`
   sang `installations`, gồm mã băm/chuỗi xoay vòng/hết hạn/thu hồi token làm mới.
2. Các trường kích thước/khung hình/định dạng/ảnh chuẩn/chính sách/hết hạn của ảnh nguồn.
3. Các trường điểm/mô hình Gemini/phiên bản lược đồ/chính sách và các loại kết quả kiểm tra bắt buộc.
4. Các trường ngôn ngữ/danh mục/câu lệnh/`generation_base_url_host`/
   `generation_model`/thời hạn/`available_at`/phiên thuê/tín hiệu sống/lần thử/
   yêu cầu tạo ảnh/thử lại/hủy của tác vụ.
5. Ràng buộc đúng 8 ảnh và các trường PNG/chiều rộng/chiều cao/alpha/mã kiểm tra.
6. `moderation_decisions`, `provider_invocations`, `reports`, `analytics_events`,
   `deletion_requests`; lần gọi chỉ lưu `provider_kind`, máy chủ đích không gồm
   đường dẫn/bí mật, mô hình, ID yêu cầu, độ trễ, đơn vị tính phí và chi phí
   micro-dollar, không lưu ảnh/câu lệnh/phản hồi thô.
7. Tính lũy đẳng và mã băm yêu cầu cho tải lên/xóa/báo cáo.
8. Chỉ mục nhận việc `generation_jobs(status, available_at, lease_expires_at)` và
   câu lệnh giao dịch `FOR UPDATE SKIP LOCKED`; không cài PGMQ hay hàng đợi dịch vụ.
9. Cấu hình MIME/dung lượng kho riêng tư và RLS mặc định từ chối quyền di động.
10. Giao dịch nguyên tử để công bố đúng 8 ảnh, lưu phần đã chọn và yêu cầu xóa;
    chỉ mục/hàm dọn dẹp theo `expires_at`, SLA báo cáo và giám sát tác vụ chờ.

Tệp chuyển đổi chỉ được tiến về trước, dùng giao dịch khi được hỗ trợ, có tính lũy
đẳng ở tiền sản xuất và kèm ghi chú quay lui/tương thích. Đối tượng Storage phải
được xóa qua Storage API, không sửa trực tiếp `storage.objects`.

## 7. Bàn giao ứng dụng di động

### 7.1 Ảnh đầu vào

- Giữ trình chọn/máy ảnh một ảnh và cơ chế đặt lại sự đồng ý.
- Không dùng cắt/nén để lách kiểm tra; máy chủ là nơi quyết định có thẩm quyền.
- Ánh xạ mọi mã lỗi SRS sang nội dung Việt/Anh an toàn và thao tác khôi phục.
- Xử lý quyền `undetermined`, `denied`, `limited`, bị thu hồi, máy ảnh không sẵn
  sàng và hoàn tất tải ảnh chỉ có trên đám mây.

### 7.2 Tác vụ/xem trước/lưu

- Khôi phục tác vụ đang hoạt động theo trạng thái máy chủ sau khi khởi động lại; thăm dò 2 giây rồi 10 giây.
- Thêm hủy cho trạng thái đang xếp hàng/kiểm tra.
- Xác nhận đúng tám số thứ tự duy nhất và hợp đồng PNG; phản hồi không hợp lệ phải
  thành lỗi an toàn cho máy khách, không kết xuất một lưới thiếu ảnh.
- Mặc định chọn cả tám; tắt nút Lưu khi không chọn ảnh; thử lại giữ khóa ý định.
- Bản xem trước hết hạn sau 24 giờ; hiển thị hết hạn/lỗi thay vì âm thầm tạo lại.

### 7.3 Tải xuống/chia sẻ

- Cài/cấu hình Expo MediaLibrary với mô tả quyền chỉ thêm ảnh trên iOS.
- Nút Tải xuống chỉ có trong chi tiết gói đã lưu; mỗi thao tác tải một ảnh.
- Truyền PNG có xác thực vào bộ nhớ đệm ứng dụng, xác minh `image/png`, không rỗng
  và ETag/mã kiểm tra nếu có; lưu vào album `Duhat Gen Sticker`, dọn trong `finally`.
- Khi bị từ chối/hủy/đầy đĩa/lỗi ghi, không được báo thành công và phải cho thử lại.
- Chia sẻ một PNG từ bản xem trước/đã lưu qua Expo Sharing; dọn trong `finally`.
- Mở bảng chia sẻ của hệ điều hành chỉ phát sự kiện `native_share_sheet_invoked`.

### 7.4 Khả năng tiếp cận/bản địa hóa

Nhãn VoiceOver/TalkBack, vai trò/trạng thái ô chọn, vùng thông báo tiến độ, cỡ chữ
động 200%, vùng chạm 44pt/48dp và đầy đủ khóa Việt/Anh là yêu cầu phát hành.

## 8. Bàn giao bảo mật/quyền riêng tư

- Thay JWT Supabase bằng danh tính cài đặt do FastAPI cấp; X-Device-ID cục bộ chỉ dành cho phát triển.
- JWT truy cập sống 15 phút; token làm mới sống 90 ngày, chỉ lưu dạng băm, xoay vòng
  mỗi lần dùng và thu hồi cả chuỗi khi phát hiện phát lại. Ứng dụng lưu token trong SecureStore.
- FastAPI/proxy giới hạn tạo cài đặt 10 lượt/IP/giờ, làm mới 60 lượt/IP/giờ và áp
  dụng giới hạn theo chủ sở hữu/IP cho tải lên, tạo ảnh và báo cáo.
- Xác minh đơn vị phát hành/đối tượng/thuật toán/chữ ký/thời hạn JWT cài đặt; không bao giờ nhận chủ sở hữu từ máy khách.
- Điều kiện chủ sở hữu là bắt buộc trong mọi phương thức kho dữ liệu và kiểm thử chéo chủ sở hữu.
- Loại EXIF/XMP/GPS trước khi gửi Gemini/dịch vụ tạo ảnh và trước khi tạo ảnh đầu ra.
- Không đưa ảnh thô, URI, tên tệp, đường dẫn đối tượng, URL có chữ ký, câu lệnh hoặc dữ liệu nhà cung cấp
  vào nhật ký, dữ liệu phân tích hoặc Problem Details.
- Bí mật đến từ tệp môi trường sản xuất quyền `0600`, chỉ được đưa vào tiến trình
  `api`/`worker`, không nằm trong ảnh Docker hoặc kho mã; luân chuyển mỗi 90 ngày.
- Danh sách đích mạng ra ngoài chỉ gồm máy chủ Supabase, API Gemini và máy chủ từ `OPENAI_BASE_URL`.
- Hiện thực tác vụ lưu giữ và xóa theo SRS; xóa dữ liệu chính ≤24 giờ, bản sao lưu ≤30 ngày.
- Không bao giờ dùng nội dung sản xuất để huấn luyện/đánh giá mô hình.

## 9. Bàn giao báo cáo và phân tích sản phẩm

### 9.1 Báo cáo

Lý do được cố định trong SRS. Ghi chú là tùy chọn, tối đa 500 ký tự. Báo cáo phải
tham chiếu ảnh đầu ra mà chủ sở hữu gửi báo cáo nhìn thấy được. Máy trạng thái Tin
cậy & An toàn là `submitted -> triaged -> actioned|closed -> appealed|final`.
SLA khẩn cấp là 24 giờ, thông thường là 72 giờ. Gỡ bỏ làm mất quyền truy cập ảnh ngay.

### 9.2 Phân tích sản phẩm

Xây dựng luồng nhận sự kiện theo lô do hệ thống tự quản lý vào Supabase. Yêu cầu
người dùng đồng ý, UUID sự kiện và phiên bản lược đồ; loại trùng theo UUID sự kiện.
Từ chối sự kiện/thuộc tính không biết và mọi trường ảnh/tham chiếu bị cấm. Dữ liệu
thô lưu 90 ngày, bản tổng hợp theo ngày lưu 13 tháng.

Nhật ký bảo mật/vận hành tách khỏi dữ liệu phân tích sản phẩm và vẫn phải tuân thủ
thời hạn 30 ngày/cơ chế lược bỏ dữ liệu nhạy cảm.

## 10. Thứ tự triển khai

1. Thêm bộ giải mã/chuẩn hóa và dữ liệu mẫu/kiểm thử ảnh đầu vào.
2. Hiện thực danh tính/token cài đặt, gỡ Supabase Auth và cập nhật thông báo quyền riêng tư trong `consent-v1.1`.
3. Hiện thực bộ chuyển đổi Gemini cho đánh giá theo JSON Schema và kiểm duyệt.
4. Thêm tệp chuyển đổi mục tiêu/phiên thuê trên `generation_jobs` và tái cấu trúc cổng quy trình xử lý.
5. Đánh giá dịch vụ tạo ảnh tương thích OpenAI, cấu hình URL/khóa/mô hình của dịch vụ có chi phí thấp nhất đạt cổng; hiện thực bộ chuyển đổi và các chốt PNG/đúng 8 ảnh.
6. Tích hợp phiên thuê, thử lại, đối soát và dọn dẹp của tiến trình xử lý.
7. Hoàn thiện môi trường Supabase chỉ-lưu-trữ và kiểm thử chủ sở hữu/RLS/tải lên lũy đẳng.
8. Hiện thực hợp đồng PNG/tải xuống trên di động và kiểm thử quyền thiết bị.
9. Thêm luồng báo cáo/phân tích/xóa/lưu giữ.
10. Thêm Docker Compose/HTTPS/CI/CD/nhật ký, rồi chạy đầy đủ TDD/thiết bị/đánh giá chuẩn/bảo mật.

ID công việc và kế hoạch theo ngày nằm trong
`IMPLEMENTATION_BACKLOG_SPRINT_PLAN.md`; TDD quy định chi tiết xác minh.

## 11. Hướng dẫn chạy cục bộ

### 11.1 Máy chủ

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload
```

Giá trị `.env` cục bộ ở thư mục gốc: `APP_ENV=development`, `DATA_BACKEND=local`,
`PIPELINE_BACKEND=mock`, `ALLOW_LOCAL_DEMO_AUTH=true`. `PIPELINE_BACKEND=mock`
chỉ là công tắc của mã trình diễn hiện tại, không phải cấu hình nhà cung cấp và bị
từ chối ở bản phát hành. Bộ chuyển đổi mục tiêu chỉ đọc bốn biến AI:
`GEMINI_API_KEY`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_IMAGE_MODEL`.
Không dùng ảnh người dùng thật cho thử nghiệm tích hợp AI.

### 11.2 Ứng dụng di động

```bash
cd mobile
npm ci
npm run start
```

Đặt `EXPO_PUBLIC_API_URL` thành địa chỉ FastAPI mà thiết bị truy cập được. Bản mục
tiêu không có URL/khóa Supabase trong biến công khai; ứng dụng đăng ký phiên cài
đặt với FastAPI. Chế độ `X-Device-ID` chỉ được bật cho bản dựng trình diễn cục bộ.

### 11.3 Kiểm thử

```bash
cd backend
.venv/bin/pytest
.venv/bin/ruff check .

cd ../mobile
npm test
npm run lint
npm run typecheck
```

Hành vi máy ảnh/quyền/MediaLibrary/chia sẻ gốc cần bản dựng phát triển hoặc thiết
bị đích; riêng kiểm thử đơn vị không đủ làm bằng chứng cho các điều kiện này.

### 11.4 Xác minh mốc hiện trạng ngày 14/08/2026

- Máy chủ: `26 passed`; Ruff: `All checks passed`.
- Ứng dụng di động: `4` tệp kiểm thử, `19 passed`; kiểm tra kiểu TypeScript và Expo lint đều đạt.
- Máy chủ phát sinh cảnh báo tính năng sắp ngừng hỗ trợ từ phụ thuộc FastAPI/Python;
  không làm bộ kiểm thử thất bại nhưng phải xử lý khi khóa phụ thuộc Mục tiêu V1.
- Kết quả này chỉ chứng minh mốc bản mẫu/mô phỏng, không thay thế bằng chứng Mục
  tiêu V1 về nhà cung cấp, thiết bị thật, đánh giá chuẩn, bảo mật hoặc vận hành.

## 12. Danh sách kiểm tra hoàn tất bàn giao

### Máy chủ/AI

- [ ] Đã hiện thực giải mã toàn bộ ảnh tĩnh, chuẩn hóa và các chốt chất lượng/chủ thể/an toàn.
- [ ] Bộ chuyển đổi đánh giá/kiểm duyệt đóng an toàn; không có nhận dạng danh tính hoặc suy luận tuổi.
- [ ] Cổng trung lập hãng và tiến trình nhận phiên thuê từ `generation_jobs` thay điểm nối theo mô phỏng.
- [ ] Hồ sơ AI có chi phí thấp nhất trong các hồ sơ đạt cổng tạo đúng 8 PNG hợp lệ với chính sách tạo bù.
- [ ] Danh tính/token cài đặt hoạt động; Supabase Auth/JS không còn trong bản phát hành.
- [ ] Lược đồ mục tiêu/RLS/kho riêng tư/tính lũy đẳng/lưu giữ/xóa đều đạt.
- [ ] API báo cáo/phân tích và SLA vận hành đều đạt.
- [ ] Không thể dùng mô phỏng, xác thực cục bộ hoặc điểm cuối AI chưa phê duyệt ở tiền sản xuất/sản xuất.

### Ứng dụng di động

- [ ] Mọi lỗi ổn định và trạng thái quyền có nội dung Việt/Anh kèm thao tác xử lý.
- [ ] Khởi động lại/đối soát/hủy tác vụ và hợp đồng đúng 8 ảnh phía máy khách đều đạt.
- [ ] Lưu/thư viện/xóa tuân thủ ý nghĩa chủ sở hữu/thời hạn lưu giữ.
- [ ] Tải xuống qua MediaLibrary đạt ma trận Android/iOS.
- [ ] Chia sẻ PNG và dọn tệp tạm đạt; ý nghĩa dữ liệu phân tích chính xác.
- [ ] Khả năng tiếp cận và ngân sách tài nguyên đạt.

### Phát hành/vận hành

- [ ] Docker Compose/API/worker/HTTPS/tệp bí mật/nhật ký/CI/CD và quay lui hoạt động trên máy chủ MVP.
- [ ] Kiểm tra tổng hợp mỗi phút, cảnh báo, báo cáo SLA tháng và diễn tập SEV-1/RPO/RTO đạt `SLA_Duhat_Gen_Sticker_V1_VI.md`.
- [ ] Đã xác minh DPA/không huấn luyện/lưu giữ tối đa 30 ngày và nội dung đồng ý/khai báo quyền riêng tư cho Gemini cùng dịch vụ tạo ảnh đang cấu hình.
- [ ] Trực báo cáo, SLA xóa và diễn tập khôi phục đạt.
- [ ] Đầy đủ bằng chứng TDD tự động/thủ công/đánh giá chuẩn.
- [ ] Mã kiểm tra PRD không đổi; kiểm tra truy vết tài liệu kế tiếp và quyết định đã đóng đạt.

## 13. Quy tắc cập nhật

SRS thay đổi trước, sau đó cập nhật Kiến trúc, tài liệu Bàn giao này, Danh sách
công việc và TDD trong cùng một tập thay đổi. Trạng thái mã nguồn có thể chuyển từ
chưa triển khai sang đã triển khai mà không đổi SRS. PRD luôn chỉ đọc; quyết định
sản phẩm mới được ghi ở tài liệu kế tiếp kèm phân tích tác động, không viết lại PRD gốc.
