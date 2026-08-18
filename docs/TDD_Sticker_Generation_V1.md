# Đặc tả Kiểm thử (TDD) — Duhat Gen Sticker V1

## 0. Kiểm soát tài liệu

| Trường | Giá trị |
| --- | --- |
| Mã tài liệu | TDD-DGS-V1 |
| Phiên bản | 1.0 |
| Ngày chốt chuẩn | 18/08/2026 |
| Sản phẩm | Duhat Gen Sticker — ứng dụng web full-stack |
| Nguồn yêu cầu | `SRS_Sticker_Generation_V1_VI.md` v1.0 |
| Nguồn kiến trúc | `Software_Architecture_Technical_Design.md` v1.0 |
| Nguồn SLA | `SLA_Duhat_Gen_Sticker_V1_VI.md` v1.0 |
| Trạng thái | Đã chốt làm cơ sở kiểm thử |

### 0.1 Thứ tự ưu tiên nguồn

1. **PRD** là nguồn yêu cầu sản phẩm chính và không được sửa bởi bộ tài liệu này.
2. **SRS** chốt yêu cầu và giá trị mục tiêu.
3. **Kiến trúc (SAD)** quy định cách hiện thực hóa kỹ thuật.
4. **SLA** quy định cách đo lường mức dịch vụ, chất lượng và phản ứng sự cố.
5. **TDD này** quy định bằng chứng kiểm thử và tiêu chuẩn nghiệm thu cho SRS, kiến trúc và SLA.

### 0.2 Mục đích

Tài liệu này quy định chi tiết toàn bộ chiến lược kiểm thử, môi trường, dữ liệu mẫu, và danh mục các ca kiểm thử (test cases) bao phủ 100% yêu cầu chức năng (FR), yêu cầu phi chức năng (NFR), quy tắc nghiệp vụ (BR), tiêu chí chấp nhận (AC), và cam kết mức dịch vụ (SLA).

---

## 1. Phạm vi kiểm thử

### 1.1 Trong phạm vi (In Scope)

- **Quy trình người dùng (Wizard 5 bước):**
  - Bước 1: Landing Page (branding, navigation, i18n toggle).
  - Bước 2: Upload Page (file picker, drag-and-drop, camera selfie modal, client validation, server AI validation, consent confirmation).
  - Bước 3: Generating Page (SSE streaming, 8 parallel tasks, skeleton loading, bounce-in animation, filtered slot display, cancelation).
  - Bước 4: Preview Page (grid 8 stickers, multi-select, select/deselect all, regenerate counter [max 3], report menu, save trigger).
  - Bước 5: Tray Page (pack list, expand/collapse pack, download single PNG, export ZIP pack, delete sticker, delete pack with confirmation).
- **Backend API Endpoints:**
  - `GET /api/health` — trạng thái hệ thống, active provider, vision & image models.
  - `POST /api/validate` — kiểm tra tính hợp lệ và an toàn ảnh qua AI Vision.
  - `POST /api/generate-pack` — tạo 8 biến thể sticker qua SSE stream.
- **AI Multi-Provider Adapters:**
  - Google Gemini (`gemini-3.6-flash` vision / `gemini-3.1-flash-image` generation).
  - OpenAI (`gpt-4o-mini` vision / `dall-e-3` generation).
  - Cloudflare Workers AI (`@cf/meta/llama-3.2-11b-vision-instruct` / `@cf/black-forest-labs/flux-1-schnell`).
- **Xử lý ảnh & Background Removal:**
  - rembg U-2-Net AI cutout + interior alpha preservation.
  - Flood fill fallback (edge-connected component analysis).
  - Fail-safe preservation.
  - White die-cut border rendering (MaxFilter + GaussianBlur anti-aliasing).
- **Client Storage & Persistence:**
  - IndexedDB (`duhat_stickers`, store `images`) cho binary image blob.
  - localStorage (`duhat_sticker_packs`) cho pack metadata.
- **Smart Text Compositing:**
  - HTML5 Canvas overlay banner theo từng biểu cảm.
- **An toàn, Tin cậy & Quyền riêng tư:**
  - Chặn NSFW, bạo lực, nội dung bất hợp pháp ở đầu vào & đầu ra.
  - Bảo vệ quyền riêng tư: không lưu ảnh thô trên server, không log dữ liệu nhạy cảm.
- **Hiệu năng & SLA:**
  - Đo lường độ trễ (P50/P95) của validation, generation, background removal.
  - Tỷ lệ thành công theo SLA (§3.1–§3.5).

### 1.2 Ngoài phạm vi (Out of Scope)

- Độ chính xác sinh ảnh của AI model nền tảng (phụ thuộc nhà cung cấp).
- Kiểm thử tải đồng thời hàng nghìn người dùng (V2).
- Tích hợp tài khoản người dùng / OAuth (V1 lưu trữ hoàn toàn cục bộ).
- Sinh sticker cho động vật / đồ vật (V1 chỉ hỗ trợ selfie 1 người).

---

## 2. Chiến lược kiểm thử

### 2.1 Các cấp độ kiểm thử

```text
+-------------------------------------------------------------+
|                      E2E / UI Tests                         |  Playwright / Manual
|           (Wizard Flow, Camera, Tray, Download)             |
+-------------------------------------------------------------+
|                   Integration & API Tests                   |  pytest + httpx-sse
|         (/api/health, /api/validate, /api/generate-pack)    |  Vitest (Storage/Services)
+-------------------------------------------------------------+
|                        Unit Tests                           |  pytest (Python)
|   (bg_remover, prompts, validators, textCompositor, i18n)   |  Vitest (TypeScript)
+-------------------------------------------------------------+
```

