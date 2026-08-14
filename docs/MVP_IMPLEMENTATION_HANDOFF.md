# Bàn giao triển khai MVP — Duhat Gen Sticker V1

## 0. Quy ước bàn giao

| Trường | Giá trị |
| --- | --- |
| Phiên bản | 1.0 |
| Ngày chốt chuẩn | 14/08/2026 |
| Yêu cầu | `SRS_Sticker_Generation_V1_VI.md` v1.0 |
| Kiến trúc | `Software_Architecture_Technical_Design.md` v1.0 |
| Nguồn sản phẩm | PRD tiếng Việt, bất biến |
| Trạng thái bàn giao | Bản mẫu hoạt động; Mục tiêu V1 chưa đạt điều kiện phát hành |

Tài liệu này bàn giao mã nguồn hiện tại và đường triển khai đã chốt. Yêu cầu, nhà
cung cấp, ngưỡng, thời hạn lưu giữ, nền tảng và chiến lược kiểm thử không còn là
quyết định mở; phần chưa tồn tại trong mã nguồn được gọi rõ là **phần triển khai còn thiếu**.

## 1. Kết quả cần đạt và điều kiện sản phẩm bất biến

Mục tiêu V1 phải chứng minh xuyên suốt toàn bộ luồng:

1. Chụp/chọn một ảnh tĩnh JPEG/PNG/WebP/HEIC/HEIF.
2. Đồng ý theo `consent-v1.0` cho đúng ảnh nguồn hiện tại.
3. Kiểm tra kỹ thuật/chất lượng/an toàn có thẩm quyền.
4. Đúng một chủ thể chính thuộc loại người/thú cưng/vật thể; ảnh người có đúng
   một khuôn mặt người lớn rõ, không phải người nổi tiếng; nhân vật có thương hiệu/bản quyền bị chặn.
5. Người dùng chủ động gửi một tác vụ tạo ảnh bền vững.
6. Khi thành công, trả đúng 8 PNG Chibi 3D theo `catalog-chibi-v1`.
7. Ảnh đầu ra đạt hợp đồng định dạng/mã kiểm tra và kiểm duyệt ảnh/chữ trước khi xem trước.
8. Người dùng xem kỹ/chọn/lưu một phần và tạo lại toàn bộ.
9. Phần đã lưu nằm trong thư viện Supabase riêng tư và có thể mở lại theo chủ sở hữu.
10. Người dùng tải từng PNG đã lưu hoặc chia sẻ một PNG qua bảng chia sẻ của hệ điều hành.
11. Người dùng xóa gói và báo cáo ảnh đầu ra; thời hạn lưu giữ/gỡ bỏ chạy đúng SLA.

Không được phá các điều kiện bất biến: chưa đồng ý → không tải lên/tạo ảnh; chưa
đạt toàn bộ bước kiểm tra đầu vào → không tạo tác vụ; chưa kiểm duyệt đầu ra/không
đủ đúng 8 ảnh → không công bố; sai chủ sở hữu → 404; tác vụ lỗi → không có bộ/gói;
thao tác lưu chỉ nhận phần đã chọn không rỗng.

## 2. Hiện trạng kho mã nguồn

### 2.1 Đã triển khai

