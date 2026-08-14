# Cam kết mức dịch vụ nội bộ (SLA) — Duhat Gen Sticker V1

## 0. Kiểm soát tài liệu

| Trường | Giá trị |
| --- | --- |
| Mã tài liệu | SLA-DGS-V1 |
| Phiên bản | 1.0 |
| Ngày chốt chuẩn | 14/08/2026 |
| Sản phẩm | Duhat Gen Sticker — ứng dụng di động độc lập |
| Phạm vi môi trường | Môi trường sản xuất V1 |
| Múi giờ vận hành | `Asia/Ho_Chi_Minh` (UTC+7) |
| Nguồn yêu cầu | `SRS_Sticker_Generation_V1_VI.md` v1.0 |
| Nguồn kiến trúc | `Software_Architecture_Technical_Design.md` v1.0 |
| Nguồn bàn giao | `MVP_IMPLEMENTATION_HANDOFF.md` v1.0 |
| Nguồn kế hoạch | `IMPLEMENTATION_BACKLOG_SPRINT_PLAN.md` v1.0 |
| Nguồn xác minh | `TDD_Sticker_Generation_V1.md` v1.0 |
| Trạng thái | Chuẩn vận hành bắt buộc trước khi phát hành sản xuất |

Tài liệu này là SLA nội bộ cho MVP miễn phí, dùng để vận hành, đo lường và quyết
định phát hành. Đây không phải hợp đồng thương mại, không tạo quyền hoàn tiền hay
tín dụng dịch vụ. Nếu sản phẩm thu phí hoặc ký hợp đồng với khách hàng, phải phát
hành SLA thương mại riêng.

SLA chỉ có hiệu lực sau khi môi trường sản xuất vượt toàn bộ điều kiện phát hành
ở SRS §12.3. Trước thời điểm đó, mọi số liệu chỉ là kết quả thử nghiệm hoặc mục
tiêu chuẩn bị, không được công bố là mức dịch vụ đã đạt.

### 0.1 Thứ tự ưu tiên

1. PRD là nguồn sản phẩm bất biến.
2. SRS chốt yêu cầu và giá trị mục tiêu.
3. Kiến trúc quy định cách hiện thực.
4. SLA này quy định cách đo, báo cáo và xử lý khi không đạt các mục tiêu đó.
5. TDD quy định bằng chứng xác minh.

Nếu SLA khác SRS, SRS thắng và SLA phải được sửa trong cùng tập thay đổi. SLA
không được dùng để nới lỏng điều kiện an toàn, quyền riêng tư, chủ sở hữu hoặc hợp
đồng đúng tám sticker.

## 1. Mục đích và phạm vi

### 1.1 Dịch vụ nằm trong SLA

- API FastAPI sản xuất và phiên cài đặt do FastAPI cấp.
- Tải lên, giải mã, kiểm tra kỹ thuật, chất lượng, chủ thể và an toàn ảnh nguồn.
- Hàng tác vụ `generation_jobs`, tiến trình xử lý, Gemini và dịch vụ tạo ảnh đang cấu hình.
- Xem trước đúng tám sticker, lưu, thư viện Supabase riêng tư và truy cập ảnh.
- Tải PNG đã lưu về thiết bị và yêu cầu mở bảng chia sẻ của hệ điều hành.
- Xóa dữ liệu, báo cáo nội dung, sao lưu, khôi phục và xử lý sự cố.

### 1.2 Ranh giới và trường hợp không thuộc SLA

- Mạng, thiết bị, dung lượng đĩa, quyền hệ điều hành hoặc cấu hình do người dùng kiểm soát.
- Thời gian xét duyệt/phát hành của App Store, Google Play hoặc nhà mạng.
- Việc ứng dụng đích có nhận/gửi thành công ảnh sau khi bảng chia sẻ hệ điều hành đã mở.
- Bản PNG người dùng đã tải xuống hoặc chia sẻ ra ngoài phạm vi lưu trữ của Duhat Gen Sticker.
- Yêu cầu sai hợp đồng, không xác thực, vượt hạn mức người dùng hoặc bị chính sách an toàn từ chối đúng thiết kế.
- Môi trường cục bộ, kiểm thử, tiền sản xuất và quy trình mô phỏng.

