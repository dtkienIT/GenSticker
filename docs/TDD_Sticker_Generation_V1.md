# Kế hoạch phát triển hướng kiểm thử và xác minh — Duhat Gen Sticker V1

## 0. Quy ước tài liệu kiểm thử

| Trường | Giá trị |
| --- | --- |
| Phiên bản | 1.0 |
| Ngày chốt chuẩn | 14/08/2026 |
| Nguồn sản phẩm | PRD tiếng Việt, bất biến |
| Yêu cầu | SRS v1.0 |
| Kiến trúc | SAD v1.0 |
| Mức dịch vụ | SLA v1.0 |
| Phạm vi | Đơn vị, hợp đồng, tích hợp, E2E trên thiết bị, đánh giá chuẩn, bảo mật và vận hành |

TDD này là đặc tả có thể thực thi. Kiểm thử mới phải thất bại trước khi thêm phần
triển khai, sau đó đạt bằng thay đổi nhỏ nhất và được tái cấu trúc mà không giảm độ
bao phủ. Mô phỏng chỉ chứng minh trạng thái/luồng API; không chứng minh chất lượng
ảnh, phát hiện chủ thể, an toàn, quyền riêng tư nhà cung cấp hoặc hành vi gốc trên thiết bị.

Tài liệu đặc tả **214 ID ca kiểm thử**. Trạng thái ở từng ca mô tả loại bằng chứng
cần có; số lượt kiểm thử khi chạy có thể lớn hơn do tham số hóa và ma trận nền tảng.

## 1. Chiến lược, môi trường và bằng chứng

### 1.1 Cấp kiểm thử

| Cấp | Mục tiêu | Môi trường |
| --- | --- | --- |
| Đơn vị | Bộ giải mã, ngưỡng, chính sách, trạng thái, mã băm, ánh xạ | Cục bộ/CI, không có mạng |
| Hợp đồng | Lược đồ kho dữ liệu/Gemini/API tạo ảnh/API công khai với dữ liệu mẫu xác định | Dịch vụ giả lập trong CI + phản hồi Gemini/dịch vụ tạo ảnh đã ghi và làm sạch |
| Tích hợp | FastAPI + PostgreSQL/Storage Supabase + tiến trình nhận phiên thuê + bộ chuyển đổi giả lập/tài khoản kiểm thử Gemini và dịch vụ tạo ảnh | Tiền sản xuất Singapore biệt lập |
| E2E trên thiết bị | Máy ảnh/trình chọn/phiên/tải xuống/chia sẻ/khả năng tiếp cận | Ma trận thiết bị thật/trình mô phỏng |
| Đánh giá chuẩn | Chất lượng/thiên lệch/an toàn/độ trễ/năng lực | Bộ dữ liệu hợp pháp có phiên bản/tiền sản xuất |
| Bảo mật/Quyền riêng tư | IDOR, lạm dụng tải lên, bí mật/nhật ký, lưu giữ/xóa | CI + duyệt tiền sản xuất |
| Vận hành | Cảnh báo, quay lui, SLA báo cáo, sao lưu/khôi phục | Diễn tập tiền sản xuất |

### 1.2 Nhãn trạng thái

- `Đã tự động hóa ở mốc hiện trạng`: kiểm thử đã có trong bộ hiện tại của kho mã.
- `Dự kiến tự động hóa`: phải được tự động hóa trong bộ đơn vị/hợp đồng/tích hợp.
- `Dự kiến kiểm thử thiết bị`: cần chạy trên Android/iOS và lưu bằng chứng.
- `Đánh giá trước phát hành`: điều kiện về bộ dữ liệu/tải/bảo mật/vận hành trước khi phát hành.

Không được âm thầm miễn bất kỳ ca kiểm thử phát hành nào. Ngoại lệ phải có người
chịu trách nhiệm rủi ro, ngày hết hạn và biện pháp bù trong bộ bằng chứng phát hành.

### 1.3 Chính sách dữ liệu mẫu

- Dữ liệu mẫu phải thuộc quyền sở hữu/có giấy phép/sự đồng ý và lưu ngoài sản xuất.
- Kho dữ liệu bao phủ năm định dạng cho phép, mọi định dạng cấm, tệp hỏng, nhiều
  khung hình, EXIF, kích thước, mờ/sáng, người/thú cưng/vật thể, không có/nhiều/
  trộn chủ thể, mặt rõ/bị che/quá nhỏ, dấu hiệu thương hiệu rõ ràng và nội dung cấm.
- Ca tuổi/quyền và nhân vật công chúng dùng dữ liệu xác nhận/báo cáo tổng hợp; bộ
  đánh giá không cần kho khuôn mặt trẻ vị thành niên hoặc người nổi tiếng.
- Bộ dữ liệu người dùng để đánh giá cuối có tối thiểu 300 ảnh nguồn, cân bằng giữa
  các nhóm màu da/giới/tuổi trưởng thành; bộ thú cưng/vật thể đa dạng hình dạng/lông/ánh sáng.
- Dữ liệu an toàn nhạy cảm thô dùng kho mã hóa hạn chế và nhãn CI; máy phát triển
  thông thường dùng phản hồi nhà cung cấp tổng hợp/đã làm sạch.
- Bản kê dữ liệu mẫu ghi giấy phép, nhãn mong đợi, SHA-256 và phiên bản bộ dữ liệu.

### 1.4 Ma trận nền tảng

| Nền tảng | Phạm vi bắt buộc chạy |
| --- | --- |
| Android | API 24, 29, 33, 36; ít nhất một thiết bị thật API 33+ |
| iOS | 15.1, 17.x, 18.x; ít nhất một iPhone thật được hỗ trợ |
| Kiểu thiết bị | Điện thoại dọc; kiểm tra nhanh bố cục thích ứng trên một máy tính bảng Android và một iPad |

## 2. Tính nhất quán của tài liệu và hợp đồng

| ID | Tình huống | Kết quả mong đợi | Cấp kiểm thử | Trạng thái |
| --- | --- | --- | --- | --- |
| DOC-01 | Băm hai tệp PRD trước/sau thay đổi tài liệu | Mã kiểm tra giống mốc chuẩn | CI | `Dự kiến tự động hóa` |
| DOC-02 | Quét tài liệu kế tiếp để tìm dấu hiệu quyết định chưa đóng | Không có kết quả | CI | `Dự kiến tự động hóa` |
| DOC-03 | Trích tham chiếu DEC/FR/BR/AC/công việc/kiểm thử | Không thiếu, trùng hoặc có tham chiếu sai | CI | `Dự kiến tự động hóa` |
| DOC-04 | So sánh hằng số SRS giữa Kiến trúc/SLA/Bàn giao/Danh sách công việc/TDD | Giá trị định dạng/số lượng/phong cách/ngưỡng/lưu giữ/nền tảng/SLO giống nhau; Supabase chỉ lưu trữ; AI chỉ có Gemini và API tạo ảnh tương thích OpenAI với đúng bốn biến môi trường | CI | `Dự kiến tự động hóa` |
| DOC-05 | Kiểm tra cấu trúc Markdown | Bảng/tiêu đề/liên kết hiển thị không lỗi cấu trúc | CI | `Dự kiến tự động hóa` |

