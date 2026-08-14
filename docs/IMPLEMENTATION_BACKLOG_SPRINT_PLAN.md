# Danh sách công việc triển khai và kế hoạch chu kỳ — Duhat Gen Sticker V1

## 0. Quy ước kế hoạch

| Trường | Giá trị |
| --- | --- |
| Phiên bản | 1.0 |
| Chu kỳ | Chu kỳ 01 — 2 tuần / 10 ngày làm việc |
| Thời gian | 17/08/2026–28/08/2026 |
| Mốc trạng thái | 14/08/2026 |
| Yêu cầu | SRS v1.0 |
| Kiến trúc/Bàn giao | v1.0 |
| Nguồn sản phẩm | PRD bất biến |

Mọi quyết định sản phẩm/kỹ thuật đã được chốt trong SRS DEC-001..039. Danh sách
này chỉ còn công việc triển khai, chuyển đổi dữ liệu, tích hợp, kiểm thử và vận
hành; không có công việc “chờ quyết định”.

## 1. Trạng thái và mức ưu tiên

| Trạng thái | Nghĩa |
| --- | --- |
| `Hoàn thành` | Mã nguồn/tài liệu và bằng chứng xác minh tương ứng đã tồn tại, đạt ở mốc hiện trạng. |
| `Đang thực hiện` | Đã triển khai một phần nhưng chưa đạt toàn bộ tiêu chí hoàn thành. |
| `Chưa thực hiện` | Chưa triển khai. |

| Ưu tiên/Kế hoạch | Nghĩa |
| --- | --- |
| P0 | Điều kiện chặn phát hành hoặc quy tắc bất biến về an toàn/chủ sở hữu/dữ liệu. |
| P1 | Cần cho V1 nhưng có thể chuyển sang chu kỳ sau khi hoàn thành lát cắt chức năng cốt lõi. |
| P2 | Gia cố/mở rộng sau P0–P1. |
| D1..D10 | Ngày dự kiến của Chu kỳ 01. |
| Mở rộng | Chỉ nhận khi P0 không trễ. |
| Sau chu kỳ | Danh sách công việc sản phẩm sau Chu kỳ 01. |

Tổng quan 120 công việc tại mốc trạng thái:

| Trạng thái | Số công việc |
| --- | ---: |
| `Hoàn thành` | 27 |
| `Đang thực hiện` | 20 |
| `Chưa thực hiện` | 73 |
| **Tổng** | **120** |

Kế hoạch giả định ba luồng công việc: Máy chủ/AI, Ứng dụng di động và QA/Nền tảng.
Nếu một người thực hiện, chỉ cam kết DOC, kiểm tra kỹ thuật VAL, cổng nhà cung cấp,
chuyển đổi dữ liệu mục tiêu, tải xuống và kiểm thử hợp đồng tự động; E2E với nhà
cung cấp thật và vận hành sẽ chuyển sang chu kỳ sau.

## 2. Danh sách công việc theo nhóm

### 2.1 Tài liệu và quản trị

| ID | Công việc | Ưu tiên | Tiêu chí hoàn thành | Tham chiếu | Kế hoạch | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| DOC-01 | Bảo vệ mốc PRD | P0 | Lưu/kiểm tra mã kiểm tra hai PRD; không có khác biệt | SRS §0.1 | D10 | `Hoàn thành` |
| DOC-02 | Chốt SRS và danh mục quyết định | P0 | Đầy đủ DEC-001..039, yêu cầu, ngưỡng, thời hạn lưu giữ và điều kiện phát hành | SRS v1.0 | D1 | `Hoàn thành` |
| DOC-03 | Đồng bộ Kiến trúc | P0 | Hiện trạng/Mục tiêu, công nghệ, API, lược đồ, triển khai và bản đồ phần còn thiếu khớp SRS | SAD v1.0 | D1 | `Hoàn thành` |
| DOC-04 | Đồng bộ Bàn giao | P0 | Hiện trạng mã nguồn, phần còn thiếu, hướng dẫn chạy và danh sách kiểm tra khớp Kiến trúc | Bàn giao v1.0 | D1 | `Hoàn thành` |
| DOC-05 | Đồng bộ Danh sách công việc/TDD | P0 | Mọi yêu cầu có công việc triển khai, bằng chứng kiểm thử và người chịu trách nhiệm | SRS §12–13 | D1 | `Hoàn thành` |
| DOC-06 | Kiểm tra tự động tính nhất quán tài liệu | P1 | Kiểm tra mã PRD, dấu hiệu quyết định chưa đóng, tham chiếu cục bộ hỏng và ID công việc/kiểm thử | SRS §12.3 | Sau chu kỳ | `Chưa thực hiện` |

### 2.2 Điểm vào, lấy ảnh đầu vào và sự đồng ý

