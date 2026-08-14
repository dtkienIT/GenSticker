# Đặc tả yêu cầu phần mềm — Duhat Gen Sticker V1

## 0. Kiểm soát tài liệu

| Trường | Giá trị |
| --- | --- |
| Mã tài liệu | SRS-DGS-V1 |
| Phiên bản | 1.0 |
| Ngày chốt chuẩn | 14/08/2026 |
| Trạng thái | Đã chốt làm cơ sở triển khai |
| Sản phẩm | Duhat Gen Sticker — ứng dụng di động độc lập |
| Nguồn sản phẩm bất biến | `PRD_Sticker_Generation_V1_VI.md` |
| Bản tham chiếu bằng tiếng Anh | `PRD_Sticker_Generation_V1.md` |

### 0.1 Thứ tự ưu tiên nguồn

1. PRD là nguồn yêu cầu sản phẩm chính và không được sửa bởi bộ tài liệu này.
2. SRS ghi lại cách áp dụng PRD cho ứng dụng Duhat Gen Sticker độc lập và các
   quyết định sản phẩm/kỹ thuật đã được người yêu cầu chốt.
3. Tài liệu Thiết kế kiến trúc và kỹ thuật hiện thực hóa SRS.
4. SLA quy định cách đo mức dịch vụ và phản ứng vận hành từ các mục tiêu của SRS.
5. Tài liệu Bàn giao triển khai MVP mô tả trạng thái mã nguồn và khoảng cách tới SRS.
6. Tài liệu Danh sách công việc và kế hoạch chu kỳ lập thứ tự thực hiện.
7. TDD quy định bằng chứng kiểm thử cho SRS, kiến trúc và SLA.

Nếu mã nguồn hoặc tài liệu kế tiếp khác SRS, mã nguồn/tài liệu kế tiếp phải được
sửa. Nếu SRS khác mục tiêu PRD mà không có quyết định điều chỉnh được liệt kê tại
Mục 0.2, PRD thắng.

### 0.2 Danh mục quyết định đã chốt

| ID | Quyết định | Quan hệ với PRD |
| --- | --- | --- |
| DEC-001 | PRD tiếng Việt là nguồn chính; PRD tiếng Anh là bản tham chiếu. Hai tệp PRD giữ nguyên. | Thiết lập quy tắc quản trị tài liệu. |
| DEC-002 | Duhat Gen Sticker là ứng dụng Android/iOS độc lập, không phải mô-đun DUHAT Chat. | Thay bối cảnh tích hợp nhưng giữ mục tiêu tạo sticker. |
| DEC-003 | Ba năng lực V1 là tạo, lưu và chia sẻ/xuất; chia sẻ dùng bảng chia sẻ của hệ điều hành. | Thay khay sticker/khung chat DUHAT bằng năng lực tương đương của ứng dụng độc lập. |
| DEC-004 | Ảnh đầu vào có đúng một chủ thể chính: một người, một thú cưng hoặc một vật thể. | Chốt lựa chọn PRD §14.1. |
| DEC-005 | Một bộ được tạo thành công có chính xác 8 sticker. | Chuẩn hóa khoảng 6–8 của PRD thành 8. |
| DEC-006 | Phong cách V1 cố định là Chibi 3D, phi thực tế. | Chốt phong cách theo PRD §14.2. |
| DEC-007 | Danh mục có 8 vị trí cố định ở Mục 8.3; mọi vị trí có câu chữ Việt/Anh. | Chốt danh mục PRD §5.1. |
| DEC-008 | Mọi quyết định lịch sử đã được đóng tại DEC-011..039; tài liệu kế tiếp không được tự tạo giá trị khác. | Hoàn tất quyết định PRD §14. |
| DEC-009 | Chỉ nhận ảnh tĩnh JPEG, PNG, WebP, HEIC, HEIF; từ chối GIF, SVG, TIFF, BMP, RAW, AVIF và mọi ảnh nhiều khung hình. | Cụ thể hóa quy tắc kiểm tra định dạng. |
| DEC-010 | Thư viện riêng tư dùng Supabase PostgreSQL và Supabase Storage riêng tư, truy cập qua FastAPI theo chủ sở hữu; người dùng tải từng sticker đã lưu về thiết bị. | Thay khay sticker DUHAT bằng thư viện trong ứng dụng. |
| DEC-011 | Ngôn ngữ ứng dụng tại lúc gửi yêu cầu chọn danh mục `vi` hoặc `en`; ngôn ngữ của tác vụ không đổi sau khi gửi. | Chốt ánh xạ ngôn ngữ. |
| DEC-012 | V1 chỉ nhận ảnh người khi người tải lên xác nhận chủ thể từ 18 tuổi trở lên. Hệ thống không suy luận tuổi hoặc nhận dạng danh tính từ khuôn mặt; thiếu xác nhận thì chặn tải lên, còn nội dung tình dục hóa trẻ vị thành niên bị chặn bằng kiểm duyệt và quy trình báo cáo. | Chọn phương án bảo thủ, khả thi cho MVP của PRD §8.3. |
| DEC-013 | Thời hạn lưu giữ cố định theo Mục 7.3; dữ liệu không dùng để huấn luyện mô hình. | Chốt PRD §8.5/§14.4. |
| DEC-014 | Mỗi chủ sở hữu có 5 yêu cầu tạo/tạo lại mỗi ngày UTC và tối đa 1 tác vụ đang hoạt động; V1 không thu phí. | Chốt PRD §14.5. |
| DEC-015 | Nếu ảnh đầu ra bị chặn hoặc không hợp lệ, tiến trình xử lý tạo bù tối đa 2 lần; vẫn không đủ đúng 8 thì toàn bộ tác vụ thất bại, không hiển thị bộ chưa đầy đủ. | Chốt PRD §7.6/§14.6. |
| DEC-016 | SLO và thời gian chờ cố định tại Mục 9.2; giới hạn cứng cho việc tạo ảnh là 180 giây. | Chốt PRD §14.7. |
| DEC-017 | Ngưỡng ảnh đầu vào cố định tại Mục 8.1–8.2. | Hoàn thành hợp đồng ảnh đầu vào. |
| DEC-018 | Ảnh đầu ra là PNG 1024×1024 RGBA/sRGB, nền trong suốt, tối đa 4 MiB/ảnh. | Chốt hợp đồng ảnh đầu ra. |
| DEC-019 | Chia sẻ một sticker mỗi lần từ màn hình xem trước hoặc thư viện; không bắt buộc lưu trước; dữ liệu chia sẻ là PNG. | Chốt luồng chia sẻ của ứng dụng độc lập. |
| DEC-020 | FastAPI cấp danh tính cài đặt ẩn danh và cặp token truy cập/làm mới; `owner_id` là `installations.id`. Token truy cập sống 15 phút, token làm mới sống 90 ngày và được xoay vòng. V1 không có tài khoản, đồng bộ hoặc khôi phục đa thiết bị. | Chốt quyền sở hữu mà không dùng Supabase Auth. |
| DEC-021 | Supabase chỉ là lớp lưu trữ: PostgreSQL giữ siêu dữ liệu/trạng thái/thư viện và Storage riêng tư giữ tệp ảnh. Gemini thực hiện đánh giá ảnh có cấu trúc và kiểm duyệt; bước tạo ảnh gọi một dịch vụ bên thứ ba qua API tương thích OpenAI. Cấu hình AI của môi trường chỉ gồm `GEMINI_API_KEY`, `OPENAI_API_KEY`, `OPENAI_BASE_URL` và `OPENAI_IMAGE_MODEL`. | Chốt ranh giới Supabase và chuỗi AI tối giản, phù hợp MVP tiết kiệm chi phí. |
| DEC-022 | `generation_jobs` trong PostgreSQL là hàng đợi bền vững. Tiến trình xử lý Python thăm dò mỗi 2 giây, nhận việc bằng giao dịch `FOR UPDATE SKIP LOCKED`, giữ phiên thuê 240 giây và gửi tín hiệu sống mỗi 30 giây; không dùng Supabase Queues/PGMQ, Edge Functions, Redis hoặc dịch vụ hàng đợi khác. | Chốt kiến trúc xử lý tác vụ tối giản. |
| DEC-023 | Hỗ trợ Android 7+ và iOS 15.1+ theo Expo SDK 54; điện thoại dọc là giao diện chính, máy tính bảng có bố cục thích ứng. | Chốt ma trận nền tảng. |
| DEC-024 | Chức năng báo cáo có ở màn hình xem trước/thư viện; duyệt trong 72 giờ, trường hợp an toàn khẩn cấp trong 24 giờ; điểm cuối và hợp đồng dữ liệu ở Mục 6. | Chốt quy trình báo cáo/gỡ bỏ. |
| DEC-025 | Phân tích sản phẩm do hệ thống tự quản lý, yêu cầu người dùng đồng ý và chỉ nhận sự kiện trong danh sách Mục 11; mở bảng chia sẻ không đồng nghĩa gửi thành công. | Chốt ý nghĩa dữ liệu phân tích. |
| DEC-026 | V1 xóa theo gói sticker đã lưu; xóa cứng siêu dữ liệu/ảnh chính trong 24 giờ, bản sao lưu hết hạn tối đa 30 ngày. | Chốt ý nghĩa thao tác xóa. |
| DEC-027 | Màn hình xem trước mặc định chọn cả 8; cần chọn ít nhất 1 sticker để lưu. | Chốt cách lựa chọn. |
| DEC-028 | Bản xem trước chưa lưu được giữ 24 giờ từ khi tác vụ kết thúc; lỗi lưu không rút ngắn thời hạn này. | Chốt vòng đời bản xem trước. |
| DEC-029 | Danh mục/phiên bản lỗi và khả năng thử lại cố định tại Mục 5.4. | Chốt trải nghiệm xử lý lỗi. |
| DEC-030 | Quyền bị từ chối/giới hạn/thu hồi phải có thao tác thử lại và Mở cài đặt; ảnh chỉ có trên đám mây phải tải xong trước khi tải lên máy chủ. | Chốt cách khôi phục quyền truy cập. |
| DEC-031 | MVP không nhận dạng danh tính hay đối sánh khuôn mặt người nổi tiếng. Người dùng bắt buộc xác nhận có quyền sử dụng ảnh và ảnh không mô tả nhân vật công chúng/người nổi tiếng; bộ đánh giá AI chỉ chặn dấu hiệu rõ ràng của biểu trưng hoặc nhân vật có thương hiệu/bản quyền, còn trường hợp nhân vật công chúng được xử lý qua báo cáo và gỡ bỏ. | Chốt ranh giới khả thi về quyền hình ảnh/sở hữu trí tuệ theo PRD §8.2. |
| DEC-032 | Tạo, lưu, tải xuống và chia sẻ ảnh cần mạng; ứng dụng cho xem siêu dữ liệu thư viện đã lưu đệm khi ngoại tuyến nhưng không bảo đảm mở được tệp chưa lưu đệm. | Chốt hành vi ngoại tuyến. |
| DEC-033 | MVP chạy một API và một tiến trình xử lý trên một máy chủ Linux bằng Docker Compose; mục tiêu sẵn sàng 99,0%/tháng, RPO 24 giờ, RTO 8 giờ và năng lực cơ sở tại Mục 9.3. | Chốt mục tiêu vận hành phù hợp phạm vi MVP, không yêu cầu hạ tầng đa vùng. |
| DEC-034 | Giao diện Việt/Anh đạt WCAG 2.2 AA, hỗ trợ trình đọc màn hình, cỡ chữ động và vùng chạm theo chuẩn nền tảng. | Chốt khả năng tiếp cận và bản địa hóa. |
| DEC-035 | Ngân sách tài nguyên ứng dụng di động tại Mục 9.5. | Chốt pin, bộ nhớ, mạng và lưu trữ. |
| DEC-036 | Nội dung đồng ý phiên bản `consent-v1.1` bao gồm xử lý ảnh, xác nhận chủ thể người từ 18 tuổi, quyền sử dụng ảnh và cam kết không dùng ảnh người nổi tiếng/nhân vật công chúng hoặc nhân vật có thương hiệu; lưu bằng chứng 365 ngày sau khi xóa ảnh nguồn. Thông báo quyền riêng tư nêu Supabase là nơi lưu trữ, Google Gemini là dịch vụ đánh giá/kiểm duyệt và tên pháp lý của dịch vụ tạo ảnh đang cấu hình. Khi đổi dịch vụ đứng sau `OPENAI_BASE_URL`, nhóm phát hành phải duyệt lại thông báo, DPA và phiên bản đồng ý trước khi gửi dữ liệu cho dịch vụ mới. | Chốt bằng chứng đồng ý và minh bạch bên xử lý dữ liệu mà không cần hồ sơ cấu hình động. |
| DEC-037 | Xác minh gồm kiểm thử đơn vị, hợp đồng, tích hợp, E2E trên thiết bị, bảo mật và đánh giá chuẩn; điều kiện phát hành tại Mục 12. | Chốt chiến lược kiểm thử. |
| DEC-038 | `OPENAI_BASE_URL` trỏ qua HTTPS tới đúng một dịch vụ tạo ảnh đã được phê duyệt cho mỗi môi trường. Trước phát hành, nhóm vận hành so sánh các dịch vụ tương thích OpenAI và cấu hình dịch vụ có chi phí dự kiến thấp nhất trong số các ứng viên đạt hợp đồng, chất lượng, an toàn, độ trễ, DPA, cam kết không huấn luyện bằng dữ liệu người dùng và thời hạn lưu tối đa 30 ngày. V1 không có sổ đăng ký, chọn nhà cung cấp hay chuyển dự phòng động lúc chạy. | Chốt cách chọn dịch vụ tạo ảnh đơn giản, có kiểm soát chi phí và quyền riêng tư. |
| DEC-039 | Báo cáo và dữ liệu phân tích lưu ở Supabase; không đưa ảnh, câu lệnh thô, URL có chữ ký vào sự kiện hoặc nhật ký. | Chốt ranh giới dữ liệu vận hành. |