## 3. Kiểm tra kỹ thuật ảnh đầu vào

| ID | Tình huống/đầu vào | Kết quả mong đợi | Cấp kiểm thử | Trạng thái |
| --- | --- | --- | --- | --- |
| V-01 | JPEG tĩnh hợp lệ | 201, ảnh nguồn được tiếp tục qua các bước kiểm tra | API | `Đã tự động hóa ở mốc hiện trạng` |
| V-02 | PNG tĩnh hợp lệ | 201, ảnh nguồn được tiếp tục qua các bước kiểm tra | API | `Đã tự động hóa ở mốc hiện trạng` |
| V-03 | WebP tĩnh hợp lệ | 201, ảnh nguồn được tiếp tục qua các bước kiểm tra | API | `Đã tự động hóa ở mốc hiện trạng` |
| V-04 | HEIC tĩnh hợp lệ | Giải mã toàn bộ, ảnh nguồn được tiếp tục kiểm tra | API | `Dự kiến tự động hóa` |
| V-05 | HEIF tĩnh hợp lệ | Giải mã toàn bộ, ảnh nguồn được tiếp tục kiểm tra | API | `Dự kiến tự động hóa` |
| V-06 | Nội dung yêu cầu rỗng | 400 `EMPTY_UPLOAD` | API | `Đã tự động hóa ở mốc hiện trạng` |
| V-07 | Ảnh hợp lệ đúng 10 MiB | Chấp nhận tại biên dung lượng | Đơn vị/API | `Dự kiến tự động hóa` |
| V-08 | 10 MiB + 1 byte | 413 `IMAGE_TOO_LARGE`, không lưu dữ liệu | API | `Đã tự động hóa ở mốc hiện trạng` |
| V-09 | Khai MIME JPEG nhưng byte là PNG | 400 `IMAGE_SIGNATURE_MISMATCH` | API | `Đã tự động hóa ở mốc hiện trạng` |
| V-10 | Byte hợp lệ nhưng đổi phần mở rộng | Máy chủ dùng MIME/chữ ký/giải mã, không dùng phần mở rộng | API | `Dự kiến tự động hóa` |
| V-11 | GIF tĩnh/động | 415 `UNSUPPORTED_IMAGE_TYPE` | API | `Dự kiến tự động hóa` |
| V-12 | SVG chứa tập lệnh/tham chiếu ngoài | 415 trước khi phân tích/kết xuất | Bảo mật/API | `Dự kiến tự động hóa` |
| V-13 | TIFF/BMP/RAW/AVIF | 415 cho từng định dạng | API tham số hóa | `Dự kiến tự động hóa` |
| V-14 | JPEG/PNG bị cắt sau phần đầu hợp lệ | 422 `IMAGE_DECODE_FAILED`, đối tượng bị xóa | Đơn vị/API | `Dự kiến tự động hóa` |
| V-15 | Tệp đa nghĩa/nội dung lạ có tiền tố hợp lệ | Giải mã toàn bộ và kiểm tra nhất quán loại sẽ từ chối | Bảo mật | `Dự kiến tự động hóa` |
| V-16 | WebP động | 422 `MULTI_FRAME_IMAGE_UNSUPPORTED` | Đơn vị/API | `Dự kiến tự động hóa` |
| V-17 | APNG/PNG nhiều khung hình | 422 `MULTI_FRAME_IMAGE_UNSUPPORTED` | Đơn vị/API | `Dự kiến tự động hóa` |
| V-18 | Chuỗi HEIC/HEIF | 422 `MULTI_FRAME_IMAGE_UNSUPPORTED` | Đơn vị/API | `Dự kiến tự động hóa` |
| V-19 | 511×1024 | 422 `IMAGE_DIMENSIONS_UNSUPPORTED` | Đơn vị/API | `Dự kiến tự động hóa` |
| V-20 | 512×512 | Đạt biên kích thước | Đơn vị | `Dự kiến tự động hóa` |
| V-21 | Bất kỳ chiều nào là 8193 | Từ chối tại biên kích thước | Đơn vị | `Dự kiến tự động hóa` |
| V-22 | Đúng 40.000.000 điểm ảnh | Đạt biên điểm ảnh nếu kích thước/tỷ lệ đạt | Đơn vị | `Dự kiến tự động hóa` |
| V-23 | 40.000.001 điểm ảnh/bom giải nén | Từ chối trước khi cấp phát không giới hạn | Bảo mật/đơn vị | `Dự kiến tự động hóa` |
| V-24 | Tỷ lệ dưới 1:4 hoặc trên 4:1 | Trả lỗi kích thước 422 | Đơn vị | `Dự kiến tự động hóa` |
| V-25 | JPEG xoay bằng EXIF | Điểm ảnh chuẩn đúng chiều, kích thước xác định | Đơn vị | `Dự kiến tự động hóa` |
| V-26 | Có EXIF/XMP/GPS/tên tệp | Ảnh chuẩn/yêu cầu nhà cung cấp/đầu ra không chứa chúng | Quyền riêng tư/đơn vị | `Dự kiến tự động hóa` |
| V-27 | Đầu vào CMYK/bảng màu/16-bit | Chuẩn hóa sang RGB/RGBA 8-bit được duyệt hoặc từ chối an toàn | Đơn vị | `Dự kiến tự động hóa` |
| V-28 | Bộ giải mã vượt giới hạn thời gian/bộ nhớ | Thất bại an toàn, tiến trình xử lý/API vẫn khỏe | Bảo mật/tích hợp | `Dự kiến tự động hóa` |

## 4. Kiểm tra chất lượng và chủ thể