| ID | Công việc | Ưu tiên | Tiêu chí hoàn thành | Tham chiếu | Kế hoạch | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| ENT-01 | Điểm vào Tạo và hướng dẫn ảnh | P0 | Nội dung Việt/Anh nêu định dạng tĩnh, đúng một người/thú cưng/vật thể và một khuôn mặt rõ | FR-ENT-001, AC-001 | Hiện trạng | `Hoàn thành` |
| ENT-02 | Trình chọn một ảnh từ thư viện | P0 | Tắt chọn nhiều; ảnh mới đặt lại sự đồng ý/kết quả kiểm tra/ý định | FR-INP-001 | Hiện trạng | `Hoàn thành` |
| ENT-03 | Chụp một ảnh | P0 | Ảnh từ máy ảnh đi qua cùng quy trình kiểm tra máy chủ | FR-INP-002 | Hiện trạng | `Hoàn thành` |
| ENT-04 | Trạng thái/khôi phục quyền | P0 | Các trạng thái chưa hỏi/từ chối/giới hạn/thu hồi/không sẵn sàng/Mở cài đặt/ảnh đám mây đạt kiểm thử thiết bị | DEC-030, FR-INP-003 | D8 | `Đang thực hiện` |
| ENT-05 | Gắn sự đồng ý với ảnh nguồn hiện tại | P0 | Ô xác nhận xuất hiện sau khi chọn ảnh; thay ảnh/bật tắt sẽ đặt lại; không đồng ý thì không tải lên/tạo tác vụ | FR-CNS-001..002 | Hiện trạng | `Hoàn thành` |
| ENT-06 | Bằng chứng đồng ý v1.0 | P0 | Lưu và kiểm thử chủ sở hữu, SHA ảnh nguồn, phiên bản, `accepted_at`, `retain_until` | DEC-036, FR-CNS-003 | D5 | `Đang thực hiện` |
| ENT-07 | Vòng đời bộ nhớ đệm ảnh nguồn | P0 | Dọn tệp tạm do ứng dụng sở hữu sau tải lên/thay ảnh/rời màn hình; không xóa khi đang tải | NFR-PRI-003 | Hiện trạng | `Hoàn thành` |
| ENT-08 | Ranh giới riêng tư của ảnh nguồn | P0 | Không URL công khai/nhật ký/sự kiện; chéo chủ sở hữu trả 404; nhà cung cấp chỉ nhận byte ảnh chuẩn | FR-INP-004 | D8 | `Đang thực hiện` |

### 2.3 Kiểm tra ảnh có thẩm quyền

| ID | Công việc | Ưu tiên | Tiêu chí hoàn thành | Tham chiếu | Kế hoạch | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| VAL-01 | Truyền lên một tệp không rỗng | P0 | Một tệp đa phần, SHA-256, không base64, từ chối tệp rỗng | FR-VAL-001 | Hiện trạng | `Hoàn thành` |
| VAL-02 | Áp dụng giới hạn 10 MiB | P0 | Dừng đọc đúng tại 10.485.760 byte; có kiểm thử biên 413 | SRS §8.1 | Hiện trạng | `Hoàn thành` |
| VAL-03 | Danh sách MIME + chữ ký cho phép | P0 | Chữ ký/loại JPEG/PNG/WebP/HEIC/HEIF phải khớp | DEC-009, FR-VAL-001 | Hiện trạng | `Hoàn thành` |
| VAL-04 | Từ chối định dạng cấm/giả mạo | P0 | GIF/SVG/TIFF/BMP/RAW/AVIF/tệp đa nghĩa thất bại bất kể phần mở rộng/MIME | FR-VAL-002 | D3 | `Đang thực hiện` |
| VAL-05 | Thêm bộ giải mã Pillow/pillow-heif | P0 | Khóa phiên bản thư viện; cấu hình bộ mở HEIF; ánh xạ lỗi an toàn | SAD §2.2 | D2 | `Chưa thực hiện` |
| VAL-06 | Giải mã toàn bộ/kiểm tra toàn vẹn/chặn bom | P0 | Xác minh rồi tải điểm ảnh; từ chối tệp hỏng/cụt/bom/quá thời gian | FR-VAL-001 | D3 | `Chưa thực hiện` |
| VAL-07 | Chốt ảnh tĩnh một khung hình | P0 | `n_frames==1`, không động/chuỗi; từ chối WebP/HEIF/APNG động | FR-VAL-002, AC-004 | D3 | `Chưa thực hiện` |
| VAL-08 | Chốt kích thước/điểm ảnh/tỷ lệ | P0 | Mỗi chiều ≥512 và ≤8192, ≤40 MP, tỷ lệ 1:4..4:1 | SRS §8.1 | D3 | `Chưa thực hiện` |
| VAL-09 | Chuẩn hóa hướng/màu | P0 | Xoay theo EXIF; RGB/RGBA 8-bit sRGB; ảnh chuẩn có kết quả xác định | FR-VAL-003 | D4 | `Chưa thực hiện` |
| VAL-10 | Loại siêu dữ liệu | P0 | EXIF/XMP/GPS/tên tệp không có trong ảnh chuẩn/yêu cầu nhà cung cấp/đầu ra | FR-VAL-003, NFR-PRI-001 | D4 | `Chưa thực hiện` |
| VAL-11 | Chốt độ mờ | P0 | Phương sai Laplacian ≥100 trên ảnh độ chói 1024 đã quy định; có dữ liệu biên | SRS §8.2 | D4 | `Chưa thực hiện` |
| VAL-12 | Chốt ánh sáng/cháy sáng | P0 | Hiện thực chính xác ngưỡng trung vị/tối/cháy sáng; có dữ liệu đại diện | SRS §8.2 | D4 | `Chưa thực hiện` |
| VAL-13 | Bộ phân loại chủ thể Rekognition | P0 | Kết quả trung lập người/thú cưng/vật thể/không rõ, độ tin cậy/hộp bao/phiên bản mô hình | FR-VAL-005 | D5 | `Chưa thực hiện` |
| VAL-14 | Chốt đúng một chủ thể | P0 | Chủ thể chính ≥90%/15%; chủ thể hai ≥85%/10% làm từ chối; bao phủ cảnh trộn | BR-002, AC-006..007 | D5 | `Chưa thực hiện` |
| VAL-15 | Chốt một khuôn mặt rõ đối với người | P0 | Đúng 1 mặt ≥99%, đạt ngưỡng diện tích/chất lượng/tư thế/che khuất | BR-003, AC-005 | D5 | `Chưa thực hiện` |
| VAL-16 | Hướng dẫn cắt khi có nhiều người | P0 | Từ chối nhiều mặt/người; nội dung Việt/Anh hướng dẫn cắt hoặc chọn ảnh khác | FR-VAL-006 | D5 | `Chưa thực hiện` |
| VAL-17 | Không có/chủ thể không hỗ trợ | P0 | Từ chối an toàn 0/không rõ/động vật không phải thú cưng/vật thể ngoài phạm vi | FR-VAL-005, FR-VAL-009 | D5 | `Chưa thực hiện` |
| VAL-18 | Kết quả đánh giá có phiên bản | P0 | Mỗi bước có trạng thái/điểm/lý do/phiên bản nhà cung cấp/mô hình/chính sách | SAD §6.1 | D5 | `Đang thực hiện` |
| VAL-19 | Chốt nguyên tử ảnh nguồn sẵn sàng | P0 | Chỉ sẵn sàng khi kỹ thuật, chất lượng, chủ thể, tuổi, sở hữu trí tuệ và an toàn đều đạt | FR-VAL-008 | D6 | `Chưa thực hiện` |
| VAL-20 | Ánh xạ lỗi ổn định | P0 | Mã/HTTP/khả năng thử lại SRS §5.4 ánh xạ đủ nội dung/hành động Việt/Anh | FR-VAL-009 | D6 | `Đang thực hiện` |
| VAL-21 | Kho dữ liệu mẫu kiểm tra ảnh | P0 | Dữ liệu có phép cho định dạng, tệp hỏng, chất lượng, người/thú cưng/vật thể, 0/2+/cảnh trộn/khuôn mặt | SRS §12.2 | D5 | `Chưa thực hiện` |
| VAL-22 | Bộ kiểm thử ảnh tự động | P0 | Kiểm thử đơn vị/API/hợp đồng bao phủ VAL-01..21 và 100% nhánh quan trọng | TDD V-* | D8 | `Chưa thực hiện` |