| Cấp độ | Công cụ | Mục tiêu kiểm thử |
| --- | --- | --- |
| **Unit Test** | `pytest` (Backend), `Vitest` (Frontend) | Logic thuật toán (tách nền, prompt formatting, validation rules, i18n translation, storage wrapper). |
| **Integration Test** | `pytest` + `FastAPI TestClient` | Tương tác giữa Router, Provider Dispatcher, BG Remover, SSE Streamer. |
| **API Test** | `pytest` + `httpx` + `httpx-sse` | Kiểm tra HTTP status, headers, Pydantic schemas, SSE data format, timeout. |
| **E2E / UI Test** | `Playwright` / Manual Exploratory | Toàn bộ 5 bước wizard, thao tác DOM, IndexedDB lifecycle, camera capture. |
| **SLA & Performance** | Test scripts đo thời gian, benchmark | P50/P95 latency, tỷ lệ thành công ≥ 6/8 và 8/8, cutout validity rate. |

### 2.2 Quy ước mã định danh ca kiểm thử

Cấu trúc: `TC-{MODULE}-{SỐ_THỨ_TỰ}`

- `TC-LND-*`: Landing Page
- `TC-UPL-*`: Upload Page (Client-side)
- `TC-VAL-*`: Server AI Validation
- `TC-CNS-*`: Consent Verification
- `TC-GEN-*`: Sticker Generation & SSE Stream
- `TC-BGR-*`: Background Removal & Die-cut Border Pipeline
- `TC-PRV-*`: Preview Page & Selection
- `TC-SAV-*`: Save to Client Storage
- `TC-TRY-*`: Tray Page & Pack Management
- `TC-DL-*`: Download Single PNG & ZIP Pack
- `TC-DEL-*`: Delete Sticker & Pack
- `TC-RPT-*`: Report Content Violation
- `TC-I18-*`: Internationalization (EN / VI)
- `TC-API-*`: API Endpoints Contract
- `TC-SAF-*`: Safety, Moderation & Privacy
- `TC-PRF-*`: Performance & SLA Benchmarks
- `TC-MP-*`: Multi-Provider Compatibility
- `TC-ERR-*`: Error Handling & Resilience
- `TC-STR-*`: Client Storage Contract
- `TC-MAN-*`: Manual / Device Exploratory Tests

---

## 3. Dữ liệu kiểm thử chuẩn (Test Fixtures)

| Bộ dữ liệu | Mô tả | Kỳ vọng |
| --- | --- | --- |
| `IMG-VALID-SELFIE-01` | JPEG, 800×800, 150 KB, 1 người mặt rõ nét, ánh sáng chuẩn | Pass validation 100% |
| `IMG-VALID-SELFIE-02` | PNG, 1024×1024, 850 KB, 1 người đeo kính, mặt rõ | Pass validation 100% |
| `IMG-VALID-SELFIE-03` | WebP, 512×512, 90 KB, 1 người selfie | Pass validation 100% |
| `IMG-OVERSIZE` | JPEG, 4000×3000, 12.5 MB | Client chặn với lỗi `FILE_TOO_LARGE` |
| `IMG-INVALID-FORMAT` | GIF / BMP / TIFF, 500 KB | Client chặn với lỗi `INVALID_FORMAT` |
| `IMG-MULTI-PERSON` | JPEG, 1920×1080, 2 người cùng nhìn camera | Server trả `MULTIPLE_PEOPLE` / `MULTIPLE_FACES` |
| `IMG-NO-FACE` | JPEG, 800×600, ảnh chụp phong cảnh hoặc lưng người | Server trả `NO_FACE` |
| `IMG-OBJECT` | JPEG, ảnh cốc cà phê / xe hơi | Server trả `INVALID_SUBJECT` |
| `IMG-BLURRY-DARK` | JPEG, ảnh cực mờ hoặc thiếu sáng trầm trọng | Server trả `POOR_QUALITY` |
| `IMG-NSFW-UNSAFE` | Ảnh chứa nội dung nhạy cảm hoặc bạo lực | Server trả `UNSAFE_CONTENT` |

---

## 4. Danh mục Ca kiểm thử Chức năng

### 4.1 Landing Page (`TC-LND`)

| ID | Tên ca kiểm thử | Các bước thực hiện | Kết quả mong đợi | Truy vết SRS |
| --- | --- | --- | --- | --- |
| **TC-LND-001** | Hiển thị Landing Page chuẩn | Truy cập root URL `/` | Hiển thị đầy đủ branding DUHAT: Mascot vịt 🐥, tiêu đề, nút "Create My Stickers", nút "My Sticker Tray", toggle ngôn ngữ. | §2.1, AC-001 |
| **TC-LND-002** | Điều hướng Create My Stickers | Bấm nút "✨ Create My Stickers" | Chuyển sang bước Upload Page mượt mà, URL/State cập nhật. | §2.1 |
| **TC-LND-003** | Điều hướng My Sticker Tray | Bấm nút "📁 My Sticker Tray" | Chuyển thẳng sang Tray Page, tải danh sách pack đã lưu. | §2.1 |
| **TC-LND-004** | Chuyển ngôn ngữ tức thì | Bấm toggle EN ↔ VI trên Header | Toàn bộ văn bản hiển thị chuyển đổi tức thì không tải lại trang. | §2.1, AC-015 |

### 4.2 Upload Page — Client-Side Validation (`TC-UPL`)