Sự cố Supabase, Gemini hoặc dịch vụ tạo ảnh không tự động được miễn. API vẫn được
đo theo tính sẵn sàng của API; lỗi phụ thuộc được đo trong độ trễ/kết quả tác vụ
và được phân loại sự cố theo Mục 5.

## 2. Thuật ngữ và nguyên tắc đo

| Thuật ngữ | Định nghĩa trong tài liệu này |
| --- | --- |
| SLA | Cam kết nội bộ về mức dịch vụ, phản ứng sự cố và xử lý dữ liệu. |
| SLO | Giá trị mục tiêu cụ thể, ví dụ API sẵn sàng 99,0% mỗi tháng. |
| SLI | Chỉ số thực đo dùng để đánh giá SLO. |
| Tháng | Tháng dương lịch theo UTC đối với số liệu hệ thống. |
| Giờ liên tục | Tính cả cuối tuần và ngày lễ. |
| Ngày làm việc | Thứ Hai–Thứ Sáu, 09:00–18:00 UTC+7, trừ ngày nghỉ lễ Việt Nam. |
| Bảo trì có kế hoạch | Bảo trì được thông báo trước ít nhất 24 giờ và nằm trong hạn mức Mục 4. |
| Sự cố | Sự kiện ngoài kế hoạch làm mất hoặc suy giảm dịch vụ, an toàn, bảo mật hay toàn vẹn dữ liệu. |
| Khôi phục | Dịch vụ chính hoạt động lại an toàn; sửa vĩnh viễn có thể tiếp tục sau đó. |

Mọi chỉ số lấy từ phía máy chủ và tiến trình xử lý, không lấy đồng hồ máy khách làm
nguồn có thẩm quyền. Các chỉ số không được chứa ảnh, câu lệnh, token, URL có chữ
ký hoặc định danh chủ sở hữu thô.

## 3. Mức dịch vụ cam kết

### 3.1 Tính sẵn sàng của API

| SLI | Mục tiêu |
| --- | --- |
| Tính sẵn sàng API sản xuất | ≥99,0% mỗi tháng dương lịch |
| Tần suất kiểm tra tổng hợp | Mỗi 1 phút từ một tiến trình giám sát độc lập với API |
| Điểm kiểm tra | `/health/live`; `/health/ready` qua mạng nội bộ; một yêu cầu đọc có xác thực trên dữ liệu kiểm tra biệt lập |
| Bắt đầu gián đoạn | Hai lần kiểm tra liên tiếp thất bại; thời gian tính từ lần thất bại đầu tiên |
| Kết thúc gián đoạn | Hai lần kiểm tra liên tiếp thành công |

Công thức:

```text
Tính sẵn sàng (%) =
  (Tổng số phút đủ điều kiện - Số phút không sẵn sàng) / Tổng số phút đủ điều kiện × 100
```

Phút bảo trì có kế hoạch hợp lệ được loại khỏi mẫu số. Lỗi 4xx đúng hợp đồng do
yêu cầu người dùng, `QUOTA_EXCEEDED` do hết hạn mức cá nhân và nội dung bị chặn
đúng chính sách không phải thời gian API ngừng hoạt động. Lỗi 5xx, quá thời gian,
không thể xác thực phiên hợp lệ hoặc không thể đọc dữ liệu hợp lệ do hệ thống đều
tính là gián đoạn.

Ngân sách gián đoạn tối đa tương ứng với SLO 99,0%:

| Độ dài tháng | Tổng thời gian không sẵn sàng tối đa |
| --- | ---: |
| 28 ngày | 6 giờ 43 phút 12 giây |
| 29 ngày | 6 giờ 57 phút 36 giây |
| 30 ngày | 7 giờ 12 phút |
| 31 ngày | 7 giờ 26 phút 24 giây |

### 3.2 Hiệu năng

| SLI | Mục tiêu | Cách tính |
| --- | ---: | --- |
| API đọc p95 | ≤500 ms | Không tính truyền byte ảnh |
| API ghi p95 | ≤1 giây | Tới khi ghi/xếp hàng bền vững, không tính thời gian AI |
| Kiểm tra ảnh có thẩm quyền p95 | ≤15 giây | Từ khi máy chủ nhận xong tệp đến kết quả cuối |
| Tạo ảnh p50 | ≤60 giây | Từ khi tác vụ vào hàng tới trạng thái kết thúc |
| Tạo ảnh p95 | ≤120 giây | Cùng ranh giới với p50 |
| Giới hạn cứng tạo ảnh | 180 giây | Đạt giới hạn phải kết thúc `timed_out`, không công bố bộ |
| Trang đầu thư viện p95 | ≤1 giây | Tối đa 20 gói, không tính tải toàn bộ byte ảnh |
| Thời gian nhận byte ảnh đầu tiên p95 | ≤1 giây | Đo trên mạng dịch vụ từ FastAPI tới máy khách kiểm tra |
| Phiên ứng dụng không gặp sự cố | ≥99,5% | Theo phiên Android/iOS sản xuất |

Phân vị được tính theo tháng trên các yêu cầu đủ điều kiện. Nếu một chỉ số có dưới
100 mẫu người dùng trong tháng, báo cáo phải ghi rõ lượng mẫu và dùng thêm kiểm
tra tổng hợp có cùng hợp đồng; không được trình bày kết quả ít mẫu như bằng chứng
đạt tải sản xuất.

### 3.3 Năng lực và tính toàn vẹn tác vụ

| Năng lực/điều kiện | Cam kết V1 |
| --- | --- |
| Tải cơ sở | 20 yêu cầu API/phút |
| Tác vụ tạo đang xử lý | Tối đa 2 tác vụ đồng thời trên một tiến trình xử lý |
| Hàng đợi | Tối đa 50 tác vụ chờ; vượt ngưỡng bảo vệ trả 429 có `retry_after_seconds` |
| Cảnh báo hàng đợi | Độ sâu >20 liên tục 10 phút |
| Cảnh báo lỗi tác vụ | Tỷ lệ lỗi >5% trong 5 phút |
| Cảnh báo độ trễ | p95 tạo ảnh >120 giây |
| Bộ thành công | Chính xác 8 PNG hợp lệ, duy nhất theo số thứ tự và đã qua kiểm duyệt |
| Bộ thất bại/thiếu | Không được công bố, lưu hoặc truy cập như bộ thành công |

V1 không cam kết tỷ lệ tạo ảnh thành công tối thiểu độc lập với dữ liệu đầu vào và
dịch vụ AI. Tuy nhiên, mọi tác vụ được đánh dấu thành công phải đạt 100% điều kiện
đúng tám ảnh và hợp đồng an toàn/định dạng; lỗi phải kết thúc rõ ràng và cho thử
lại khi mã lỗi cho phép.

### 3.4 Khôi phục dữ liệu và dịch vụ

| Chỉ số | Mục tiêu |
| --- | ---: |
| RPO — lượng dữ liệu tối đa có thể mất khi khôi phục thảm họa | 24 giờ |
| RTO — thời gian khôi phục mục tiêu sau khi tuyên bố thảm họa | 8 giờ |
| Tần suất sao lưu | Hằng ngày theo khả năng sao lưu của dự án Supabase |
| Diễn tập khôi phục | Ít nhất mỗi quý và trước lần phát hành sản xuất đầu tiên |