### 2.4 An toàn, độ tuổi, nhân vật công chúng và sở hữu trí tuệ

| ID | Công việc | Ưu tiên | Tiêu chí hoàn thành | Tham chiếu | Kế hoạch | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| SAFE-01 | Bộ chuyển đổi kiểm duyệt AWS | P0 | Ngưỡng DetectModerationLabels 80%; quá thời gian/lỗi đều đóng an toàn | FR-VAL-007 | D6 | `Chưa thực hiện` |
| SAFE-02 | Bộ chuyển đổi kiểm duyệt đầu vào OpenAI | P0 | Điểm cuối/mô hình chính thức; ảnh bị gắn cờ → chặn; không proxy/nhật ký thô | DEC-021/038 | D6 | `Chưa thực hiện` |
| SAFE-03 | Chặn trẻ vị thành niên | P0 | Từ chối nếu bất kỳ mặt nào có AgeRange.Low<18; kiểm toán mã/phiên bản an toàn | DEC-012, AC-008 | D6 | `Chưa thực hiện` |
| SAFE-04 | Chặn người nổi tiếng/nhân vật công chúng | P0 | Từ chối khi RecognizeCelebrities có độ tin cậy ≥90 | DEC-031, BR-011 | D6 | `Chưa thực hiện` |
| SAFE-05 | Custom Labels cho thương hiệu/bản quyền | P0 | ARN/mô hình có phiên bản, ≥90 thì từ chối; bộ đánh giá có phép đạt ngưỡng | DEC-031 | D7 | `Chưa thực hiện` |
| SAFE-06 | Kiểm duyệt ảnh đầu ra | P0 | Quyết định AWS + OpenAI đều đạt trước khi công bố/truy cập | FR-GEN-006 | D8 | `Chưa thực hiện` |
| SAFE-07 | Kiểm duyệt chữ đầu ra | P0 | Câu chữ đã kết xuất chính xác và dữ liệu OCR/chữ đạt trước khi công bố | FR-GEN-006 | D8 | `Chưa thực hiện` |
| SAFE-08 | Chính sách tạo bù/thất bại toàn bộ | P0 | Tạo bù tối đa 2 lần/vị trí; nếu vẫn lỗi thì toàn tác vụ thất bại, không có bộ thiếu | DEC-015, AC-011 | D8 | `Chưa thực hiện` |
| SAFE-09 | Chốt công bố/truy cập ảnh | P0 | Ảnh bị chặn/chưa kiểm duyệt không truy cập được qua bộ/lưu/ảnh | BR-008 | Hiện trạng | `Hoàn thành` |
| SAFE-10 | Kiểm toán/lược bỏ dữ liệu kiểm duyệt | P0 | Giữ siêu dữ liệu quyết định tối thiểu 30 ngày; không có dữ liệu thô/tham chiếu ảnh | SRS §7.3/10 | D9 | `Chưa thực hiện` |

### 2.5 Tạo ảnh AI và xử lý tác vụ