| ID | Tình huống/đầu vào | Kết quả mong đợi | Cấp kiểm thử | Trạng thái |
| --- | --- | --- | --- | --- |
| Q-01 | Phương sai Laplacian 99,99 | `IMAGE_TOO_BLURRY` | Đơn vị | `Dự kiến tự động hóa` |
| Q-02 | Phương sai Laplacian 100,00 | Đạt chốt độ mờ | Đơn vị | `Dự kiến tự động hóa` |
| Q-03 | Trung vị độ chói 34 | `IMAGE_TOO_DARK` | Đơn vị | `Dự kiến tự động hóa` |
| Q-04 | Trung vị độ chói 35/220 | Đạt biên trung vị ánh sáng | Đơn vị | `Dự kiến tự động hóa` |
| Q-05 | Trung vị độ chói 221 | `IMAGE_TOO_BRIGHT` | Đơn vị | `Dự kiến tự động hóa` |
| Q-06 | Điểm ảnh tối >35% | `IMAGE_TOO_DARK` | Đơn vị | `Dự kiến tự động hóa` |
| Q-07 | Điểm ảnh cháy sáng >35% | `IMAGE_TOO_BRIGHT` | Đơn vị | `Dự kiến tự động hóa` |
| Q-08 | Schema trả `person`, số chủ thể chính 1, không có chủ thể thứ hai, không không-chắc-chắn | Đạt chốt chủ thể chính | Hợp đồng | `Dự kiến tự động hóa` |
| Q-09 | Schema trả `subject_type=unknown` | `SUBJECT_NOT_FOUND` | Hợp đồng | `Dự kiến tự động hóa` |
| Q-10 | `primary_subject_count=2` | `MULTIPLE_SUBJECTS` | Hợp đồng | `Dự kiến tự động hóa` |
| Q-11 | `secondary_subject_present=true` dù số chủ thể chính là 1 | `MULTIPLE_SUBJECTS` | Hợp đồng | `Dự kiến tự động hóa` |
| Q-12 | Đúng một thú cưng được hỗ trợ | Loại chủ thể `pet`, số lượng 1 | Hợp đồng/đánh giá chuẩn | `Dự kiến tự động hóa` |
| Q-13 | Đúng một vật thể thông thường | Loại chủ thể `object`, số lượng 1 | Hợp đồng/đánh giá chuẩn | `Dự kiến tự động hóa` |
| Q-14 | Không có chủ thể/không rõ | `SUBJECT_NOT_FOUND` | Hợp đồng | `Dự kiến tự động hóa` |
| Q-15 | Hai người | `MULTIPLE_SUBJECTS` hoặc `MULTIPLE_FACES`, không tạo tác vụ | Hợp đồng | `Dự kiến tự động hóa` |
| Q-16 | Người và thú cưng/vật thể đều là chủ thể chính | `MULTIPLE_SUBJECTS` | Hợp đồng | `Dự kiến tự động hóa` |
| Q-17 | Hai thú cưng/hai vật thể đều là chủ thể chính | `MULTIPLE_SUBJECTS` | Hợp đồng | `Dự kiến tự động hóa` |
| Q-18 | Có người nhưng không có mặt | `FACE_REQUIRED` | Hợp đồng | `Dự kiến tự động hóa` |
| Q-19 | Một mặt nhưng `face_clear=false` | `FACE_NOT_CLEAR` | Hợp đồng | `Dự kiến tự động hóa` |
| Q-20 | Một mặt, rõ, không che, không quá nhỏ và kết quả chắc chắn | Đạt chốt khuôn mặt người | Hợp đồng | `Dự kiến tự động hóa` |
| Q-21 | `face_too_small=true` | `FACE_NOT_CLEAR` | Hợp đồng | `Dự kiến tự động hóa` |
| Q-22 | Mặt mờ hoặc thiếu sáng làm `face_clear=false` | `FACE_NOT_CLEAR` | Hợp đồng | `Dự kiến tự động hóa` |
| Q-23 | `assessment_uncertain=true` | `ASSESSMENT_UNAVAILABLE`, không cho ảnh sẵn sàng | Hợp đồng | `Dự kiến tự động hóa` |
| Q-24 | `face_occluded=true` | `FACE_NOT_CLEAR` | Hợp đồng | `Dự kiến tự động hóa` |
| Q-25 | Ảnh bị từ chối trên ứng dụng di động | Người dùng ở lại màn hình Tạo, thấy nội dung Việt/Anh an toàn và thao tác chọn/cắt ảnh | Thiết bị/giao diện | `Dự kiến kiểm thử thiết bị` |
| Q-26 | Bộ chuyển đổi Gemini trả thiếu trường/sai enum/JSON không khớp `input-assessment-v1` | `ASSESSMENT_UNAVAILABLE`, không vô tình cho đạt | Hợp đồng | `Dự kiến tự động hóa` |

## 5. Sự đồng ý và vòng đời ảnh nguồn

| ID | Tình huống | Kết quả mong đợi | Cấp kiểm thử | Trạng thái |
| --- | --- | --- | --- | --- |
| C-01 | Tải lên với `consent_accepted=false` | 400 `CONSENT_REQUIRED`, không tạo ảnh nguồn/gọi nhà cung cấp | API | `Đã tự động hóa ở mốc hiện trạng` |
| C-02 | Đã chọn ảnh nhưng chưa đánh dấu đồng ý | Vô hiệu hóa Kiểm tra/Tạo | Giao diện | `Đã tự động hóa ở mốc hiện trạng` |
| C-03 | Đã đồng ý rồi thay ảnh | Đặt lại sự đồng ý/kết quả kiểm tra/ý định | Giao diện/đơn vị | `Đã tự động hóa ở mốc hiện trạng` |
| C-04 | Sự đồng ý/xác nhận hợp lệ | Nội dung nêu Supabase, Google Gemini và tên pháp lý dịch vụ tạo ảnh; ghi chủ sở hữu/SHA/`consent-v1.1`/hai boolean/`accepted_at` | Tích hợp | `Dự kiến tự động hóa` |
| C-05 | Boolean không phải `true` hoặc phiên bản đồng ý cũ | 400 `RIGHTS_ATTESTATION_REQUIRED`; không gọi Gemini/dịch vụ tạo ảnh; bằng chứng cũ bất biến | API/tích hợp | `Dự kiến tự động hóa` |
| C-06 | Ảnh nguồn bị xóa | Bằng chứng đồng ý giữ 365 ngày, không chứa ảnh/đường dẫn | Quyền riêng tư/tích hợp | `Dự kiến tự động hóa` |
| C-07 | Tác vụ cuối của ảnh nguồn kết thúc +24 giờ | Xóa ảnh nguồn gốc, vòng đời siêu dữ liệu chính xác | Lưu giữ/tích hợp | `Dự kiến tự động hóa` |
| C-08 | Ứng dụng di động tải thành công/lỗi/thay ảnh/rời màn hình | Chỉ dọn bộ đệm ứng dụng đúng lúc; ảnh gốc trong thư viện không đổi | Đơn vị/thiết bị | `Đã tự động hóa ở mốc hiện trạng` |

## 6. An toàn đầu vào/đầu ra, xác nhận độ tuổi và sở hữu trí tuệ