### 0.3 Điều chỉnh bối cảnh PRD

| PRD mô tả | Áp dụng trong app độc lập |
| --- | --- |
| Điểm vào từ khay sticker DUHAT | Điểm vào từ màn hình Trang chủ/Tạo của Duhat Gen Sticker. |
| Sticker đã lưu vào khay DUHAT | Sticker đã lưu vào thư viện riêng tư trên Supabase. |
| Gửi trong khung chat DUHAT | Mở bảng chia sẻ Android/iOS cho một ảnh PNG. |
| Tỷ lệ gửi trên mỗi cuộc trò chuyện | Đo `native_share_sheet_invoked`; không suy diễn gửi thành công. |
| 6–8 ảnh đầu ra | Một bộ thành công có chính xác 8 ảnh đầu ra. |

## 1. Phạm vi sản phẩm

### 1.1 Mục tiêu

Duhat Gen Sticker cho phép người dùng biến đúng một ảnh của bản thân, thú cưng
hoặc vật thể thành 8 sticker Chibi 3D, xem trước/chọn/lưu vào thư viện riêng tư,
tải về thiết bị, chia sẻ qua bảng chia sẻ của hệ điều hành, xóa và báo cáo ảnh đầu ra.

### 1.2 Tác nhân

| Tác nhân | Trách nhiệm/quyền |
| --- | --- |
| Người dùng | Chọn/chụp ảnh, đồng ý xử lý, tạo, xem, chọn, lưu, tạo lại, tải xuống, chia sẻ, xóa và báo cáo. |
| Ứng dụng di động | Xử lý quyền truy cập, trạng thái/bộ nhớ đệm cục bộ, trải nghiệm người dùng, lưu token cài đặt và gọi FastAPI. |
| FastAPI | Cấp/xác minh danh tính cài đặt, kiểm tra chủ sở hữu, kiểm tra hợp lệ có thẩm quyền, điều phối, chính sách, API và ranh giới truy cập ảnh. |
| Tiến trình xử lý | Nhận phiên thuê tác vụ từ PostgreSQL, gọi dịch vụ tạo ảnh tương thích OpenAI, nhờ Gemini kiểm duyệt đầu ra, kiểm tra ảnh và công bố nguyên tử. |
| Supabase | Chỉ lưu siêu dữ liệu/trạng thái trong PostgreSQL, tệp trong Storage riêng tư và bản sao lưu; ứng dụng di động không kết nối trực tiếp. |
| Google Gemini | Đánh giá ảnh có cấu trúc và kiểm duyệt ảnh đầu vào/ảnh, chữ đầu ra theo hợp đồng nội bộ. |
| Dịch vụ tạo ảnh | Nhận ảnh tham chiếu và yêu cầu Chibi cố định qua API tương thích OpenAI, trả ảnh raster để máy chủ chuẩn hóa. |
| Nhân sự Tin cậy và An toàn | Duyệt báo cáo, chặn/gỡ bỏ, kiểm toán và xử lý khiếu nại. |

### 1.3 Trong phạm vi V1

- Ứng dụng Android/iOS độc lập; giao diện tiếng Việt và tiếng Anh.
- Một ảnh tĩnh, đúng một người/thú cưng/vật thể chính; người có đúng một mặt rõ.
- Các bước chấp thuận, kiểm tra kỹ thuật, chất lượng, chủ thể và an toàn đầu vào.
- 8 ảnh PNG Chibi 3D theo danh mục cố định.
- Xem trước, chọn, tạo lại toàn bộ, lưu một phần đã chọn.
- Thư viện Supabase riêng tư; tải từng sticker đã lưu.
- Chia sẻ một sticker từ màn hình xem trước hoặc thư viện qua hệ điều hành.
- Xóa gói đã lưu, báo cáo và gỡ bỏ nội dung.
- Phân tích sản phẩm có sự đồng ý và khả năng quan sát vận hành do hệ thống tự quản lý.

### 1.4 Ngoài phạm vi V1

- Tài khoản/khung chat/khay sticker DUHAT, ứng dụng web và chợ nội dung công khai.
- Câu lệnh tự do, chữ động, bộ chọn phong cách, chỉnh sửa/tạo lại từng sticker.
- Nhiều ảnh tham chiếu, hoán đổi khuôn mặt, giả mạo sâu hoặc ảnh đầu ra chân thực như ảnh chụp.
- Tạo ảnh nhân vật công chúng, người nổi tiếng, nhân vật có thương hiệu/bản quyền.
- Thanh toán, gói thương mại, tạo ảnh ngoại tuyến và đồng bộ/khôi phục đa thiết bị.

## 2. Các trường hợp sử dụng

### UC-01 — Chọn và kiểm tra ảnh

1. Người dùng mở màn hình Tạo và đọc yêu cầu đối với ảnh.
2. Người dùng chụp hoặc chọn đúng một ảnh.
3. Ứng dụng đặt lại trạng thái đồng ý/kiểm tra cũ và hiển thị bản xem trước cục bộ.
4. Người dùng chấp nhận nội dung đồng ý `consent-v1.1`, gồm xác nhận độ tuổi và quyền sử dụng, cho ảnh hiện tại.
5. Ứng dụng tải lên bằng khóa lũy đẳng; máy chủ giải mã, chuẩn hóa và kiểm tra.
6. Nếu một bước kiểm tra thất bại, giao diện giữ người dùng trong luồng, hiển thị lý do an toàn và cho chọn lại.
7. Nếu mọi bước đều đạt, ảnh nguồn chuyển sang `ready` và nút Tạo được bật.

### UC-02 — Tạo và xem trước

1. Người dùng chủ động bấm Tạo.
2. Máy chủ kiểm tra chủ sở hữu, ảnh nguồn sẵn sàng, hạn mức và quy tắc chỉ có một tác vụ hoạt động.
3. Tác vụ vào hàng đợi; ứng dụng thăm dò mỗi 2 giây và người dùng có thể rời màn hình.
4. Tiến trình xử lý tạo, kiểm tra và kiểm duyệt đủ 8 ảnh đầu ra.
5. Khi thành công, hệ thống công bố nguyên tử một bộ xem trước đúng 8 ảnh; khi thất bại không công bố bộ chưa đầy đủ.
6. Ứng dụng hiển thị toàn bộ và cho xem kỹ từng sticker.