RPO/RTO áp dụng cho thảm họa cần khôi phục từ bản sao lưu, không thay thế mục tiêu
phản ứng sự cố ở Mục 5. Kết quả diễn tập phải ghi thời điểm sao lưu, dữ liệu mẫu,
thời gian bắt đầu/kết thúc, sai lệch và hành động khắc phục.

## 4. Bảo trì có kế hoạch

- Tổng thời gian bảo trì được loại trừ khỏi tính sẵn sàng không quá 4 giờ mỗi tháng.
- Thông báo trong ứng dụng hoặc kênh hỗ trợ chính thức ít nhất 24 giờ trước khi bắt đầu.
- Thông báo nêu thời gian bắt đầu, thời lượng dự kiến, chức năng bị ảnh hưởng và cách theo dõi.
- Phần vượt quá 4 giờ/tháng hoặc vượt quá cửa sổ đã thông báo được tính là gián đoạn.
- Bảo trì khẩn cấp không đủ thời gian báo trước được tính là gián đoạn ngoài kế hoạch,
  dù vẫn được phép thực hiện ngay để bảo vệ dữ liệu hoặc an toàn người dùng.
- Triển khai thông thường phải có kiểm tra sức khỏe và khả năng quay lui; không dùng
  cửa sổ bảo trì để bỏ qua điều kiện phát hành.

## 5. Phân loại và phản ứng sự cố

Giám sát tự động hoạt động 24/7. Đồng hồ phản ứng của SEV-1/SEV-2 dùng giờ liên
tục; SEV-3/SEV-4 dùng ngày làm việc.

| Mức | Tiêu chí điển hình | Xác nhận | Giảm ảnh hưởng | Khôi phục mục tiêu | Cập nhật |
| --- | --- | ---: | ---: | ---: | --- |
| SEV-1 — Nghiêm trọng | API ngừng diện rộng; mất/rò dữ liệu; truy cập chéo chủ sở hữu; nội dung nguy hiểm công khai; sự cố khóa/bí mật | ≤30 phút | ≤4 giờ | ≤8 giờ | Mỗi 60 phút |
| SEV-2 — Cao | Tạo ảnh hoặc thư viện ngừng diện rộng; lỗi tác vụ >25%; độ trễ vượt gấp đôi SLO trong 30 phút; phụ thuộc AI gián đoạn | ≤2 giờ | ≤8 giờ | ≤1 ngày | Mỗi 4 giờ |
| SEV-3 — Trung bình | Một chức năng không cốt lõi lỗi; ảnh hưởng một nhóm nhỏ; có cách xử lý thay thế an toàn | ≤1 ngày làm việc | ≤3 ngày làm việc | Theo bản sửa đã duyệt | Mỗi ngày làm việc khi còn mở |
| SEV-4 — Thấp | Lỗi hiển thị, tài liệu hoặc yêu cầu cải tiến không ảnh hưởng điều kiện bất biến | ≤2 ngày làm việc | Theo ưu tiên sản phẩm | Bản phát hành kế hoạch | Khi đổi trạng thái |

“Xác nhận” nghĩa là đã ghi nhận, chỉ định người phụ trách và phân loại sơ bộ;
không đồng nghĩa đã sửa xong. “Giảm ảnh hưởng” có thể là đóng chức năng an toàn,
giới hạn tải hoặc quay lui. Không được bỏ kiểm duyệt, quyền sở hữu hay kiểm tra đầu
ra để đạt thời gian khôi phục.

SEV-1 phải có báo cáo nguyên nhân gốc trong 3 ngày làm việc sau khi khôi phục;
SEV-2 trong 5 ngày làm việc. Báo cáo phải có dòng thời gian, nguyên nhân, phạm vi,
dữ liệu bị ảnh hưởng, điều đã làm tốt/chưa tốt, hành động phòng ngừa, người phụ
trách và ngày hoàn thành.

