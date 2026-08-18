# Đặc tả yêu cầu phần mềm — Duhat Gen Sticker V1

## 0. Kiểm soát tài liệu

| Trường | Giá trị |
| --- | --- |
| Mã tài liệu | SRS-DGS-V1 |
| Phiên bản | 1.0 |
| Ngày chốt chuẩn | 18/08/2026 |
| Trạng thái | Đã chốt làm cơ sở triển khai |
| Sản phẩm | Duhat Gen Sticker — ứng dụng web full-stack |
| Nguồn sản phẩm bất biến | `PRD_Sticker_Generation_V1_VI.md` |
| Bản tham chiếu bằng tiếng Anh | `PRD_Sticker_Generation_V1.md` |

### 0.1 Thứ tự ưu tiên nguồn

1. PRD là nguồn yêu cầu sản phẩm chính và không được sửa bởi bộ tài liệu này.
2. SRS ghi lại cách áp dụng PRD cho ứng dụng Duhat Gen Sticker web và các quyết định sản phẩm/kỹ thuật đã được chốt.
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
| DEC-002 | Duhat Gen Sticker là ứng dụng web full-stack (FastAPI + Vite React TypeScript), không phải mô-đun DUHAT Chat. Giao diện tối ưu cho di động (mobile-first) nhưng chạy trên trình duyệt. | Thay bối cảnh tích hợp nhưng giữ mục tiêu tạo sticker. |
| DEC-003 | Ba năng lực V1 là tạo, lưu và tải xuống/chia sẻ; chia sẻ dùng tải xuống PNG hoặc xuất ZIP. | Thay khay sticker/khung chat DUHAT bằng năng lực tương đương của ứng dụng web. |
| DEC-004 | Ảnh đầu vào có đúng một chủ thể chính: một người có đúng một khuôn mặt rõ ràng. V1 chỉ hỗ trợ selfie một người. | Chốt lựa chọn PRD §14.1 ở phương án thu hẹp. |
| DEC-005 | Một bộ được tạo thành công có chính xác 8 sticker biến thể. | Chuẩn hóa khoảng 6–8 của PRD thành 8. |
| DEC-006 | Phong cách V1 cố định là Chibi 2D vector kawaii, phi thực tế. | Chốt phong cách theo PRD §14.2. |
| DEC-007 | Danh mục có 8 biểu cảm cố định: Happy, Laughing, Love, Sad, Angry, Surprised, Thumbs Up, Sleepy; mỗi vị trí có tên Việt/Anh và emoji đại diện. | Chốt danh mục PRD §5.1. |
| DEC-008 | Kiến trúc AI multi-provider: hỗ trợ Google Gemini (`gemini-3.1-flash-image`), OpenAI (`dall-e-3`/`gpt-4o-mini`), và Cloudflare Workers AI (`flux-1-schnell`) qua biến `AI_PROVIDER`. | Chốt tính linh hoạt AI backend. |
| DEC-009 | Chỉ nhận ảnh tĩnh JPEG, PNG, WebP; từ chối các định dạng khác. Dung lượng tối đa 10 MB. | Cụ thể hóa quy tắc kiểm tra định dạng cho web. |
| DEC-010 | Sticker đã lưu vào lưu trữ cục bộ trình duyệt: IndexedDB cho blob ảnh, localStorage cho metadata bộ sticker. Mặc định riêng tư cho thiết bị. | Thay khay sticker DUHAT/Supabase bằng lưu trữ phía client. |
| DEC-011 | Giao diện song ngữ Việt/Anh, chuyển đổi ngay lập tức qua nút toggle. | Chốt ánh xạ ngôn ngữ. |
| DEC-012 | Mỗi phiên chụp ảnh có tối đa 3 lượt tạo lại (regenerate). | Chốt PRD §14.5. |
| DEC-013 | Tách nền AI tự động bằng rembg (U-2-Net) với fallback flood fill; phủ viền sticker trắng die-cut. | Chốt pipeline xử lý ảnh đầu ra. |
| DEC-014 | SSE (Server-Sent Events) streaming: 8 tác vụ tạo ảnh song song, kết quả trả về frontend theo thời gian thực. | Chốt kiến trúc truyền tải dữ liệu. |
| DEC-015 | Kiểm duyệt an toàn đầu vào bằng AI Vision (Gemini/OpenAI/Cloudflare); đầu ra bắt cờ safety block từ provider. | Chốt PRD §7.6/§14.6. |
| DEC-016 | Smart Text Compositing: Canvas HTML5 compositing renders text banner có màu theo biểu cảm phía client. | Chốt cách thêm chữ lên sticker. |
| DEC-017 | Wizard 5 bước: Landing → Upload → Generating → Preview → Tray. | Chốt luồng UX. |

