# Cam kết mức dịch vụ nội bộ (SLA) — Duhat Gen Sticker V1

## 0. Kiểm soát tài liệu

| Trường | Giá trị |
| --- | --- |
| Mã tài liệu | SLA-DGS-V1 |
| Phiên bản | 1.0 |
| Ngày chốt chuẩn | 18/08/2026 |
| Sản phẩm | Duhat Gen Sticker — ứng dụng web full-stack |
| Phạm vi môi trường | Môi trường phát triển/tiền sản xuất V1 |
| Múi giờ vận hành | `Asia/Ho_Chi_Minh` (UTC+7) |
| Nguồn yêu cầu | `SRS_Sticker_Generation_V1_VI.md` v1.0 |
| Nguồn kiến trúc | `Software_Architecture_Technical_Design.md` v1.0 |
| Trạng thái | Chuẩn vận hành nội bộ |

Tài liệu này là SLA nội bộ cho MVP miễn phí, dùng để vận hành, đo lường và quyết
định phát hành. Đây không phải hợp đồng thương mại.

### 0.1 Thứ tự ưu tiên

1. PRD là nguồn sản phẩm bất biến.
2. SRS chốt yêu cầu và giá trị mục tiêu.
3. Kiến trúc quy định cách hiện thực.
4. SLA này quy định cách đo, báo cáo và xử lý khi không đạt.
5. TDD quy định bằng chứng xác minh.

## 1. Mục đích và phạm vi

### 1.1 Dịch vụ nằm trong SLA

- Backend FastAPI: `/api/health`, `/api/validate`, `/api/generate-pack`.
- AI validation pipeline (Gemini/OpenAI/Cloudflare).
- Sticker generation pipeline: 8 tác vụ song song + SSE streaming.
- Background removal pipeline (rembg U-2-Net).
- Frontend Vite React: wizard flow, lưu trữ IndexedDB/localStorage.

### 1.2 Ranh giới và trường hợp không thuộc SLA

- Mạng, thiết bị, dung lượng trình duyệt, quyền camera do người dùng kiểm soát.
- Thời gian phản hồi của AI providers bên thứ ba (Gemini/OpenAI/Cloudflare).
- Trình duyệt không hỗ trợ IndexedDB hoặc getUserMedia.
- Yêu cầu sai format, vượt kích thước tệp hoặc bị safety filter từ chối đúng thiết kế.

## 2. Thuật ngữ

| Thuật ngữ | Định nghĩa |
| --- | --- |
| SLA | Cam kết nội bộ về mức dịch vụ. |
| SLO | Giá trị mục tiêu cụ thể. |
| SLI | Chỉ số thực đo. |
| Tháng | Tháng dương lịch theo UTC. |

## 3. Mức dịch vụ cam kết

### 3.1 Tính sẵn sàng API

| SLI | Mục tiêu |
| --- | --- |
| Backend `/api/health` phản hồi 200 | ≥ 99.0% thời gian hoạt động mỗi tháng |
| Điểm kiểm tra | GET `/api/health` |

### 3.2 Độ trễ Validation

| SLI | Mục tiêu |
| --- | --- |
| Thời gian phản hồi POST `/api/validate` (P95) | ≤ 8 giây |
| Thời gian phản hồi POST `/api/validate` (P50) | ≤ 5 giây |

### 3.3 Độ trễ Generation

| SLI | Mục tiêu |
| --- | --- |
| Thời gian hoàn thành toàn bộ 8 sticker (P95) | ≤ 180 giây |
| Thời gian hoàn thành toàn bộ 8 sticker (P50) | ≤ 120 giây |
| Thời gian SSE event đầu tiên (P50) | ≤ 30 giây |

### 3.4 Tỷ lệ thành công

| SLI | Mục tiêu |
| --- | --- |
| Tỷ lệ tạo thành công (≥ 6/8 sticker) | ≥ 90% số tác vụ |
| Tỷ lệ tạo thành công hoàn chỉnh (8/8 sticker) | ≥ 75% số tác vụ |
| Tỷ lệ validation thành công (ảnh hợp lệ) | ≥ 95% phản hồi không lỗi hệ thống |

### 3.5 Background Removal

| SLI | Mục tiêu |
| --- | --- |
| Tỷ lệ tách nền thành công (cutout valid 5%–92%) | ≥ 85% |
| Thời gian tách nền mỗi sticker (P95) | ≤ 15 giây |

## 4. Bảo trì có kế hoạch

| Điều kiện | Giá trị |
| --- | --- |
| Thông báo trước | ≥ 24 giờ |
| Cửa sổ bảo trì ưu tiên | 02:00–06:00 UTC+7 (ngoài giờ cao điểm) |
| Thời lượng tối đa mỗi lần | 2 giờ |
| Số lần tối đa mỗi tháng | 4 lần |