| ID | Công việc | Ưu tiên | Tiêu chí hoàn thành | Tham chiếu | Kế hoạch | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| AI-01 | Kịch bản mô phỏng xác định | P0 | Chuyển trạng thái tác vụ thành công/lỗi/quá hạn/bị chặn đều đạt | TDD G-* | Hiện trạng | `Hoàn thành` |
| AI-02 | Bản trình diễn mô phỏng đúng 8 ảnh | P0 | 8 SVG mẫu duy nhất, thông báo mô phỏng rõ ràng | DEC-005 | Hiện trạng | `Hoàn thành` |
| AI-03 | Cổng trung lập với nhà cung cấp | P0 | Tách cổng đầu vào/tạo ảnh/đầu ra; không công khai kiểu riêng nhà cung cấp | SAD §3.4 | D3 | `Đang thực hiện` |
| AI-04 | Khóa SDK/cấu hình nhà cung cấp chính thức | P0 | Xác minh máy chủ/mô hình OpenAI chính thức và khu vực AWS khi khởi động | DEC-021/038 | D3 | `Chưa thực hiện` |
| AI-05 | Khung tiến trình xử lý PGMQ | P0 | Đọc/thời gian ẩn/tín hiệu sống/lưu trữ/xóa và tắt êm | DEC-022 | D4 | `Chưa thực hiện` |
| AI-06 | Phiên thuê/đối soát tác vụ | P0 | Giao lặp/khởi động lại không tạo trùng lần gọi nhà cung cấp hoặc bộ ảnh | SRS §5.2 | D5 | `Chưa thực hiện` |
| AI-07 | Bộ dựng câu lệnh/danh mục cố định | P0 | `prompt-chibi-v1`, ngôn ngữ, 8 vị trí bất biến; không câu lệnh/phong cách người dùng | DEC-006/007/011 | D4 | `Chưa thực hiện` |
| AI-08 | Bộ chuyển đổi chỉnh sửa ảnh OpenAI | P0 | Mức giữ đặc trưng/chất lượng cao, 1024, PNG trong suốt qua API chính thức | SRS §8.4 | D6 | `Chưa thực hiện` |
| AI-09 | Giới hạn đồng thời/thử lại/thời hạn | P0 | 2 lệnh gọi đồng thời; thử lại 2/5/10 giây; giới hạn cứng 180 giây | DEC-016 | D6 | `Chưa thực hiện` |
| AI-10 | Giải mã/hợp đồng PNG | P0 | Chữ ký, 1024, RGBA/sRGB, alpha, ≤4 MiB và SHA đều đạt | SRS §8.5 | D7 | `Chưa thực hiện` |
| AI-11 | Kết xuất chính xác chữ danh mục | P0 | Noto Sans Bold phủ đúng chữ Việt/Anh và có kiểm tra độ dễ đọc | SRS §8.3/8.5 | D7 | `Chưa thực hiện` |
| AI-12 | Công bố nguyên tử đúng 8 ảnh | P0 | Cần số thứ tự duy nhất 1..8 và đã qua kiểm duyệt; CSDL không có bộ thiếu | BR-005/008 | D8 | `Đang thực hiện` |
| AI-13 | Tạo lại toàn bộ | P0 | Tác vụ/bộ mới, cùng ảnh nguồn/phong cách/ngôn ngữ/danh mục; trừ hạn mức | FR-REG-001 | Hiện trạng | `Hoàn thành` |
| AI-14 | Luồng hủy | P1 | Hủy khi xếp hàng/kiểm tra; chặn công bố kết quả nhà cung cấp về muộn | SRS §5.1 | Mở rộng | `Chưa thực hiện` |
| AI-15 | Bộ kiểm thử hợp đồng mô phỏng/nhà cung cấp | P0 | Cùng hợp đồng nghiệp vụ đạt với mô phỏng/giả lập/sandbox; bao phủ lỗi tạm/phản hồi sai | TDD G-* | D9 | `Chưa thực hiện` |

### 2.6 Máy chủ, Supabase và API