### 0.3 Điều chỉnh bối cảnh PRD

| PRD mô tả | Áp dụng trong ứng dụng web |
| --- | --- |
| Điểm vào từ khay sticker DUHAT | Điểm vào từ Landing Page với nút "Create My Stickers". |
| Sticker đã lưu vào khay DUHAT | Sticker đã lưu vào Tray Page quản lý bằng IndexedDB/localStorage. |
| Gửi trong khung chat DUHAT | Tải PNG đơn lẻ hoặc xuất ZIP toàn bộ bộ sticker. |
| Tỷ lệ gửi trên mỗi cuộc trò chuyện | Đo `sticker_downloaded` và `pack_downloaded`; không suy diễn gửi thành công. |
| 6–8 ảnh đầu ra | Một bộ thành công có chính xác 8 ảnh đầu ra. |

## 1. Phạm vi sản phẩm

### 1.1 Mục tiêu

Duhat Gen Sticker cho phép người dùng biến đúng một ảnh selfie thành 8 sticker Chibi 2D kawaii, xem trước/chọn/lưu vào lưu trữ cục bộ trình duyệt, tải về thiết bị dưới dạng PNG hoặc ZIP, xóa và báo cáo ảnh đầu ra.

### 1.2 Tác nhân

| Tác nhân | Trách nhiệm/quyền |
| --- | --- |
| Người dùng | Chọn/chụp ảnh, đồng ý xử lý, tạo, xem, chọn, lưu, tạo lại, tải xuống, xóa và báo cáo. |
| Frontend (Vite + React TS) | Xử lý quyền truy cập camera/thư viện, trải nghiệm wizard, gọi FastAPI, lưu trữ cục bộ IndexedDB/localStorage, compositing text. |
| Backend (FastAPI) | Tiếp nhận ảnh, kiểm tra hợp lệ bằng AI Vision, điều phối tạo ảnh song song, tách nền, SSE streaming kết quả. |
| AI Providers | Google Gemini (validation + generation), OpenAI (validation + generation), Cloudflare Workers AI (validation + generation) — chọn qua `AI_PROVIDER`. |

### 1.3 Các trường hợp sử dụng chính

| UC | Mô tả |
| --- | --- |
| UC-01 | Người dùng chọn ảnh từ thư viện hoặc chụp từ camera, xác nhận đồng ý, nhận kết quả validation. |
| UC-02 | Người dùng bấm Generate, hệ thống tạo 8 sticker song song qua SSE, hiển thị progressive trên UI. |
| UC-03 | Người dùng xem trước 8 sticker, chọn/bỏ chọn, tạo lại (tối đa 3 lần/phiên). |
| UC-04 | Người dùng lưu các sticker đã chọn vào Tray (IndexedDB). |
| UC-05 | Người dùng tải từng PNG hoặc xuất ZIP toàn bộ bộ sticker từ Tray. |
| UC-06 | Người dùng xóa sticker đơn lẻ hoặc toàn bộ pack. |
| UC-07 | Người dùng báo cáo sticker vi phạm. |

## 2. Trải nghiệm người dùng — Wizard 5 bước

### 2.1 Landing Page

- Hiển thị branding DUHAT: logo, slogan, mascot vịt 🐥.
- Nút "✨ Create My Stickers" dẫn tới Upload Page.
- Nút "📁 My Sticker Tray" dẫn tới Tray Page.
- Hỗ trợ chuyển ngôn ngữ EN/VI qua toggle trên Header.