| Hạng mục | Hiện trạng triển khai | Vị trí bằng chứng |
| --- | --- | --- |
| Khung ứng dụng di động | Ứng dụng Expo Router, các màn hình Trang chủ/Tạo/Tác vụ/Xem trước/Thư viện/Gói | `mobile/src/app/` |
| Trải nghiệm đầu vào | Máy ảnh/thư viện, một ảnh, đặt lại đồng ý, dọn bộ nhớ đệm ảnh nguồn | `mobile/src/app/create.tsx` |
| Xác thực | Chế độ phát triển cục bộ bằng X-Device-ID hoặc phiên/JWT Supabase ẩn danh | `mobile/src/auth/`, `backend/app/security.py` |
| API | Điểm cuối ảnh nguồn/tác vụ/tạo lại/bộ/lưu/danh sách/chi tiết/xóa/ảnh | `backend/app/api/routes.py` |
| Kiểm tra sớm khi tải lên | Không rỗng, 10 MiB, MIME/chữ ký JPEG/PNG/WebP/HEIC/HEIF | `backend/app/api/routes.py` |
| Trải nghiệm tác vụ | Thăm dò, tiến độ, ID tác vụ đang hoạt động, thử lại | mã tác vụ/nhà cung cấp phía di động |
| Quy trình mô phỏng | Đúng 8 SVG xác định và các kịch bản thành công/lỗi/quá hạn/bị chặn | `backend/app/mock_pipeline.py` |
| Lưu trữ bền vững | Bộ chuyển đổi SQLite/hệ tệp cục bộ và kho Supabase | `backend/app/adapters/` |
| Thư viện | Lưu phần đã chọn, liệt kê/xem chi tiết/xóa liên kết | tuyến/kho dữ liệu máy chủ và thư viện di động |
| Ảnh/chia sẻ | Truyền ảnh có kiểm tra chủ sở hữu/kiểm duyệt; tải tạm, chia sẻ qua hệ điều hành và dọn dẹp | tuyến ảnh máy chủ, `mobile/src/features/share.ts` |
| Bảo mật cơ bản | Xác minh JWT, điều kiện chủ sở hữu, Problem Details, tính lũy đẳng cho tác vụ/lưu | bảo mật/kho dữ liệu/kiểm thử máy chủ |
| Chốt chặn khi chạy | Môi trường sản xuất từ chối quy trình mô phỏng | `backend/app/config.py` |

### 2.2 Chưa triển khai nhưng đã đặc tả đầy đủ

| Phần còn thiếu | Nội dung phải triển khai |
| --- | --- |
| Giải mã ảnh | Pillow/pillow-heif giải mã toàn bộ, một khung hình, kích thước/điểm ảnh, EXIF/sRGB/siêu dữ liệu. |
| Chất lượng/chủ thể | Chỉ số OpenCV và ngưỡng chủ thể/mặt/tuổi/người nổi tiếng của AWS Rekognition. |
| An toàn/sở hữu trí tuệ | Kiểm duyệt AWS/Custom Labels và kiểm duyệt ảnh/chữ OpenAI, đóng an toàn. |
| Tạo ảnh thật | Cổng trung lập với nhà cung cấp, OpenAI `gpt-image-1.5`, ảnh PNG. |
| Thực thi bền vững | Supabase Queue/PGMQ, tiến trình xử lý ECS riêng và cơ chế đối soát. |
| Lược đồ mục tiêu | Kiểm duyệt, báo cáo, phân tích, xóa, phiên thuê/lần thử/tải lên lũy đẳng. |
| Giao diện tải xuống | `expo-media-library`, nút chỉ có với ảnh đã lưu, quyền/lỗi/album/dọn dẹp. |
| Báo cáo | API/bảng/trạng thái báo cáo và vận hành Tin cậy & An toàn. |
| Phân tích sản phẩm | Nhận/lưu giữ sự kiện do hệ thống tự quản lý sau khi đồng ý; danh sách trường riêng tư được phép. |
| Lưu giữ/xóa | Dọn dẹp theo lịch, xóa cứng Storage, bằng chứng sao lưu/SLA. |
| Triển khai sản xuất | Docker/ECS/ALB/ECR/Secrets/CloudWatch/CI/CD. |

## 3. Bản đồ mã nguồn và ngăn xếp công nghệ

### 3.1 Hiện trạng ứng dụng di động

- Expo `~54.0.0`, React Native `0.81.5`, React `19.1.0`.
- Expo Router `~6.0.24`, TanStack Query `^5.101.4`, Zod `^4.4.3`.
- Supabase JS `^2.112.3`, SecureStore, AsyncStorage.
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
  việc thật phải rời tiến trình xử lý yêu cầu và chạy trong tiến trình PGMQ.