| ID | Công việc | Ưu tiên | Tiêu chí hoàn thành | Tham chiếu | Kế hoạch | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| BE-01 | Giữ API FastAPI cốt lõi | P0 | Điểm cuối ảnh nguồn/tác vụ/bộ/lưu/thư viện/xóa/ảnh và Problem Details hiện có đều đạt | SAD §5.1 | Hiện trạng | `Hoàn thành` |
| BE-02 | Hợp đồng kho dữ liệu cục bộ | P1 | SQLite/hệ tệp tiếp tục là bộ chuyển đổi phát triển/kiểm thử có kết quả xác định | SAD §3.5 | Hiện trạng | `Hoàn thành` |
| BE-03 | Bộ chuyển đổi/chuyển đổi dữ liệu Supabase hiện tại | P0 | Đã có bảng/RPC/kho riêng tư/kho dữ liệu cơ sở | DEC-010 | Hiện trạng | `Hoàn thành` |
| BE-04 | Thêm chuyển đổi dữ liệu Mục tiêu V1 | P0 | Lược đồ/ràng buộc/bảng/PGMQ/RLS/Storage/dọn dẹp theo Bàn giao §6 | Bàn giao §6 | D4 | `Chưa thực hiện` |
| BE-05 | Áp dụng/xác minh Supabase SG tiền sản xuất | P0 | Kiểm tra nhanh chuyển đổi, xác thực, CSDL, Storage và hàng đợi đạt trong dự án biệt lập | DEC-010/020/022 | D5 | `Đang thực hiện` |
| BE-06 | Gia cố cô lập chủ sở hữu | P0 | Mọi thực thể/thao tác chéo chủ sở hữu trả 404; RLS/quyền đã kiểm toán | NFR-SEC-002 | D8 | `Đang thực hiện` |
| BE-07 | Tải ảnh nguồn lũy đẳng | P0 | Cùng khóa+byte trả kết quả cũ; byte khác gây xung đột; không trùng ảnh nguồn/sự đồng ý | SRS §5.3 | D5 | `Chưa thực hiện` |
| BE-08 | Giữ tính lũy đẳng tác vụ/lưu | P0 | Kiểm thử phát lại/xung đột/đồng thời vẫn đạt sau tái cấu trúc | SRS §5.3 | Hiện trạng | `Hoàn thành` |
| BE-09 | Áp dụng hạn mức/giới hạn tần suất | P0 | 5/ngày, 1 tác vụ hoạt động, giới hạn tải lên/chung/báo cáo và Retry-After | DEC-014 | D6 | `Chưa thực hiện` |
| BE-10 | Phản hồi ảnh PNG | P0 | Kiểm tra chủ sở hữu/kiểm duyệt, MIME/tên/dài/ETag/riêng tư/không lưu đệm/`nosniff` | SAD §5.2 | D8 | `Đang thực hiện` |
| BE-11 | Lưu/thư viện đúng phần đã chọn | P0 | Lựa chọn nguyên tử, không rỗng, duy nhất, cùng bộ và phân trang bằng con trỏ | FR-SAV-001..004 | Hiện trạng | `Hoàn thành` |
| BE-12 | API/trạng thái báo cáo | P0 | Gửi/trạng thái/lý do/ghi chú/SLA/lũy đẳng/gỡ bỏ làm mất quyền truy cập | DEC-024 | Sau chu kỳ | `Chưa thực hiện` |
| BE-13 | Nhận dữ liệu phân tích | P1 | Đồng ý, danh sách cho phép, theo lô, loại trùng, lưu giữ và từ chối thuộc tính cấm | DEC-025/039 | Sau chu kỳ | `Chưa thực hiện` |
| BE-14 | Tiến trình lưu giữ/dọn dẹp | P0 | Lịch 1 giờ/24 giờ/30 ngày/90 ngày/365 ngày và bằng chứng kiểm toán | DEC-013 | Sau chu kỳ | `Chưa thực hiện` |
| BE-15 | Điều phối xóa | P0 | Mất quyền truy cập ngay + xóa dữ liệu chính ≤24 giờ + bản ghi hết hạn sao lưu | DEC-026 | Sau chu kỳ | `Chưa thực hiện` |
| BE-16 | Ranh giới lỗi/nhật ký an toàn | P0 | Đủ mã SRS/RFC 9457; kiểm thử 500/lược bỏ/bí mật/tham chiếu | SRS §5.4 | D9 | `Đang thực hiện` |
| BE-17 | Chốt chặn khi chạy ở sản xuất | P0 | Từ chối mô phỏng/xác thực cục bộ/CORS đại diện/kho công khai/máy chủ OpenAI không chính thức | BR-012 | D9 | `Đang thực hiện` |

### 2.7 Xem trước, thư viện, tải xuống và chia sẻ trên di động

| ID | Công việc | Ưu tiên | Tiêu chí hoàn thành | Tham chiếu | Kế hoạch | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| MOB-01 | Giao diện tiến độ/thăm dò | P0 | Hiển thị giai đoạn/tiến độ/lỗi/thử lại; chuyển màn hình không âm thầm hủy | FR-GEN-005 | Hiện trạng | `Hoàn thành` |
| MOB-02 | Khôi phục tác vụ đang hoạt động | P0 | Khởi động lại/đối soát máy chủ, thăm dò 2→10 giây, dọn khi kết thúc | DEC-022 | D8 | `Đang thực hiện` |
| MOB-03 | Xác nhận bản xem trước đúng 8 | P0 | Chỉ nhận tám số thứ tự duy nhất; phản hồi sai hiển thị lỗi an toàn | AC-010 | Hiện trạng | `Hoàn thành` |
| MOB-04 | Xem kỹ từng sticker | P1 | Chi tiết toàn cỡ/tiêu điểm dễ tiếp cận cho mọi ảnh | FR-PRV-001 | Mở rộng | `Đang thực hiện` |
| MOB-05 | Hợp đồng lựa chọn | P0 | Mặc định chọn cả 8; cho bật/tắt; vô hiệu hóa Lưu khi không chọn ảnh | DEC-027 | D5 | `Đang thực hiện` |
| MOB-06 | Lưu phần đã chọn/thử lại | P0 | Gửi ID đã chọn được sắp thứ tự với khóa ý định ổn định; làm mới thư viện | FR-SAV-001 | Hiện trạng | `Hoàn thành` |
| MOB-07 | Bản xem trước hết hạn/lưu lỗi | P0 | Lỗi lưu vẫn giữ bản xem trước; trải nghiệm hết hạn/khôi phục sau 24 giờ | DEC-028 | D8 | `Đang thực hiện` |
| MOB-08 | Trạng thái danh sách/chi tiết thư viện | P0 | Dữ liệu theo chủ sở hữu, phân trang, đang tải/rỗng/lỗi/thử lại | FR-SAV-004 | Hiện trạng | `Hoàn thành` |
| MOB-09 | Trải nghiệm ý nghĩa thao tác xóa | P0 | Xác nhận, làm mới, giải thích bản cục bộ/đã chia sẻ không bị thu hồi | DEC-026 | Sau chu kỳ | `Đang thực hiện` |
| MOB-10 | Cài/cấu hình MediaLibrary | P0 | Gói tương thích SDK, nội dung quyền chỉ thêm trên iOS, cấu hình lưu trữ có phạm vi Android | DEC-010 | D3 | `Chưa thực hiện` |
| MOB-11 | Nút tải xuống chỉ cho ảnh đã lưu | P0 | Chỉ ảnh trong thư viện có nút Tải xuống; truyền PNG tạm có xác thực | FR-SAV-005 | D5 | `Chưa thực hiện` |
| MOB-12 | Kiểm tra/lưu ảnh tải xuống | P0 | `image/png`, không rỗng, mã kiểm tra, tên tệp; album `Duhat Gen Sticker` | SAD §3.1 | D6 | `Chưa thực hiện` |
| MOB-13 | Trải nghiệm lỗi/quyền tải xuống | P0 | Từ chối/hủy/đầy đĩa/lỗi ghi/mạng có thử lại đúng, không báo thành công giả | AC-015 | D7 | `Chưa thực hiện` |
| MOB-14 | Dọn tệp tải xuống tạm | P0 | Dọn khi thành công/lỗi/khởi động; bản đám mây không đổi | FR-SAV-006 | D7 | `Chưa thực hiện` |
| MOB-15 | Chia sẻ PNG từ xem trước/thư viện | P0 | Một PNG, không cần lưu trước, bảng chia sẻ hệ điều hành, dọn tệp tạm | DEC-019 | D7 | `Đang thực hiện` |
| MOB-16 | Dữ liệu phân tích chia sẻ đúng nghĩa | P1 | Chỉ có `native_share_sheet_invoked`; không khẳng định đã gửi | DEC-025 | Sau chu kỳ | `Chưa thực hiện` |
| MOB-17 | Hoàn thiện Việt/Anh và khả năng tiếp cận | P0 | Đủ khóa lỗi/sự kiện/quyền; trình đọc màn hình/cỡ chữ động/vùng chạm/tương phản | DEC-034 | D9 | `Đang thực hiện` |
| MOB-18 | Kiểm tra nhanh trên thiết bị Android/iOS | P0 | Máy ảnh/trình chọn/tác vụ/lưu/thư viện/tải xuống/chia sẻ theo ma trận SRS | DEC-023 | D9 | `Chưa thực hiện` |