| ID | Tên ca kiểm thử | Các bước thực hiện | Kết quả mong đợi | Truy vết SRS |
| --- | --- | --- | --- | --- |
| **TC-UPL-001** | Upload JPEG hợp lệ (< 10MB) | Chọn file `IMG-VALID-SELFIE-01` | Client nhận file, tạo local object URL, hiển thị thumbnail preview. | FR-INP-001, FR-VAL-001 |
| **TC-UPL-002** | Upload PNG hợp lệ (< 10MB) | Chọn file `IMG-VALID-SELFIE-02` | Client nhận file, hiển thị preview thành công. | FR-INP-001, FR-VAL-001 |
| **TC-UPL-003** | Upload WebP hợp lệ (< 10MB) | Chọn file `IMG-VALID-SELFIE-03` | Client nhận file, hiển thị preview thành công. | FR-INP-001, FR-VAL-001 |
| **TC-UPL-004** | Chặn file vượt dung lượng | Chọn file `IMG-OVERSIZE` (12.5 MB) | Client từ chối ngay lập tức, hiển thị thông báo lỗi file quá 10MB, không gửi API. | FR-VAL-001, AC-005 |
| **TC-UPL-005** | Chặn định dạng không hợp lệ | Chọn file `IMG-INVALID-FORMAT` (GIF/BMP) | Client từ chối ngay, báo định dạng chỉ chấp nhận JPEG/PNG/WebP. | FR-VAL-001, DEC-009 |
| **TC-UPL-006** | Kéo thả ảnh (Drag & Drop) | Kéo thả file ảnh hợp lệ vào dropzone | Dropzone active animation, sau khi thả xử lý tương đương chọn file. | FR-INP-001, §2.2 |
| **TC-UPL-007** | Chụp ảnh camera | Bấm icon Camera, cấp quyền, bấm Chụp | Luồng stream hiển thị trên canvas, chụp frame, đóng modal và preview ảnh chụp. | FR-INP-002, §2.2 |
| **TC-UPL-008** | Hiển thị khung căn mặt camera | Mở CameraModal | Xuất hiện khung hình oval hướng dẫn căn chỉnh khuôn mặt vào giữa. | FR-INP-002 |

### 4.3 Server-Side AI Validation (`TC-VAL`)

| ID | Tên ca kiểm thử | Các bước thực hiện | Kết quả mong đợi | Truy vết SRS |
| --- | --- | --- | --- | --- |
| **TC-VAL-001** | Ảnh 1 người hợp lệ | Gửi `IMG-VALID-SELFIE-01` tới `/api/validate` | `valid: true`, `error_code: null`, UI kích hoạt nút "Generate Stickers". | FR-VAL-002..009, AC-002 |
| **TC-VAL-002** | Chặn ảnh nhiều người | Gửi `IMG-MULTI-PERSON` | `valid: false`, `error_code: "MULTIPLE_PEOPLE"`, UI hiển thị hướng dẫn chọn ảnh 1 người. | FR-VAL-004, AC-003 |
| **TC-VAL-003** | Chặn ảnh không phải người | Gửi `IMG-OBJECT` | `valid: false`, `error_code: "INVALID_SUBJECT"`, báo chỉ hỗ trợ ảnh người selfie. | FR-VAL-005 |
| **TC-VAL-004** | Chặn ảnh không thấy mặt | Gửi `IMG-NO-FACE` | `valid: false`, `error_code: "NO_FACE"`, báo không nhận diện được khuôn mặt. | FR-VAL-006 |
| **TC-VAL-005** | Chặn nhiều khuôn mặt | Gửi ảnh có nhiều mặt trong poster nền | `valid: false`, `error_code: "MULTIPLE_FACES"`. | FR-VAL-007 |
| **TC-VAL-006** | Chặn mặt bị che khuất | Gửi ảnh đeo khẩu trang kín / bị che | `valid: false`, `error_code: "UNCLEAR_FACE"`. | FR-VAL-008 |
| **TC-VAL-007** | Chặn ảnh chất lượng kém | Gửi `IMG-BLURRY-DARK` | `valid: false`, `error_code: "POOR_QUALITY"`, yêu cầu ảnh sáng và rõ hơn. | FR-VAL-009, AC-004 |
| **TC-VAL-008** | Chặn nội dung không an toàn | Gửi `IMG-NSFW-UNSAFE` | `valid: false`, `error_code: "UNSAFE_CONTENT"`, từ chối tạo ngay. | FR-VAL-003 |
| **TC-VAL-009** | Không mất ngữ cảnh khi lỗi | Server trả lỗi validation | Người dùng vẫn ở lại màn hình Upload, ảnh lỗi bị hủy preview để chọn lại ảnh mới. | FR-VAL-010 |
| **TC-VAL-010** | Xử lý lỗi API backend | Backend trả 500 hoặc disconnect | `valid: false`, `error_code: "API_ERROR"`, UI hiển thị toast thông báo thử lại. | §5.2 |

### 4.4 Sự đồng ý — Consent Flow (`TC-CNS`)

| ID | Tên ca kiểm thử | Các bước thực hiện | Kết quả mong đợi | Truy vết SRS |
| --- | --- | --- | --- | --- |
| **TC-CNS-001** | Modal Consent xuất hiện | Bấm "Generate Stickers" sau khi validate pass | ConsentModal mở ra, giải thích điều khoản sở hữu ảnh. | FR-CNS-001 |
| **TC-CNS-002** | Khóa nút Continue khi chưa tick | Xem ConsentModal với checkbox chưa tick | Nút Continue ở trạng thái disabled (mờ, không click được). | FR-CNS-003 |
| **TC-CNS-003** | Mở khóa và bắt đầu tạo | Tick vào checkbox "Tôi xác nhận..." và bấm Continue | Modal đóng, chuyển ngay sang Generating Page, khởi tạo SSE stream. | FR-CNS-002, FR-CNS-003, AC-006 |
| **TC-CNS-004** | Hủy bỏ xác nhận | Bấm nút Cancel / đóng modal | Đóng modal, giữ nguyên trạng thái ở Upload Page. | FR-CNS-001 |

### 4.5 Tạo Sticker & SSE Streaming (`TC-GEN`)