- `SUPPORTED_UPLOADS` chỉ là chốt kiểm tra sớm; không phải bước kiểm tra ảnh có
  thẩm quyền và không được tự chuyển ảnh nguồn sang `ready`.

### 3.3 Hiện trạng Supabase

Tệp chuyển đổi `supabase/migrations/001_mvp.sql` tạo các bảng ảnh nguồn/sự đồng ý/
kiểm tra/tác vụ/bộ/biến thể/gói lưu, các RPC và kho riêng tư. Cần thêm một tệp
chuyển đổi tiến về trước, không sửa tệp đã chạy ở sản xuất, để bổ sung trường/bảng/
ràng buộc Mục tiêu V1, PGMQ và hàm dọn dẹp/báo cáo/phân tích.

Ứng dụng di động gọi FastAPI để lấy dữ liệu nghiệp vụ. Supabase JS chỉ dùng để
lấy JWT ẩn danh; bí mật máy chủ chỉ tồn tại ở phía máy chủ.

## 4. Luồng dữ liệu và nhà cung cấp mục tiêu

```text
Ảnh nguồn từ ứng dụng di động
 -> FastAPI truyền theo luồng/mã băm/chốt kiểm tra sớm
 -> Pillow+pillow-heif xác minh/giải mã toàn bộ/kiểm tra một khung hình
 -> xoay EXIF/sRGB/loại siêu dữ liệu
 -> OpenCV kiểm tra mờ/sáng
 -> AWS Rekognition kiểm tra nhãn/mặt/tuổi/người nổi tiếng/kiểm duyệt/nhãn tùy chỉnh
 -> OpenAI kiểm duyệt
 -> ảnh nguồn Supabase riêng tư + các kết quả kiểm tra đạt
 -> thông điệp tạo ảnh PGMQ
 -> tiến trình xử lý ECS
 -> OpenAI Images gpt-image-1.5, 8 vị trí cố định
 -> kiểm tra PNG/alpha/dung lượng/chữ/mã kiểm tra
 -> AWS + OpenAI kiểm duyệt đầu ra
 -> công bố nguyên tử đúng 8 ảnh vào Supabase riêng tư
 -> ranh giới FastAPI cho xem trước/lưu/truy cập ảnh
 -> tải xuống qua MediaLibrary hoặc chia sẻ qua hệ điều hành
```

### 4.1 Cấu hình nhà cung cấp

| Nhà cung cấp | Cấu hình cố định |
| --- | --- |
| AWS Rekognition | Khu vực `ap-southeast-1`; áp dụng mọi ngưỡng SRS §8.2. |
| AWS Custom Labels | ARN có phiên bản đã phê duyệt; độ tin cậy ≥90%. |
| OpenAI Images | `/v1/images/edits` chính thức, `gpt-image-1.5`, mức giữ đặc trưng/chất lượng cao, 1024×1024, PNG trong suốt. |
| OpenAI Moderation | `/v1/moderations` chính thức, `omni-moderation-latest`, kiểm duyệt ảnh/chữ. |
| Supabase | Dự án Singapore, xác thực ẩn danh, kho riêng tư, hàng đợi PGMQ cơ bản. |

Lưu trữ theo khu vực Singapore của OpenAI yêu cầu quyền kiểm soát dữ liệu nâng cao
đã được phê duyệt; cơ chế này không cam kết suy luận chỉ diễn ra tại Singapore.
Nội dung đồng ý/thông báo quyền riêng tư khi phát hành phải nêu việc chuyển dữ liệu
cho nhà cung cấp. Cấm mọi proxy không chính thức ở tiền sản xuất và sản xuất.

### 4.2 Hợp đồng trung lập với nhà cung cấp

Kết quả đánh giá đầu vào trả về:

- `passed`, `subject_type`, `subject_count`, `face_count`;
- kết quả kiểm tra có phiên bản cho kỹ thuật, chất lượng, chủ thể, tuổi, người nổi tiếng, thương hiệu và an toàn;
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