### 2.8 Nền tảng, vận hành và tuân thủ

| ID | Công việc | Ưu tiên | Tiêu chí hoàn thành | Tham chiếu | Kế hoạch | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| OPS-01 | Ảnh Docker cho API/tiến trình xử lý | P0 | Không chạy bằng root, kiểm tra sức khỏe, khóa phụ thuộc, SBOM và quét lỗ hổng | SAD §8 | Sau chu kỳ | `Chưa thực hiện` |
| OPS-02 | Triển khai ECS/ALB/ECR | P0 | Tối thiểu 2 API/2 tiến trình xử lý, tự co giãn đến 10, HTTPS và quay lui cuốn chiếu | DEC-033 | Sau chu kỳ | `Chưa thực hiện` |
| OPS-03 | Bí mật/IAM/luồng mạng ra | P0 | Secrets Manager, vai trò tác vụ quyền tối thiểu, danh sách điểm cuối chính thức cho phép | NFR-SEC-004 | Sau chu kỳ | `Chưa thực hiện` |
| OPS-04 | Chỉ số/cảnh báo CloudWatch | P0 | Cảnh báo SLO cho API/hàng đợi/tác vụ/nhà cung cấp/kiểm duyệt/xóa/báo cáo | SAD §8.4 | Sau chu kỳ | `Chưa thực hiện` |
| OPS-05 | Diễn tập sao lưu/khôi phục | P0 | Chứng minh RPO 24 giờ/RTO 4 giờ và lập tài liệu bằng chứng | DEC-033 | Sau chu kỳ | `Chưa thực hiện` |
| OPS-06 | Chốt ZDR/khu vực OpenAI khi phát hành | P0 | Dự án/kiểm soát dữ liệu đã phê duyệt, máy chủ SG chính thức và bằng chứng lưu giữ | DEC-021/038 | Sau chu kỳ | `Chưa thực hiện` |
| OPS-07 | DPA/quyền riêng tư/sự đồng ý với nhà cung cấp | P0 | Luồng dữ liệu Supabase/AWS/OpenAI khớp nội dung đồng ý và khai báo kho ứng dụng | DEC-036 | Sau chu kỳ | `Chưa thực hiện` |
| OPS-08 | Vận hành Tin cậy & An toàn | P0 | Quyền nhân sự, SLA 24/72 giờ, gỡ bỏ/khiếu nại/diễn tập trực | DEC-024 | Sau chu kỳ | `Chưa thực hiện` |
| OPS-09 | Điều kiện chất lượng CI/CD | P0 | Kiểm thử/quy tắc/kiểu/độ bao phủ/chuyển đổi/quét ảnh/thiết bị trước phát hành | DEC-037 | D10 | `Chưa thực hiện` |
| OPS-10 | Đánh giá tài nguyên di động | P1 | Đạt ngân sách bộ nhớ/bộ đệm/mạng/pin | DEC-035 | Mở rộng | `Chưa thực hiện` |

### 2.9 Đảm bảo chất lượng và bằng chứng phát hành