| ID | Tình huống | Kết quả mong đợi | Cấp kiểm thử | Trạng thái |
| --- | --- | --- | --- | --- |
| M-01 | Đầu vào có cấu trúc hợp lệ và Gemini kiểm duyệt cho đạt | Bước kiểm tra an toàn đạt | Hợp đồng | `Dự kiến tự động hóa` |
| M-02 | Gemini trả `blocked=false` | Riêng bước kiểm duyệt đạt; vẫn phải qua chủ thể/quyền | Hợp đồng | `Dự kiến tự động hóa` |
| M-03 | Gemini trả `blocked=true` | `INPUT_BLOCKED`, không tạo ảnh | Hợp đồng | `Dự kiến tự động hóa` |
| M-04 | Phản hồi kiểm duyệt Gemini sai lược đồ | `ASSESSMENT_UNAVAILABLE`, không tạo ảnh | Hợp đồng | `Dự kiến tự động hóa` |
| M-05 | Gemini trả `assessment_uncertain=true` | Đóng an toàn, không cho ảnh nguồn sẵn sàng | Hợp đồng | `Dự kiến tự động hóa` |
| M-06 | Gemini quá thời gian hoặc không sẵn sàng | 503 `ASSESSMENT_UNAVAILABLE`, có thể thử lại, không tạo tác vụ | Hợp đồng | `Dự kiến tự động hóa` |
| M-07 | Ảnh người thiếu xác nhận chủ thể từ 18 tuổi/quyền sử dụng | 400 `RIGHTS_ATTESTATION_REQUIRED`, không gọi AI | API | `Dự kiến tự động hóa` |
| M-08 | `consent-v1.1` có đủ xác nhận tuổi/quyền | Đạt chốt xác nhận; hệ thống không suy luận tuổi, vẫn phải qua các bước khác | Hợp đồng | `Dự kiến tự động hóa` |
| M-09 | Câu lệnh/schema yêu cầu tên, danh tính, tuổi hoặc thuộc tính nhạy cảm | Kiểm tra cấu hình thất bại; không triển khai cấu hình đó | Đơn vị/bảo mật | `Dự kiến tự động hóa` |
| M-10 | Báo cáo `unauthorized_image` có căn cứ cho nhân vật công chúng | Ảnh mất quyền truy cập khi quản trị viên gỡ bỏ; có dấu vết/SLA | Tích hợp/vận hành | `Dự kiến tự động hóa` |
| M-11 | `obvious_branded_or_copyrighted_character=true` | `RIGHTS_POLICY_BLOCKED` | Hợp đồng | `Dự kiến tự động hóa` |
| M-12 | Bộ âm tính gồm vật thể thông thường | Tỷ lệ dương tính giả của chốt thương hiệu nằm trong ngưỡng phát hành | Đánh giá chuẩn | `Đánh giá trước phát hành` |
| M-13 | Ảnh tạo ra không an toàn | Chặn vị trí trước khi lưu chính thức/công bố lên Storage | Tích hợp | `Dự kiến tự động hóa` |
| M-14 | Câu chữ chính xác/đã kết xuất không an toàn | Chặn vị trí trước khi công bố | Tích hợp | `Dự kiến tự động hóa` |
| M-15 | Một vị trí bị chặn, tạo bù thành công | Bộ cuối vẫn có đúng 8 ảnh đạt | Tích hợp | `Dự kiến tự động hóa` |
| M-16 | Vị trí vẫn bị chặn sau hai lần tạo bù | Toàn bộ tác vụ thất bại; không truy cập được bộ/gói/ảnh | Tích hợp | `Dự kiến tự động hóa` |
| M-17 | Lỗi/điểm/bằng chứng thô từ nhà cung cấp | Không bao giờ trả cho ứng dụng di động/nhật ký/sự kiện | Bảo mật | `Dự kiến tự động hóa` |
| M-18 | Yêu cầu ID sticker bị chặn/chưa kiểm duyệt | 404; không lộ sự tồn tại/chi tiết | API/bảo mật | `Đã tự động hóa ở mốc hiện trạng` |

## 7. Hợp đồng tạo ảnh và đầu ra