### 2.2 Upload Page

- Drag & drop hoặc chọn file (JPEG/PNG/WebP, tối đa 10 MB).
- Chụp ảnh trực tiếp từ camera qua CameraModal (viewfinder hướng dẫn căn khuôn mặt).
- Client-side validation: kiểm tra định dạng và dung lượng.
- Server-side AI validation: gửi base64 tới `/api/validate` → kiểm tra face_count, has_clear_face, image_quality, is_safe, subject_type.
- Hiển thị lỗi cụ thể khi không đạt: MULTIPLE_PEOPLE, NO_FACE, UNCLEAR_FACE, POOR_QUALITY, UNSAFE_CONTENT.
- Khi đạt validation: hiển thị ảnh preview + nút "Generate Stickers →".
- ConsentModal bắt buộc xác nhận quyền sở hữu ảnh trước khi chuyển sang bước tạo.

### 2.3 Generating Page

- POST tới `/api/generate-pack` với SSE streaming.
- Hiển thị grid 8 slot sticker với skeleton loading.
- Mỗi sticker hoàn thành → bounceIn animation hiển thị ngay.
- Sticker bị content safety filter → hiển thị icon 🚫 và thông báo.
- Thanh tiến trình: "Generating... {current} of 8".
- Nút Cancel để quay lại Upload.

### 2.4 Preview Page

- Hiển thị grid 8 sticker đã tạo với checkbox chọn/bỏ chọn.
- Nút Select All / Deselect All.
- Nút Regenerate (đếm ngược số lượt còn lại, tối đa 3).
- Nút Save Selected → lưu vào IndexedDB + chuyển sang Tray.
- Menu ⋮ trên mỗi sticker: Report Content.
- Thông báo khi có sticker bị filtered.

### 2.5 Tray Page

- Liệt kê tất cả pack đã lưu, sắp xếp theo ngày tạo.
- Mỗi pack hiển thị: thumbnail sticker đầu tiên, ngày, số lượng sticker.
- Bấm mở rộng pack → hiển thị grid toàn bộ sticker của pack.
- Menu mỗi sticker: Download PNG, Report, Delete.
- Download toàn bộ pack dưới dạng ZIP.
- Delete pack (có xác nhận).
- FAB "+" tạo pack mới.

## 3. Yêu cầu chức năng

### 3.1 Đầu vào ảnh

| ID | Yêu cầu |
| --- | --- |
| FR-INP-001 | Người dùng chọn một ảnh từ thư viện thiết bị qua input file. |
| FR-INP-002 | Người dùng chụp một ảnh từ camera thiết bị qua CameraModal (getUserMedia, facingMode: user). |
| FR-INP-003 | Ảnh gốc không rời khỏi thiết bị dưới dạng không mã hóa; chỉ base64 được gửi tới backend qua HTTPS. |

### 3.2 Kiểm tra hợp lệ ảnh

| ID | Yêu cầu |
| --- | --- |
| FR-VAL-001 | Client kiểm tra: MIME type phải là image/jpeg, image/png hoặc image/webp; dung lượng ≤ 10 MB. |
| FR-VAL-002 | Server gửi ảnh tới AI Vision model để đánh giá có cấu trúc: face_count, has_clear_face, image_quality, is_safe, safety_reason, subject_type. |
| FR-VAL-003 | Ảnh chứa nội dung không an toàn (NSFW, bạo lực, bất hợp pháp) → trả `UNSAFE_CONTENT`. |
| FR-VAL-004 | subject_type = "multiple_people" → trả `MULTIPLE_PEOPLE`. |
| FR-VAL-005 | subject_type ≠ "person" → trả `INVALID_SUBJECT`. |
| FR-VAL-006 | face_count = 0 → trả `NO_FACE`. |
| FR-VAL-007 | face_count > 1 → trả `MULTIPLE_FACES`. |
| FR-VAL-008 | has_clear_face = false → trả `UNCLEAR_FACE`. |
| FR-VAL-009 | image_quality ≠ "good" → trả `POOR_QUALITY`. |
| FR-VAL-010 | Khi thất bại, giữ người dùng trong luồng Upload và cho chọn ảnh khác. |