| ID | Công việc | Ưu tiên | Tiêu chí hoàn thành | Tham chiếu | Kế hoạch | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| QA-01 | Giữ bộ kiểm thử hiện trạng | P0 | Bộ kiểm thử máy chủ/di động hiện tại vẫn đạt trước/sau tái cấu trúc | Hướng dẫn chạy TDD | Hiện trạng | `Hoàn thành` |
| QA-02 | Ánh xạ mọi ID TDD | P0 | Có loại tự động/thủ công/đánh giá chuẩn, người phụ trách, môi trường, trạng thái và liên kết bằng chứng | DEC-037 | D2 | `Chưa thực hiện` |
| QA-03 | Kiểm thử hồi quy kỹ thuật đầu vào | P0 | Định dạng/giả mạo/hỏng/bom/khung hình/kích thước/hướng/siêu dữ liệu | TDD V-* | D8 | `Chưa thực hiện` |
| QA-04 | Kiểm thử hồi quy chủ thể/chất lượng | P0 | Ngưỡng mờ/sáng/người/thú cưng/vật thể/0/2+/cảnh trộn/khuôn mặt | TDD Q-* | D8 | `Chưa thực hiện` |
| QA-05 | Kiểm thử hồi quy an toàn | P0 | Trẻ vị thành niên/người nổi tiếng/thương hiệu/NSFW/bất đồng nhà cung cấp/đóng an toàn | TDD M-* | D9 | `Chưa thực hiện` |
| QA-06 | Kiểm thử hồi quy tạo ảnh/đầu ra | P0 | Danh mục/đúng 8/PNG/alpha/chữ/mã kiểm tra/tạo bù/quá thời gian | TDD G-* | D9 | `Chưa thực hiện` |
| QA-07 | E2E Supabase/chủ sở hữu | P0 | Xác thực/RLS/ảnh nguồn/tác vụ/lưu/thư viện/ảnh/xóa/báo cáo chéo chủ sở hữu | TDD S-01..09, J-*, D-*, R-* | D9 | `Chưa thực hiện` |
| QA-08 | E2E gốc trên di động | P0 | Quyền, ảnh đám mây, tải xuống, chia sẻ, dọn dẹp theo ma trận nền tảng | TDD C-08, D-10..20, P-13..19 | D9 | `Chưa thực hiện` |
| QA-09 | Kiểm thử quyền riêng tư dữ liệu phân tích | P0 | Không đồng ý, danh sách cho phép, loại trùng, trường cấm và lưu giữ | TDD AN-* | Sau chu kỳ | `Chưa thực hiện` |
| QA-10 | Đánh giá chuẩn chất lượng/thiên lệch | P0 | 300 ảnh nguồn hợp pháp; đạt mọi ngưỡng SRS §8.6 | AC-021 | Sau chu kỳ | `Chưa thực hiện` |
| QA-11 | Đánh giá chuẩn hiệu năng/năng lực | P0 | Độ trễ SRS §9.2/9.3, 100 tác vụ đồng thời, bằng chứng hàng đợi/quá thời gian | AC-021 | Sau chu kỳ | `Chưa thực hiện` |
| QA-12 | Đánh giá bảo mật/quyền riêng tư | P0 | Duyệt OWASP/IDOR/phát lại/lạm dụng tải lên/bí mật/nhật ký/lưu giữ/xóa đạt | SRS §9.1 | Sau chu kỳ | `Chưa thực hiện` |
| QA-13 | Kiểm tra khả năng tiếp cận/bản địa hóa | P0 | Hoàn tất ma trận WCAG/nền tảng/Việt-Anh | DEC-034 | Sau chu kỳ | `Chưa thực hiện` |
| QA-14 | Bộ bằng chứng phát hành | P0 | Liên kết mã kiểm tra, cấu hình, kiểm thử, đánh giá chuẩn, duyệt, diễn tập và phê duyệt | SRS §12.3 | Sau chu kỳ | `Chưa thực hiện` |

## 3. Phạm vi cam kết của Chu kỳ 01

Phạm vi cam kết cho ba luồng công việc:

- Tài liệu/hợp đồng: DOC-01..05.
- Ảnh đầu vào: ENT-06, VAL-04..22.
- Nền tảng nhà cung cấp/tiến trình xử lý: SAFE-01..05, AI-03..09.
- Dữ liệu/API: BE-04..10, BE-16..17.
- Ứng dụng di động: ENT-04, MOB-02, MOB-05, MOB-10..15, MOB-17..18.
- Xác minh: QA-02..08 và OPS-09.

SAFE-06..10, AI-10..15 và công bố thật đúng 8 ảnh được đưa vào khi có thông tin
xác thực sandbox và dữ liệu mẫu hợp pháp trước D3; nếu không, giữ nguyên các ID
công việc, chuyển sang chu kỳ sau với trạng thái `Chưa thực hiện`/`Đang thực hiện`,
không bao giờ đánh dấu hoàn thành bằng bằng chứng giả lập.

Hạng mục mở rộng: AI-14, MOB-04, OPS-10. Báo cáo, phân tích, lưu giữ, triển khai
đầy đủ và đánh giá trước phát hành vẫn ở `Sau chu kỳ`, nhưng yêu cầu/hợp đồng đã chốt.

## 4. Lịch mười ngày

