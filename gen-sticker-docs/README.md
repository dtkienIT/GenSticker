# GenSticker Project Documentation

Bộ tài liệu này mô tả **source code hiện tại** của GenSticker trên branch `kien_v5`, lấy snapshot nền `4d23b9a` cùng các thay đổi gate ảnh/documentation đang có trong working tree, được rà soát ngày 2026-08-10.

## Kết quả hiện tại

- 12 tài liệu Office: 6 DOCX và 6 XLSX.
- 20 sơ đồ kỹ thuật được dựng mới từ source code, lưu đồng thời dưới dạng SVG editable và PNG để nhúng vào Word/Excel.
- Cả 12 tài liệu đã có section/sheet riêng về gate ảnh đúng một khuôn mặt; 15 figure chịu ảnh hưởng đã được cập nhật để thể hiện bước MediaPipe, nhánh pass/reject và ranh giới client/backend.
- Board vector chuẩn của lần cập nhật này là [`assets/figures/figma-board.svg`](./assets/figures/figma-board.svg), chứa đủ 20 sơ đồ có thể chỉnh sửa. [Documentation Diagrams – Web v5 trên Figma](https://www.figma.com/design/RZJ594RY1AAAPEHm30vWfb/GenSticker-%E2%80%93-Mobile-MVP-UI-UX?node-id=42-2&p=f) là board tham chiếu trước đó và không tự đồng bộ khi builder cục bộ chạy.
- Trang documentation hub trên web hiển thị nội dung, sơ đồ, chú thích, nguồn đối chiếu và cho tải file Office gốc.
- Các workbook có bảng Excel thực, freeze pane, filter, conditional formatting; PRD, Backlog và TDD có dashboard/chart liên kết dữ liệu bằng công thức.
- Gate mới dùng `@mediapipe/tasks-vision@1.0.1` và BlazeFace short-range trong Web Worker, chạy trên CPU/WASM của thiết bị, không cần GPU server hoặc API thị giác trả phí khi frontend triển khai trên Vercel Free.

## Nguyên tắc nguồn

- ZIP mẫu chỉ được dùng để tham khảo cách đánh số, phân nhóm DOCX/XLSX và nhịp trình bày.
- Không sao chép nội dung, ảnh, sơ đồ hay dữ liệu của dự án mẫu.
- Không dùng ảnh AI, không dùng ảnh người dùng và không đưa dữ liệu base64/runtime Telegram vào tài liệu.
- Không đọc hoặc đưa secret từ `.env` vào tài liệu.
- Mọi mô tả kỹ thuật đều được đối chiếu với code, test và cấu hình có trong repository.
- Mọi mô tả gate đều dùng đúng phạm vi **“đúng một khuôn mặt được BlazeFace phát hiện”**; không suy diễn thành đúng một người, xác minh danh tính hay liveness.
- Gate là kiểm soát UX phía trình duyệt. Ảnh bị từ chối không đi vào generation trong luồng web chuẩn, nhưng người gọi trực tiếp API backend có thể bypass vì backend chưa có semantic face gate.
- Những phần chưa được version-control, như base schema/RLS/bucket policy của Supabase, được đánh dấu là **inferred**, **gap** hoặc **recommended**, không mô tả như đã triển khai.

## Danh mục

| STT | File | Visual chính |
|---:|---|---|
| 01 | Project Charter (DOCX) | Luồng giá trị có gate ảnh trước pack 20 sticker |
| 02 | Product Requirements Document (XLSX) | User journey qua face gate + dashboard requirement |
| 03 | Software Requirements Specification (DOCX) | System boundary + nhánh pass/reject + job state machine |
| 04 | Software Architecture & Technical Design (XLSX) | Browser worker, runtime sequence + pipeline 5 giai đoạn |
| 05 | Implementation Backlog & Sprint Plan (XLSX) | Roadmap Now/Next/Later + dashboard priority |
| 06 | UI/UX Specification & Screen Flow (XLSX) | Trạng thái kiểm tra 0/1/nhiều mặt + docs hub responsive |
| 07 | Test-Driven Development (XLSX) | Face-gate matrix + quality gates + coverage dashboard |
| 08 | Database Schema & RLS (XLSX) | ERD as-is + ownership/RLS + data lifecycle |
| 09 | Input Validation Summary (DOCX) | Validation boundary MediaPipe từ browser đến provider |
| 10 | Output Quality Scoring Spec (DOCX) | Kế hoạch 3 sheet + quality decision flow |
| 11 | Source Code, Security & Operations Guide (DOCX) | Runtime/repository map + client-bypass risk/control map |
| 12 | Service Level Agreement – SLA (DOCX) | Gate miễn phí/no-GPU + chi phí generation + giới hạn hệ thống |

File Office nằm trong [`originals`](./originals). Manifest dùng chung cho web và các builder nằm ở [`project-docs.json`](./project-docs.json). Bộ visual nằm trong [`assets/figures`](./assets/figures).

## Gate ảnh đúng một khuôn mặt

- Frontend chuyển `ImageBitmap` sang Web Worker; BlazeFace chạy ở `IMAGE` mode trên CPU/WASM với confidence `0.6`, suppression `0.3` và timeout 45 giây.
- Chỉ `faceCount === 1` được giữ làm input. Kết quả 0 mặt, nhiều mặt, lỗi model/worker, trình duyệt không hỗ trợ hoặc timeout đều fail closed trước generation trong UI chuẩn.
- Model TFLite nằm cùng origin; WASM dùng URL jsDelivr đã ghim `@mediapipe/tasks-vision@1.0.1`. Bước này không cần GPU Vercel và không gọi Gemini/DeepSeek hay API thị giác trả phí.
- Backend vẫn kiểm tra JWT, MIME/format, 15 MB, 40 triệu pixel và khả năng giải mã, nhưng chưa đếm khuôn mặt. Vì thế direct API caller có thể bypass gate; detector cũng không chứng minh danh tính, liveness hoặc số người toàn ảnh.

## Database Schema & RLS

Tài liệu số 08 cố ý tách ba mức bằng chứng:

- **As-is:** `auth.users → sticker_packs → stickers`, cùng liên kết lỏng từ `stickers.image_url` sang Storage.
- **Chưa chứng minh từ repo:** base DDL, foreign key, `ENABLE RLS`, policy và bucket policy.
- **Target đề xuất:** owner-bound policy, service-only writes, private object path/signed URL và vòng đời xoá object.

Do backend hiện ưu tiên Supabase service-role, sơ đồ RLS cũng thể hiện rõ service-role có thể bypass policy; owner filter của backend đang là lớp kiểm soát quan trọng.

## Build và đồng bộ

Chạy từ root repository:

```powershell
node gen-sticker-docs\_build\build_figures.mjs
python gen-sticker-docs\_build\enrich_manifest.py
python gen-sticker-docs\_build\build_docx.py
# build_xlsx.mjs dùng bundled artifact-tool runtime của Codex
node gen-sticker-docs\_build\build_xlsx.mjs
python gen-sticker-docs\_build\sync_public.py
npm.cmd --prefix frontend run build
```

Thứ tự trên là bắt buộc: dựng lại 20 SVG/PNG và board trước, enrich manifest, dựng 6 DOCX + 6 XLSX, rồi mới đồng bộ và build web. `sync_public.py` sao chép manifest, figures và 12 file Office sang `frontend/public/gen-sticker-docs`, đồng thời kiểm tra hash để tránh bản web lệch bản gốc.

## Xác minh

- Backend: `75 passed`; test dùng fake provider/mock và không gọi API ảnh trả phí.
- Frontend: `npm run lint` và `npm run build` đều đạt.
- Face-gate browser QA bao phủ đủ ba kết quả: 0 mặt bị chặn, đúng 1 mặt được nhận và nhiều mặt bị chặn; layout mobile 375×667 không tràn ngang.
- Khi phát hành tài liệu, phải render và kiểm tra **mọi trang của cả 6 DOCX** cùng **mọi worksheet của cả 6 XLSX**, gồm sheet face gate mới, visual PNG và lớp fallback bằng cell cho renderer không hỗ trợ worksheet drawing.
- Manifest phải có đúng 12 tài liệu/20 figure; SVG/PNG, file Office gốc và bản dưới `frontend/public/gen-sticker-docs` phải khớp hash sau `sync_public.py`.
- Chưa có frontend component/E2E test hoặc CI workflow trong repository.

## Xem trên web

Trong ứng dụng, chọn **Xem tài liệu** ở header. Trang tài liệu hỗ trợ lọc tài liệu, xem sơ đồ, mở toàn màn hình, mở board Figma nguồn và tải DOCX/XLSX gốc. Trên mobile, danh sách file có vùng cuộn riêng để nội dung tài liệu không bị đẩy quá xa xuống dưới.