| ID | Tình huống | Kết quả mong đợi | Cấp kiểm thử | Trạng thái |
| --- | --- | --- | --- | --- |
| G-01 | Cấu hình sản xuất dùng mô phỏng | Khởi động thất bại | Đơn vị | `Đã tự động hóa ở mốc hiện trạng` |
| G-02 | Tiền sản xuất/sản xuất dùng xác thực cục bộ | Khởi động thất bại | Đơn vị | `Dự kiến tự động hóa` |
| G-03 | Môi trường sản xuất thiếu một trong bốn biến AI, giá trị rỗng hoặc `OPENAI_BASE_URL` không dùng HTTPS | Khởi động thất bại; với đủ `GEMINI_API_KEY`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_IMAGE_MODEL` hợp lệ thì tạo đúng hai bộ chuyển đổi, không có chọn dịch vụ động | Đơn vị/hợp đồng | `Dự kiến tự động hóa` |
| G-04 | Ảnh nguồn sẵn sàng + thao tác Tạo | 202, tác vụ bền vững đã vào hàng đợi | API/tích hợp | `Đã tự động hóa ở mốc hiện trạng` |
| G-05 | Ảnh nguồn chưa sẵn sàng/không đúng chủ sở hữu | 404/lỗi kiểm tra, không có thông điệp hàng đợi | API | `Đã tự động hóa ở mốc hiện trạng` |
| G-06 | Yêu cầu thứ năm trong hạn mức | Chấp nhận nếu không có tác vụ đang hoạt động | API | `Dự kiến tự động hóa` |
| G-07 | Yêu cầu thứ sáu trong cùng ngày UTC | 429 `QUOTA_EXCEEDED` kèm `retry_after` | API | `Dự kiến tự động hóa` |
| G-08 | Chủ sở hữu đã có tác vụ đang hoạt động | Từ chối tác vụ hoạt động thứ hai | API | `Dự kiến tự động hóa` |
| G-09 | Hợp đồng yêu cầu tạo ảnh | Phong cách, ngôn ngữ/danh mục/câu lệnh cố định, 8 vị trí; không câu lệnh người dùng | Hợp đồng | `Dự kiến tự động hóa` |
| G-10 | Lệnh gọi bộ chuyển đổi tạo ảnh | Dùng đúng URL/khóa/mô hình đã cấu hình; yêu cầu giữ đặc trưng/chất lượng cao, đích 1024 và nền trong suốt mà không rò kiểu riêng dịch vụ | Hợp đồng | `Dự kiến tự động hóa` |
| G-11 | Hơn hai lệnh gọi dịch vụ tạo ảnh chồng nhau | Chốt đồng thời ngăn lệnh thứ ba | Đơn vị/tích hợp | `Dự kiến tự động hóa` |
| G-12 | Dịch vụ tạo ảnh trả lỗi tạm thời 429/5xx | Chờ 2/5/10 giây trong thời hạn; từng lần gọi ghi `provider_kind`/máy chủ/mô hình/đơn vị tính phí/chi phí mà không có ảnh/câu lệnh thô | Hợp đồng | `Dự kiến tự động hóa` |
| G-13 | Dịch vụ tạo ảnh từ chối và không thể thử lại | Tác vụ thất bại an toàn, không thử lại dồn dập hoặc tự đổi URL/mô hình; tổng chi phí chỉ gồm lần gọi thực tế bị tính phí | Hợp đồng | `Dự kiến tự động hóa` |
| G-14 | Dịch vụ tạo ảnh trả base64 sai/không phải PNG | `INVALID_OUTPUT_CONTRACT` | Hợp đồng | `Dự kiến tự động hóa` |
| G-15 | PNG không phải 1024×1024/RGBA/sRGB | Từ chối vị trí | Đơn vị | `Dự kiến tự động hóa` |
| G-16 | PNG >4 MiB | Từ chối/tạo bù vị trí | Đơn vị | `Dự kiến tự động hóa` |
| G-17 | Không trong suốt hoặc <5% điểm ảnh trong suốt | Từ chối/tạo bù vị trí | Đơn vị | `Dự kiến tự động hóa` |
| G-18 | Chữ danh mục sai/thiếu | Bộ kết xuất chữ xác định tạo đúng câu mong đợi | Đơn vị | `Dự kiến tự động hóa` |
| G-19 | Kiểm tra chữ ở 128×128 | Đạt ngưỡng dễ đọc | Đánh giá chuẩn | `Đánh giá trước phát hành` |
| G-20 | Mã kiểm tra đầu ra trước/sau Storage | SHA-256 giống nhau | Tích hợp | `Dự kiến tự động hóa` |
| G-21 | Tám số thứ tự hợp lệ và duy nhất | Công bố bộ nguyên tử và tác vụ thành công | Tích hợp | `Dự kiến tự động hóa` |
| G-22 | Có 7/9/trùng/thiếu số thứ tự | Toàn bộ tác vụ thất bại; không có bộ thiếu | Tích hợp | `Đã tự động hóa ở mốc hiện trạng` |
| G-23 | Mô phỏng thành công/lỗi/quá hạn/bị chặn | Trạng thái kết thúc xác định, không có gói thiếu | Đơn vị/API | `Đã tự động hóa ở mốc hiện trạng` |
| G-24 | Tạo lại | Tác vụ/bộ mới, cùng ảnh nguồn/phong cách/ngôn ngữ/danh mục, trừ hạn mức | API | `Đã tự động hóa ở mốc hiện trạng` |
| G-25 | Yêu cầu sửa/tạo lại từng ảnh hoặc câu lệnh tự do | Không có API/giao diện công khai; yêu cầu bị từ chối | Hợp đồng/giao diện | `Dự kiến tự động hóa` |
| G-26 | Phản hồi thành công | Bộ công khai ghi `chibi_3d`, tám PNG đã qua kiểm duyệt | API | `Dự kiến tự động hóa` |

## 8. Hàng đợi tác vụ, thử lại, tiếp tục và tính lũy đẳng

| ID | Tình huống | Kết quả mong đợi | Cấp kiểm thử | Trạng thái |
| --- | --- | --- | --- | --- |
| J-01 | Ghi `generation_jobs` ở trạng thái `queued` | Chính hàng tác vụ là việc bền vững; không có thông điệp thứ hai hoặc cửa sổ mất đồng bộ | Tích hợp | `Dự kiến tự động hóa` |
| J-02 | Quay lui giao dịch tạo tác vụ | Không có hàng tác vụ/chi phí nhà cung cấp mồ côi | Tích hợp | `Dự kiến tự động hóa` |
| J-03 | Hai tiến trình xử lý nhận việc đồng thời | `FOR UPDATE SKIP LOCKED` chỉ giao mỗi tác vụ cho một tiến trình; phiên thuê 240 giây, tín hiệu sống 30 giây | Hợp đồng/tích hợp | `Dự kiến tự động hóa` |
| J-04 | Tiến trình thử nhận lại tác vụ còn phiên thuê | Không gọi trùng nhà cung cấp hoặc tạo trùng bộ | Tích hợp | `Dự kiến tự động hóa` |
| J-05 | Tiến trình dừng giữa tác vụ | Phiên thuê hết hạn + đối soát nhận lại và tiếp tục an toàn | Tích hợp | `Dự kiến tự động hóa` |
| J-06 | API/tiến trình xử lý khởi động lại | Tác vụ chưa kết thúc vẫn truy vấn được và đi tới trạng thái kết thúc | Tích hợp | `Dự kiến tự động hóa` |
| J-07 | Ứng dụng di động rời màn hình | Tác vụ tiếp tục; quay lại thấy trạng thái hiện tại | Thiết bị | `Dự kiến kiểm thử thiết bị` |
| J-08 | Ứng dụng di động khởi động lại | Đối soát ID tác vụ hoạt động với máy chủ | Thiết bị | `Dự kiến kiểm thử thiết bị` |
| J-09 | Các ảnh chụp tiến độ | Chỉ tăng 0–100, giai đoạn hợp lệ, không lùi | Đơn vị/API | `Đã tự động hóa ở mốc hiện trạng` |
| J-10 | Thời gian chạy đạt 180 giây | `timed_out`, không công bố, cho thử lại an toàn | Tích hợp | `Dự kiến tự động hóa` |
| J-11 | Hủy khi đang xếp hàng/kiểm tra | `cancelled`, chặn công bố từ hàng đợi/nhà cung cấp | Tích hợp | `Dự kiến tự động hóa` |
| J-12 | Kết quả nhà cung cấp về sau khi hủy | Xóa ảnh, không tạo bộ | Tích hợp | `Dự kiến tự động hóa` |
| J-13 | Cùng Idempotency-Key + nội dung | Trả phản hồi/tài nguyên gốc | API | `Đã tự động hóa ở mốc hiện trạng` |
| J-14 | Cùng khóa + nội dung khác | 409 xung đột lũy đẳng | API | `Đã tự động hóa ở mốc hiện trạng` |
| J-15 | Cùng khóa đồng thời | Chính xác một tài nguyên | API | `Đã tự động hóa ở mốc hiện trạng` |
| J-16 | Mất/phát lại phản hồi tải ảnh nguồn | Trả cùng ảnh nguồn/sự đồng ý, không trùng | Tích hợp | `Dự kiến tự động hóa` |
| J-17 | Bản ghi lũy đẳng sau 24 giờ | Hết hạn theo chính sách mà không xóa tài nguyên | Lưu giữ | `Dự kiến tự động hóa` |

## 9. Xem trước, thư viện, tải xuống, chia sẻ và xóa

| ID | Tình huống | Kết quả mong đợi | Cấp kiểm thử | Trạng thái |
| --- | --- | --- | --- | --- |
| D-01 | Lấy bộ của tác vụ thành công | Bản xem trước có đúng 8 số thứ tự duy nhất | API/giao diện | `Đã tự động hóa ở mốc hiện trạng` |
| D-02 | Bản xem trước mặc định | Chọn cả 8 ảnh | Giao diện | `Đã tự động hóa ở mốc hiện trạng` |
| D-03 | Chọn/bỏ chọn | Phần được chọn trên giao diện phản ánh đúng thao tác | Giao diện | `Đã tự động hóa ở mốc hiện trạng` |
| D-04 | Không chọn ảnh nào | Vô hiệu hóa Lưu ở máy khách và máy chủ từ chối phần rỗng | Giao diện/API | `Đã tự động hóa ở mốc hiện trạng` |
| D-05 | ID sticker trùng/không thuộc bộ | 422/404, không tạo gói | API | `Đã tự động hóa ở mốc hiện trạng` |
| D-06 | Lưu ba trong tám ảnh | Gói chứa nguyên tử đúng ba ảnh đó | API/tích hợp | `Đã tự động hóa ở mốc hiện trạng` |
| D-07 | Mất phản hồi lưu/thử lại | Trả cùng gói, không tạo trùng | API | `Đã tự động hóa ở mốc hiện trạng` |
| D-08 | Lỗi CSDL khi lưu | Bản xem trước vẫn có tới hết 24 giờ | Tích hợp/giao diện | `Dự kiến tự động hóa` |
| D-09 | Bản xem trước chưa lưu hết hạn sau 24 giờ | Không còn truy cập được; ảnh tạm đã dọn | Lưu giữ | `Dự kiến tự động hóa` |
| D-10 | Khởi động lại ứng dụng với cùng token làm mới của cài đặt | Làm mới token truy cập và khôi phục gói/danh sách/chi tiết đã lưu từ Supabase | Tích hợp/thiết bị | `Dự kiến tự động hóa` |
| D-11 | Phân trang thư viện | Con trỏ ổn định, không lộ cấu trúc, mặc định 20, không trùng/thiếu | API | `Dự kiến tự động hóa` |
| D-12 | Thao tác Tải xuống trên ảnh chỉ có ở bản xem trước | Không xuất hiện | Giao diện | `Dự kiến tự động hóa` |
| D-13 | Tải xuống ảnh đã lưu | `image/png` có xác thực, đúng tên tệp/byte/mã kiểm tra | API/thiết bị | `Dự kiến kiểm thử thiết bị` |
| D-14 | Đã cấp quyền MediaLibrary | PNG được lưu vào album `Duhat Gen Sticker` | Thiết bị | `Dự kiến kiểm thử thiết bị` |
| D-15 | Quyền tải xuống bị từ chối/hủy | Không báo thành công giả; có thao tác thử lại/Mở cài đặt | Thiết bị | `Dự kiến kiểm thử thiết bị` |
| D-16 | Lỗi mạng/đầy đĩa/ghi | Thất bại an toàn, dọn tệp tạm, bản đám mây không đổi | Thiết bị | `Dự kiến kiểm thử thiết bị` |
| D-17 | Tải xuống hoàn tất | Gói/sticker vẫn tồn tại trong thư viện đám mây | Tích hợp/thiết bị | `Dự kiến tự động hóa` |
| D-18 | Chia sẻ ảnh ở bản xem trước | Một PNG tạm mở bảng chia sẻ hệ điều hành mà không cần lưu | Thiết bị | `Dự kiến kiểm thử thiết bị` |
| D-19 | Chia sẻ ảnh đã lưu | Một PNG; gói không công khai; tệp tạm được dọn trong mọi kết quả | Thiết bị | `Dự kiến kiểm thử thiết bị` |
| D-20 | Mở/đóng bảng chia sẻ | Chỉ ghi sự kiện mở, không bao giờ ghi đã giao/đã gửi | Phân tích/thiết bị | `Dự kiến kiểm thử thiết bị` |
| D-21 | Xóa gói | Biến mất ngay; trả 204 rồi các lần sau trả 404 | API | `Đã tự động hóa ở mốc hiện trạng` |
| D-22 | Xóa ảnh chính | Hoàn tất ≤24 giờ khi không còn tham chiếu; có kiểm toán | Lưu giữ/tích hợp | `Dự kiến tự động hóa` |
| D-23 | Xóa gói đám mây sau khi tải/chia sẻ cục bộ | Không khẳng định/thu hồi bản cục bộ/bên ngoài | Giao diện/thiết bị | `Dự kiến kiểm thử thiết bị` |
| D-24 | Tạo lại khi còn bản xem trước/gói cũ | Tài nguyên cũ không đổi; tác vụ mới độc lập | API/giao diện | `Đã tự động hóa ở mốc hiện trạng` |

## 10. Báo cáo và phân tích sản phẩm

| ID | Tình huống | Kết quả mong đợi | Cấp kiểm thử | Trạng thái |
| --- | --- | --- | --- | --- |
| R-01 | Báo cáo theo từng lý do cố định | 201, báo cáo có lý do/trạng thái/SLA hợp lệ | API | `Dự kiến tự động hóa` |
| R-02 | Ghi chú tùy chọn 500 ký tự | Chấp nhận; 501 ký tự bị từ chối | API | `Dự kiến tự động hóa` |
| R-03 | Báo cáo sticker không nhìn thấy/chéo chủ sở hữu | 404 | Bảo mật/API | `Dự kiến tự động hóa` |
| R-04 | Phát lại báo cáo lũy đẳng | Cùng báo cáo, không trùng mục hàng đợi | API | `Dự kiến tự động hóa` |
| R-05 | Báo cáo khẩn cấp | Hạn xử lý ≤24 giờ | Tích hợp | `Dự kiến tự động hóa` |
| R-06 | Báo cáo thông thường | Hạn xử lý ≤72 giờ | Tích hợp | `Dự kiến tự động hóa` |
| R-07 | Thao tác gỡ bỏ | Ảnh mất khả năng truy cập ngay; ghi kiểm toán | Tích hợp | `Dự kiến tự động hóa` |
| R-08 | Khiếu nại trong 14 ngày | Chấp nhận một khiếu nại và ghi kiểm toán | Tích hợp | `Dự kiến tự động hóa` |
| R-09 | Báo cáo đã đóng +180 ngày | Dọn bằng chứng | Lưu giữ | `Dự kiến tự động hóa` |
| R-10 | Nhân sự vận hành truy cập/thao tác trái phép | Bị từ chối và phát sự kiện bảo mật | Bảo mật | `Đánh giá trước phát hành` |
| AN-01 | Chưa/tắt đồng ý phân tích | Không gửi/nhận sự kiện sản phẩm | Đơn vị/API | `Dự kiến tự động hóa` |
| AN-02 | Đã đồng ý + sự kiện trong danh sách cho phép | 202 và lưu kèm phiên bản lược đồ | API | `Dự kiến tự động hóa` |
| AN-03 | UUID sự kiện trùng | Chỉ một sự kiện thô | API | `Dự kiến tự động hóa` |
| AN-04 | Sự kiện/thuộc tính không biết | Từ chối lô/sự kiện an toàn | API | `Dự kiến tự động hóa` |
| AN-05 | Dữ liệu chứa byte/đường dẫn/khóa/URL có chữ ký/câu lệnh/tham chiếu nhà cung cấp | Từ chối; không lưu/ghi vọng vào nhật ký | Quyền riêng tư/API | `Dự kiến tự động hóa` |
| AN-06 | `validation_failed` | Chỉ có nhóm lý do an toàn, không có chi tiết nhạy cảm | Hợp đồng | `Dự kiến tự động hóa` |
| AN-07 | Mở bảng chia sẻ | Không có sự kiện “đã gửi/đã giao” | Hợp đồng/thiết bị | `Dự kiến tự động hóa` |
| AN-08 | Sự kiện tải xuống | Đúng ý nghĩa bắt đầu/hoàn tất/thất bại và không có đường dẫn cục bộ | Hợp đồng/thiết bị | `Dự kiến tự động hóa` |
| AN-09 | Sự kiện thô đạt 90 ngày | Bị xóa; dữ liệu tổng hợp được giữ | Lưu giữ | `Dự kiến tự động hóa` |
| AN-10 | Dữ liệu mẫu tính KPI | Công thức/mẫu số SRS tạo giá trị mong đợi | Kiểm thử dữ liệu | `Dự kiến tự động hóa` |

## 11. Xác thực, phân quyền, bảo mật và quyền riêng tư

| ID | Tình huống | Kết quả mong đợi | Cấp kiểm thử | Trạng thái |
| --- | --- | --- | --- | --- |
| S-01 | Không có/JWT truy cập cài đặt sai hoặc hết hạn | 401 `AUTH_REQUIRED`; máy khách có thể làm mới nếu token làm mới còn hạn | API | `Đã tự động hóa ở mốc hiện trạng` |
| S-02 | JWT truy cập sai đơn vị phát hành/đối tượng/thuật toán/chữ ký | 401 | Bảo mật | `Đã tự động hóa ở mốc hiện trạng` |
| S-03 | Đăng ký cài đặt rồi dùng JWT truy cập hợp lệ | Trả token đúng TTL; chỉ suy ra chủ sở hữu từ `sub=installations.id`; không dùng trường Supabase | API | `Dự kiến tự động hóa` |
| S-04 | Máy khách gửi trường/tiêu đề chủ sở hữu | Bỏ qua/từ chối | Bảo mật | `Dự kiến tự động hóa` |
| S-05 | Ảnh nguồn/tác vụ/bộ/gói/sticker/báo cáo chéo chủ sở hữu | Mọi điểm cuối đều trả 404 | Bảo mật/tích hợp | `Đã tự động hóa ở mốc hiện trạng` |
| S-06 | Gói di động hoặc vai trò công khai truy cập Supabase trực tiếp | Không có URL/anon key trong gói; quyền CSDL/Storage mặc định từ chối | Tích hợp Supabase | `Dự kiến tự động hóa` |
| S-07 | Tìm khóa dịch vụ/bí mật trong gói di động/kho mã/nhật ký | Không có kết quả hoặc bí mật dùng được | Bảo mật CI | `Dự kiến tự động hóa` |
| S-08 | Kho công khai hoặc URL đối tượng | Kiểm tra sẵn sàng/khởi động thất bại | Tích hợp | `Dự kiến tự động hóa` |
| S-09 | Phản hồi ảnh | Riêng tư/không lưu đệm, `nosniff`, Content-Type/Disposition/ETag hợp lệ | API | `Đã tự động hóa ở mốc hiện trạng` |
| S-10 | Duyệt đường dẫn/chèn khóa đối tượng | Không đọc/ghi tùy ý | Bảo mật | `Dự kiến tự động hóa` |
| S-11 | CORS ký tự đại diện ở sản xuất | Khởi động thất bại | Đơn vị | `Dự kiến tự động hóa` |
| S-12 | Có đích mạng ngoài Supabase, API Gemini và máy chủ HTTPS từ `OPENAI_BASE_URL`; hoặc cố đổi URL/mô hình lúc chạy | Yêu cầu/luồng mạng ra bị chặn; không có chuyển dự phòng động | Đơn vị/tích hợp | `Dự kiến tự động hóa` |
| S-13 | Thu lại yêu cầu gửi Gemini/dịch vụ tạo ảnh | Chỉ có byte ảnh chuẩn/dữ liệu tối thiểu; không EXIF/GPS | Hợp đồng quyền riêng tư | `Dự kiến tự động hóa` |
| S-14 | Ngoại lệ ứng dụng chứa đường dẫn/bí mật/dữ liệu nhà cung cấp | Chỉ trả Problem Details chung + ID yêu cầu | API | `Đã tự động hóa ở mốc hiện trạng` |
| S-15 | Nhật ký có cấu trúc qua mọi luồng | Không ảnh/tham chiếu/chủ sở hữu/câu lệnh/bí mật/dữ liệu thô | Quét quyền riêng tư | `Dự kiến tự động hóa` |
| S-16 | Dữ liệu phân tích sản phẩm qua mọi luồng | Đạt cùng phép quét trường bị cấm | Quét quyền riêng tư | `Dự kiến tự động hóa` |
| S-17 | Giới hạn tần suất tải lên/chung/báo cáo | 429 kèm `retry_after`, không phát sinh chi phí nhà cung cấp sau giới hạn | Tích hợp | `Dự kiến tự động hóa` |
| S-18 | Lạm dụng `POST /installations` hoặc `/installations/refresh` | Giới hạn FastAPI/proxy 10 đăng ký và 60 lần làm mới/IP/giờ trả 429, không tạo hàng loạt chủ sở hữu/phiên | Bảo mật | `Đánh giá trước phát hành` |
| S-19 | Dọn tệp tạm khi thành công/lỗi/sự cố/khởi động | Vòng đời tệp tạm ứng dụng/tiến trình xử lý đạt chính sách 1 giờ | Tích hợp/thiết bị | `Dự kiến tự động hóa` |
| S-20 | Duyệt Gemini và dịch vụ tạo ảnh về huấn luyện/lưu giữ | Không có đường dùng nội dung sản xuất để huấn luyện; mỗi dịch vụ lưu tối đa 30 ngày, có cơ chế xóa/DPA và tên pháp lý khớp thông báo quyền riêng tư | Duyệt quyền riêng tư | `Đánh giá trước phát hành` |
| S-21 | Yêu cầu xóa sau 24 giờ/bản sao lưu sau 30 ngày | Dữ liệu chính đã mất/kiểm toán hoàn tất; xác minh sao lưu hết hạn | Vận hành | `Đánh giá trước phát hành` |
| S-22 | Token làm mới hợp lệ, xoay vòng rồi phát lại token cũ; đồng thời diễn tập đổi khóa ký | Lần đầu trả cặp token mới, phát lại thu hồi chuỗi phiên; đổi khóa theo quy trình không vượt SLO | Bảo mật/vận hành | `Đánh giá trước phát hành` |

## 12. Hiệu năng, chất lượng, khả năng tiếp cận và vận hành

| ID | Tình huống | Kết quả mong đợi | Cấp kiểm thử | Trạng thái |
| --- | --- | --- | --- | --- |
| P-01 | Tải đọc/ghi API | p95 ≤500 ms/1 giây | Tải | `Đánh giá trước phát hành` |
| P-02 | Kho dữ liệu kiểm tra ảnh có thẩm quyền | p95 ≤15 giây sau khi tải lên | Đánh giá chuẩn | `Đánh giá trước phát hành` |
| P-03 | Kho dữ liệu tạo ảnh | p50 ≤60 giây, p95 ≤120 giây, tối đa 180 giây | Đánh giá chuẩn | `Đánh giá trước phát hành` |
| P-04 | 20 mục đầu thư viện | p95 ≤1 giây | Tải | `Đánh giá trước phát hành` |
| P-05 | Truyền ảnh | TTFB p95 ≤1 giây | Tải | `Đánh giá trước phát hành` |
| P-06 | 2 tác vụ đang xử lý, 50 tác vụ chờ và 20 yêu cầu mỗi phút | Không mất điều kiện bất biến; yêu cầu vượt ngưỡng trả 429, hàng đợi không mất tác vụ | Tải | `Đánh giá trước phát hành` |
| P-07 | Độ sâu hàng đợi >20 trong 10 phút/lỗi tác vụ >5% | Phát đúng cảnh báo mà không có PII | Vận hành | `Đánh giá trước phát hành` |
| P-08 | Kiểm tra tổng hợp độ sẵn sàng API | Chạy mỗi phút theo SLA §3.1; tính đúng bảo trì/gián đoạn và đo được mục tiêu tháng ≥99,0% | Vận hành | `Đánh giá trước phát hành` |
| P-09 | Diễn tập khôi phục sao lưu | RPO ≤24 giờ, RTO ≤8 giờ | Vận hành | `Đánh giá trước phát hành` |
| P-10 | Bộ 300 ảnh nguồn về giữ đặc trưng/tách nền/chữ | Đạt mọi ngưỡng SRS §8.6 | Đánh giá chuẩn | `Đánh giá trước phát hành` |
| P-11 | So sánh nhóm nhân khẩu học | Nhóm thấp nhất ≥80%, chênh lệch ≤5 điểm phần trăm | Đánh giá chuẩn | `Đánh giá trước phát hành` |
| P-12 | Bộ âm tính chủ thể/an toàn/thương hiệu | Độ bao phủ nhiều chủ thể ≥95%, chấp nhận sai nhiều chủ thể ≤2%, chấp nhận sai nội dung an toàn/thương hiệu ≤1% | Đánh giá chuẩn | `Đánh giá trước phát hành` |
| P-13 | Luồng VoiceOver/TalkBack | Mọi thao tác/trạng thái/lỗi/tiến độ được thông báo đúng | Thiết bị | `Dự kiến kiểm thử thiết bị` |
| P-14 | Cỡ chữ động 200% | Không cắt nội dung/thao tác quan trọng | Thiết bị | `Dự kiến kiểm thử thiết bị` |
| P-15 | Độ tương phản/vùng chạm | ≥4,5:1 và ≥44pt/48dp | Kiểm toán giao diện | `Dự kiến kiểm thử thiết bị` |
| P-16 | Khóa/danh mục/phông Việt-Anh | Không thiếu khóa; đúng danh mục; kết xuất đúng ký tự tiếng Việt | Đơn vị/thiết bị | `Đã tự động hóa ở mốc hiện trạng` |
| P-17 | Luồng di động ở mức tải cao nhất | Bộ nhớ ≤350 MiB, bộ đệm ≤100 MiB | Hồ sơ thiết bị | `Đánh giá trước phát hành` |
| P-18 | Luồng ba phút | Pin ≤3% trên thiết bị đánh giá 4000mAh | Hồ sơ thiết bị | `Đánh giá trước phát hành` |
| P-19 | Ngoại tuyến/mạng yếu/chuyển mạng | Khung đã lưu đệm hoạt động; thao tác lỗi/thử lại an toàn; không trùng tác vụ | Thiết bị | `Dự kiến kiểm thử thiết bị` |
| P-20 | Diễn tập SEV-1 và quay lui Docker Compose | Cảnh báo/phân loại/cập nhật đúng SLA §5; khôi phục thẻ ảnh API/tiến trình xử lý trước mà không vỡ lược đồ hoặc mất phiên thuê/tác vụ trong PostgreSQL | Vận hành | `Đánh giá trước phát hành` |

## 13. Truy vết

| SRS | Bộ kiểm thử |
| --- | --- |
| Quản trị/DEC-001..039 | DOC-*, kiểm thử cấu hình G-01..03, S-*, P-* |
| FR-ENT/INP/CNS | V-*, C-*, Q-25, S-01..03/S-18/S-22, các ca quyền thiết bị |
| FR-VAL | V-*, Q-*, M-01..12 |
| FR-GEN/SAFE | M-13..18, G-*, J-* |
| FR-PRV/SEL/REG/SAV/DEL | D-* |
| FR-SHR | D-18..20, AN-07 |
| FR-REP | R-* |
| FR-ANL | AN-* |
| Tác vụ/lỗi/tính lũy đẳng | J-*, các ca lỗi V/Q/M/G |
| Hợp đồng đầu vào/đầu ra | V-*, Q-*, G-14..26 |
| Bảo mật/quyền riêng tư/lưu giữ | C-06..08, S-*, R-09, AN-09 |
| Hiệu năng/chất lượng/nền tảng | P-* |
| Tiêu chí chấp nhận AC-001..021 | Được bao phủ bởi các bộ tương ứng; bằng chứng phát hành ánh xạ từng AC tới ID đã chạy |

## 14. Hướng dẫn thực thi

### 14.1 Các bộ kiểm thử tự động hiện có

```bash
cd backend
.venv/bin/pytest
.venv/bin/ruff check .