### UC-03 — Chọn, lưu, xem thư viện và tải xuống

1. Bản xem trước mặc định chọn cả 8; người dùng chọn/bỏ từng ảnh và phải chọn ít nhất 1 ảnh khi lưu.
2. Hệ thống lưu nguyên tử phần được chọn vào thư viện riêng tư.
3. Người dùng mở lại thư viện và xem danh sách/chi tiết từ Supabase qua FastAPI.
4. Người dùng chọn Tải xuống trên một sticker đã lưu; ứng dụng tải PNG theo đúng chủ sở hữu và lưu
   vào album `Duhat Gen Sticker` bằng quyền chỉ thêm ảnh vào thư viện thiết bị.
5. Tải xuống tạo một bản sao cục bộ và không xóa bản trên đám mây.

### UC-04 — Tạo lại

Tạo lại sinh một tác vụ mới từ cùng ảnh nguồn, phong cách, ngôn ngữ và phiên bản
danh mục; tiêu thụ một lượt hạn mức. Không thay đổi bộ cũ và không tạo lại riêng từng ảnh.

### UC-05 — Chia sẻ

Người dùng chia sẻ một sticker đã qua kiểm duyệt từ màn hình xem trước hoặc thư
viện. Ứng dụng tải tệp tạm, mở bảng chia sẻ của hệ điều hành và xóa tệp tạm trong
`finally`. Ứng dụng chỉ ghi nhận việc mở bảng chia sẻ, không ghi nhận “đã gửi”.

### UC-06 — Xóa

Người dùng xác nhận xóa một gói đã lưu. Máy chủ xóa cứng liên kết ngay, đưa ảnh
không còn được tham chiếu vào hàng đợi xóa và hoàn thành việc xóa dữ liệu chính
trong 24 giờ. Tệp người dùng đã tải xuống/chia sẻ không thể bị thu hồi.

### UC-07 — Báo cáo

Người dùng mở trình đơn thao tác ở màn hình xem trước/thư viện, chọn lý do, thêm
ghi chú tối đa 500 ký tự và gửi. Báo cáo vào hàng đợi duyệt; thao tác gỡ bỏ khiến
ảnh không còn truy cập được.

## 3. Yêu cầu chức năng

### 3.1 Điểm vào, ảnh đầu vào và sự đồng ý

| ID | Yêu cầu |
| --- | --- |
| FR-ENT-001 | Ứng dụng phải có điểm vào Tạo độc lập và giải thích định dạng, chất lượng, quy tắc đúng một người/thú cưng/vật thể và đúng một khuôn mặt đối với người. |
| FR-ENT-002 | Lần chạy đầu, ứng dụng phải đăng ký một danh tính cài đặt với FastAPI, lưu token truy cập/làm mới trong SecureStore, tự làm mới phiên và không gửi định danh thiết bị/phần cứng cho Supabase. |
| FR-INP-001 | Người dùng chọn đúng một ảnh bằng trình chọn ảnh của hệ thống; tắt chọn nhiều ảnh. |
| FR-INP-002 | Người dùng chụp đúng một ảnh bằng máy ảnh. |
| FR-INP-003 | Ứng dụng chỉ truy cập máy ảnh/thư viện trong phạm vi quyền hệ điều hành cấp và thực hiện khôi phục theo DEC-030. |
| FR-INP-004 | Ảnh nguồn không được tự công khai, chia sẻ hoặc ghi vào dữ liệu phân tích/nhật ký. |
| FR-CNS-001 | Ô xác nhận `consent-v1.1` chỉ xuất hiện sau khi có ảnh, nêu rõ việc xử lý ảnh, xác nhận người trong ảnh từ 18 tuổi, quyền sử dụng và các loại chủ thể bị cấm; trạng thái được đặt lại khi ảnh thay đổi. |
| FR-CNS-002 | Tải lên/tạo ảnh bị chặn nếu thiếu bất kỳ xác nhận bắt buộc nào cho ảnh nguồn hiện tại. |
| FR-CNS-003 | Máy chủ lưu `consent_version`, `consent_accepted`, `adult_or_no_person_attested`, `rights_attested`, chủ sở hữu, mã kiểm tra ảnh nguồn và `accepted_at` theo DEC-036. |
| FR-CNS-004 | Trước khi đồng ý, ứng dụng hiển thị nội dung `consent-v1.1` và thông báo quyền riêng tư nêu Supabase, Google Gemini cùng tên pháp lý của dịch vụ tạo ảnh đang cấu hình. Đổi dịch vụ tạo ảnh phải qua duyệt quyền riêng tư và cập nhật phiên bản đồng ý khi nội dung/bên xử lý thay đổi. |

### 3.2 Kiểm tra hợp lệ và an toàn đầu vào

| ID | Yêu cầu |
| --- | --- |
| FR-VAL-001 | Máy chủ phải kiểm tra kích thước tệp, MIME, chữ ký tệp, khả năng giải mã, số khung hình, kích thước ảnh và tổng điểm ảnh; không tin phần mở rộng/siêu dữ liệu từ máy khách. |
| FR-VAL-002 | Chỉ JPEG/PNG/WebP/HEIC/HEIF tĩnh được nhận; mọi định dạng hoặc ảnh nhiều khung hình khác bị từ chối. |
| FR-VAL-003 | Máy chủ chuẩn hóa hướng ảnh, sRGB, RGBA/RGB; loại EXIF/XMP/GPS và tạo ảnh chuẩn dùng để đánh giá. |
| FR-VAL-004 | Máy chủ kiểm tra độ mờ, ánh sáng, cháy sáng/tối và mức độ nhìn rõ theo Mục 8.2. |
| FR-VAL-005 | Ảnh chỉ đạt khi có đúng một chủ thể chính thuộc loại người/thú cưng/vật thể. |
| FR-VAL-006 | Ảnh người chỉ đạt khi có đúng một khuôn mặt rõ; nhiều người/khuôn mặt bị từ chối kèm hướng dẫn cắt/chọn lại ảnh. |
| FR-VAL-007 | Ảnh người thiếu xác nhận tuổi/quyền, dấu hiệu rõ ràng của nhân vật có thương hiệu/bản quyền và nội dung đầu vào không an toàn bị chặn; khiếu nại về nhân vật công chúng được xử lý theo Mục 10. |
| FR-VAL-008 | Ảnh nguồn chỉ chuyển sang `ready` khi kiểm tra kỹ thuật, chất lượng, chủ thể và kiểm duyệt đầu vào đều đạt. |
| FR-VAL-009 | Khi thất bại, hệ thống trả mã ổn định và nội dung an toàn bằng Việt/Anh, giữ người dùng trong luồng và cho chọn ảnh khác. |

### 3.3 Tạo ảnh và an toàn đầu ra

| ID | Yêu cầu |
| --- | --- |
| FR-GEN-001 | Chỉ thao tác chủ động của người dùng sau khi ảnh nguồn sẵn sàng mới tạo tác vụ. |
| FR-GEN-002 | Tiến trình xử lý dùng hợp đồng câu lệnh Chibi 3D cố định, không nhận câu lệnh/phong cách từ người dùng. |
| FR-GEN-003 | Một bộ thành công có đúng 8 vị trí theo danh mục. |
| FR-GEN-004 | Ảnh đầu ra dùng ngôn ngữ/phiên bản danh mục cố định tại lúc gửi yêu cầu. |
| FR-GEN-005 | Giao diện hiển thị tiến độ/giai đoạn; chuyển màn hình hoặc khởi động lại ứng dụng không hủy/làm mất tác vụ. |
| FR-GEN-006 | Mọi ảnh đầu ra phải đạt hợp đồng định dạng/số lượng/mã kiểm tra, kiểm duyệt ảnh và kiểm duyệt chữ trước khi công bố. |
| FR-GEN-007 | Ảnh không hợp lệ/bị chặn được tạo bù tối đa 2 lần; sau đó toàn bộ tác vụ thất bại. |
| FR-GEN-008 | Lỗi/quá thời gian có thao tác thử lại và không tạo bản xem trước/gói lưu chưa đầy đủ. |

### 3.4 Xem trước, lưu, thư viện và tải xuống

| ID | Yêu cầu |
| --- | --- |
| FR-PRV-001 | Ứng dụng hiển thị toàn bộ và cho xem kỹ từng sticker. |
| FR-SEL-001 | Người dùng chọn/bỏ từng sticker; mặc định chọn cả 8; không cho lưu khi không chọn ảnh nào. |
| FR-REG-001 | Tạo lại toàn bộ từ cùng ảnh nguồn/phong cách/ngôn ngữ; không tạo lại riêng từng ảnh. |
| FR-SAV-001 | Lưu là thao tác của người dùng và chỉ lưu các ID đã chọn thuộc đúng bộ/chủ sở hữu. |
| FR-SAV-002 | Gói đã lưu mặc định là riêng tư, tồn tại bền vững ở Supabase và chỉ truy cập qua FastAPI có kiểm tra chủ sở hữu. |
| FR-SAV-003 | Lỗi lưu vẫn giữ bản xem trước để thử lại cho tới hết thời hạn 24 giờ. |
| FR-SAV-004 | Thư viện phải liệt kê/hiển thị đúng phần đã lưu sau khi khởi động lại ứng dụng với cùng chủ sở hữu. |
| FR-SAV-005 | Người dùng tải từng PNG đã lưu về album thiết bị; ảnh chỉ có ở bản xem trước không có nút Tải xuống. |
| FR-SAV-006 | Tải xuống chỉ truyền ảnh đã qua kiểm duyệt và không thay đổi vòng đời bản trên đám mây. |
| FR-DEL-001 | Người dùng xóa gói đã lưu theo DEC-026 và nhận kết quả rõ ràng. |

### 3.5 Chia sẻ, báo cáo và phân tích sản phẩm