- `POST /generation-jobs/{id}/cancel`.
- `POST /reports` và `GET /reports/{id}`.
- `POST /analytics/events`.
- Tách `/health/live` và `/health/ready`.

### 5.3 Quy tắc tương thích

- Tiền tố API giữ là `/api/v1` và các trường dùng `snake_case`.
- Giữ bí danh trường hiện có của ứng dụng di động trong giai đoạn chuyển đổi; chỉ
  xóa ở một phiên bản API riêng.
- Mọi thao tác thay đổi dữ liệu cần `Idempotency-Key`; tải lên hiện còn thiếu khóa này.
- Phát lại cùng khóa/nội dung trả phản hồi gốc; xung đột khóa/nội dung trả 409.
- Chéo chủ sở hữu trả 404; lỗi dùng RFC 9457 và mã SRS §5.4.
- Ảnh chuyển từ SVG trình diễn sang PNG theo hợp đồng; ứng dụng di động phải suy
  ra phần mở rộng từ `Content-Type` đã xác minh, không dùng giá trị cố định cũ.

## 6. Bàn giao chuyển đổi dữ liệu

Tạo `002_target_v1.sql` với:

1. Các trường kích thước/khung hình/định dạng/ảnh chuẩn/chính sách/hết hạn của ảnh nguồn.
2. Các trường điểm/nhà cung cấp/mô hình/chính sách và các loại kết quả kiểm tra bắt buộc.
3. Các trường ngôn ngữ/danh mục/câu lệnh/thời hạn/phiên thuê/lần thử/yêu cầu nhà cung cấp/thử lại/hủy của tác vụ.
4. Ràng buộc đúng 8 ảnh và các trường PNG/chiều rộng/chiều cao/alpha/mã kiểm tra.
5. `moderation_decisions`, `reports`, `analytics_events`, `deletion_requests`.
6. Tính lũy đẳng và mã băm yêu cầu cho tải lên/xóa/báo cáo.
7. Phần mở rộng PGMQ/hàng đợi cơ bản `sticker-generation`, ứng dụng di động không truy cập được.
8. Cấu hình MIME/dung lượng kho riêng tư và RLS/quyền mục tiêu.
9. RPC nguyên tử để xếp hàng, công bố đúng 8 ảnh, lưu phần đã chọn và yêu cầu xóa.
10. Chỉ mục/hàm dọn dẹp theo `expires_at`, SLA báo cáo và giám sát hàng đợi.

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

- Dùng JWT Supabase ẩn danh ở sản xuất; X-Device-ID cục bộ chỉ dành cho phát triển.
- Thêm Turnstile/CAPTCHA hoặc biện pháp chống lạm dụng được duyệt vào luồng đăng nhập ẩn danh.
- Xác minh đơn vị phát hành/đối tượng/thuật toán/chữ ký/thời hạn JWT; không bao giờ nhận chủ sở hữu từ máy khách.
- Điều kiện chủ sở hữu là bắt buộc trong mọi phương thức kho dữ liệu và kiểm thử chéo chủ sở hữu.
- Loại EXIF/XMP/GPS trước khi gửi AWS/OpenAI và trước khi tạo ảnh đầu ra.
- Không đưa ảnh thô, URI, tên tệp, đường dẫn đối tượng, URL có chữ ký, câu lệnh hoặc dữ liệu nhà cung cấp
  vào nhật ký, dữ liệu phân tích hoặc Problem Details.