## 6. SLA Tin cậy và An toàn

| Loại yêu cầu | Đồng hồ | Mức dịch vụ |
| --- | --- | ---: |
| Báo cáo khẩn cấp, trẻ vị thành niên hoặc mối đe dọa đáng tin cậy | Từ `submitted_at` | Phân loại ≤24 giờ liên tục |
| Báo cáo thông thường | Từ `submitted_at` | Phân loại ≤72 giờ liên tục |
| Nội dung được quyết định gỡ bỏ | Từ thao tác quản trị | Mất khả năng truy cập ngay; kiểm tra tự động xác nhận trong ≤15 phút |
| Khiếu nại | Người dùng gửi trong 14 ngày sau quyết định | Nhận đúng một khiếu nại và đưa lại vào quy trình có kiểm toán |

Mốc 24/72 giờ là thời gian phân loại và quyết định bước tiếp theo, không phải cam
kết mọi điều tra pháp lý đều kết thúc trong thời gian đó. Trường hợp có nghĩa vụ
thông báo cho cơ quan quản lý hoặc người dùng được xử lý theo thời hạn pháp luật
và chính sách quyền riêng tư áp dụng.

## 7. SLA xóa và vòng đời dữ liệu

| Dữ liệu/thao tác | Mức dịch vụ |
| --- | --- |
| Xóa gói đã lưu | Sau phản hồi 204, gói không còn liệt kê hoặc đọc được |
| Xóa cứng dữ liệu chính theo yêu cầu | Hoàn thành ≤24 giờ |
| Bản sao lưu chứa dữ liệu đã xóa | Tự hết hạn tối đa 30 ngày; không khôi phục chọn lọc cho mục đích sử dụng thường xuyên |
| Ảnh nguồn gốc | Xóa ≤24 giờ sau khi tác vụ cuối cùng kết thúc |
| Ảnh chuẩn/trung gian/tạm và ứng viên lỗi/bị chặn | Xóa ≤1 giờ sau khi bước/tác vụ kết thúc |
| Bản xem trước/ảnh đầu ra chưa lưu | Hết hạn 24 giờ sau khi tác vụ kết thúc |
| Siêu dữ liệu tác vụ/kiểm tra/kiểm duyệt/lần gọi | 30 ngày, không chứa ảnh hoặc phản hồi thô |
| Bằng chứng đồng ý | 365 ngày sau khi xóa ảnh nguồn |
| Báo cáo đã đóng | 180 ngày |
| Nhật ký ứng dụng/bảo mật | 30 ngày |
| Dữ liệu tại Gemini/dịch vụ tạo ảnh | Không dùng huấn luyện; lưu tối đa 30 ngày theo DPA/cơ chế xóa đã duyệt |

Việc xóa không thể thu hồi bản người dùng đã tải xuống hoặc chia sẻ sang ứng dụng
khác. Mọi tác vụ xóa phải có dấu thời gian yêu cầu, hạn hoàn thành, kết quả và bằng
chứng kiểm toán không chứa nội dung ảnh.

## 8. Phụ thuộc bên ngoài và nguyên tắc đóng an toàn

| Phụ thuộc | Vai trò | Khi không sẵn sàng |
| --- | --- | --- |
| Supabase | PostgreSQL, Storage riêng tư và sao lưu | API/tiến trình xử lý đóng an toàn; không dùng kho thay thế không được duyệt |
| Google Gemini | Đánh giá ảnh và kiểm duyệt đầu vào/đầu ra | Không cho ảnh nguồn sẵn sàng hoặc không công bố đầu ra; trả lỗi có thể thử lại phù hợp |
| Dịch vụ tại `OPENAI_BASE_URL` | Tạo ảnh | Giữ tác vụ ở trạng thái có thể thử lại hoặc kết thúc lỗi; không tự đổi URL/mô hình |
| Apple/Google và hệ điều hành | Phân phối, quyền ảnh, MediaLibrary, bảng chia sẻ | Hiển thị lỗi/hướng dẫn khôi phục; không báo thành công giả |