### 3.3 Sự đồng ý (Consent)

| ID | Yêu cầu |
| --- | --- |
| FR-CNS-001 | ConsentModal hiển thị sau khi ảnh đạt validation, trước khi tạo. |
| FR-CNS-002 | Checkbox bắt buộc: "Tôi xác nhận tôi sở hữu hoặc có quyền sử dụng bức ảnh này". |
| FR-CNS-003 | Nút Continue chỉ bật khi checkbox được tích. |

### 3.4 Tạo sticker

| ID | Yêu cầu |
| --- | --- |
| FR-GEN-001 | Chỉ tạo tác vụ khi người dùng chủ động bấm Generate sau consent. |
| FR-GEN-002 | Backend tạo 8 tác vụ bất đồng bộ song song (asyncio.as_completed), mỗi tác vụ gọi AI provider. |
| FR-GEN-003 | Mỗi tác vụ dùng prompt Chibi 2D cố định + expression modifier, giữ đặc trưng nhận diện người dùng. |
| FR-GEN-004 | Kết quả trả về qua SSE stream (`text/event-stream`), mỗi sticker hoàn thành gửi ngay 1 event. |
| FR-GEN-005 | Ảnh đầu ra được tách nền tự động bằng rembg (U-2-Net) với fallback flood fill, phủ viền trắng die-cut. |
| FR-GEN-006 | Nếu AI provider trả safety block/filtered → đánh dấu `filtered: true`, không hiển thị ảnh. |
| FR-GEN-007 | Event cuối cùng: `{"done": true}` báo hiệu kết thúc stream. |
| FR-GEN-008 | Tách nền có thể bật/tắt qua biến `ENABLE_BG_REMOVAL`. |

### 3.5 Xem trước, chọn và tạo lại

| ID | Yêu cầu |
| --- | --- |
| FR-PRV-001 | Preview Page hiển thị toàn bộ sticker đã tạo thành công trong grid. |
| FR-SEL-001 | Checkbox trên mỗi sticker cho phép chọn/bỏ chọn; mặc định chọn tất cả. |
| FR-SEL-002 | Nút Select All và Deselect All. |
| FR-REG-001 | Nút Regenerate tạo lại toàn bộ bộ sticker từ cùng ảnh nguồn; tối đa 3 lần/phiên. |
| FR-REG-002 | Khi hết lượt regenerate, nút bị disable. |

### 3.6 Lưu và tải xuống

| ID | Yêu cầu |
| --- | --- |
| FR-SAV-001 | Lưu là thao tác chủ động: chỉ khi bấm "Save Selected". |
| FR-SAV-002 | Chỉ lưu sticker đã chọn (selected = true). |
| FR-SAV-003 | Blob ảnh lưu vào IndexedDB (`duhat_stickers` store); metadata pack lưu vào localStorage (`duhat_sticker_packs`). |
| FR-SAV-004 | Sau khi lưu, tự động chuyển sang Tray Page. |
| FR-DL-001 | Tải từng sticker dưới dạng PNG blob. |
| FR-DL-002 | Tải toàn bộ pack dưới dạng file ZIP (sử dụng JSZip + FileSaver). |

### 3.7 Xóa và báo cáo

| ID | Yêu cầu |
| --- | --- |
| FR-DEL-001 | Xóa sticker đơn lẻ: xóa blob khỏi IndexedDB + cập nhật metadata localStorage. |
| FR-DEL-002 | Xóa pack: xóa tất cả blob sticker + xóa pack metadata. Nếu pack trống sau xóa sticker đơn → tự xóa pack. |
| FR-DEL-003 | Xóa pack yêu cầu xác nhận (confirm dialog). |
| FR-REP-001 | Menu thao tác mỗi sticker (Preview + Tray) có "Report Content". |
| FR-REP-002 | ReportModal hiển thị 4 danh mục: `unauthorized_likeness`, `inappropriate_content`, `copyright_violation`, `other`. |
| FR-REP-003 | Báo cáo ghi nhận qua analytics event (client-side in-memory). |