- Bí mật đến từ Secrets Manager/vai trò tác vụ; luân chuyển mỗi 90 ngày.
- Danh sách đích mạng ra ngoài chỉ gồm máy chủ Supabase/AWS/OpenAI chính thức.
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
2. Hiện thực cổng đánh giá và bộ chuyển đổi kiểm duyệt AWS/OpenAI.
3. Thêm tệp chuyển đổi mục tiêu/PGMQ và tái cấu trúc cổng quy trình xử lý.
4. Hiện thực tạo ảnh OpenAI và các chốt PNG/đầu ra/đúng 8 ảnh.
5. Tích hợp phiên thuê, thử lại, đối soát và dọn dẹp của tiến trình xử lý.
6. Hoàn thiện môi trường Supabase và kiểm thử chủ sở hữu/RLS/tải lên lũy đẳng.
7. Hiện thực hợp đồng PNG/tải xuống trên di động và kiểm thử quyền thiết bị.
8. Thêm luồng báo cáo/phân tích/xóa/lưu giữ.
9. Thêm Docker/ECS/CI/CD/khả năng quan sát/diễn tập khôi phục.
10. Chạy đầy đủ điều kiện TDD/thiết bị/đánh giá chuẩn/bảo mật trước phát hành.

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
`PIPELINE_BACKEND=mock`, `ALLOW_LOCAL_DEMO_AUTH=true`. Không dùng ảnh người dùng
thật cho thử nghiệm proxy/nhà cung cấp.

### 11.2 Ứng dụng di động

```bash
cd mobile
npm ci
npm run start
```

Đặt `EXPO_PUBLIC_API_URL` thành địa chỉ FastAPI mà thiết bị truy cập được. URL và
khóa công khai Supabase bật JWT ẩn danh; để trống sẽ dùng xác thực trình diễn cục bộ.

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
- [ ] AWS Rekognition/Custom Labels và kiểm duyệt OpenAI đóng an toàn.
- [ ] Cổng trung lập với nhà cung cấp và tiến trình PGMQ thay điểm nối theo mô phỏng.
- [ ] OpenAI Images tạo đúng 8 PNG hợp lệ với chính sách tạo bù.
- [ ] Lược đồ mục tiêu/RLS/kho riêng tư/tính lũy đẳng/lưu giữ/xóa đều đạt.
- [ ] API báo cáo/phân tích và SLA vận hành đều đạt.
- [ ] Không thể dùng mô phỏng/xác thực cục bộ/proxy ở tiền sản xuất/sản xuất.

### Ứng dụng di động

- [ ] Mọi lỗi ổn định và trạng thái quyền có nội dung Việt/Anh kèm thao tác xử lý.
- [ ] Khởi động lại/đối soát/hủy tác vụ và hợp đồng đúng 8 ảnh phía máy khách đều đạt.
- [ ] Lưu/thư viện/xóa tuân thủ ý nghĩa chủ sở hữu/thời hạn lưu giữ.
- [ ] Tải xuống qua MediaLibrary đạt ma trận Android/iOS.
- [ ] Chia sẻ PNG và dọn tệp tạm đạt; ý nghĩa dữ liệu phân tích chính xác.
- [ ] Khả năng tiếp cận và ngân sách tài nguyên đạt.

### Phát hành/vận hành

- [ ] ECS/API/tiến trình xử lý/Secrets/CloudWatch/CI/CD và quay lui hoạt động.
- [ ] Đã xác minh ZDR/nơi lưu trú dữ liệu/DPA/nội dung đồng ý/khai báo quyền riêng tư.
- [ ] Trực báo cáo, SLA xóa và diễn tập khôi phục đạt.
- [ ] Đầy đủ bằng chứng TDD tự động/thủ công/đánh giá chuẩn.
- [ ] Mã kiểm tra PRD không đổi; kiểm tra truy vết tài liệu kế tiếp và quyết định đã đóng đạt.

## 13. Quy tắc cập nhật

SRS thay đổi trước, sau đó cập nhật Kiến trúc, tài liệu Bàn giao này, Danh sách
công việc và TDD trong cùng một tập thay đổi. Trạng thái mã nguồn có thể chuyển từ
chưa triển khai sang đã triển khai mà không đổi SRS. PRD luôn chỉ đọc; quyết định
sản phẩm mới được ghi ở tài liệu kế tiếp kèm phân tích tác động, không viết lại PRD gốc.