Chỉ bốn biến AI được dùng: `GEMINI_API_KEY`, `OPENAI_API_KEY`,
`OPENAI_BASE_URL`, `OPENAI_IMAGE_MODEL`. Thay dịch vụ tạo ảnh là thay đổi phát
hành, phải chạy lại kiểm thử hợp đồng, hiệu năng, an toàn, chi phí và duyệt quyền
riêng tư trước khi áp dụng.

## 9. Đo lường, báo cáo và bằng chứng

### 9.1 Nguồn số liệu

- Kiểm tra tổng hợp `/health/live`, `/health/ready` và yêu cầu đọc biệt lập.
- Chỉ số FastAPI: lưu lượng, mã trạng thái, độ trễ và lỗi.
- Bảng `generation_jobs`: thời gian chờ, giai đoạn, kết quả, thử lại và thời hạn.
- `provider_invocations`: loại dịch vụ, máy chủ đích, mô hình, độ trễ, trạng thái
  và chi phí; không lưu ảnh, câu lệnh hoặc phản hồi thô.
- Supabase Dashboard và bằng chứng sao lưu/khôi phục.
- Số liệu sự cố ứng dụng di động, báo cáo an toàn và tác vụ xóa.

### 9.2 Báo cáo tháng

Báo cáo SLA được chốt chậm nhất vào ngày làm việc thứ năm của tháng kế tiếp và gồm:

1. Tính sẵn sàng, số phút gián đoạn và phần ngân sách còn lại.
2. Các phân vị hiệu năng, lượng mẫu và tỷ lệ lỗi theo nhóm mã.
3. Độ sâu/tuổi hàng đợi, kết quả tác vụ và số lần quá 180 giây.
4. Số báo cáo an toàn đúng hạn/quá hạn và số nội dung bị gỡ.
5. Số yêu cầu xóa đúng hạn/quá hạn và kết quả vòng đời dữ liệu.
6. Danh sách SEV-1/SEV-2, thời gian xác nhận/giảm ảnh hưởng/khôi phục và liên kết báo cáo nguyên nhân gốc.
7. Kết quả sao lưu/khôi phục, thay đổi phụ thuộc AI và hành động cải thiện.

### 9.3 Bảo toàn bằng chứng

Bằng chứng SLA dùng ID yêu cầu/tác vụ ngẫu nhiên, dấu thời gian UTC và phiên bản
triển khai. Không đưa ảnh, chủ sở hữu thô, token, URL có chữ ký hoặc bí mật vào
bảng điều khiển, cảnh báo hay báo cáo.

## 10. Xử lý khi không đạt SLA

SLA nội bộ của MVP không có tín dụng dịch vụ. Khi bất kỳ SLO nào không đạt:

1. Mở sự cố với mức nghiêm trọng phù hợp và bảo toàn bằng chứng.
2. Công bố số liệu thực, không loại trừ thủ công khoảng lỗi để làm đẹp báo cáo.
3. Hoàn thành phân tích nguyên nhân và tạo công việc khắc phục có người phụ trách.
4. Ưu tiên lỗi an toàn, rò dữ liệu, chủ sở hữu và xóa quá hạn ở mức P0.
5. Nếu tính sẵn sàng hoặc cùng một SLO không đạt hai tháng liên tiếp, tạm dừng mở
   rộng tải/tính năng cho tới khi duyệt xong năng lực và kế hoạch khắc phục.
6. Nếu vi phạm điều kiện bất biến về an toàn/quyền riêng tư, đóng chức năng liên
   quan hoặc quay lui bản phát hành cho tới khi kiểm thử hồi quy đạt.

## 11. Vai trò và trách nhiệm