### 3.8 Phân tích sản phẩm (Analytics)

| ID | Yêu cầu |
| --- | --- |
| FR-ANL-001 | Analytics ghi nhận in-memory phía client: tên sự kiện + timestamp + metadata. |
| FR-ANL-002 | Danh sách sự kiện: `generation_started`, `generation_completed`, `generation_failed`, `sticker_toggled`, `pack_saved`, `sticker_downloaded`, `pack_downloaded`, `sticker_deleted`, `pack_deleted`, `sticker_reported`. |
| FR-ANL-003 | Không ghi dữ liệu ảnh, base64, URL hoặc thông tin nhạy cảm vào analytics. |

## 4. Quy tắc nghiệp vụ và điều kiện bất biến

| ID | Quy tắc |
| --- | --- |
| BR-001 | Chỉ tạo sticker khi ảnh đã qua validation và consent. |
| BR-002 | Ảnh đạt yêu cầu có đúng một người với một khuôn mặt rõ. |
| BR-003 | Phong cách luôn là `chibi_2d_kawaii`; không có prompt tự do. |
| BR-004 | Mỗi bộ thành công có 8 biểu cảm cố định. |
| BR-005 | Sticker bị safety filter không thể xem trước/lưu/tải xuống. |
| BR-006 | Lưu yêu cầu chọn ít nhất 1 sticker. |
| BR-007 | Tối đa 3 lượt regenerate mỗi phiên chụp ảnh. |
| BR-008 | Dữ liệu sticker mặc định riêng tư cho thiết bị/trình duyệt. |

## 5. Luồng tạo sticker và xử lý lỗi

### 5.1 Luồng chính

```text
Upload → Client Validate → Server AI Validate → Consent → Generate (8 parallel SSE)
  → Background Removal → SSE Stream → Preview → Select → Save → Tray
```

### 5.2 Xử lý lỗi

| Tình huống | Hành vi |
| --- | --- |
| File không hợp lệ (type/size) | Thông báo lỗi client, giữ ở Upload. |
| Server validation thất bại | Hiển thị mã lỗi cụ thể, xóa preview, cho chọn ảnh khác. |
| AI provider lỗi khi generate | Hiển thị error-card, có thể Cancel quay lại Upload. |
| Một số sticker bị filtered | Hiển thị 🚫 cho slot đó; sticker an toàn vẫn hiển thị bình thường. |
| SSE stream timeout/connection error | Hiển thị lỗi, cho thử lại hoặc quay lại. |
| Save thất bại | Preview vẫn hiển thị để có thể thử lại. |

### 5.3 Mã lỗi Validation

| Mã | HTTP | Mô tả |
| --- | --- | --- |
| `UNSAFE_CONTENT` | 200 (valid=false) | Nội dung không an toàn. |
| `MULTIPLE_PEOPLE` | 200 (valid=false) | Nhiều hơn một người. |
| `INVALID_SUBJECT` | 200 (valid=false) | Không phải ảnh người. |
| `NO_FACE` | 200 (valid=false) | Không phát hiện khuôn mặt. |
| `MULTIPLE_FACES` | 200 (valid=false) | Nhiều khuôn mặt. |
| `UNCLEAR_FACE` | 200 (valid=false) | Khuôn mặt không rõ. |
| `POOR_QUALITY` | 200 (valid=false) | Chất lượng ảnh kém (mờ/tối). |
| `API_ERROR` | 200 (valid=false) | Lỗi hệ thống khi gọi AI. |

## 6. Giao diện API

### 6.1 Health Check

```
GET /api/health
Response: { status, provider, models: { image, vision } }
```

### 6.2 Validate Image

```
POST /api/validate
Body: { image_base64: string, mime_type: string }
Response: { valid: bool, error_code?: string, error_message?: string, details?: object }
```