| ID | Tên ca kiểm thử | Các bước thực hiện | Kết quả mong đợi | Truy vết SRS |
| --- | --- | --- | --- | --- |
| **TC-GEN-001** | Khởi tạo tiến trình tạo sticker | Bấm xác nhận từ ConsentModal | Gửi `POST /api/generate-pack`, mở kết nối `EventSource`/SSE. | FR-GEN-001, AC-006 |
| **TC-GEN-002** | Skeleton loading 8 slots | Bước vào Generating Page | Grid 8 ô hiển thị shimmer skeleton và tên 8 biểu cảm. | §2.3 |
| **TC-GEN-003** | Progressive rendering qua SSE | Nhận từng event dữ liệu từ SSE | Mỗi slot hoàn thành lập tức chuyển từ skeleton sang sticker với hiệu ứng bounce-in. | FR-GEN-004, §2.3 |
| **TC-GEN-004** | Hoàn thành đủ 8 sticker | Đợi hoàn tất stream | Nhận đủ 8 sự kiện sticker thành công. | FR-GEN-002, DEC-005, AC-007 |
| **TC-GEN-005** | Đúng 8 biểu cảm cố định | Kiểm tra ID từng sticker nhận được | Gồm đủ: `happy`, `laughing`, `love`, `sad`, `angry`, `surprised`, `thumbsup`, `sleepy`. | DEC-007, BR-004 |
| **TC-GEN-006** | Chuẩn phong cách Chibi 2D | Đánh giá trực quan sticker | Nét vẽ vector 2D kawaii phi thực tế, giữ đặc trưng tóc/kính/nét mặt. | DEC-006, BR-003 |
| **TC-GEN-007** | Xử lý sticker bị filtered | Provider trả cờ an toàn vi phạm ở 1 biểu cảm | Slot đó hiển thị biểu tượng 🚫 kèm dòng chữ "Filtered for safety", 7 sticker khác vẫn hiện. | FR-GEN-006, AC-008, BR-005 |
| **TC-GEN-008** | Cập nhật thanh tiến trình | Theo dõi bộ đếm | Tiến trình hiển thị chính xác `{current} of 8`. | §2.3 |
| **TC-GEN-009** | Hủy tạo giữa chừng (Cancel) | Bấm nút "Cancel" khi đang render | Hủy kết nối SSE, dọn dẹp state, quay về Upload Page. | §2.3 |
| **TC-GEN-010** | Tự động chuyển sang Preview | Nhận sự kiện `{"done": true}` | Generating Page tự động chuyển hướng sang Preview Page. | FR-GEN-007 |
| **TC-GEN-011** | Tách nền và viền die-cut | Kiểm tra base64 đầu ra | Kênh Alpha trong suốt xung quanh nhân vật + có viền trắng die-cut. | FR-GEN-005, DEC-013 |
| **TC-GEN-012** | Tắt cấu hình tách nền | Cấu hình `ENABLE_BG_REMOVAL=false` | Trả về ảnh gốc chưa tách nền từ AI provider. | FR-GEN-008 |

### 4.6 Background Removal Pipeline (`TC-BGR`)

| ID | Tên ca kiểm thử | Các bước thực hiện | Kết quả mong đợi | Truy vết |
| --- | --- | --- | --- | --- |
| **TC-BGR-001** | rembg U-2-Net thành công | Chạy qua Stage 1 rembg | Tách sạch nền ngoài, giữ toàn vẹn nhân vật chibi. | DEC-013, SAD §4.2 |
| **TC-BGR-002** | Flood Fill Fallback | Giả lập rembg trả kết quả invalid (<5% hoặc >92% opaque) | Kích hoạt Stage 2 edge-connected flood fill, tách nền biên ngoài. | SAD §4.2 |
| **TC-BGR-003** | Fail-Safe Preservation | Cả Stage 1 và Stage 2 đều không đạt | Kích hoạt Stage 3 giữ ảnh gốc, không crash tiến trình. | SAD §4.2 |
| **TC-BGR-004** | Viền sticker die-cut chuẩn | Chạy qua Stage 4 `add_uniform_sticker_border` | Viền trắng mở rộng 6px–12px, mép viền làm mịn chống răng cưa. | SLA §6.1 |
| **TC-BGR-005** | Bảo toàn vùng sáng trong mắt/răng | Tách nền ảnh có mắt/răng màu sáng | Hàm `_preserve_interior_alpha` bảo toàn các lỗ/vùng bên trong nhân vật. | SAD §4.2 |
| **TC-BGR-006** | Kiểm tra tính hợp lệ Cutout | Kiểm tra diện tích pixel đục | Opaque pixels nằm trong khoảng [5%, 92%] diện tích ảnh. | SAD §4.2 |

### 4.7 Preview Page & Selection (`TC-PRV`)