| Ngày | Máy chủ/AI | Ứng dụng di động | QA/Nền tảng | Kết quả cuối ngày |
| --- | --- | --- | --- | --- |
| D1 | Xác nhận thay đổi cổng/phụ thuộc | Kiểm toán đường dẫn PNG/tải xuống | Chốt DOC-01..05 | Đồng bộ tài liệu kế tiếp và ID công việc/kiểm thử |
| D2 | Cài VAL-05; AI-03 | Thử nghiệm nhanh MediaLibrary | QA-02 + kiểm kê dữ liệu mẫu | Hợp đồng bộ giải mã/nhà cung cấp biên dịch được |
| D3 | VAL-04..08; AI-04 | MOB-10 | Các ca kỹ thuật QA-03 | Chốt giải mã toàn bộ ảnh tĩnh hoạt động |
| D4 | VAL-09..12; BE-04; AI-05/07 | Dựng khung tải xuống | Kiểm tra chuyển đổi/hàng đợi | Ảnh chuẩn/chất lượng + lược đồ mục tiêu sẵn sàng |
| D5 | VAL-13..18; BE-05/07 | MOB-05/11 | Kho dữ liệu chủ thể QA-04 | Đánh giá đúng một chủ thể/một mặt hoạt động trong sandbox |
| D6 | VAL-19/20; SAFE-01..04; AI-08/09 | MOB-12 | Kiểm thử hợp đồng an toàn/nhà cung cấp | Không tác vụ nào bắt đầu trước khi mọi chốt đầu vào đạt |
| D7 | SAFE-05; tích hợp đầu ra AI | MOB-13..15/17 | Dữ liệu mẫu QA-05/06 | Tích hợp PNG và luồng gốc trên thiết bị |
| D8 | SAFE-06..08; AI-10..12; BE-06/10 | ENT-04, MOB-02/07 | QA-03/04/07 | Chỉ đầu ra đúng 8 ảnh đạt yêu cầu mới vào thư viện riêng tư |
| D9 | AI-15; BE-16/17 | MOB-18 | QA-05..08/hồi quy bảo mật | Thu thập bằng chứng Android/iOS và chéo chủ sở hữu |
| D10 | Sửa P0; duyệt chuyển đổi/cấu hình | Sửa lỗi gốc trên thiết bị | OPS-09/hồi quy đầy đủ/duyệt | Bản trình diễn, bằng chứng và hạng mục chuyển tiếp rõ ràng |

## 5. Định nghĩa hoàn thành

Một công việc chỉ chuyển sang `Hoàn thành` khi:

- phần triển khai/cấu hình/chuyển đổi dữ liệu đã được duyệt;
- luồng thành công, biên, lỗi và lạm dụng có đủ bằng chứng kiểm thử;
- năng lực thật không được đại diện bằng bằng chứng mô phỏng;
- yêu cầu về chủ sở hữu/an toàn/quyền riêng tư/nhật ký/bí mật đều đạt;
- lỗi/nội dung/API/lược đồ khớp SRS và Kiến trúc;
- kiểm thử, kiểm tra quy tắc, kiểm tra kiểu, kiểm tra chuyển đổi và điều kiện thiết bị/đánh giá chuẩn liên quan đều đạt;
- liên kết bằng chứng được gắn vào hệ thống theo dõi công việc hoặc báo cáo chu kỳ.

## 6. Tiêu chí kết thúc chu kỳ

- [ ] Giải mã toàn bộ năm định dạng tĩnh được phép; định dạng cấm/giả mạo/nhiều khung hình thất bại.
- [ ] Ngưỡng kỹ thuật/chất lượng chính xác tạo kết quả có phiên bản.
- [ ] Chỉ đúng một người/thú cưng/vật thể được đạt; ảnh người có một khuôn mặt
  người lớn rõ, không phải người nổi tiếng; đầu vào có thương hiệu/không an toàn đóng an toàn.
- [ ] Ảnh nguồn không thể sẵn sàng hoặc tạo tác vụ nếu thiếu bất kỳ bước kiểm tra nào.
- [ ] Cổng trung lập nhà cung cấp, nền tảng tiến trình PGMQ và cấu hình nhà cung cấp chính thức hoạt động.
- [ ] Nếu có tích hợp nhà cung cấp, bộ thành công thật phải là tám PNG hợp lệ đã kiểm duyệt.
- [ ] Ranh giới chủ sở hữu/lưu/thư viện/ảnh trên Supabase tiền sản xuất đều đạt.
- [ ] Tải PNG đã lưu và chia sẻ một PNG đạt trên thiết bị Android/iOS đích.
- [ ] Không có ảnh/tham chiếu/bí mật/dữ liệu thô nhà cung cấp trong nhật ký/sự kiện/lỗi.
- [ ] Mọi hồi quy hiện trạng và P0 mới đều đạt; hạng mục chưa xong giữ nguyên trạng thái.

## 7. Truy vết

| Nhóm SRS | Danh sách công việc |
| --- | --- |
| Quản trị/DEC-001..039 | DOC-01..06, OPS-06..08 |
| FR-ENT/INP/CNS | ENT-01..08 |
| FR-VAL | VAL-01..22, SAFE-01..05 |
| FR-GEN/SAFE | SAFE-06..10, AI-01..15 |
| FR-PRV/SEL/REG/SAV/DEL | BE-10..15, MOB-02..14 |
| FR-SHR | MOB-15..16, QA-08 |
| FR-REP/ANL | BE-12..13, OPS-08, QA-09 |
| Tác vụ/lỗi/tính lũy đẳng | AI-05..06/09/14, BE-07..09/16 |
| Bảo mật/quyền riêng tư/dữ liệu | BE-04..17, OPS-03/06/07, QA-07/09/12 |
| Hiệu năng/nền tảng/khả năng tiếp cận | MOB-17..18, OPS-02/04/05/10, QA-08/11/13 |
| Điều kiện phát hành | OPS-01..09, QA-01..14 |

ID công việc giữ ổn định khi chuyển sang chu kỳ sau. Thay đổi SRS phải cập nhật
tác động đồng thời tại đây, trong Kiến trúc, Bàn giao và TDD; PRD vẫn giữ nguyên.