### 6.3 Generate Pack (SSE)

```
POST /api/generate-pack
Body: { image_base64: string, mime_type: string }
Response: text/event-stream
  Event: data: { expression_id, image_base64?, success, error?, filtered }
  Final: data: { done: true }
```

## 7. An toàn, Tin cậy và Tuân thủ

### 7.1 Sự đồng ý và Nhận diện

- Người dùng xác nhận sở hữu hoặc có quyền sử dụng ảnh trước khi tạo.
- V1 chỉ chấp nhận ảnh người có đúng một khuôn mặt rõ.
- Hệ thống không nhận dạng danh tính hoặc suy luận tuổi.

### 7.2 An toàn nội dung

- Ảnh nguồn được kiểm tra qua AI Vision: nội dung NSFW/bạo lực/bất hợp pháp bị chặn.
- Ảnh đầu ra từ AI provider bắt cờ safety block → không hiển thị.
- Prompt tạo sticker yêu cầu phi thực tế (chibi), tránh tạo ảnh chân thực.

### 7.3 Quyền riêng tư

- Ảnh gốc không lưu trữ lâu dài trên server — chỉ xử lý trong bộ nhớ tạm.
- Sticker đã tạo lưu cục bộ phía client (IndexedDB), không upload lên server.
- Analytics chỉ ghi metadata sự kiện, không ghi nội dung ảnh.

### 7.4 Độ trung thực nhận diện

- Prompt AI yêu cầu giữ nguyên: hair color, hair style, skin tone, glasses, facial structure.
- Hệ thống tránh thay đổi không mong muốn về tông da, sắc tộc, giới tính, độ tuổi.

## 8. Hợp đồng ảnh đầu vào

### 8.1 Yêu cầu kỹ thuật

| Tiêu chí | Giá trị |
| --- | --- |
| Định dạng | JPEG, PNG, WebP (tĩnh) |
| Dung lượng tối đa | 10 MB |
| Chủ thể | Đúng 1 người, 1 khuôn mặt rõ |
| Chất lượng | "good" (không mờ, không tối) |
| An toàn | Không NSFW/bạo lực/bất hợp pháp |

### 8.2 Kết quả AI Assessment

```json
{
  "face_count": 1,
  "has_clear_face": true,
  "image_quality": "good",
  "is_safe": true,
  "safety_reason": null,
  "subject_type": "person"
}
```

## 9. Hợp đồng ảnh đầu ra

| Tiêu chí | Giá trị |
| --- | --- |
| Số lượng | 8 sticker/bộ |
| Phong cách | Chibi 2D vector kawaii |
| Nền | Trong suốt (sau tách nền) với viền trắng die-cut |
| Kích thước render | 512×512 pixels (từ AI), PNG |
| Biểu cảm | 8 danh mục cố định theo `EXPRESSIONS` config |

## 10. Danh mục biểu cảm cố định

| ID | Tên EN | Tên VI | Emoji | Màu | Prompt Modifier |
| --- | --- | --- | --- | --- | --- |
| `happy` | Happy/Smiling | Vui vẻ | 😊 | #FFD700 | big happy smile, joyful expression |
| `laughing` | Laughing/LOL | Cười to | 😂 | #FF8C00 | laughing out loud, hilarious, tear of joy |
| `love` | Love/Heart Eyes | Yêu thích | 😍 | #FF69B4 | heart eyes, deeply in love, affectionate |
| `sad` | Sad/Crying | Buồn bã | 😢 | #6495ED | sad, crying, tears on cheeks, looking down |
| `angry` | Angry/Frustrated | Tức giận | 😡 | #E74C3C | angry, frustrated, red face, steam from ears |
| `surprised` | Surprised/Shocked | Bất ngờ | 😲 | #9B59B6 | surprised, shocked, wide eyes, open mouth |
| `thumbsup` | Thumbs Up/OK | Đồng ý | 👍 | #2ECC71 | thumbs up gesture, confident, approving |
| `sleepy` | Sleepy/Tired | Buồn ngủ | 😴 | #B39DDB | sleepy, tired, yawning, sleepy bubble from nose |