| ID | Tên ca kiểm thử | Các bước thực hiện | Kết quả mong đợi | Truy vết SRS |
| --- | --- | --- | --- | --- |
| **TC-PRV-001** | Hiển thị lưới Preview | Vào Preview Page sau khi tạo xong | Grid hiển thị đủ 8 sticker, mặc định tất cả đều được tick chọn. | FR-PRV-001, FR-SEL-001 |
| **TC-PRV-002** | Bỏ chọn/chọn từng sticker | Bấm vào checkbox của sticker | Checkbox chuyển trạng thái, khung viền đổi màu active/inactive. | FR-SEL-001 |
| **TC-PRV-003** | Chọn tất cả (Select All) | Bấm nút "Select All" | Tất cả 8 sticker được đánh dấu chọn. | FR-SEL-002 |
| **TC-PRV-004** | Bỏ chọn tất cả (Deselect All) | Bấm nút "Deselect All" | Tất cả checkbox bị bỏ chọn, nút "Save Selected" bị disabled. | FR-SEL-002 |
| **TC-PRV-005** | Tạo lại (Regenerate) lần 1 & 2 | Bấm nút "Regenerate" | Kích hoạt tạo lại từ cùng ảnh nguồn, bộ đếm hiển thị "2 left" rồi "1 left". | FR-REG-001, DEC-012 |
| **TC-PRV-006** | Khóa Regenerate sau lần 3 | Thực hiện Regenerate đến lần thứ 3 | Tạo lại thành công, sau đó nút Regenerate bị disabled vĩnh viễn trong phiên. | FR-REG-002, AC-010 |
| **TC-PRV-007** | Mở menu báo cáo | Bấm menu ⋮ trên góc sticker → chọn "Report" | Mở ReportModal ứng với ID sticker tương ứng. | §2.4, FR-REP-001 |
| **TC-PRV-008** | Cảnh báo sticker bị lọc an toàn | Có sticker bị safety filtered | Hiển thị banner cảnh báo và slot filtered không cho phép chọn/lưu. | §2.4 |

### 4.8 Lưu trữ — Save Flow (`TC-SAV`)

| ID | Tên ca kiểm thử | Các bước thực hiện | Kết quả mong đợi | Truy vết SRS |
| --- | --- | --- | --- | --- |
| **TC-SAV-001** | Lưu danh sách đã chọn | Chọn 5/8 sticker, bấm "Save Selected (5)" | Lưu 5 blob vào IndexedDB, ghi metadata vào localStorage, chuyển sang Tray. | FR-SAV-001..004, AC-009 |
| **TC-SAV-002** | Ràng buộc chọn ≥ 1 sticker | Bỏ chọn toàn bộ sticker | Nút "Save Selected" bị disabled, không thể bấm lưu. | BR-006 |
| **TC-SAV-003** | Cấu trúc dữ liệu localStorage | Kiểm tra key `duhat_sticker_packs` | Mảng JSON chứa `{ id, createdAt, stickers: [...] }`, `imageBase64` được dọn rỗng. | FR-SAV-003 |
| **TC-SAV-004** | Cấu trúc dữ liệu IndexedDB | Kiểm tra DB `duhat_stickers`, store `images` | Chứa chính xác các key là `sticker.id` và value là base64 data URL. | FR-SAV-003 |
| **TC-SAV-005** | Xử lý khi bộ nhớ đầy | Giả lập lỗi IndexedDB QuotaExceededError | Hiển thị toast lỗi, giữ nguyên giao diện Preview để người dùng thử lại hoặc tải ZIP. | §5.2 |

### 4.9 Quản lý Tray Page (`TC-TRY`)

| ID | Tên ca kiểm thử | Các bước thực hiện | Kết quả mong đợi | Truy vết SRS |
| --- | --- | --- | --- | --- |
| **TC-TRY-001** | Danh sách các pack đã lưu | Mở Tray Page | Danh sách các pack hiển thị theo thứ tự thời gian mới nhất lên đầu. | §2.5 |
| **TC-TRY-002** | Thông tin tóm tắt pack | Kiểm tra card pack thu gọn | Hiển thị ảnh thumbnail đầu tiên, ngày giờ tạo, và số lượng stickers (VD: "8 stickers"). | §2.5 |
| **TC-TRY-003** | Mở rộng xem chi tiết pack | Bấm vào card pack | Mở rộng accordion/grid hiển thị đầy đủ các sticker kèm nút tải/xóa. | §2.5 |
| **TC-TRY-004** | Nút tạo mới (+) | Bấm nút Floating Action Button "+" | Điều hướng trực tiếp về Upload Page để tạo pack mới. | §2.5 |

### 4.10 Tải xuống & Xuất tệp (`TC-DL`)

| ID | Tên ca kiểm thử | Các bước thực hiện | Kết quả mong đợi | Truy vết SRS |
| --- | --- | --- | --- | --- |
| **TC-DL-001** | Tải sticker PNG đơn lẻ | Bấm menu ⋮ trên sticker → chọn "Download PNG" | Trình duyệt kích hoạt tải file `sticker_{expression}.png` chuẩn 512×512 transparent. | FR-DL-001, AC-011 |
| **TC-DL-002** | Xuất toàn bộ pack dạng ZIP | Bấm nút "Download Pack (ZIP)" | Thư viện JSZip đóng gói toàn bộ sticker đã composite chữ vào file `duhat_pack_{id}.zip` và tải xuống. | FR-DL-002, AC-012 |

### 4.11 Xóa dữ liệu (`TC-DEL`)

| ID | Tên ca kiểm thử | Các bước thực hiện | Kết quả mong đợi | Truy vết SRS |
| --- | --- | --- | --- | --- |
| **TC-DEL-001** | Xóa 1 sticker đơn lẻ | Bấm menu ⋮ → chọn "Delete" trên sticker | Xóa blob trong IndexedDB, xóa item khỏi pack trong localStorage, UI cập nhật tức thì. | FR-DEL-001 |
| **TC-DEL-002** | Xóa toàn bộ pack | Bấm "Delete Pack" → xác nhận modal confirm | Xóa toàn bộ blob liên quan trong IndexedDB và bản ghi pack trong localStorage. | FR-DEL-002, AC-013 |
| **TC-DEL-003** | Hủy xác nhận xóa pack | Bấm "Delete Pack" → bấm Cancel trong confirm dialog | Không có dữ liệu nào bị xóa, modal đóng lại. | FR-DEL-003 |
| **TC-DEL-004** | Tự động xóa pack khi hết sticker | Xóa lần lượt từng sticker cho đến khi pack rỗng | Khi sticker cuối cùng bị xóa, pack tự động biến mất khỏi Tray. | FR-DEL-002 |

