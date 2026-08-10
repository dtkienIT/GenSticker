# GenSticker Project Documentation

Bộ tài liệu này mô tả **source code hiện tại** của GenSticker trên branch `kien_v5`, snapshot `c09e26a` cùng các thay đổi documentation hub đang có trong working tree, được rà soát ngày 2026-08-09.

## Kết quả hiện tại

- 12 tài liệu Office: 6 DOCX và 6 XLSX.
- 20 sơ đồ kỹ thuật được dựng mới từ source code, lưu đồng thời dưới dạng SVG editable và PNG để nhúng vào Word/Excel.
- Một board Figma riêng chứa toàn bộ 20 sơ đồ ở dạng vector có thể chỉnh sửa: [Documentation Diagrams – Web v5](https://www.figma.com/design/RZJ594RY1AAAPEHm30vWfb/GenSticker-%E2%80%93-Mobile-MVP-UI-UX?node-id=42-2&p=f).
- Trang documentation hub trên web hiển thị nội dung, sơ đồ, chú thích, nguồn đối chiếu và cho tải file Office gốc.
- Các workbook có bảng Excel thực, freeze pane, filter, conditional formatting; PRD, Backlog và TDD có dashboard/chart liên kết dữ liệu bằng công thức.

## Nguyên tắc nguồn

- ZIP mẫu chỉ được dùng để tham khảo cách đánh số, phân nhóm DOCX/XLSX và nhịp trình bày.
- Không sao chép nội dung, ảnh, sơ đồ hay dữ liệu của dự án mẫu.
- Không dùng ảnh AI, không dùng ảnh người dùng và không đưa dữ liệu base64/runtime Telegram vào tài liệu.
- Không đọc hoặc đưa secret từ `.env` vào tài liệu.
- Mọi mô tả kỹ thuật đều được đối chiếu với code, test và cấu hình có trong repository.
- Những phần chưa được version-control, như base schema/RLS/bucket policy của Supabase, được đánh dấu là **inferred**, **gap** hoặc **recommended**, không mô tả như đã triển khai.

## Danh mục

| STT | File | Visual chính |
|---:|---|---|
| 01 | Project Charter (DOCX) | Luồng giá trị từ selfie đến pack 20 sticker |
| 02 | Product Requirements Document (XLSX) | User journey + dashboard trạng thái requirement |
| 03 | Software Requirements Specification (DOCX) | System boundary + job state machine |
| 04 | Software Architecture & Technical Design (XLSX) | System context + runtime sequence + pipeline 5 giai đoạn |
| 05 | Implementation Backlog & Sprint Plan (XLSX) | Roadmap Now/Next/Later + dashboard priority |
| 06 | UI/UX Specification & Screen Flow (XLSX) | Screen flow + layout documentation hub responsive |
| 07 | Test-Driven Development (XLSX) | Quality gates + coverage map + test dashboard |
| 08 | Database Schema & RLS (XLSX) | ERD as-is + ownership/RLS + data lifecycle |
| 09 | Input Validation Summary (DOCX) | Validation boundary từ browser đến provider |
| 10 | Output Quality Scoring Spec (DOCX) | Kế hoạch 3 sheet + quality decision flow |
| 11 | Source Code, Security & Operations Guide (DOCX) | Runtime/repository map + risk/control map |
| 12 | Service Level Agreement – SLA (DOCX) | Chi phí/token tiêu thụ + giới hạn hệ thống + monitoring roadmap |

File Office nằm trong [`originals`](./originals). Manifest dùng chung cho web và các builder nằm ở [`project-docs.json`](./project-docs.json). Bộ visual nằm trong [`assets/figures`](./assets/figures).

## Database Schema & RLS

Tài liệu số 08 cố ý tách ba mức bằng chứng:

- **As-is:** `auth.users → sticker_packs → stickers`, cùng liên kết lỏng từ `stickers.image_url` sang Storage.
- **Chưa chứng minh từ repo:** base DDL, foreign key, `ENABLE RLS`, policy và bucket policy.
- **Target đề xuất:** owner-bound policy, service-only writes, private object path/signed URL và vòng đời xoá object.

Do backend hiện ưu tiên Supabase service-role, sơ đồ RLS cũng thể hiện rõ service-role có thể bypass policy; owner filter của backend đang là lớp kiểm soát quan trọng.

## Build và đồng bộ

Chạy từ root repository:

```powershell
python gen-sticker-docs\_build\enrich_manifest.py
python gen-sticker-docs\_build\build_docx.py
# build_xlsx.mjs dùng bundled artifact-tool runtime của Codex
python gen-sticker-docs\_build\sync_public.py
```

`sync_public.py` sao chép manifest, figures và 12 file Office sang `frontend/public/gen-sticker-docs`, đồng thời kiểm tra hash để tránh bản web lệch bản gốc.

## Xác minh

- Backend: `75 passed`; test dùng fake provider/mock và không gọi API ảnh trả phí.
- Frontend: `npm run lint` và `npm run build` đều đạt.
- 78 worksheet đã được render để kiểm tra layout; 12 visual sheet có cả sơ đồ PNG đầy đủ và lớp fallback bằng cell để vẫn đọc được trong renderer không hỗ trợ worksheet drawing. Sáu workbook cũng được mở lại bằng Excel để xác nhận package hợp lệ.
- 5 DOCX được kiểm tra package/relationship và render đủ 30/30 trang bằng WPS + Poppler. Word mở được file nhưng thao tác xuất PDF native bị treo, vì vậy không tuyên bố Word-native export đã đạt.
- Chưa có frontend component/E2E test hoặc CI workflow trong repository.

## Xem trên web

Trong ứng dụng, chọn **Xem tài liệu** ở header. Trang tài liệu hỗ trợ lọc tài liệu, xem sơ đồ, mở toàn màn hình, mở board Figma nguồn và tải DOCX/XLSX gốc. Trên mobile, danh sách file có vùng cuộn riêng để nội dung tài liệu không bị đẩy quá xa xuống dưới.