| Vai trò | Trách nhiệm |
| --- | --- |
| Chủ sản phẩm | Phê duyệt SLA, ưu tiên tác động người dùng và quyết định phát hành/dừng phát hành. |
| Máy chủ/Vận hành | Giám sát API, worker, Supabase, AI, triển khai, quay lui, sao lưu và xử lý sự cố. |
| Ứng dụng di động | Theo dõi phiên không gặp sự cố, lỗi thiết bị, quyền, tải xuống và chia sẻ. |
| QA | Duy trì kiểm thử TDD, kiểm tra tải, diễn tập khôi phục và xác minh bằng chứng SLA. |
| Tin cậy và An toàn | Phân loại báo cáo, gỡ bỏ, xử lý khiếu nại và giữ dấu vết kiểm toán. |
| Bảo mật/Quyền riêng tư | Duyệt DPA, bí mật, luồng dữ liệu, sự cố và thời hạn xóa/lưu giữ. |

Một người có thể đảm nhiệm nhiều vai trò trong MVP, nhưng bằng chứng và trách
nhiệm của từng vai trò vẫn phải được ghi riêng.

## 12. Điều kiện kích hoạt SLA

Không kích hoạt SLA sản xuất cho tới khi có đủ bằng chứng:

- TDD P-01..12, P-20 đạt cho hiệu năng, năng lực, sẵn sàng và khôi phục.
- TDD R-01..09 đạt cho báo cáo và SLA Tin cậy & An toàn.
- TDD D-21..23, C-06..08 và S-19..21 đạt cho xóa/lưu giữ.
- Cảnh báo API, hàng đợi, lỗi tác vụ, độ trễ, chi phí, báo cáo và xóa hoạt động.
- Diễn tập SEV-1, quay lui và khôi phục sao lưu đạt RPO/RTO.
- Môi trường sản xuất không dùng mô phỏng, Supabase Auth/Queues/Edge/AI hoặc điểm
  cuối AI chưa được duyệt.

## 13. Truy vết

| Nội dung SLA | Nguồn và bằng chứng |
| --- | --- |
| Tính sẵn sàng 99,0% | SRS DEC-033, §9.3; TDD P-08 |
| Hiệu năng và giới hạn 180 giây | SRS DEC-016, §9.2; TDD P-01..05, G-09..26, J-10 |
| Năng lực/hàng đợi | SRS DEC-022, §9.3; SAD §3.3/8.4; TDD J-01..17, P-06..07 |
| RPO 24 giờ/RTO 8 giờ | SRS DEC-033, §9.3; TDD P-09/P-20 |
| Báo cáo 24/72 giờ | SRS DEC-024, §10.3; TDD R-01..09 |
| Xóa dữ liệu chính 24 giờ/bản sao lưu 30 ngày | SRS DEC-026, §7.3; TDD D-21..23, S-21 |
| Dữ liệu tạm/ảnh nguồn/bản xem trước | SRS DEC-013/028, §7.3; TDD C-06..08, D-08..09 |
| Phụ thuộc AI và đóng an toàn | SRS DEC-021/038, §8.4/9.3; SAD §3.4; TDD G-03/G-10..14/S-12..20 |
| Báo cáo SLA | SAD §8.4; TDD P-07..09 và bộ bằng chứng phát hành |

## 14. Rà soát và thay đổi

- Rà soát SLA mỗi tháng trong ba tháng đầu sau phát hành, sau đó ít nhất mỗi quý.
- Rà soát ngay sau SEV-1, thay đổi kiến trúc lưu trữ, đổi dịch vụ tạo ảnh, thay
  chính sách lưu giữ hoặc thay phạm vi nền tảng.
- Mọi thay đổi giá trị đã chốt phải cập nhật SRS trước, rồi cập nhật Kiến trúc,
  SLA, Bàn giao, Danh sách công việc và TDD trong cùng tập thay đổi.
- PRD luôn chỉ đọc.