Bảo trì có kế hoạch được trừ khỏi tính sẵn sàng.

## 5. Phân loại sự cố

| Mức độ | Mô tả | Phản ứng | Khôi phục |
| --- | --- | --- | --- |
| P1 — Nghiêm trọng | API hoàn toàn không phản hồi; mất dữ liệu người dùng | ≤ 15 phút | ≤ 2 giờ |
| P2 — Cao | Generation thất bại 100%; validation lỗi hệ thống | ≤ 30 phút | ≤ 4 giờ |
| P3 — Trung bình | Một provider lỗi (có thể chuyển provider); BG removal thất bại cao | ≤ 2 giờ | ≤ 8 giờ |
| P4 — Thấp | UI bug không chặn luồng chính; i18n thiếu key | ≤ 1 ngày làm việc | ≤ 3 ngày làm việc |

## 6. Chất lượng đầu ra

### 6.1 Sticker Output Quality

| Tiêu chí | Mục tiêu |
| --- | --- |
| Giữ nhận diện khuôn mặt (subjective) | ≥ 80% người dùng đánh giá "giống" |
| Đường cắt nền sạch sẽ | Không có vùng nền sót ≥ 10% diện tích |
| Viền die-cut đều | Viền trắng ≥ 6px, ≤ 12px đều quanh character |
| Phong cách nhất quán trong 1 pack | 8 sticker cùng chibi style |

### 6.2 An toàn nội dung

| Tiêu chí | Mục tiêu |
| --- | --- |
| Tỷ lệ chặn NSFW/bạo lực đầu vào | 100% (zero-tolerance) |
| Tỷ lệ safety filter đầu ra bắt đúng | ≥ 95% |
| False positive rate (ảnh an toàn bị chặn sai) | ≤ 5% |

## 7. Lưu trữ và Quyền riêng tư

### 7.1 Thời hạn lưu trữ

| Dữ liệu | Nơi lưu | Thời hạn |
| --- | --- | --- |
| Ảnh nguồn (base64) | Bộ nhớ tạm server | Chỉ trong thời gian request (seconds) |
| Sticker đầu ra | IndexedDB phía client | Cho tới khi người dùng xóa |
| Pack metadata | localStorage phía client | Cho tới khi người dùng xóa |
| Analytics events | In-memory client | Mất khi refresh page |
| Server logs | stdout/file | 30 ngày rolling |

### 7.2 Xóa dữ liệu

| Thao tác | SLA |
| --- | --- |
| Xóa sticker đơn → IndexedDB | Ngay lập tức |
| Xóa pack → IndexedDB + localStorage | Ngay lập tức |
| Clear browser data → tất cả sticker | Ngay lập tức (trình duyệt quản lý) |

## 8. Khả năng phục hồi

### 8.1 Backend

| Tình huống | Hành vi |
| --- | --- |
| Server restart | Uvicorn tự khởi động lại; SSE connections hiện tại bị mất |
| AI provider timeout | Trả error trong SSE event; client có thể Cancel/Retry |
| rembg model chưa tải | Tự tải u2net.onnx khi request đầu tiên |

### 8.2 Frontend

| Tình huống | Hành vi |
| --- | --- |
| Page refresh trong lúc Generate | Mất tiến trình (SSE bị ngắt); quay lại Upload |
| IndexedDB full | Save thất bại; preview vẫn hiện để thử lại |
| Offline | Tray hiện pack từ localStorage metadata; ảnh không tải được từ IndexedDB |

## 9. Giám sát và Báo cáo

### 9.1 Health Check

- `GET /api/health` trả: `status`, `provider`, `models.image`, `models.vision`.
- Cần kiểm tra mỗi 1 phút từ monitoring bên ngoài.

### 9.2 Logging

- Backend: Python logging → stdout, level INFO.
- Format: `[expression_id] Raw image base64 length: {len}`.
- Không log: base64 data, file paths, API keys.

### 9.3 Metrics cần theo dõi

| Metric | Nguồn | Tần suất |
| --- | --- | --- |
| API response time | Server logs | Mỗi request |
| Generation success rate | SSE events count | Mỗi tác vụ |
| BG removal success rate | Server logs | Mỗi sticker |
| Provider error rate | Server error logs | Real-time |
| Client analytics events | In-memory (dev) | On-demand |

## 10. Thay đổi và Duyệt

- Thay đổi SLA yêu cầu cập nhật SRS nếu ảnh hưởng yêu cầu.
- Mỗi thay đổi phải có: ID, mô tả, ảnh hưởng, người phê duyệt, ngày hiệu lực.
- Không nới lỏng tiêu chí an toàn, quyền riêng tư hoặc chất lượng đầu ra.