| ID | Yêu cầu |
| --- | --- |
| FR-SHR-001 | Người dùng chia sẻ một sticker đã qua kiểm duyệt từ bản xem trước/thư viện qua bảng chia sẻ của hệ điều hành. |
| FR-SHR-002 | Chia sẻ không cần lưu trước, không công khai bộ sticker và không phụ thuộc DUHAT. |
| FR-SHR-003 | Ứng dụng dọn tệp tạm và không diễn giải kết quả bảng chia sẻ thành “đã gửi”. |
| FR-REP-001 | Trình đơn thao tác ở bản xem trước/thư viện phải có các lý do báo cáo: `unauthorized_image`, `harassment`, `copyright`, `not_like_me`, `unsafe`, `other`. |
| FR-REP-002 | Báo cáo lưu chủ sở hữu, ảnh đầu ra, lý do, ghi chú, trạng thái và dấu vết kiểm toán; ghi chú tối đa 500 ký tự và không chứa bản sao ảnh. |
| FR-REP-003 | Đội vận hành duyệt, gỡ bỏ và xử lý khiếu nại theo DEC-024. |
| FR-ANL-001 | Phân tích sản phẩm chỉ chạy sau khi người dùng đồng ý và chỉ nhận sự kiện/thuộc tính trong danh sách cho phép tại Mục 11. |
| FR-ANL-002 | Dữ liệu phân tích/nhật ký không chứa byte ảnh, tên tệp, đường dẫn, khóa đối tượng, URL có chữ ký, câu lệnh thô hoặc dữ liệu thô từ nhà cung cấp. |

## 4. Quy tắc nghiệp vụ và điều kiện bất biến

| ID | Quy tắc |
| --- | --- |
| BR-001 | Một tác vụ tham chiếu đúng một ảnh nguồn `ready` thuộc chủ sở hữu. |
| BR-002 | Một ảnh nguồn đạt yêu cầu có đúng một chủ thể chính: người, thú cưng hoặc vật thể. |
| BR-003 | Ảnh người đạt yêu cầu có đúng một khuôn mặt rõ. |
| BR-004 | Sự đồng ý và xác nhận tuổi/quyền gắn với mã kiểm tra ảnh nguồn hiện tại, không tái sử dụng khi đổi ảnh. |
| BR-005 | Trạng thái `succeeded` luôn có 8 số thứ tự duy nhất từ 1 đến 8. |
| BR-006 | Phong cách luôn là `chibi_3d`; không có câu lệnh tự do hoặc chỉnh sửa từng ảnh. |
| BR-007 | Danh mục/ngôn ngữ không đổi sau khi gửi yêu cầu. |
| BR-008 | Ảnh đầu ra chưa kiểm duyệt hoặc bị chặn không thể xem trước/lưu/tải xuống/chia sẻ. |
| BR-009 | Phần lưu phải có ít nhất một ảnh, không trùng, cùng bộ và cùng chủ sở hữu. |
| BR-010 | Một chủ sở hữu có tối đa một tác vụ đang hoạt động và 5 lượt tạo/tạo lại mỗi ngày UTC. |
| BR-011 | Ảnh người dưới 18 tuổi, nhân vật công chúng và nhân vật có thương hiệu/bản quyền nằm ngoài V1; MVP thực thi bằng xác nhận bắt buộc, chốt ngữ nghĩa không nhận dạng danh tính và quy trình báo cáo/gỡ bỏ. |
| BR-012 | Môi trường sản xuất không chạy quy trình mô phỏng, `X-Device-ID` cục bộ hoặc hồ sơ/điểm cuối AI chưa được phê duyệt. |

## 5. Tác vụ, thử lại và hợp đồng lỗi

### 5.1 Trạng thái tác vụ

```text
queued -> validating_input -> generating -> moderating_outputs -> succeeded
   |            |                |                  |
   +------------+----------------+------------------+-> failed
                                       hạn chót cứng -> timed_out
```

Các trạng thái kết thúc: `succeeded`, `failed`, `timed_out`, `cancelled`. Tiến độ
chỉ tăng từ 0–100; giai đoạn là giá trị máy đọc. Người dùng có thể hủy khi tác vụ
ở `queued` hoặc `validating_input`; nếu yêu cầu tạo ảnh đã gửi tới nhà cung cấp,
hệ thống chỉ ghi nhận ý định hủy và tiến trình xử lý không công bố kết quả nếu nhà
cung cấp không hỗ trợ hủy.

### 5.2 Hàng đợi, thăm dò và tiếp tục xử lý

- FastAPI chèn một hàng `generation_jobs` ở trạng thái `queued`; chính hàng này là
  thông điệp bền vững, vì vậy không tồn tại giao dịch kép giữa tác vụ và hàng đợi.
- Tiến trình xử lý nhận tối đa một lô nhỏ bằng giao dịch `FOR UPDATE SKIP LOCKED`, đặt
  `lease_owner`, `lease_expires_at` sau 240 giây và cập nhật `heartbeat_at` mỗi 30 giây.
- Chỉ tác vụ `queued` có `available_at <= now()` hoặc tác vụ đang xử lý có phiên thuê
  hết hạn mới được nhận; một bộ đối soát trả tác vụ bị bỏ dở về trạng thái có thể xử lý.
- Ứng dụng di động thăm dò 2 giây khi ở tiền cảnh, chuyển thành 10 giây sau 30 giây và dừng khi tác vụ kết thúc.
- ID tác vụ đang hoạt động lưu trong AsyncStorage; máy chủ là nguồn đúng sau khi khởi động lại.
- Khi tiến trình xử lý/máy chủ khởi động lại, hệ thống đối soát tác vụ chưa kết thúc dựa trên mã tham chiếu của nhà cung cấp.

### 5.3 Thử lại và tính lũy đẳng

- `Idempotency-Key` gồm 8–128 ký tự an toàn, bắt buộc cho tải lên, tạo, tạo lại,
  lưu, xóa và báo cáo; khóa/kết quả được giữ 24 giờ.
- Cùng khóa và cùng mã băm yêu cầu trả kết quả cũ; cùng khóa nhưng khác mã băm trả 409.
- Lỗi tạm thời từ nhà cung cấp được thử lại tối đa 3 lần với khoảng chờ 2/5/10 giây trong giới hạn cứng.
- Người dùng thử lại sau lỗi sẽ tạo tác vụ mới nhưng giữ `retry_of_job_id`.

### 5.4 Danh mục lỗi ổn định

| Mã | HTTP | Có thể thử lại | Ý nghĩa an toàn |
| --- | ---: | --- | --- |
| `AUTH_REQUIRED` | 401 | Có | Token truy cập cài đặt thiếu, sai hoặc hết hạn; làm mới phiên cài đặt. |
| `CONSENT_REQUIRED` | 400 | Không | Cần đồng ý xử lý ảnh hiện tại. |
| `RIGHTS_ATTESTATION_REQUIRED` | 400 | Không | Thiếu xác nhận độ tuổi hoặc quyền sử dụng ảnh hiện tại. |
| `EMPTY_UPLOAD` | 400 | Không | Tệp rỗng. |
| `IMAGE_TOO_LARGE` | 413 | Không | Vượt 10 MiB. |
| `UNSUPPORTED_IMAGE_TYPE` | 415 | Không | Định dạng không hỗ trợ. |
| `IMAGE_SIGNATURE_MISMATCH` | 400 | Không | Nội dung không khớp loại khai báo. |
| `IMAGE_DECODE_FAILED` | 422 | Không | Tệp hỏng/không giải mã được toàn bộ. |
| `MULTI_FRAME_IMAGE_UNSUPPORTED` | 422 | Không | Ảnh động/nhiều khung hình. |
| `IMAGE_DIMENSIONS_UNSUPPORTED` | 422 | Không | Độ phân giải/số điểm ảnh/tỷ lệ không đạt. |
| `IMAGE_TOO_BLURRY` | 422 | Không | Ảnh quá mờ. |
| `IMAGE_TOO_DARK` / `IMAGE_TOO_BRIGHT` | 422 | Không | Ánh sáng không đạt. |
| `SUBJECT_NOT_FOUND` | 422 | Không | Không thấy chủ thể được hỗ trợ. |
| `MULTIPLE_SUBJECTS` | 422 | Không | Có nhiều chủ thể chính; cần cắt hoặc chọn lại ảnh. |
| `FACE_REQUIRED` | 422 | Không | Ảnh người không có đúng một khuôn mặt rõ. |
| `MULTIPLE_FACES` | 422 | Không | Có nhiều khuôn mặt/người. |
| `FACE_NOT_CLEAR` | 422 | Không | Mặt quá nhỏ, mờ, bị che hoặc thiếu sáng. |
| `RIGHTS_POLICY_BLOCKED` | 422 | Không | Phát hiện dấu hiệu rõ ràng của biểu trưng hoặc nhân vật có thương hiệu/bản quyền. |
| `INPUT_BLOCKED` / `OUTPUT_BLOCKED` | 422 | Không | Nội dung không phù hợp chính sách. |
| `ASSESSMENT_UNAVAILABLE` | 503 | Có | Bước đánh giá ảnh từ chối, sai hợp đồng, quá thời gian hoặc tạm thời không sẵn sàng. |
| `QUOTA_EXCEEDED` | 429 | Có | Đã hết hạn mức ngày; trả `retry_after`. |
| `GENERATION_FAILED` | 502 | Có | Nhà cung cấp/tác vụ thất bại. |
| `GENERATION_TIMEOUT` | 504 | Có | Quá 180 giây. |
| `INVALID_OUTPUT_CONTRACT` | 502 | Có | Số lượng/định dạng/mã kiểm tra/ảnh đầu ra không hợp lệ. |
| `SAVE_FAILED` / `DOWNLOAD_FAILED` | 503 | Có | Lỗi tạm thời; có thể thử lại. |

Mọi lỗi dùng RFC 9457 Problem Details, có `request_id`, `code`, `retryable`
và `retry_after_seconds` khi cần. Máy khách ánh xạ mã sang nội dung Việt/Anh;
không hiển thị thông báo thô từ nhà cung cấp.

## 6. Giao diện và hợp đồng API

### 6.1 Ứng dụng di động/hệ điều hành

- Expo ImagePicker: `mediaTypes=['images']`, `allowsMultipleSelection=false`,
  không dựa vào cắt/nén để biến định dạng bị cấm thành định dạng hợp lệ.
- Quyền máy ảnh/thư viện tuân theo hệ điều hành; máy khách không yêu cầu EXIF.
- Expo MediaLibrary với quyền chỉ thêm lưu PNG vào album `Duhat Gen Sticker`.
- Expo Sharing mở bảng chia sẻ của hệ điều hành với một tệp PNG tạm.