## 11. Phân tích sản phẩm (Analytics)

Các sự kiện metadata sau đây được ghi nhận phía client mà không chứa nội dung ảnh:

| Sự kiện | Khi nào | Metadata |
| --- | --- | --- |
| `generation_started` | Bắt đầu tạo sticker | — |
| `generation_completed` | Hoàn thành tạo | count: số sticker thành công |
| `generation_failed` | Tạo thất bại | error: mô tả lỗi |
| `sticker_toggled` | Chọn/bỏ chọn sticker | — |
| `pack_saved` | Lưu bộ sticker | count: số sticker đã lưu |
| `sticker_downloaded` | Tải PNG đơn | stickerId |
| `pack_downloaded` | Tải ZIP pack | packId |
| `sticker_deleted` | Xóa sticker | stickerId |
| `pack_deleted` | Xóa pack | packId |
| `sticker_reported` | Báo cáo sticker | stickerId, category, details |

## 12. Tiêu chí chấp nhận

| ID | Tình huống | Kết quả mong đợi |
| --- | --- | --- |
| AC-001 | Mở Landing Page | Hiển thị branding DUHAT, nút Create và Tray, toggle ngôn ngữ. |
| AC-002 | Upload ảnh JPEG hợp lệ có 1 mặt rõ | Validation thành công, hiển thị preview + nút Generate. |
| AC-003 | Upload ảnh có nhiều người | Trả lỗi MULTIPLE_PEOPLE, giữ ở Upload cho chọn ảnh khác. |
| AC-004 | Upload ảnh mờ/tối | Trả lỗi POOR_QUALITY. |
| AC-005 | Upload file > 10 MB | Client chặn ngay, hiển thị lỗi dung lượng. |
| AC-006 | Xác nhận consent và bấm Generate | Chuyển sang Generating Page, SSE stream bắt đầu. |
| AC-007 | Tạo sticker thành công | Đúng 8 slot hiển thị, sticker bounceIn progressive. |
| AC-008 | Sticker bị safety filter | Slot đó hiển thị 🚫, thông báo "filtered for safety". |
| AC-009 | Preview: chọn 5/8 sticker và Save | Chỉ 5 sticker được lưu vào IndexedDB + Tray. |
| AC-010 | Regenerate 3 lần | Sau lần 3, nút Regenerate bị disable. |
| AC-011 | Tray: tải PNG đơn | File PNG được tải xuống thiết bị. |
| AC-012 | Tray: tải ZIP pack | File ZIP chứa tất cả sticker của pack được tải xuống. |
| AC-013 | Tray: xóa pack | Xác nhận → xóa blob IndexedDB + metadata localStorage. |
| AC-014 | Report sticker | ReportModal hiển thị 4 danh mục, submit ghi analytics event. |
| AC-015 | Chuyển ngôn ngữ EN ↔ VI | Toàn bộ UI labels + expression names chuyển đổi ngay lập tức. |

## 13. Truy vết PRD → SRS

| PRD | SRS |
| --- | --- |
| F1 | FR-INP-001..003, Mục 8.1 |
| F2 | FR-VAL-001..010, Mục 8.1..8.2 |
| F3 | FR-CNS-001..003 |
| F4 | FR-GEN-003, FR-GEN-005, DEC-006, DEC-013 |
| F5 | FR-GEN-002..004, DEC-005, DEC-007, Mục 10 |
| F6 | FR-VAL-002..003, FR-GEN-006, DEC-015 |
| F7 | FR-PRV/SEL/REG/SAV, UC-02..04 |
| F8 | DEC-010, FR-SAV-001..004 |
| F9 | DEC-003, FR-DL-001..002 |
| F10 | FR-DEL-001..003, FR-REP-001..003 |
| PRD §8 | Mục 7 |
| PRD §10 | Mục 9 (hợp đồng đầu ra) |
| PRD §11 | Mục 11 |
| PRD §14.1..7 | DEC-004..017 |