### 4.12 Báo cáo vi phạm (`TC-RPT`)

| ID | Tên ca kiểm thử | Các bước thực hiện | Kết quả mong đợi | Truy vết SRS |
| --- | --- | --- | --- | --- |
| **TC-RPT-001** | Mở modal báo cáo | Bấm "Report Content" từ Preview hoặc Tray | ReportModal hiển thị với các tùy chọn danh mục vi phạm. | FR-REP-001, AC-014 |
| **TC-RPT-002** | 4 danh mục vi phạm chuẩn | Kiểm tra danh sách radio options | Gồm: `unauthorized_likeness`, `inappropriate_content`, `copyright_violation`, `other`. | FR-REP-002 |
| **TC-RPT-003** | Gửi báo cáo thành công | Chọn danh mục, nhập mô tả, bấm "Submit Report" | Ghi sự kiện analytics `sticker_reported`, hiển thị thông báo cảm ơn và đóng modal. | FR-REP-003 |

### 4.13 Đa ngôn ngữ — i18n (`TC-I18`)

| ID | Tên ca kiểm thử | Các bước thực hiện | Kết quả mong đợi | Truy vết SRS |
| --- | --- | --- | --- | --- |
| **TC-I18-001** | Chuyển đổi EN sang VI | Bấm toggle sang tiếng Việt | Tất cả nhãn, tiêu đề, thông báo lỗi chuyển sang tiếng Việt chuẩn xác. | DEC-011, AC-015 |
| **TC-I18-002** | Chuyển đổi VI sang EN | Bấm toggle sang tiếng Anh | Tất cả văn bản chuyển lại tiếng Anh chuẩn xác. | DEC-011, AC-015 |
| **TC-I18-003** | Tên 8 biểu cảm đa ngôn ngữ | Kiểm tra nhãn biểu cảm ở cả 2 ngôn ngữ | Hiển thị đúng: Happy / Vui vẻ, Laughing / Cười to, Love / Yêu thích, Sad / Buồn bã, Angry / Tức giận, Surprised / Bất ngờ, Thumbs Up / Đồng ý, Sleepy / Buồn ngủ. | DEC-007, DEC-011 |
| **TC-I18-004** | Thông báo lỗi validation theo ngôn ngữ | Kích hoạt lỗi validation khi đang chọn VI | Hiển thị câu thông báo tiếng Việt tương ứng theo mã lỗi (VD: "Vui lòng chọn ảnh chỉ có một người"). | DEC-011 |

---

## 5. Danh mục Ca kiểm thử API Contract

### 5.1 Health Check API (`TC-API-HEALTH`)

| ID | Endpoint | Method | Request Body | Kỳ vọng Status & Payload |
| --- | --- | --- | --- | --- |
| **TC-API-001** | `/api/health` | GET | Không | 200 OK, JSON: `{ "status": "ok", "provider": "gemini", "models": { "image": "...", "vision": "..." } }` |

### 5.2 Validation API (`TC-API-VAL`)

| ID | Endpoint | Method | Request Body | Kỳ vọng Status & Payload |
| --- | --- | --- | --- | --- |
| **TC-API-002** | `/api/validate` | POST | `{ "image_base64": "<valid_base64>", "mime_type": "image/jpeg" }` | 200 OK, `{ "valid": true, "details": { "face_count": 1, "has_clear_face": true, "image_quality": "good", "is_safe": true, "subject_type": "person" } }` |
| **TC-API-003** | `/api/validate` | POST | `{ "image_base64": "<multi_face_base64>", "mime_type": "image/jpeg" }` | 200 OK, `{ "valid": false, "error_code": "MULTIPLE_PEOPLE", "error_message": "..." }` |
| **TC-API-004** | `/api/validate` | POST | `{}` (Rỗng) | 422 Unprocessable Entity |
| **TC-API-005** | `/api/validate` | POST | `{ "image_base64": "...", "mime_type": "application/pdf" }` | 200 OK / 400 Bad Request, `{ "valid": false, "error_code": "INVALID_FORMAT" }` |

### 5.3 Generation SSE API (`TC-API-GEN`)

| ID | Endpoint | Method | Headers & Payload | Kỳ vọng Stream & Events |
| --- | --- | --- | --- | --- |
| **TC-API-006** | `/api/generate-pack` | POST | Content-Type: application/json<br>Payload: `{ "image_base64": "...", "mime_type": "image/jpeg" }` | Response Header: `Content-Type: text/event-stream`<br>Stream trả về 8 events `data: {...}` + 1 final event `data: {"done": true}` |
| **TC-API-007** | `/api/generate-pack` | POST | Event Payload Structure Check | Mỗi data chunk parse được JSON gồm: `expression_id`, `image_base64`, `success`, `filtered`. |
| **TC-API-008** | `/api/generate-pack` | POST | Final Termination Event | Sự kiện cuối cùng trả về `{"done": true}` và kết thúc kết nối stream. |
| **TC-API-009** | `/api/generate-pack` | POST | Payload rỗng `{}` | 422 Unprocessable Entity |

---

## 6. Danh mục Ca kiểm thử An toàn, Bảo mật & Quyền riêng tư (`TC-SAF`)