### 6.2 REST API `/api/v1`

| Phương thức | Đường dẫn | Hợp đồng chính |
| --- | --- | --- |
| `POST` | `/installations` | Không cần phiên; giới hạn theo IP; tạo danh tính cài đặt và trả token truy cập 15 phút cùng token làm mới 90 ngày. |
| `POST` | `/installations/refresh` | Xoay vòng token làm mới một lần dùng và trả cặp token mới; phát lại token cũ bị từ chối. |
| `POST` | `/source-images` | Tệp đa phần + `consent_version=consent-v1.1`, `consent_accepted=true`, `adult_or_no_person_attested=true`, `rights_attested=true`; `Idempotency-Key`; kiểm tra hợp lệ có thẩm quyền. |
| `GET` | `/source-images/{id}` | Tóm tắt kiểm tra theo chủ sở hữu. |
| `POST` | `/generation-jobs` | Tạo tác vụ từ ảnh nguồn `ready`. |
| `GET` | `/generation-jobs?active=true` | Tiếp tục/đối soát tác vụ đang hoạt động. |
| `GET` | `/generation-jobs/{id}` | Trạng thái/giai đoạn/tiến độ/lỗi/ID bộ ảnh. |
| `POST` | `/generation-jobs/{id}/regenerate` | Tác vụ tạo lại toàn bộ. |
| `POST` | `/generation-jobs/{id}/cancel` | Ghi nhận ý định hủy. |
| `GET` | `/sticker-sets/{id}` | Bản xem trước đúng 8 ảnh đã qua kiểm duyệt. |
| `POST` | `/sticker-sets/{id}/save` | Lưu phần đã chọn, không rỗng và không trùng. |
| `GET` | `/saved-packs` | Phân trang bằng con trỏ, 20 mục/trang, theo chủ sở hữu. |
| `GET` | `/saved-packs/{id}` | Chi tiết phần đã lưu. |
| `DELETE` | `/saved-packs/{id}` | Yêu cầu xóa cứng; trả 204. |
| `GET` | `/stickers/{id}/asset` | Truyền PNG theo chủ sở hữu; riêng tư/không lưu đệm. |
| `POST` | `/reports` | Gửi báo cáo cho ảnh đầu ra đang xem được. |
| `GET` | `/reports/{id}` | Chủ sở hữu xem trạng thái báo cáo của mình. |
| `POST` | `/analytics/events` | Nhận lô tối đa 20 sự kiện đã được cho phép sau khi người dùng đồng ý. |
| `GET` | `/health/live` | Kiểm tra tiến trình còn sống. |
| `GET` | `/health/ready` | Kiểm tra mức sẵn sàng của PostgreSQL, Storage, phiên thuê tác vụ và cấu hình hai bộ chuyển đổi Gemini/tạo ảnh. |

### 6.3 Cổng giao tiếp với nhà cung cấp

```python
class InputAssessmentPort(Protocol):
    async def assess(self, request: InputAssessmentRequest) -> InputAssessment: ...

class GenerationPort(Protocol):
    async def start(self, request: GenerationRequest) -> ProviderJobRef: ...
    async def get(self, ref: ProviderJobRef) -> ProviderJobSnapshot: ...

class OutputAssessmentPort(Protocol):
    async def assess(self, request: OutputAssessmentRequest) -> OutputAssessment: ...
```

Miền nghiệp vụ/API không được chứa kiểu phản hồi riêng của nhà cung cấp. Phản hồi
thô chỉ tồn tại trong bộ nhớ khi xử lý yêu cầu/tác vụ và bị lược bỏ khỏi nhật ký.

`InputAssessmentPort` và `OutputAssessmentPort` được hiện thực bằng bộ chuyển đổi
Gemini; `GenerationPort` được hiện thực bằng bộ chuyển đổi API tạo ảnh tương thích
OpenAI. Tên mô hình Gemini, JSON Schema `input-assessment-v1`, thời gian chờ và
chính sách lưu giữ là hằng số có phiên bản trong mã/chính sách, thay đổi qua duyệt
mã và kiểm thử; không phải biến môi trường.

Cấu hình AI lúc chạy có đúng bốn biến tại DEC-021. Tiền tố `OPENAI_` mô tả hợp
đồng giao tiếp của máy khách, không khẳng định dịch vụ sau `OPENAI_BASE_URL` do
OpenAI vận hành. V1 không tải tệp hồ sơ, không tự chọn nhà cung cấp và không
chuyển dự phòng động. Mỗi lần đổi URL/mô hình/dịch vụ phải chạy lại kiểm thử hợp
đồng, đánh giá chuẩn, bảo mật, chi phí và duyệt quyền riêng tư theo DEC-036/038.

## 7. Dữ liệu, quyền sở hữu và vòng đời

### 7.1 Thực thể lô-gic

`installations`, `installation_sessions`, `source_images`, `consent_records`, `validation_results`, `generation_jobs`,
`sticker_sets`, `sticker_variants`, `saved_packs`, `saved_pack_items`,
`moderation_decisions`, `provider_invocations`, `reports`, `analytics_events`, `idempotency_records`,
`deletion_requests`.

Mọi thực thể người dùng có `owner_id`; mọi ảnh đầu ra có `moderation_status`,
SHA-256, MIME, số byte, kích thước, phiên bản chính sách/mô hình/danh mục và dấu thời gian.
Mỗi lần gọi AI chỉ lưu `provider_kind` (`gemini_assessment`, `gemini_moderation`
hoặc `openai_compatible_generation`), máy chủ đích không gồm đường dẫn/bí mật,
tên mô hình, ID yêu cầu, trạng thái, độ trễ, đơn vị tính phí và chi phí USD quy
đổi theo micro-dollar; không lưu ảnh, câu lệnh hoặc phản hồi thô. Tác vụ tạo ảnh
chụp lại máy chủ đích và mô hình đang cấu hình để đối soát. Chi phí một bộ thành
công gồm mọi lần thử/tạo bù của tác vụ.

### 7.2 Quyền sở hữu và truy cập

- Chủ sở hữu ở môi trường sản xuất là UUID `installations.id` lấy duy nhất từ `sub`
  của token truy cập do FastAPI ký; không nhận `owner_id` từ dữ liệu/tiêu đề của máy khách.
- FastAPI lưu duy nhất mã băm token làm mới trong `installation_sessions`; token
  được xoay vòng, thu hồi khi phát lại và hết hạn sau 90 ngày.
- Ứng dụng di động không truy cập trực tiếp Postgres/Storage cho dữ liệu nghiệp vụ; FastAPI dùng
  khóa bí mật máy chủ, luôn thêm điều kiện chủ sở hữu và trả 404 khi truy vấn chéo chủ sở hữu.
- Không cấp Supabase URL/anon key/quyền Data API hoặc Storage cho ứng dụng di động;
  hai kho `source-images` và `generated-stickers` đều riêng tư và vai trò công khai bị từ chối.
- Khóa dịch vụ/bí mật chỉ ở FastAPI/tiến trình xử lý. Điều kiện `owner_id` ở tầng ứng dụng và
  ràng buộc CSDL là ranh giới tenant bắt buộc; RLS mặc định từ chối là lớp phòng thủ bổ sung.
- Cài lại ứng dụng hoặc mất token làm mới làm mất quyền truy cập thư viện đám mây;
  giao diện phải cảnh báo trước khi xóa dữ liệu ứng dụng. Đây là giới hạn V1 đã chốt.

### 7.3 Thời hạn lưu giữ

| Dữ liệu | Thời hạn lưu giữ |
| --- | --- |
| Ảnh nguồn gốc | Xóa trong 24 giờ sau khi tác vụ cuối cùng kết thúc. |
| Ảnh chuẩn/trung gian/tạm của nhà cung cấp | Xóa trong 1 giờ sau khi bước/tác vụ kết thúc. |
| Ảnh ứng viên lỗi/bị chặn | Xóa trong 1 giờ. |
| Bản xem trước/ảnh đầu ra chưa lưu | 24 giờ sau khi tác vụ kết thúc. |
| PNG và siêu dữ liệu đã lưu | Tới khi người dùng xóa gói. |
| Siêu dữ liệu tác vụ/kiểm tra/kiểm duyệt | 30 ngày; không chứa ảnh/tham chiếu nhạy cảm. |
| Siêu dữ liệu lần gọi/chi phí nhà cung cấp | 30 ngày; không chứa ảnh, câu lệnh hoặc phản hồi thô. |
| Danh tính cài đặt | Tới khi người dùng yêu cầu xóa dữ liệu; phiên làm mới hết hạn sau 90 ngày hoặc khi bị thu hồi. |
| Bằng chứng đồng ý | 365 ngày sau khi xóa ảnh nguồn. |
| Báo cáo và bằng chứng kiểm toán tối thiểu | 180 ngày sau khi đóng báo cáo. |
| Nhật ký ứng dụng/bảo mật | 30 ngày. |
| Sự kiện phân tích thô | 90 ngày; bản tổng hợp theo ngày 13 tháng. |
| Bản ghi lũy đẳng | 24 giờ. |
| Yêu cầu xóa dữ liệu chính | Hoàn thành trong 24 giờ; bản sao lưu tự hết hạn tối đa 30 ngày. |

Cấm huấn luyện, tinh chỉnh hoặc đánh giá mô hình bằng ảnh nguồn/đầu ra của người
dùng. Đánh giá chuẩn chỉ dùng bộ dữ liệu có giấy phép/sự đồng ý riêng, không lấy
từ môi trường sản xuất.

## 8. Hợp đồng ảnh đầu vào, đầu ra và chất lượng

### 8.1 Yêu cầu kỹ thuật đối với ảnh đầu vào