cd ../mobile
npm test
npm run lint
npm run typecheck
```

CI phải khóa phụ thuộc, chạy kiểm thử đơn vị/hợp đồng không cần mạng dịch vụ AI
và công bố kết quả JUnit/độ bao phủ/SBOM. Kiểm thử tích hợp Gemini/dịch vụ tạo ảnh
dùng bí mật tiền sản xuất và dữ liệu mẫu hợp pháp; không chạy trên yêu cầu kéo không đáng tin cậy.

Lần chạy mốc ngày 14/08/2026: máy chủ `26 passed`, Ruff đạt; ứng dụng di động có
`4` tệp/`19 passed`, kiểm tra kiểu TypeScript và Expo lint đạt. Đây là mốc mô
phỏng/bản mẫu, không phải kết quả phát hành của Mục tiêu V1.

### 14.2 Bản ghi bằng chứng

Với mỗi ca đã chạy, ghi: ID kiểm thử, SHA bản ghi mã, phiên bản môi trường/cấu
hình, SHA bộ dữ liệu/dữ liệu mẫu, thời điểm bắt đầu/kết thúc, kết quả, liên kết sản
phẩm bằng chứng, người duyệt và tham chiếu lỗi/rủi ro. Ca trên thiết bị ghi thêm hệ
điều hành/thiết bị/bản dựng ứng dụng; ca Gemini/dịch vụ tạo ảnh ghi loại dịch vụ,
máy chủ đích, mô hình và phiên bản chính sách/danh mục/câu lệnh mà không chứa nội dung thô.

### 14.3 Quy tắc phát hành

Phát hành yêu cầu:

- mọi ca P0 tự động/trên thiết bị đều đạt;
- độ bao phủ máy chủ ≥85%, ứng dụng di động ≥80%, các nhánh quan trọng về đồng ý/
  chủ sở hữu/an toàn/công bố/xóa đạt 100%;
- đạt ngưỡng chất lượng/an toàn/hiệu năng SRS;
- duyệt bảo mật/quyền riêng tư/lưu giữ/báo cáo/khôi phục đều đạt;
- mã kiểm tra PRD không đổi và bộ nhất quán DOC đạt.

Ca phát hành thất bại hoặc chưa chạy sẽ chặn phát hành. Chỉ đạt các kiểm thử mô
phỏng hiện tại không bao giờ đủ đáp ứng điều kiện phát hành Mục tiêu V1.