| ID | Tên ca kiểm thử | Kịch bản kiểm thử | Kết quả mong đợi | Truy vết |
| --- | --- | --- | --- | --- |
| **TC-SAF-001** | Chặn ảnh NSFW đầu vào | Gửi ảnh chứa nội dung khiêu dâm qua validation | Bị chặn tuyệt đối ở `/api/validate`, trả mã `UNSAFE_CONTENT`, không gọi sang pipeline tạo ảnh. | FR-VAL-003, §7.2 |
| **TC-SAF-002** | Chặn ảnh bạo lực / vũ khí | Gửi ảnh bạo lực qua validation | Bị chặn, trả `UNSAFE_CONTENT`. | FR-VAL-003, §7.2 |
| **TC-SAF-003** | Bắt cờ vi phạm đầu ra từ AI | Giả lập AI provider trả `finish_reason: SAFETY` hoặc `content_filter` | Hệ thống bắt cờ, gán `filtered: true`, không gửi ảnh về client. | FR-GEN-006, BR-005 |
| **TC-SAF-004** | Không lưu sticker bị filtered | Kiểm tra danh sách sticker cho phép lưu | Các sticker có cờ `filtered: true` bị loại bỏ khỏi danh sách lưu trữ. | BR-005 |
| **TC-SAF-005** | Bắt buộc Consent | Cố gắng gọi generate mà không thông qua consent trên giao diện | Client chặn luồng, không dispatch request. | BR-001, FR-CNS-001..003 |
| **TC-SAF-006** | Không lưu ảnh thô trên Server | Quét thư mục backend sau 100 lượt tạo | Không có file ảnh nguồn hoặc ảnh tạm nào lưu trên ổ đĩa server (chỉ xử lý in-memory). | SAD §7.1, SLA §7.1 |
| **TC-SAF-007** | Analytics không lộ dữ liệu nhạy cảm | Thu thập các analytics events phía client | Payload sự kiện không chứa base64, token, tên file hay ảnh. | FR-ANL-003, SAD §7.3 |

---

## 7. Danh mục Ca kiểm thử Hiệu năng & SLA (`TC-PRF`)

| ID | Chỉ số SLA | Điều kiện đo | Mục tiêu cam kết | Truy vết SLA |
| --- | --- | --- | --- | --- |
| **TC-PRF-001** | Độ trễ Validation (P50) | Đo thời gian phản hồi POST `/api/validate` (mẫu 20 requests) | P50 ≤ 5.0 giây | SLA §3.2 |
| **TC-PRF-002** | Độ trễ Validation (P95) | Đo thời gian phản hồi POST `/api/validate` (mẫu 20 requests) | P95 ≤ 8.0 giây | SLA §3.2 |
| **TC-PRF-003** | Độ trễ Generation hoàn tất 8 sticker (P50) | Đo thời gian từ khi gửi request đến khi nhận `{"done": true}` (mẫu 10 packs) | P50 ≤ 120 giây | SLA §3.3 |
| **TC-PRF-004** | Độ trễ Generation hoàn tất 8 sticker (P95) | Đo thời gian hoàn tất toàn bộ 8 sticker (mẫu 20 packs) | P95 ≤ 180 giây | SLA §3.3 |
| **TC-PRF-005** | Thời gian nhận SSE Event đầu tiên (P50) | Đo từ lúc gửi request đến khi nhận sticker đầu tiên | P50 ≤ 30 giây | SLA §3.3 |
| **TC-PRF-006** | Tỷ lệ thành công tạo pack (≥ 6/8 stickers) | Thống kê trên 20 lượt tạo pack | ≥ 90% số lượt tạo thành công từ 6 sticker trở lên | SLA §3.4 |
| **TC-PRF-007** | Tỷ lệ tạo trọn vẹn 8/8 stickers | Thống kê trên 20 lượt tạo pack | ≥ 75% số lượt tạo thành công đủ 8 sticker | SLA §3.4 |
| **TC-PRF-008** | Thời gian tách nền mỗi sticker (P95) | Đo thời gian chạy `remove_background_pipeline` | P95 ≤ 15 giây | SLA §3.5 |
| **TC-PRF-009** | Tỷ lệ tách nền hợp lệ | Đo tỷ lệ cutout không bị vỡ hoặc mất nhân vật | ≥ 85% kết quả tách nền đạt chuẩn | SLA §3.5 |
| **TC-PRF-010** | Tính sẵn sàng Health Check | Ping `GET /api/health` định kỳ | ≥ 99.0% phản hồi status 200 | SLA §3.1 |

---

## 8. Danh mục Ca kiểm thử Multi-Provider (`TC-MP`)

| ID | Provider kiểm thử | Biến môi trường | Kết quả mong đợi | Truy vết |
| --- | --- | --- | --- | --- |
| **TC-MP-001** | Gemini Provider Validation | `AI_PROVIDER=gemini` | Sử dụng Gemini Flash Vision, trả kết quả JSON hợp lệ. | DEC-008, SAD §3 |
| **TC-MP-002** | Gemini Provider Generation | `AI_PROVIDER=gemini` | Sinh ảnh qua `gemini-3.1-flash-image` thành công. | DEC-008, SAD §3 |
| **TC-MP-003** | OpenAI Provider Validation | `AI_PROVIDER=openai` | Sử dụng `gpt-4o-mini` Vision để kiểm tra ảnh. | DEC-008, SAD §3 |
| **TC-MP-004** | OpenAI Provider Generation | `AI_PROVIDER=openai` | Sinh ảnh qua `dall-e-3` thành công. | DEC-008, SAD §3 |
| **TC-MP-005** | Cloudflare Provider Validation | `AI_PROVIDER=cloudflare` | Sử dụng Llama 3.2 Vision trên Cloudflare Workers AI. | DEC-008, SAD §3 |
| **TC-MP-006** | Cloudflare Provider Generation | `AI_PROVIDER=cloudflare` | Sinh ảnh qua `flux-1-schnell` trên Cloudflare Workers AI. | DEC-008, SAD §3 |
| **TC-MP-007** | Chuyển đổi Provider không đổi Client | Đổi `AI_PROVIDER` trong `.env` | Giao diện và API client frontend hoạt động đồng nhất, không cần chỉnh sửa code. | SAD §1.2 |
| **TC-MP-008** | Khai báo Provider trên Health Check | Gọi `GET /api/health` | Trường `provider` phản ánh chính xác cấu hình hiện tại. | SAD §3 |