| Thuộc tính | Giá trị bắt buộc |
| --- | --- |
| Số tệp | 1 |
| Định dạng | JPEG, PNG, WebP, HEIC hoặc HEIF tĩnh |
| Dung lượng tối đa | 10 MiB (10.485.760 byte) |
| Kích thước tối thiểu | Cả chiều rộng và chiều cao ≥512 px |
| Kích thước tối đa | Mỗi chiều ≤8192 px |
| Tổng điểm ảnh tối đa | 40.000.000 |
| Tỷ lệ khung hình | 1:4 đến 4:1 |
| Khung hình | `n_frames == 1`, `is_animated == false`; từ chối MIME chuỗi HEIF |
| Giải mã | Giải mã toàn bộ điểm ảnh, kiểm tra tính toàn vẹn và chặn bom giải nén |
| Ảnh chuẩn | Xoay theo EXIF, sRGB, RGB/RGBA 8-bit; loại toàn bộ siêu dữ liệu |

### 8.2 Ngưỡng chất lượng/chủ thể

Các chỉ số được tính trên ảnh chuẩn có cạnh dài thu về 1024 px, không phóng lớn ảnh nhỏ:

| Bước kiểm tra | Ngưỡng |
| --- | --- |
| Độ mờ | Phương sai Laplacian ≥100,0 trên độ chói. |
| Ánh sáng | Trung vị độ chói 35–220; điểm ảnh tối `<10` ≤35%; điểm ảnh cháy sáng `>245` ≤35%. |
| Chủ thể chính | Phản hồi có cấu trúc của bộ đánh giá ảnh trả đúng một chủ thể chính với `subject_type` là `person`, `pet` hoặc `object` và `assessment_uncertain=false`. |
| Nhiều chủ thể | `primary_subject_count != 1` hoặc `secondary_subject_present=true` thì từ chối. |
| Khuôn mặt người | Khi `subject_type=person`, phải có `visible_face_count=1`, `face_clear=true`, `face_occluded=false` và `face_too_small=false`. |
| Trẻ vị thành niên | Không suy luận tuổi từ khuôn mặt. Ảnh người chỉ được tải lên khi `consent-v1.1` xác nhận chủ thể từ 18 tuổi; thiếu xác nhận thì từ chối trước khi gọi nhà cung cấp AI. |
| Người nổi tiếng/nhân vật công chúng | Không nhận dạng danh tính tự động. Bắt buộc xác nhận quyền/không thuộc nhóm cấm; báo cáo có căn cứ làm ảnh mất quyền truy cập và được xử lý theo Mục 10.3. |
| Thương hiệu/nhân vật | `obvious_branded_or_copyrighted_character=true` trong phản hồi có cấu trúc thì từ chối; không yêu cầu mô hình nêu tên thương hiệu/nhân vật. |
| An toàn đầu vào | Bộ chuyển đổi chuẩn hóa kết quả kiểm duyệt thành `blocked=true\|false`; `blocked=true` thì từ chối. Phản hồi thiếu trường, từ chối của mô hình, quá thời gian hoặc `assessment_uncertain=true` đều đóng an toàn. |

Tổ hợp người và thú cưng, người và vật thể, hoặc nhiều thú cưng/vật thể được bộ
đánh giá xem là chủ thể chính đều bị từ chối. Đồ vật phụ thuộc ngữ cảnh ở hậu cảnh
không được tính là chủ thể chính. Hợp đồng JSON Schema được ghim phiên bản; miền
nghiệp vụ chỉ nhận enum/boolean ổn định và không dùng văn bản tự do của mô hình.

### 8.3 Danh mục cố định `catalog-chibi-v1`

| Thứ tự | Khóa | Tiếng Việt | Tiếng Anh | Biểu cảm/hành động |
| ---: | --- | --- | --- | --- |
| 1 | `hello` | Xin chào! | Hi! | Vẫy tay/mỉm cười |
| 2 | `yay` | Tuyệt quá! | Yay! | Ăn mừng |
| 3 | `laugh` | Ha ha! | Haha! | Cười lớn |
| 4 | `love` | Yêu quá! | Love it! | Mắt trái tim/cử chỉ trái tim |
| 5 | `thanks` | Cảm ơn! | Thanks! | Cúi đầu/cử chỉ cảm ơn |
| 6 | `sorry` | Xin lỗi! | Sorry! | Hối lỗi |
| 7 | `wow` | Wow! | Wow! | Ngạc nhiên |
| 8 | `bye` | Tạm biệt! | Bye! | Vẫy tay chào tạm biệt |

Chữ dùng Noto Sans Bold, được kết xuất chính xác sau bước tạo ảnh nếu chữ do nhà
cung cấp tạo không đạt. V1 không có sticker không chữ.

### 8.4 Yêu cầu tạo ảnh

- Gemini cung cấp đánh giá ảnh có cấu trúc theo `input-assessment-v1` và kiểm
  duyệt ảnh/chữ. Mô hình Gemini được ghim trong mã; thay đổi mô hình phải qua
  duyệt mã, kiểm thử hợp đồng và đánh giá chuẩn.
- Bộ chuyển đổi tạo ảnh dùng `OPENAI_API_KEY`, `OPENAI_BASE_URL` và
  `OPENAI_IMAGE_MODEL` để gọi một dịch vụ tương thích OpenAI. `OPENAI_BASE_URL`
  bắt buộc là HTTPS; khóa không được xuất hiện trong REST, CSDL hoặc nhật ký.
- Cùng với `GEMINI_API_KEY`, đây là đúng bốn biến môi trường dành cho AI. JSON
  Schema, thời gian lưu tối đa 30 ngày, phiên bản câu lệnh và ngưỡng kiểm duyệt
  là hằng số trong mã/chính sách, không cấu hình qua `.env`.
- Yêu cầu tạo đặt mức ưu tiên cao cho giữ đặc trưng/chất lượng, kích thước đích
  1024×1024 và nền trong suốt. Nhà cung cấp phải trả ảnh raster có alpha hoặc
  mặt nạ nền để bộ chuyển đổi chuẩn hóa thành PNG RGBA; SVG và đầu ra nhiều khung hình bị từ chối.
- Câu lệnh lấy từ cấu hình phía máy chủ `prompt-chibi-v1`, khóa phong cách/vị trí/an toàn;
  không có câu lệnh người dùng và không ghi câu lệnh thô vào nhật ký.
- Tối đa 2 lệnh gọi nhà cung cấp đồng thời cho mỗi tác vụ; ghép đúng 8 ảnh theo thứ tự.
- Trước phát hành hoặc khi đổi `OPENAI_BASE_URL`/mô hình, ứng viên phải vượt kiểm
  thử hợp đồng, bộ đánh giá chuẩn, SLO và duyệt bảo mật/quyền riêng tư. Trong các
  ứng viên đạt, nhóm vận hành cấu hình dịch vụ có chi phí dự kiến thấp nhất cho
  một bộ 8 ảnh thành công, gồm tỷ lệ tạo lại; nếu bằng nhau, ưu tiên p95 thấp hơn
  rồi điểm giữ đặc trưng cao hơn. Không chọn lại tự động lúc chạy.
- Gemini và dịch vụ tạo ảnh không được dùng dữ liệu người dùng để huấn luyện;
  thời gian lưu phía dịch vụ không quá 30 ngày và phải có DPA/cơ chế xóa được xác minh.

### 8.5 Ảnh đầu ra

| Thuộc tính | Yêu cầu |
| --- | --- |
| Số lượng | Chính xác 8 số thứ tự duy nhất từ 1 đến 8 |
| Phong cách | `chibi_3d`, không chân thực như ảnh chụp |
| Định dạng | Chữ ký PNG hợp lệ, 1024×1024, RGBA 8-bit sRGB |
| Nền | Trong suốt; có kênh alpha và ≥5% điểm ảnh có alpha <255 |
| Dung lượng tối đa | 4 MiB/ảnh |
| Chữ | Đúng câu chữ trong danh mục, đọc được khi kết xuất ở 128×128 |
| Tính toàn vẹn | SHA-256 gồm 64 ký tự thập lục phân, được xác minh trước/sau khi tải lên Storage |
| An toàn | Ảnh và chữ đã kết xuất đều đạt kiểm duyệt đầu ra |
| Riêng tư | Đường dẫn đối tượng riêng tư `{owner_id}/outputs/{set_id}/{ordinal}-{id}.png` |

### 8.6 Ngưỡng chất lượng để phát hành

Trên bộ đánh giá có phiên bản gồm tối thiểu 300 ảnh nguồn có quyền sử dụng, cân
bằng giữa người/thú cưng/vật thể và các nhóm màu da/giới/tuổi trưởng thành:

- ≥85% sticker đạt điểm giữ đặc trưng chủ thể ≥4/5; không nhóm nào thấp hơn 80%.
- ≥90% sticker đạt điểm tách nền ≥4/5; chữ chính xác và đọc được =100%.
- Tỷ lệ chấp nhận sai ảnh có nhiều chủ thể ≤2%; độ bao phủ phát hiện nhiều chủ thể
  ≥95%; tỷ lệ chấp nhận sai nội dung không an toàn hoặc nhân vật có thương hiệu rõ ràng ≤1%.
- 100% ảnh người thiếu xác nhận `consent-v1.1` bị chặn trước khi gọi nhà cung cấp;
  luồng báo cáo/gỡ bỏ nhân vật công chúng đạt toàn bộ ca kiểm thử vận hành.
- Chênh lệch tỷ lệ đạt/giữ đặc trưng giữa các nhóm nhân khẩu học ≤5 điểm phần trăm.
- 100% bộ thành công đúng 8 ảnh, đúng danh mục và đạt hợp đồng PNG/alpha/mã kiểm tra.

## 9. Yêu cầu phi chức năng

### 9.1 Bảo mật và quyền riêng tư

| ID | Yêu cầu |
| --- | --- |
| NFR-SEC-001 | Dùng TLS 1.2+ khi truyền; dữ liệu tại nhà cung cấp/kho lưu trữ/cơ sở dữ liệu được mã hóa khi lưu. |
| NFR-SEC-002 | Token truy cập cài đặt dùng JWT do FastAPI ký; xác minh đơn vị phát hành, đối tượng, thuật toán, chữ ký, hạn và `sub`; token làm mới được băm, xoay vòng và chống phát lại; cô lập chủ sở hữu và cấp quyền tối thiểu. |
| NFR-SEC-003 | Chặn giả mạo MIME, bom giải nén, duyệt đường dẫn, phát lại yêu cầu, SVG/tệp đa nghĩa độc hại và dữ liệu quá cỡ. |
| NFR-SEC-004 | Bí mật không được vào kho mã/ứng dụng di động/nhật ký; luân chuyển tối thiểu mỗi 90 ngày và khi có sự cố. |
| NFR-PRI-001 | Không ghi byte ảnh nguồn/đầu ra hoặc tham chiếu nhạy cảm vào nhật ký/dữ liệu phân tích. |
| NFR-PRI-002 | Không huấn luyện bằng nội dung người dùng; thông báo về nhà cung cấp có trong nội dung đồng ý. |
| NFR-PRI-003 | Tự động thực thi thời hạn lưu giữ/xóa và có bằng chứng kiểm toán. |

### 9.2 Hiệu năng

| Chỉ số | Mục tiêu |
| --- | --- |
| API đọc p95 | ≤500 ms, không tính thời gian truyền ảnh/nhà cung cấp |
| API ghi p95 | ≤1 giây trước khi đưa vào hàng đợi/gọi nhà cung cấp |
| Kiểm tra ảnh có thẩm quyền p95 | ≤15 giây sau khi tải lên hoàn tất |
| Tạo ảnh p50 / p95 | ≤60 giây / ≤120 giây |
| Giới hạn cứng tạo ảnh | 180 giây |
| Trang đầu thư viện p95 | ≤1 giây cho 20 gói |
| Thời gian nhận byte đầu tiên của ảnh p95 | ≤1 giây trên mạng dịch vụ |
| Phiên không gặp sự cố | ≥99,5% |

### 9.3 Độ sẵn sàng, năng lực và khôi phục

- Độ sẵn sàng API theo tháng mục tiêu ≥99,0%, không tính bảo trì có kế hoạch đã báo trước.
- Năng lực cơ sở là 20 yêu cầu/phút, tối đa 2 tác vụ tạo đang được xử lý đồng thời
  trên một tiến trình xử lý và tối đa 50 tác vụ chờ; hàng đợi trả 429 khi vượt ngưỡng bảo vệ.
- Cảnh báo nếu độ sâu hàng đợi >20 trong 10 phút, tỷ lệ lỗi tác vụ >5%/5 phút hoặc p95 >120 giây.
- Supabase sao lưu hằng ngày: RPO 24 giờ; quy trình khôi phục có tài liệu: RTO 8 giờ.
- Khi Gemini hoặc dịch vụ tạo ảnh gián đoạn: đóng an toàn, giữ tác vụ ở trạng
  thái có thể thử lại, không tự chuyển sang URL/mô hình khác.
- Theo dõi chi phí thực tế trung bình và p95 cho mỗi bộ thành công theo
  `provider_kind`, máy chủ đích và mô hình; cảnh báo khi vượt 120% chi phí kỳ vọng
  đã phê duyệt trong 24 giờ.

### 9.4 Nền tảng, khả năng tiếp cận và bản địa hóa

- Expo SDK 54, React Native 0.81, React 19.1; dùng Node 20.19+ để dựng ứng dụng.
- Android 7/API 24+, SDK biên dịch/đích 36; kiểm thử API 24, 29, 33, 36.
- iOS 15.1+; kiểm thử 15.1, 17.x, 18.x; điện thoại dọc và máy tính bảng có bố cục thích ứng.
- WCAG 2.2 AA; VoiceOver/TalkBack; cỡ chữ động tới 200%; độ tương phản ≥4,5:1;
  vùng chạm ≥44pt trên iOS/48dp trên Android; trình đọc màn hình phải thông báo tiến độ/lỗi.
- Giao diện/nội dung/mã có tiếng Việt và tiếng Anh; phông dự phòng Noto Sans.

### 9.5 Ngân sách tài nguyên/mạng của ứng dụng di động

- Bộ nhớ thường trú cao nhất ≤350 MiB khi tải lên/tạo/xem trước.
- Bộ nhớ đệm do ứng dụng quản lý ≤100 MiB và dọn ảnh nguồn/tệp chia sẻ/tệp tải xuống tạm trong 1 giờ.
- Không giữ ảnh base64 trong trạng thái React/nhật ký; truyền tệp theo luồng khi tải lên/tải xuống.
- Một ảnh nguồn tải lên tối đa 10 MiB; tải một bộ theo từng ảnh ≤4 MiB.
- Dừng thăm dò nền khi tác vụ kết thúc/ngoại tuyến; luồng 3 phút tiêu thụ pin ≤3%
  trên thiết bị đánh giá có pin 4000mAh.
- Khi ngoại tuyến: hiển thị khung ứng dụng/siêu dữ liệu thư viện đã lưu đệm; thao tác thay đổi dữ liệu báo cần mạng
  và chỉ thử lại khi người dùng chủ động, không tự xếp hàng dài hạn để tải ảnh lên.

## 10. Tin cậy, an toàn và tuân thủ

### 10.1 Chuỗi đánh giá MVP

- Pillow/pillow-heif và OpenCV chạy trong máy chủ để giải mã, chuẩn hóa và tính
  chỉ số mờ/ánh sáng; không gửi bước này tới dịch vụ đám mây khác.
- Bộ chuyển đổi Gemini trả JSON Schema
  `input-assessment-v1`: loại/số chủ thể, số khuôn mặt nhìn thấy, độ rõ/che khuất
  của mặt, mức không chắc chắn và dấu hiệu rõ ràng của nhân vật có thương hiệu.
- Bộ đánh giá không được yêu cầu tên, danh tính hoặc tuổi của người trong ảnh.
- Bộ chuyển đổi Gemini nhận ảnh chuẩn và ảnh/chữ đầu ra, chuẩn hóa quyết định thành
  `blocked` cùng nhóm lý do nội bộ ổn định; `blocked=true` làm nội dung bị chặn.
- Phản hồi thiếu/không hợp lệ, mô hình từ chối, quá thời gian hoặc bước bắt buộc
  không sẵn sàng đều đóng an toàn. Lý do cho người dùng không tiết lộ chi tiết có thể giúp né kiểm duyệt.

### 10.2 An toàn trẻ em

V1 không hỗ trợ ảnh người dưới 18 tuổi. Người tải lên phải xác nhận chủ thể là
người trưởng thành trong `consent-v1.1`; hệ thống không thu ngày sinh và không
suy luận tuổi từ khuôn mặt. Mọi ảnh đầu vào/đầu ra bị bộ chuyển đổi kiểm duyệt xếp vào
nhóm nội dung tình dục đều bị chặn, vì MVP không dựa vào phân loại độ tuổi riêng cho ảnh. Báo cáo
liên quan trẻ vị thành niên được ưu tiên trong 24 giờ. Không ghi ảnh vào nhật ký;
nghĩa vụ xử lý nội dung nghi là CSAM của nhà cung cấp phải được nêu trong thông
báo quyền riêng tư. Máy khách không có cơ chế ghi đè thủ công.

### 10.3 Vận hành xử lý báo cáo

- MVP không xây dựng cơ sở dữ liệu khuôn mặt hoặc tự nhận dạng người nổi tiếng.
  Quyền sử dụng ảnh được kiểm soát bằng xác nhận bắt buộc và quy trình báo cáo.
  Báo cáo có căn cứ về nhân vật công chúng, sử dụng hình ảnh trái phép hoặc bản
  quyền làm ảnh mất quyền truy cập ngay khi quản trị viên chọn hành động gỡ bỏ.
- Báo cáo đi qua `submitted -> triaged -> actioned|closed -> appealed|final`.
- Trường hợp khẩn cấp/trẻ em/mối đe dọa đáng tin cậy: phân loại ≤24 giờ; báo cáo khác ≤72 giờ.
- Hành động gồm giữ nguyên, chặn ảnh, xóa gói/ảnh nguồn theo chính sách, đình chỉ
  chủ sở hữu hoặc chuyển Pháp chế/cơ quan thực thi pháp luật khi bắt buộc.
- Nhân sự vận hành dùng bảng điều khiển có quyền tối thiểu, mọi thao tác đọc/hành
  động đều được kiểm toán; bằng chứng giữ 180 ngày. Người dùng xem trạng thái và
  gửi một khiếu nại tối đa 500 ký tự trong 14 ngày.

## 11. Phân tích sản phẩm và khả năng quan sát

### 11.1 Danh sách sự kiện cho phép

`sticker_screen_opened`, `consent_confirmed`, `photo_source_selected`,
`validation_passed`, `validation_failed`, `generation_started`,
`generation_completed`, `generation_failed`, `generation_timed_out`,
`sticker_set_regenerated`, `sticker_selected`, `sticker_deselected`,
`pack_saved`, `pack_save_failed`, `native_share_sheet_invoked`,
`sticker_download_invoked`, `sticker_download_completed`,
`sticker_download_failed`, `pack_deleted`, `sticker_reported`.

Thuộc tính cho phép: `event_version`, `occurred_at`, `session_id` ngẫu nhiên,
`locale`, `platform`, `app_version`, `reason_category` không nhạy cảm, nhóm thời
lượng, số ảnh đã chọn và kết quả tác vụ. Không có định danh ảnh/tệp/nhà cung cấp.

Sự kiện thô lưu 90 ngày; dữ liệu tổng hợp theo ngày lưu 13 tháng. Người dùng có
nút bật/tắt phân tích; khi không đồng ý, hệ thống ngừng sự kiện sản phẩm mới nhưng
không tắt nhật ký bảo mật/vận hành bắt buộc.

### 11.2 KPI

- Tỷ lệ hoàn tất tạo ảnh = tác vụ thành công / tác vụ đã gửi.
- Tỷ lệ từ tạo đến lưu = tác vụ có gói được lưu / tác vụ thành công.
- Tỷ lệ lỗi kiểm tra theo nhóm lý do an toàn / ảnh nguồn đã tải lên.
- Tỷ lệ tạo lại = tác vụ tạo lại / tác vụ gốc thành công.
- Tỷ lệ mở bảng chia sẻ = số bộ thành công duy nhất có mở bảng chia sẻ / số bộ thành công.
- Tỷ lệ tải xuống hoàn tất = lượt hoàn tất / lượt bắt đầu tải xuống.
- Tỷ lệ dùng lại trong 7 ngày = gói đã lưu được mở/chia sẻ/tải xuống trong ngày 2–7 / gói đã lưu.
- Tỷ lệ chặn/báo cáo an toàn theo tổng lượt đánh giá/ảnh đầu ra có thể xem.