---

## 9. Ma trận Truy vết Yêu cầu SRS → Ca kiểm thử (Traceability Matrix)

| Mã yêu cầu SRS | Mã Ca kiểm thử TDD tương ứng |
| --- | --- |
| **FR-INP-001..003** (Đầu vào ảnh) | `TC-UPL-001`, `TC-UPL-002`, `TC-UPL-003`, `TC-UPL-006`, `TC-UPL-007`, `TC-SAF-006` |
| **FR-VAL-001..010** (Kiểm tra hợp lệ) | `TC-UPL-004`, `TC-UPL-005`, `TC-VAL-001` đến `TC-VAL-010`, `TC-API-002` đến `TC-API-005` |
| **FR-CNS-001..003** (Sự đồng ý) | `TC-CNS-001`, `TC-CNS-002`, `TC-CNS-003`, `TC-CNS-004`, `TC-SAF-005` |
| **FR-GEN-001..008** (Tạo sticker & SSE) | `TC-GEN-001` đến `TC-GEN-012`, `TC-API-006` đến `TC-API-009`, `TC-BGR-001` đến `TC-BGR-006` |
| **FR-PRV-001** (Hiển thị preview) | `TC-PRV-001`, `TC-PRV-008` |
| **FR-SEL-001..002** (Chọn/bỏ chọn) | `TC-PRV-002`, `TC-PRV-003`, `TC-PRV-004` |
| **FR-REG-001..002** (Tạo lại) | `TC-PRV-005`, `TC-PRV-006` |
| **FR-SAV-001..004** (Lưu trữ) | `TC-SAV-001`, `TC-SAV-002`, `TC-SAV-003`, `TC-SAV-004`, `TC-SAV-005` |
| **FR-DL-001..002** (Tải xuống) | `TC-DL-001`, `TC-DL-002` |
| **FR-DEL-001..003** (Xóa dữ liệu) | `TC-DEL-001`, `TC-DEL-002`, `TC-DEL-003`, `TC-DEL-004` |
| **FR-REP-001..003** (Báo cáo vi phạm) | `TC-RPT-001`, `TC-RPT-002`, `TC-RPT-003`, `TC-PRV-007` |
| **FR-ANL-001..003** (Phân tích) | `TC-SAF-007`, `TC-RPT-003` |
| **BR-001..008** (Quy tắc nghiệp vụ) | `TC-CNS-003`, `TC-VAL-001`, `TC-GEN-005`, `TC-GEN-006`, `TC-SAF-003`, `TC-SAV-002`, `TC-PRV-006` |
| **SLA §3.1..3.5** (Mức dịch vụ) | `TC-PRF-001` đến `TC-PRF-010` |
| **DEC-001..017** (Các quyết định chốt) | `TC-GEN-004` đến `TC-GEN-006`, `TC-GEN-011`, `TC-I18-001` đến `TC-I18-004`, `TC-MP-001` đến `TC-MP-008` |
| **AC-001..015** (Tiêu chí chấp nhận) | `TC-LND-001`, `TC-VAL-001`, `TC-VAL-002`, `TC-VAL-007`, `TC-UPL-004`, `TC-CNS-003`, `TC-GEN-004`, `TC-GEN-007`, `TC-SAV-001`, `TC-PRV-006`, `TC-DL-001`, `TC-DL-002`, `TC-DEL-002`, `TC-RPT-001`, `TC-I18-001` |

---

## 10. Tiêu chí Đạt/Không đạt & Hoàn thành Kiểm thử

### 10.1 Phân loại mức độ nghiêm trọng của Ca kiểm thử

| Mức độ | Định nghĩa | Danh sách Ca kiểm thử |
| --- | --- | --- |
| **Critical (Khẩn cấp)** | Lỗi an toàn, quyền riêng tư, rò rỉ dữ liệu, hoặc chặn luồng tạo sticker chính. | `TC-SAF-001`..`007`, `TC-CNS-001`..`004`, `TC-GEN-001`..`004`, `TC-API-006`..`008` |
| **High (Cao)** | Lỗi kiểm tra ảnh, mất dữ liệu lưu trữ, lỗi tải file, hoặc lỗi API endpoint. | `TC-VAL-001`..`010`, `TC-SAV-001`..`004`, `TC-DEL-001`..`004`, `TC-DL-001`..`002`, `TC-API-001`..`005` |
| **Medium (Trung bình)** | Lỗi hiệu năng vượt ngưỡng SLA nhẹ, sai sót giao diện i18n, hoặc lỗi tách nền fallback. | `TC-PRF-001`..`010`, `TC-I18-001`..`004`, `TC-BGR-001`..`006`, `TC-PRV-005`..`006` |
| **Low (Thấp)** | Lỗi thẩm mỹ UI nhỏ, animation không mượt, hoặc ghi nhận analytics thiếu trường phụ. | `TC-LND-001`..`004`, `TC-TRY-001`..`004`, `TC-MP-007`..`008` |

### 10.2 Tiêu chí Hoàn thành (Exit Criteria) cho Bản phát hành V1

1. **100% ca kiểm thử Critical và High đều PASS**.
2. **Tối đa ≤ 3 ca kiểm thử Medium bị lỗi** và phải có giải pháp khắc phục (workaround) được chấp thuận.
3. Không có lỗi gây treo ứng dụng (crash/unhandled exception) ở cả Frontend và Backend.
4. Đạt các chỉ số SLA cốt lõi: Tỷ lệ tạo thành công ≥ 90%, thời gian phản hồi Health Check 200.
5. Toàn bộ tài liệu bàn giao và báo cáo kiểm thử được ký duyệt.