Không dùng chỉ số “gửi trên mỗi cuộc trò chuyện” vì ứng dụng không có khung chat/cuộc trò chuyện.

## 12. Chấp nhận, xác minh và điều kiện phát hành

### 12.1 Tiêu chí chấp nhận

| ID | Điều kiện / hành động | Kết quả mong đợi |
| --- | --- | --- |
| AC-001 | Người dùng mới mở màn hình Tạo | Hiển thị đúng phạm vi ảnh, nội dung đồng ý và thao tác máy ảnh/thư viện. |
| AC-002 | Chưa đồng ý hoặc đổi ảnh | Không tải lên/tạo ảnh; trạng thái đồng ý cũ được đặt lại. |
| AC-003 | JPEG/PNG/WebP/HEIC/HEIF tĩnh đạt mọi ngưỡng | Ảnh nguồn chuyển `ready`. |
| AC-004 | Định dạng cấm, giả mạo, hỏng hoặc nhiều khung hình | Từ chối trước khi gọi nhà cung cấp và không lưu ảnh lâu dài. |
| AC-005 | Đúng một người với một khuôn mặt rõ và có đủ xác nhận tuổi/quyền `consent-v1.1` | Có thể đạt bước kiểm tra chủ thể/an toàn mà không nhận dạng danh tính hoặc suy luận tuổi. |
| AC-006 | Đúng một thú cưng hoặc vật thể được hỗ trợ | Có thể đạt bước kiểm tra chủ thể/an toàn. |
| AC-007 | Không có/nhiều hơn một chủ thể, nhiều khuôn mặt hoặc cảnh trộn đạt ngưỡng | Từ chối với nội dung an toàn, nêu rõ cách xử lý. |
| AC-008 | Thiếu xác nhận tuổi/quyền, phát hiện nhân vật có thương hiệu rõ ràng hoặc nội dung không an toàn | Không tạo tác vụ. Báo cáo nhân vật công chúng có căn cứ làm ảnh bị gỡ theo SLA. |
| AC-009 | Ảnh nguồn sẵn sàng và người dùng bấm Tạo | Tác vụ bền vững được gửi; tiến độ và tiếp tục theo dõi hoạt động đúng. |
| AC-010 | Tác vụ thành công | Bản xem trước có đúng 8 PNG Chibi theo danh mục/ngôn ngữ và đã qua kiểm duyệt. |
| AC-011 | Một ảnh vẫn không hợp lệ/bị chặn sau 2 lần tạo bù | Toàn bộ tác vụ thất bại, không xem trước/lưu bộ chưa đầy đủ. |
| AC-012 | Người dùng chọn ít nhất một ảnh và bấm Lưu | Chỉ phần đã chọn được lưu riêng tư; thử lại có tính lũy đẳng. |
| AC-013 | Lưu lỗi | Bản xem trước còn tới hết 24 giờ và có thể thử lại. |
| AC-014 | Khởi động lại ứng dụng với cùng token làm mới của cài đặt | Làm mới token truy cập, giữ nguyên chủ sở hữu và khôi phục tác vụ/thư viện đã lưu. |
| AC-015 | Người dùng tải một ảnh đã lưu | PNG đúng MIME/mã kiểm tra vào album hệ điều hành; bản đám mây còn nguyên. |
| AC-016 | Người dùng chia sẻ một ảnh đang xem được | Bảng chia sẻ hệ điều hành mở cho một PNG; gói không bị công khai. |
| AC-017 | Người dùng xóa gói | Không còn liệt kê/đọc được gói; xóa dữ liệu chính hoàn tất ≤24 giờ. |
| AC-018 | Đọc/liệt kê/truy cập ảnh/báo cáo chéo chủ sở hữu | Trả 404, không lộ sự tồn tại của tài nguyên. |
| AC-019 | Người dùng báo cáo ảnh đầu ra | Báo cáo theo chủ sở hữu vào hàng đợi và có trạng thái/SLA. |
| AC-020 | Người dùng không đồng ý phân tích hoặc dữ liệu chứa trường bị cấm | Không nhận sự kiện sản phẩm/dữ liệu bị từ chối. |
| AC-021 | Bộ kiểm tra trước phát hành | Đạt các ngưỡng chất lượng, an toàn, độ trễ, bảo mật và nền tảng. |

### 12.2 Các lớp xác minh

- Đơn vị: bộ giải mã, ngưỡng, máy trạng thái, chính sách, mã băm và ánh xạ lỗi.
- Hợp đồng: kho dữ liệu, bộ chuyển đổi Gemini, bộ chuyển đổi tạo ảnh tương thích OpenAI, JSON Schema đánh giá ảnh và lược đồ REST.
- Tích hợp: FastAPI, PostgreSQL/Storage của Supabase, tiến trình xử lý nhận phiên thuê từ bảng tác vụ, máy chủ tương thích OpenAI giả lập và tài khoản Gemini/dịch vụ tạo ảnh dành cho kiểm thử.
- E2E trên thiết bị: ma trận Android/iOS cho máy ảnh, trình chọn ảnh, tải xuống và chia sẻ.
- Đánh giá chuẩn: bộ dữ liệu đại diện hợp pháp, thiên lệch, giữ đặc trưng, an toàn và độ trễ.
- Bảo mật/quyền riêng tư: cô lập xác thực, RLS, quét bí mật/nhật ký, lạm dụng, phát lại và bom giải nén.

Độ bao phủ máy chủ ≥85%, ứng dụng di động ≥80%; các nhánh quan trọng về đồng ý,
chủ sở hữu, an toàn, công bố và xóa =100%. TDD là đặc tả kiểm thử chính.

### 12.3 Điều kiện phát hành

Không phát hành nếu bất kỳ điều kiện nào không đạt:

1. Mã kiểm tra PRD không đổi và truy vết SRS/tài liệu kế tiếp đạt yêu cầu.
2. Không còn mô phỏng, `X-Device-ID`, Supabase Auth/Queues/Edge Functions hoặc điểm cuối AI chưa phê duyệt trong môi trường tiền sản xuất/sản xuất.
3. Bốn biến AI bắt buộc có giá trị, `OPENAI_BASE_URL` dùng HTTPS; hai bộ chuyển đổi Gemini/tạo ảnh vượt đủ cổng hợp đồng, chất lượng, an toàn, độ trễ và chi phí, đồng thời có bằng chứng DPA, không huấn luyện và lưu giữ tối đa 30 ngày.
4. Supabase chỉ lưu PostgreSQL/Storage tại dự án đã phê duyệt; thông báo quyền riêng tư và `consent-v1.1` nêu đúng Supabase, Google Gemini cùng tên pháp lý của dịch vụ tạo ảnh đang cấu hình.
5. Kiểm thử ảnh đầu vào, an toàn, đúng 8 ảnh, kiểm duyệt đầu ra và cô lập chủ sở hữu đều đạt.
6. Trực vận hành báo cáo/gỡ bỏ hoạt động và diễn tập SLA đạt yêu cầu.
7. Tác vụ lưu giữ/xóa và thời hạn bản sao lưu đã được kiểm chứng.
8. Ngưỡng chất lượng/thiên lệch/hiệu năng đạt trên bộ dữ liệu có phiên bản.
9. Ma trận Android/iOS, khả năng tiếp cận và kiểm tra nhanh độ ổn định đạt yêu cầu.
10. Giám sát, cảnh báo, diễn tập khôi phục RPO/RTO và quy trình quay lui đạt yêu cầu.

## 13. Truy vết PRD → SRS

| PRD | SRS |
| --- | --- |
| F1 | FR-INP-001..004, Mục 8.1 |
| F2 | FR-VAL-001..009, Mục 8.1..8.2, Mục 10 |
| F3 | FR-CNS-001..003, DEC-036 |
| F4 | FR-GEN-002, Mục 8.4..8.5 |
| F5 | FR-GEN-003..004, DEC-005, Mục 8.3 |
| F6 | FR-VAL-007..008, FR-GEN-006..007, Mục 10 |
| F7 | FR-PRV/SEL/REG/SAV, UC-02..04 |
| F8 | DEC-010, FR-SAV-002..006; thư viện độc lập thay khay DUHAT |
| F9 | DEC-003/019, FR-SHR-001..003; bảng chia sẻ hệ điều hành thay thao tác gửi trong khung chat |
| F10 | FR-DEL-001, FR-REP-001..003 |
| PRD §8 | Mục 7, 9.1, 10, 11 |
| PRD §10 | Mục 8.6, 9 |
| PRD §11 | Mục 11; loại chỉ số theo cuộc trò chuyện theo DEC-003 |
| PRD §14.1..7 | DEC-004, DEC-006..007, DEC-012..018 |

## 14. Nguồn kỹ thuật đã nghiên cứu

- [Ma trận nền tảng/phiên bản Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/)
- [Expo ImagePicker SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/imagepicker/)
- [Expo MediaLibrary SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/media-library/)
- [Bảo mật cấp hàng của Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Truy cập Supabase Storage riêng tư](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Khóa hàng với `SKIP LOCKED` trong PostgreSQL](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)
- [JWT — RFC 7519](https://www.rfc-editor.org/rfc/rfc7519)
- [Hợp đồng ảnh/khung hình của Pillow](https://pillow.readthedocs.io/en/stable/reference/Image.html)
- [Khả năng hỗ trợ phần bổ trợ/khung hình của pillow-heif](https://pillow-heif.readthedocs.io/en/stable/reference/HeifImagePlugin.html)

## 15. Phê duyệt và thay đổi

Phiên bản 1.0 đóng toàn bộ quyết định triển khai V1. Thay đổi yêu cầu hoặc ngưỡng
sau mốc chuẩn phải có ID quyết định mới, phân tích tác động cho Kiến trúc, Bàn
giao, Danh sách công việc và TDD, cùng kế hoạch chuyển đổi dữ liệu/kiểm thử. Không
sửa PRD để hợp thức hóa thay đổi ở tài liệu kế tiếp.
