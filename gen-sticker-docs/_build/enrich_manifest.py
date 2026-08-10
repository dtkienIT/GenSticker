from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "project-docs.json"
FIGURE_INDEX = ROOT / "assets" / "figures" / "index.json"


FIGURE_DETAILS = {
    "value-flow": {
        "caption": "Dòng giá trị MVP từ upload chân dung đến bộ 20 sticker và các kênh sử dụng.",
        "alt": "Sơ đồ năm bước gồm Upload, Giữ danh tính, Sinh biểu cảm, Kiểm thử và Sử dụng; ba khối dưới nêu giá trị, điểm kiểm soát và giới hạn hiện tại.",
        "sourceRefs": ["backend/app/services/sticker_pipeline.py", "backend/sticker_generation/grouped.py", "frontend/src/App.tsx"],
    },
    "user-journey": {
        "caption": "Happy path và nhánh rejected của CTA Thử Lại Ngay trong UI hiện tại.",
        "alt": "Luồng từ chọn ảnh, xác thực, tạo job, polling đến gallery; nhánh validation rejected reset về upload, còn retry API backend được đánh dấu chưa nối UI.",
        "sourceRefs": ["frontend/src/App.tsx", "frontend/src/hooks/useStickerGenerator.ts", "frontend/src/services/stickerService.ts"],
    },
    "system-boundary": {
        "caption": "Actor và ranh giới giữa code GenSticker với Supabase, Image API và Telegram.",
        "alt": "Người dùng và nhà vận hành tương tác với React, FastAPI và generation core bên trong GenSticker; ba dịch vụ ngoài nằm bên phải.",
        "sourceRefs": ["backend/app/main.py", "backend/app/api/router.py", "frontend/src/App.tsx"],
    },
    "job-state": {
        "caption": "State machine frontend và nhánh retry backend chưa được nối với CTA hiện tại.",
        "alt": "Idle chuyển processing rồi completed hoặc error; từ error, Thử Lại Ngay quay về idle; retry backend là đường nét đứt.",
        "sourceRefs": ["frontend/src/hooks/useStickerGenerator.ts", "frontend/src/App.tsx", "backend/app/services/sticker_pipeline.py"],
    },
    "system-context": {
        "caption": "Component topology runtime và các external trust boundaries.",
        "alt": "Browser gọi React, React gọi FastAPI; FastAPI điều phối grouped generator, RAM/temp, Supabase, Image API và Telegram.",
        "sourceRefs": ["backend/app/main.py", "backend/app/services/sticker_pipeline.py", "backend/sticker_generation/grouped.py"],
    },
    "generation-sequence": {
        "caption": "Sequence bốn image request, structural QA, polling và persistence best-effort.",
        "alt": "Swimlane từ Browser qua FastAPI, Pipeline, Image API, Quality và Supabase; gồm canonical, ba sheet, crop và poll kết quả.",
        "sourceRefs": ["backend/sticker_generation/grouped.py", "backend/sticker_generation/providers/openai_image.py", "backend/app/services/sticker_pipeline.py"],
    },
    "pipeline-five-stage": {
        "caption": "Năm giai đoạn user-facing và artifact được tạo ở từng mốc.",
        "alt": "Normalize, Canonical, Three sheets, Structural QA và Postprocess; bên dưới là artifact, decision và delivery.",
        "sourceRefs": ["backend/app/services/sticker_pipeline.py", "backend/sticker_generation/identity.py", "backend/sticker_generation/postprocess.py"],
    },
    "roadmap-now-next-later": {
        "caption": "Roadmap đề xuất theo mức độ rủi ro và phụ thuộc kỹ thuật.",
        "alt": "Ba cột Now, Next, Later lần lượt chứa các hạng mục dữ liệu, credentials, durable jobs, schema RLS, test, observability và QA.",
        "sourceRefs": ["backend/data/pending_telegram_packs.json", "frontend/src/services/authService.ts", "backend/migrations/001_add_sticker_pack_soft_delete.sql"],
    },
    "screen-flow": {
        "caption": "Bản đồ view, overlay và chuyển trạng thái chính của ứng dụng web.",
        "alt": "Upload nối Auth modal và Processing; kết quả sang Gallery hoặc Rejected; Gallery mở History/Telegram; header mở Docs hub.",
        "sourceRefs": ["frontend/src/App.tsx", "frontend/src/components", "frontend/src/hooks/useStickerGenerator.ts"],
    },
    "docs-hub-layout": {
        "caption": "Bố cục Documentation Hub trên desktop và mobile.",
        "alt": "Desktop gồm sidebar và viewer; mobile xếp hero, document picker và viewer theo chiều dọc với visual có thể mở rộng.",
        "sourceRefs": ["frontend/src/components/docs/DocumentationPage.tsx", "frontend/src/components/docs/DocumentationPage.css"],
    },
    "quality-gates": {
        "caption": "Chuỗi kiểm tra source, Office artifact và browser trước bàn giao.",
        "alt": "Năm bước Backend, Frontend, Docs build, Visual QA và Browser QA; bên dưới là pass criteria, manual boundary và gaps.",
        "sourceRefs": ["backend/app/tests", "backend/sticker_generation/tests", "frontend/package.json"],
    },
    "coverage-map": {
        "caption": "Phân bổ 75 backend test cases và các vùng chưa được tự động hóa.",
        "alt": "Sáu nhóm test backend ở trái và ba nhóm coverage gap ở phải, gồm frontend, external integration và non-functional.",
        "sourceRefs": ["backend/app/tests", "backend/sticker_generation/tests", "frontend/package.json"],
    },
    "data-model": {
        "caption": "ERD as-is phân biệt field đã dùng trong code, field suy ra và khoảng trống DDL/RLS.",
        "alt": "Auth users liên hệ semantic một-nhiều với sticker_packs; sticker_packs một-nhiều stickers; stickers trỏ lỏng tới storage; EphemeralJob nằm ngoài PostgreSQL.",
        "sourceRefs": ["backend/app/services/supabase_service.py", "backend/migrations/001_add_sticker_pack_soft_delete.sql", "frontend/src/services/stickerService.ts"],
    },
    "rls-owner-flow": {
        "caption": "Owner isolation hiện tại so với mô hình RLS và private storage khuyến nghị.",
        "alt": "Bên trái JWT, owner filters và service-role; bên phải sticker_packs RLS, stickers RLS, private storage và migrations.",
        "sourceRefs": ["backend/app/security.py", "backend/app/services/supabase_service.py", "backend/app/database.py"],
    },
    "data-lifecycle": {
        "caption": "Vòng đời selfie, temp artifacts, output history và soft delete.",
        "alt": "Năm bước Upload, Generate, Persist, History và Soft delete; ba callout mô tả nguồn selfie, temp artifact và target lifecycle.",
        "sourceRefs": ["backend/app/api/stickers.py", "backend/app/services/sticker_pipeline.py", "backend/app/services/supabase_service.py"],
    },
    "validation-boundaries": {
        "caption": "Các lớp validation từ browser đến decode response của provider.",
        "alt": "Năm bước Browser, FastAPI, Sanitize, Provider guard và Decode; bên dưới nêu safe rejection, gap và privacy boundary.",
        "sourceRefs": ["frontend/src/hooks/useImageUpload.ts", "backend/app/api/stickers.py", "backend/sticker_generation/providers/openai_image.py"],
    },
    "sheet-plan": {
        "caption": "Ba sheet 4×2 tạo 8 + 8 + 4 sticker; bốn cell cuối sheet ba là reserve.",
        "alt": "Ba lưới bốn cột hai hàng; hai lưới đầu giữ tám cell, lưới cuối giữ bốn cell trên và đánh dấu bốn reserve.",
        "sourceRefs": ["backend/sticker_generation/grouped.py", "backend/sticker_generation/prompts.py"],
    },
    "quality-decision-flow": {
        "caption": "Decision tree của grid quality gate với các ngưỡng hiện hành.",
        "alt": "Decode, kiểm kích thước, tạo mask, dò lưới 4×2 rồi crop hoặc reject theo cut score, crossing và occupancy.",
        "sourceRefs": ["backend/sticker_generation/grouped.py", "backend/sticker_generation/postprocess.py"],
    },
    "repo-runtime-map": {
        "caption": "Bản đồ thư mục source và chiều phụ thuộc của web grouped pipeline.",
        "alt": "Frontend gọi backend app, backend app dùng sticker_generation; migrations, runtime state, docs và external services được đặt thành các khối riêng.",
        "sourceRefs": ["frontend/src", "backend/app", "backend/sticker_generation", "backend/migrations"],
    },
    "risk-control-map": {
        "caption": "Trust boundaries và lộ trình kiểm soát bảo mật/vận hành theo P0–P2.",
        "alt": "Browser, FastAPI, Supabase và providers nối qua các cạnh dữ liệu rủi ro; bốn nhóm control phía dưới theo ưu tiên.",
        "sourceRefs": ["frontend/src/services/authService.ts", "backend/app/services/supabase_service.py", "backend/app/services/telegram_service.py"],
    },
}


FACE_GATE_FIGURE_DETAILS = {
    "value-flow": {
        "caption": "Dòng giá trị MVP có gate đúng một khuôn mặt chạy cục bộ trước khi tạo job trả phí.",
        "alt": "Sáu bước gồm chọn ảnh, gate một khuôn mặt, khóa nhận diện, sinh biểu cảm, kiểm tra cấu trúc và sử dụng; các callout nêu chi phí bằng không của gate, giới hạn client-only và thời điểm ảnh được gửi backend.",
        "sourceRefs": ["frontend/src/hooks/useImageUpload.ts", "frontend/src/services/faceDetectionService.ts", "backend/app/services/sticker_pipeline.py"],
    },
    "user-journey": {
        "caption": "User journey mới: ảnh chỉ đi tới xác thực và tạo job sau khi detector trả đúng một khuôn mặt.",
        "alt": "Luồng chọn ảnh qua Web Worker MediaPipe; không có mặt, nhiều mặt hoặc detector lỗi đều quay lại chọn ảnh và không gọi API tạo sticker; đúng một mặt tiếp tục auth, job, polling và gallery.",
        "sourceRefs": ["frontend/src/components/upload/ImageUploader.tsx", "frontend/src/hooks/useImageUpload.ts", "frontend/src/services/faceDetectionService.ts"],
    },
    "system-boundary": {
        "caption": "Ranh giới hệ thống cập nhật với detector CPU/WASM chạy trong browser và backend vẫn không có semantic face gate.",
        "alt": "Người dùng tương tác React; FaceDetector Web Worker và model tĩnh chạy trong browser; FastAPI và generation core chỉ nhận ảnh qua UI sau khi gate pass, nhưng direct API vẫn có thể bypass; jsDelivr, Supabase, Image API và Telegram nằm ngoài hệ thống.",
        "sourceRefs": ["frontend/src/workers/faceDetector.worker.ts", "frontend/public/models/README.md", "backend/app/api/stickers.py"],
    },
    "job-state": {
        "caption": "State machine bổ sung preflight checking/verified trước trạng thái generation processing.",
        "alt": "Idle chọn ảnh chuyển sang checking; chỉ verified mới cho phép tạo job và processing; rejected hoặc detector error quay lại idle; completed/error của job giữ nguyên và retry backend vẫn chưa nối CTA.",
        "sourceRefs": ["frontend/src/hooks/useImageUpload.ts", "frontend/src/hooks/useStickerGenerator.ts", "frontend/src/App.tsx"],
    },
    "system-context": {
        "caption": "Runtime topology có MediaPipe worker chạy trên CPU client, model tĩnh cùng origin và WASM tải từ CDN ghim phiên bản.",
        "alt": "Browser chứa React và FaceDetector worker; Vite/Vercel phục vụ model BlazeFace; worker tải WASM từ jsDelivr; ảnh pass mới được gửi FastAPI, grouped generator và Image API; Supabase và Telegram giữ nguyên.",
        "sourceRefs": ["frontend/src/services/faceDetectionService.ts", "frontend/src/workers/faceDetector.worker.ts", "frontend/public/models/README.md"],
    },
    "generation-sequence": {
        "caption": "Sequence bắt đầu bằng exact-one-face preflight cục bộ; chỉ nhánh pass mới phát sinh POST và bốn image request.",
        "alt": "Browser gửi ImageBitmap cho Face Worker; nhánh 0, nhiều mặt hoặc lỗi dừng cục bộ; nhánh một mặt POST FastAPI rồi tạo canonical, ba sheet, structural QA và persistence best-effort.",
        "sourceRefs": ["frontend/src/services/faceDetectionService.ts", "frontend/src/workers/faceDetector.worker.ts", "backend/sticker_generation/grouped.py"],
    },
    "roadmap-now-next-later": {
        "caption": "Roadmap ghi nhận browser face gate đã triển khai và tách rõ phần backend enforcement, test tự động và telemetry còn lại.",
        "alt": "Now có local MediaPipe gate; Next gồm backend authoritative detector và frontend unit/E2E; Later gồm metric false reject, CDN fallback và policy đa khuôn mặt.",
        "sourceRefs": ["frontend/src/hooks/useImageUpload.ts", "frontend/src/workers/faceDetector.worker.ts", "frontend/package.json"],
    },
    "screen-flow": {
        "caption": "Screen flow bổ sung trạng thái kiểm tra khuôn mặt giữa Upload và Auth/Processing.",
        "alt": "Upload chuyển Face checking; invalid quay về Upload với alert, verified mới đi Auth hoặc Processing; các nhánh Gallery, Rejected, History, Telegram và Docs giữ nguyên.",
        "sourceRefs": ["frontend/src/components/upload/ImageUploader.tsx", "frontend/src/hooks/useImageUpload.ts", "frontend/src/App.tsx"],
    },
    "quality-gates": {
        "caption": "Release gates cập nhật với QA 0/1/2 khuôn mặt, 12 Office file và giới hạn backend semantic gate chưa triển khai.",
        "alt": "Năm bước backend, frontend, docs build, visual QA và browser QA; frontend gate được kiểm tra 0, 1, 2 mặt; callout gap nêu chưa có test tự động và direct API vẫn bypass.",
        "sourceRefs": ["frontend/package.json", "frontend/src/hooks/useImageUpload.ts", "backend/app/tests"],
    },
    "coverage-map": {
        "caption": "Coverage giữ nguyên 75 backend tests và bổ sung bằng chứng browser QA thủ công cho ba verdict face gate.",
        "alt": "Bên trái là 75 backend cases, giữa là manual browser matrix 0 mặt reject, 1 mặt pass, 2 mặt reject, bên phải là gap frontend unit/E2E và backend authoritative detector.",
        "sourceRefs": ["backend/app/tests", "backend/sticker_generation/tests", "frontend/src/services/faceDetectionService.ts"],
    },
    "data-lifecycle": {
        "caption": "Vòng đời dữ liệu có bước local preflight trước upload; ảnh reject không đi qua UI tới Storage hay provider.",
        "alt": "Local face gate chạy trước Upload; pass mới gửi backend và Storage, rồi Generate, Persist, History và Soft delete; direct API bypass và cleanup Storage vẫn là gap.",
        "sourceRefs": ["frontend/src/hooks/useImageUpload.ts", "backend/app/api/stickers.py", "backend/app/services/supabase_service.py"],
    },
    "validation-boundaries": {
        "caption": "Validation tách technical file gate và exact-one-face semantic gate chạy cục bộ trước FastAPI/provider.",
        "alt": "Sáu lớp gồm browser MIME/size, MediaPipe exact-one-face, FastAPI bytes/decode, sanitize, provider guard và response decode; fail closed không tạo job nhưng backend chưa kiểm lại semantic.",
        "sourceRefs": ["frontend/src/hooks/useImageUpload.ts", "frontend/src/services/faceDetectionService.ts", "frontend/src/workers/faceDetector.worker.ts", "backend/app/api/stickers.py"],
    },
    "repo-runtime-map": {
        "caption": "Repository map bổ sung faceDetectionService, module worker và model BlazeFace tĩnh trong frontend.",
        "alt": "Frontend gồm React hooks, face detection service, Web Worker và public model; backend API và generation core giữ nguyên; jsDelivr cung cấp WASM; gen-sticker-docs tạo 12 Office outputs.",
        "sourceRefs": ["frontend/src/services/faceDetectionService.ts", "frontend/src/workers/faceDetector.worker.ts", "frontend/public/models/README.md"],
    },
    "risk-control-map": {
        "caption": "Control map ghi rõ local face gate giảm upload nhầm nhưng không phải security boundary có thể tin cậy cho direct API.",
        "alt": "Browser giữ selfie và chạy MediaPipe; CDN chỉ cung cấp WASM; FastAPI vẫn nhận direct requests; controls gồm fail-closed, pinned runtime/model provenance, backend revalidation backlog và privacy disclosure.",
        "sourceRefs": ["frontend/src/services/faceDetectionService.ts", "frontend/src/workers/faceDetector.worker.ts", "backend/app/api/stickers.py"],
    },
}


VISUALS = {
    "project-charter": [{"figureId": "value-flow", "afterSection": "2. Tổng quan dự án"}],
    "prd": [{"figureId": "user-journey", "sheetName": "Visual User Journey"}],
    "srs": [
        {"figureId": "system-boundary", "afterSection": "2. Actor và ranh giới hệ thống"},
        {"figureId": "job-state", "afterSection": "5. Vòng đời job"},
    ],
    "architecture": [
        {"figureId": "system-context", "sheetName": "Visual System Context"},
        {"figureId": "generation-sequence", "sheetName": "Visual Sequence"},
        {"figureId": "pipeline-five-stage", "sheetName": "Visual Pipeline"},
    ],
    "backlog": [{"figureId": "roadmap-now-next-later", "sheetName": "Visual Roadmap"}],
    "uiux": [
        {"figureId": "screen-flow", "sheetName": "Visual Screen Flow"},
        {"figureId": "docs-hub-layout", "sheetName": "Visual Docs Layout"},
    ],
    "tdd": [
        {"figureId": "quality-gates", "sheetName": "Visual Quality Gates"},
        {"figureId": "coverage-map", "sheetName": "Visual Coverage Map"},
    ],
    "database": [
        {"figureId": "data-model", "sheetName": "Visual ERD"},
        {"figureId": "rls-owner-flow", "sheetName": "Visual RLS"},
        {"figureId": "data-lifecycle", "sheetName": "Visual Lifecycle"},
    ],
    "input-validation": [{"figureId": "validation-boundaries", "afterSection": "2. Ma trận upload"}],
    "output-quality": [
        {"figureId": "sheet-plan", "afterSection": "2. Kế hoạch bảng"},
        {"figureId": "quality-decision-flow", "afterSection": "3. Grid quality gate"},
    ],
    "source-security-operations": [
        {"figureId": "repo-runtime-map", "afterSection": "1. Bản đồ repository"},
        {"figureId": "risk-control-map", "afterSection": "6. Risk register"},
    ],
    "sla": [{"figureId": "system-context", "afterSection": "5. Hạ tầng triển khai"}],
}


DOCX_EXTRA = {
    "project-charter": [
        {"title": "10. Stakeholder và quyền quyết định", "type": "table", "headers": ["Vai trò", "Trách nhiệm", "Quyền quyết định", "Bằng chứng hiện tại"], "rows": [
            ["Người dùng đã xác thực", "Cung cấp chân dung, chọn style, xem và tải kết quả", "Chấp nhận ảnh đầu vào và chủ động gửi sang provider", "Bearer JWT + owner-bound jobs"],
            ["Frontend", "Thu input, hiển thị tiến độ, gallery, history, Telegram và docs", "Không được giữ provider/service-role secret", "React/Vite; token ở localStorage"],
            ["Backend", "Xác thực, giới hạn job, điều phối sinh ảnh, QA và persistence", "Từ chối input/job/provider lỗi bằng safe message", "FastAPI /api/v1"],
            ["External providers", "Auth/Storage/DB, image edit, Telegram export", "Theo contract riêng của từng dịch vụ", "Supabase, Compatible Image API, Telegram/QR"],
        ]},
        {"title": "11. Deliverable và baseline kiểm chứng", "type": "table", "headers": ["Deliverable", "As-is", "Verification", "Acceptance"], "rows": [
            ["Web generator", "Upload → processing → gallery/error", "Frontend lint + production build", "Không phá hợp đồng 20 output"],
            ["Image pipeline", "Canonical + 3 sheet 4×2 + crop", "75 backend tests với provider mock", "Grid gate reject layout không an toàn"],
            ["Persistence", "Supabase best-effort", "Source audit; chưa có integration test", "AI success không phụ thuộc DB save"],
            ["Project docs", "12 file Office + web viewer", "Render toàn bộ page/sheet + browser QA", "Visual có caption, alt và source refs"],
        ]},
        {"title": "12. Assumption, dependency và trigger xem xét lại", "type": "table", "headers": ["Nhóm", "Giả định hiện tại", "Rủi ro nếu sai", "Trigger"], "rows": [
            ["Model", "Endpoint hỗ trợ multi-image edits và 1536×1024", "Request fail hoặc output sai grid", "Đổi model/base URL/provider contract"],
            ["Auth", "Supabase Auth trả UUID owner", "History không persist cho demo owner", "Thay auth provider hoặc schema"],
            ["Runtime", "Một process backend cho MVP local", "Split in-memory state khi multi-worker", "Deploy nhiều worker/restart yêu cầu durable store"],
            ["Privacy", "Người dùng hiểu ảnh được gửi external provider", "Claim bảo mật tuyệt đối gây hiểu sai", "Ra mắt public cần consent/retention notice"],
        ]},
        {"title": "13. Exit criteria cho baseline này", "type": "bullets", "bullets": [
            "Backend tests, frontend lint/build và Office render phải cùng đạt trên checkout được ghi trong metadata.",
            "Mỗi tài liệu phải phân biệt rõ implemented, inferred, gap và recommended; không biến external Supabase state thành fact.",
            "Không đưa secret, credential, user selfie, Telegram base64 runtime hoặc ảnh từ ZIP mẫu vào output.",
            "Database/architecture visual phải có source reference, caption và mô tả dài để người đọc không phụ thuộc màu sắc.",
            "Mọi số liệu product KPI chưa có telemetry phải mang nhãn TBD thay vì được tự tạo.",
        ]},
    ],
    "srs": [
        {"title": "10. Generation sequence chi tiết", "type": "table", "headers": ["Bước", "Component", "Input", "Output/decision"], "rows": [
            ["1", "Browser + API", "file, style_id, Bearer", "Job processing hoặc 4xx/429/503"],
            ["2", "Pipeline", "raw upload bytes", "sanitized selfie + temp artifacts"],
            ["3", "Grouped generator", "selfie", "canonical 1024×1024"],
            ["4", "Grouped generator", "selfie + canonical + guide", "3 raw sheets 1536×1024"],
            ["5", "Quality gate", "raw sheet", "8 crops hoặc rejected preview"],
            ["6", "Postprocess", "20 selected cells", "20 transparent PNG 512×512"],
            ["7", "Persistence", "outputs + owner", "Storage URLs/history best-effort"],
        ]},
        {"title": "11. Authorization và data ownership", "type": "table", "headers": ["Resource", "Owner source", "Enforcement", "Durability"], "rows": [
            ["Generation job", "JWT user id", "job_owners map + API guard", "Process-local"],
            ["History pack", "sticker_packs.user_id", "Backend .eq(user_id, ...)", "External Supabase"],
            ["Sticker output", "Parent pack owner", "Backend query assembles children", "External Supabase/Storage"],
            ["Telegram pending pack", "Không gắn authenticated owner", "Pack token/deep link", "Local JSON; single-process"],
        ]},
        {"title": "12. Retry, resume và idempotency", "type": "paragraphs", "paragraphs": [
            "Frontend lưu active job id trong sessionStorage và poll mỗi giây. Khi reload, resumeActiveJob tiếp tục poll; trong khoảng poll, hook hiện không phản ánh processing ngay lập tức.",
            "Backend /retry chỉ nhận job error có quality_status=rejected, đúng owner, còn artifact và chưa quá hai lần. Grouped generator tái dùng canonical, raw sheet hợp lệ và sticker đã hoàn thành; raw sheet lỗi chỉ tái sinh sheet tương ứng.",
            "CTA Thử Lại Ngay ở App hiện gọi resetGenerator, xóa active job và quay về Upload. Vì vậy retry API là chức năng implemented nhưng unreachable từ CTA hiện tại; đây là khác biệt phải được giữ rõ trong UI, API và test traceability.",
        ]},
        {"title": "13. Security và privacy requirements", "type": "table", "headers": ["ID", "Requirement", "Current", "Target"], "rows": [
            ["SEC-01", "Secret chỉ ở backend", "Provider/service-role/token đọc từ env", "Giữ; scan secret trước release"],
            ["SEC-02", "Owner isolation", "JWT + backend filters", "Versioned RLS + integration tests"],
            ["SEC-03", "Portrait transfer disclosure", "Chưa có notice chuyên biệt", "Consent + provider/retention notice"],
            ["SEC-04", "Storage privacy", "get_public_url", "Private bucket + signed URL"],
            ["SEC-05", "Telegram abuse prevention", "Export API chưa auth", "JWT + count/size/rate limits"],
        ]},
        {"title": "14. Operational constraints", "type": "bullets", "bullets": [
            "Job state, owner, attempts, retries và artifact path nằm trong RAM của một process; multi-worker không an toàn nếu không thêm durable store.",
            "Image request timeout 180 giây; frontend poll timeout 12 phút. Thời gian thực tế phụ thuộc external provider.",
            "Rate limit mặc định 3 job/giờ/user và global active capacity 2 job; các giá trị cấu hình được đọc từ settings.",
            "Persistence failure chỉ log warning và không đổi completed AI result thành error; history có thể không tồn tại dù gallery hoàn tất.",
            "Code cost estimate hard-code theo gpt-image-1.5 medium và không phải hóa đơn proxy thực tế.",
        ]},
    ],
    "input-validation": [
        {"title": "8. Decision table theo lớp", "type": "table", "headers": ["Layer", "Check", "Fail outcome", "Test status"], "rows": [
            ["Browser", "JPEG/PNG/WebP, ≤15 MiB", "Inline upload error", "Không có frontend automated test"],
            ["FastAPI", "Bearer, MIME, bytes, actual decode, ≤40 MP", "401/400/413/422", "API tests có spoofed image"],
            ["Sanitizer", "EXIF transpose, metadata strip, RGB, max side", "Generation error", "Covered indirectly"],
            ["Provider adapter", "model id, ref MIME/size, aggregate size", "Config/input error", "MockTransport tests"],
            ["Provider response", "JSON data[0].b64_json, base64, ≤20 MiB", "Safe provider/internal error", "Provider tests"],
        ]},
        {"title": "9. HTTP/provider error mapping", "type": "table", "headers": ["Signal", "Internal code", "User-facing behavior", "Retryability"], "rows": [
            ["401/403", "openai_key_or_permission_invalid", "Key/model permission không hợp lệ", "Không tự retry"],
            ["402 hoặc quota-like 429", "openai_quota_or_billing_required", "Hết credit/quota hoặc billing", "Không tự retry"],
            ["invalid request 429", "openai_invalid_request", "Provider từ chối cấu hình request", "Sửa cấu hình/model"],
            ["other 429", "openai_rate_limit", "Thử lại sau", "Có thể retry có kiểm soát"],
            ["grid reject", "pack_sheet_grid_not_detected", "Hiện raw preview / rejected", "Backend retry có điều kiện; CTA reset"],
        ]},
        {"title": "10. Threat cases cần test thêm", "type": "table", "headers": ["Case", "Why", "Current defense", "Backlog"], "rows": [
            ["Decompression bomb", "Nhỏ theo byte nhưng cực lớn khi decode", "40 MP guard sau Pillow decode", "Fuzz/timeout fixture"],
            ["Polyglot/spoofed MIME", "Bypass browser Content-Type", "API verify actual format", "Thêm corpus malicious"],
            ["Filename/path control chars", "Log/storage object ambiguity", "UUID prefix; filename còn giữ", "Normalize filename"],
            ["Telegram base64 flood", "Memory/disk/abuse", "Chưa có explicit count/size bound", "JWT + payload limits"],
            ["Provider URL response", "SSRF nếu tự download", "Adapter chỉ nhận b64_json", "Giữ no-URL contract"],
        ]},
        {"title": "11. Privacy handling", "type": "paragraphs", "paragraphs": [
            "Sanitize ảnh loại EXIF/metadata và giới hạn kích thước, nhưng không làm ảnh chân dung mất tính nhận diện. Selfie vẫn được gửi tới image provider; các sheet tiếp theo gửi selfie, canonical và layout guide.",
            "Upload source hiện được đưa lên Supabase Storage trước rate/capacity checks và trả public URL; URL chỉ được log, không liên kết record. Đây là lý do cần failed-upload cleanup, private bucket và retention policy rõ ràng.",
            "Tài liệu và test không được đọc hay nhúng user image/base64 runtime. Fixture chất lượng phải là hình tổng hợp hình học hoặc asset repo an toàn, không phải dữ liệu người dùng.",
        ]},
    ],
    "output-quality": [
        {"title": "9. Ma trận ngưỡng kỹ thuật", "type": "table", "headers": ["Metric", "Transparent", "Opaque", "Decision"], "rows": [
            ["Minimum dimensions", "1000×600", "1000×600", "Nhỏ hơn → reject"],
            ["Transparent ratio branch", ">5% pixel alpha thấp", "≤5%", "Chọn foreground-mask algorithm"],
            ["Severe cut score", "≥0.45", "N/A", "Reject ngay"],
            ["Cut + dominant crossing", ">0.10 + crossing", "N/A", "Reject"],
            ["Opaque cut score", "N/A", ">0.18", "Reject"],
            ["Minimum occupancy", "<0.03", "<0.03", "Reject"],
            ["Final canvas", "512×512", "512×512", "Center + white outline"],
        ]},
        {"title": "10. Failure-mode analysis", "type": "table", "headers": ["Failure", "Detector", "Observed outcome", "Residual risk"], "rows": [
            ["Model tạo 3×2 thay vì 4×2", "Severe cut score + grid regression", "Reject raw sheet", "Lower-density wrong grid có thể cần detector bổ sung"],
            ["Nhân vật cắt qua gutter", "Dominant/multi-segment crossing", "Reject", "Decorations nhỏ phải tránh false positive"],
            ["Cell trống hoặc quá ít foreground", "minimum_occupancy", "Reject", "Không hiểu semantic pose"],
            ["Ảnh đúng grid nhưng sai mặt/tay", "Không có automated score", "Có thể pass", "Human review bắt buộc"],
            ["Text/watermark ngẫu nhiên", "Prompt constraint only", "Có thể pass", "OCR/content QA backlog"],
        ]},
        {"title": "11. Manual review rubric", "type": "table", "headers": ["Dimension", "Weight đề xuất", "Pass signal", "Fail signal"], "rows": [
            ["Identity likeness", "30", "Khuôn mặt/tóc/đặc điểm nhất quán", "Biến thành người khác"],
            ["Grid/crop", "25", "8 cell sạch, không dính hàng xóm", "Cắt người, trộn cell, thiếu cell"],
            ["Face/hand anatomy", "20", "Mắt/tay hợp lý", "Biến dạng hoặc thừa chi"],
            ["Pose/expression", "15", "Khớp catalog", "Trùng/mất biểu cảm"],
            ["Style/alpha/text", "10", "Đồng nhất, nền sạch, không watermark", "Style drift hoặc text rác"],
        ]},
        {"title": "12. Artifact và retry behavior", "type": "paragraphs", "paragraphs": [
            "Raw sheet được ghi ra temp và preview callback chạy trước khi split; vì vậy khi structural gate reject, UI vẫn có bằng chứng trực quan để so sánh.",
            "Resume logic đọc raw sheet cũ và chạy cùng quality gate. Sheet hợp lệ được tái dùng, sheet lỗi hoặc thiếu mới gọi provider; sticker path đã đủ cho một sheet được bỏ qua.",
            "UI hiện reset về upload nên người dùng tạo job mới và có thể trả lại toàn bộ chi phí bốn call. Backend targeted retry vẫn hữu ích cho API client hoặc khi UI nối lại sau này.",
        ]},
        {"title": "13. Cost and observability", "type": "table", "headers": ["Item", "Code estimate", "What is missing", "Recommendation"], "rows": [
            ["Canonical 1024²", "$0.034", "Input/reference token + proxy markup", "Capture provider balance/cost telemetry"],
            ["Each landscape sheet", "$0.05", "Failed/retried calls", "Log model, request_id, latency, outcome"],
            ["Nominal 4-call job", "$0.184 output estimate", "Actual ShopAIKey invoice", "Do not show as billed amount"],
            ["Rejected/reset", "Potential full new job", "No UI cost warning", "Expose retry strategy and cost budget"],
        ]},
    ],
    "source-security-operations": [
        {"title": "10. Endpoint runbook", "type": "table", "headers": ["Purpose", "Route/command", "Auth", "Operational note"], "rows": [
            ["Health", "GET /api/v1/health", "Public", "Supabase/Postgres flags are configuration indicators"],
            ["Generate", "POST /api/v1/stickers/generate", "Bearer", "multipart file + style_id"],
            ["Poll", "GET /api/v1/stickers/jobs/{id}", "Bearer + owner", "Cache-Control no-store/private"],
            ["Retry", "POST /api/v1/stickers/jobs/{id}/retry", "Bearer + owner", "Only rejected; max 2"],
            ["History/delete", "GET/DELETE /api/v1/stickers/history", "Bearer", "Soft delete pack row"],
            ["Telegram export", "POST /api/v1/telegram/export", "Current: public", "Must add auth/count/size/rate controls"],
        ]},
        {"title": "11. Secret và privileged capability inventory", "type": "table", "headers": ["Name/capability", "Location", "Exposure rule", "Risk"], "rows": [
            ["OPENAI_API_KEY", "Backend env", "Never frontend/log/docs", "Paid provider access"],
            ["SUPABASE_SERVICE_ROLE_KEY", "Backend env", "Server-only; bypasses RLS", "Full data/storage blast radius"],
            ["TELEGRAM_BOT_TOKEN", "Backend env", "Server-only", "Bot impersonation/control"],
            ["Bearer access token", "Browser localStorage", "Send only HTTPS Authorization", "XSS theft risk"],
            ["Demo credential", "Currently hard-coded client source", "Remove/rotate", "Credential disclosure"],
        ]},
        {"title": "12. Data inventory và retention", "type": "table", "headers": ["Data", "Store", "Current lifetime", "Required control"], "rows": [
            ["Uploaded selfie", "Supabase Storage + temp", "No explicit storage retention; temp TTL", "Private object, cleanup failed job, consent"],
            ["Canonical/raw/crops", "Temp directory", "Job TTL/retention; lost on restart", "Encrypted/durable store only if product needs resume"],
            ["20 outputs/history", "Storage + DB", "Soft-delete hides row; object remains", "Delete cascade/object lifecycle"],
            ["Telegram pending pack", "Local JSON with base64", "No abandoned TTL; claim removes early", "External durable store, TTL, no Git tracking"],
            ["Logs", "Process stdout", "Deployment-dependent", "Redaction + request_id + retention policy"],
        ]},
        {"title": "13. Incident playbooks", "type": "table", "headers": ["Signal", "Immediate action", "Evidence to preserve", "Recovery"], "rows": [
            ["401/403 provider", "Disable generation CTA if systemic", "status/code/model/base URL host only", "Fix key/permission; never print key"],
            ["402/quota", "Stop paid retries", "balance timestamp + safe provider code", "Top up/change model after approval"],
            ["Repeated grid reject", "Keep raw preview, avoid loop", "raw sheet hash + grid metrics", "Targeted retry or model/prompt review"],
            ["Split job state/404", "Ensure single backend process", "PID/listener/job owner", "Durable shared store before multi-worker"],
            ["Suspected data leak", "Revoke service-role/bot/provider keys", "access logs/object paths", "Purge objects/history; notify per policy"],
        ]},
        {"title": "14. Deployment/readiness gates", "type": "bullets", "bullets": [
            "One authoritative backend listener per process-local job store; multi-worker deployment is blocked until state moves to a shared durable store.",
            "CORS origins, HTTPS, Supabase Auth redirect/config and private Storage policies must match deployment hostname.",
            "Base schema, RLS and bucket policies must be version-controlled and tested before describing data isolation as database-enforced.",
            "Remove tracked pending Telegram payload and demo credential; rotate affected secrets before public release.",
            "Run backend tests, frontend lint/build, manual end-to-end generation with a controlled budget, and validate actual provider billing separately.",
            "Update privacy copy: no absolute '100% secure' claim while portraits are sent to third parties or public URLs are possible.",
        ]},
        {"title": "15. Known technical debt", "type": "table", "headers": ["Debt", "Impact", "Priority", "Evidence"], "rows": [
            ["Process-local job state", "Restart/multi-worker loses or splits jobs", "P1", "sticker_pipeline global dictionaries"],
            ["Base DB/RLS not versioned", "Deploy not reproducible; policy unknown", "P0/P1", "only migration 001 exists"],
            ["Unauth Telegram export", "Abuse/memory/storage risk", "P0", "telegram router lacks require_user_id"],
            ["Public Storage URL", "Portrait/output privacy ambiguity", "P1", "get_public_url"],
            ["No frontend/E2E tests", "UI state regressions undetected", "P1", "package scripts only lint/build"],
            ["Deprecated framework APIs", "Future upgrade breakage", "P2", "25 warnings from backend suite"],
        ]},
    ],
}


XLSX_EXTRA = {
    "prd": [
        {"name": "Feature Dashboard", "summary": "Phân bố 15 yêu cầu theo mức triển khai từ source audit", "headers": ["Status", "Count", "Meaning"], "rows": [["Implemented", 9, "Có code path và không ghi nhận gap trực tiếp"], ["Partial", 5, "Có flow nhưng còn lệch contract, cấu hình hoặc durability"], ["Gap", 1, "Chưa có durable job store"]], "formulas": [{"row": 0, "column": 1, "formula": "=COUNTIF(Requirements!$H$7:$H$21,A7)"}, {"row": 1, "column": 1, "formula": "=COUNTIF(Requirements!$H$7:$H$21,A8)"}, {"row": 2, "column": 1, "formula": "=COUNTIF(Requirements!$H$7:$H$21,A9)"}], "chart": {"type": "doughnut", "title": "15 requirements by implementation status", "categoryColumn": 0, "valueColumns": [1]}},
        {"name": "Stakeholders", "summary": "Vai trò, mục tiêu và trách nhiệm trong product flow", "headers": ["Actor", "Primary need", "System touchpoint", "Risk/constraint"], "rows": [["Guest", "Hiểu sản phẩm", "Upload screen + Auth modal", "Không được xem history"], ["Authenticated user", "Tạo và quản lý sticker", "Generate/History/Telegram", "Portrait transfer consent"], ["Operator", "Duy trì uptime/cost", "Backend config/logs", "Secret handling"], ["Reviewer", "Đánh giá likeness/anatomy", "Gallery/raw preview", "Manual boundary"]]},
        {"name": "Acceptance Criteria", "summary": "Given/When/Then cho các user outcome chính", "headers": ["ID", "Given", "When", "Then", "Automation"], "rows": [["AC-01", "Authenticated + valid image", "Generate", "Job processing và poll owner-bound", "Backend API"], ["AC-02", "Provider returns valid sheets", "Pipeline completes", "Exactly 20 PNG 512px", "Grouped tests"], ["AC-03", "Grid invalid", "Gate rejects", "Error page shows raw preview", "Service tests"], ["AC-04", "Rejected page", "Click Thử Lại Ngay", "Return clean Upload state", "Manual; FE test gap"], ["AC-05", "Completed pack", "Open history", "Only current user active packs", "Backend filter tests"]]},
        {"name": "Feature Matrix", "summary": "Phạm vi MVP, dependency và trạng thái triển khai", "headers": ["Feature", "Priority", "Current state", "Dependencies", "Out of scope/gap"], "rows": [["Upload + style", "Must", "Implemented", "Browser/File API", "Frontend tests"], ["AI pack generation", "Must", "Implemented", "Image edits endpoint", "Live contract not CI"], ["Structural QA", "Must", "Implemented", "Pillow/Numpy", "No likeness/anatomy score"], ["History", "Should", "Best-effort", "Supabase", "Schema/RLS external"], ["Telegram export", "Should", "Implemented with risks", "Bot/QR", "No auth/TTL bounds"], ["Documentation hub", "Should", "Working-tree", "Static manifest/assets", "No server-side CMS"]]},
        {"name": "Analytics Plan", "summary": "Metric definitions; values remain TBD until telemetry exists", "headers": ["Metric", "Definition", "Event/source", "Current value", "Guardrail"], "rows": [["Generation success rate", "completed / started jobs", "job lifecycle logs", "TBD", "Exclude auth/input rejects"], ["Grid rejection rate", "rejected sheets / generated sheets", "quality gate metrics", "TBD", "Track by model/style"], ["Time to first result", "generate click → completed", "client/server timestamps", "TBD", "p50/p95"], ["Cost per accepted pack", "actual provider billing / accepted packs", "provider/balance telemetry", "TBD", "Do not use hard-coded estimate"], ["History persistence rate", "saved packs / completed jobs", "Supabase result", "TBD", "Separate AI success"]]},
    ],
    "architecture": [
        {"name": "Component Responsibilities", "summary": "Ranh giới trách nhiệm và dependency direction", "headers": ["Component", "Owns", "Calls", "Must not own"], "rows": [["React", "UI state/auth token/polling", "FastAPI", "Provider/service-role secrets"], ["FastAPI API", "Validation/auth/HTTP mapping", "Services", "Image prompt internals"], ["StickerPipelineService", "Job lifecycle/orchestration", "Grouped generator/Supabase", "Frontend state"], ["Grouped generator", "Canonical/sheets/grid/postprocess", "Provider protocol", "FastAPI schemas"], ["OpenAIImageProvider", "Multipart/response/error contract", "Compatible endpoint", "Product flow"], ["SupabaseService", "Auth/storage/history", "Supabase", "Image generation"]]},
        {"name": "API Sequence", "summary": "Request/response contract và failure points", "headers": ["Order", "Call", "Auth", "Success", "Failure"], "rows": [[1, "POST /stickers/generate", "Bearer", "processing job", "400/401/413/422/429/503"], [2, "GET /stickers/jobs/{id}", "Bearer+owner", "processing/completed/error", "404 owner/not found"], [3, "POST provider /images/edits ×4", "API key", "b64 PNG", "401/402/403/429/invalid response"], [4, "Storage + pack/stickers insert", "service-role/anon", "history URLs", "warning only; job remains completed"]]},
        {"name": "Deployment Topology", "summary": "As-is local topology và blockers cho multi-worker", "headers": ["Node", "State", "Scale behavior", "Readiness requirement"], "rows": [["Vite/static frontend", "Stateless except browser storage", "Horizontal safe", "Correct API base/CORS"], ["FastAPI worker", "RAM jobs + temp artifacts", "Not multi-worker safe", "Shared durable job/artifact store"], ["Supabase", "External durable data", "Managed", "Versioned schema/RLS/bucket policy"], ["Telegram bot", "Local JSON + update offset", "Single-process only", "Shared queue/claim semantics"], ["Image provider", "External", "Rate/quota limited", "Budget, retry and telemetry"]]},
        {"name": "Security Boundaries", "summary": "Data/secret crossing và lớp kiểm soát hiện tại", "headers": ["Boundary", "Data", "Current control", "Gap"], "rows": [["Browser→API", "JWT + portrait", "Bearer + MIME/size/format", "localStorage XSS exposure"], ["API→Supabase", "service-role + objects", "backend only", "public URL; bypass RLS"], ["API→Image provider", "sanitized portrait refs", "TLS + API key", "consent/retention disclosure"], ["API→Telegram/QR", "20 stickers + deep link", "pack token", "endpoint unauth; external QR"], ["Process→disk", "temp artifacts + pending JSON", "temp cleanup/lock", "tracked runtime data/no TTL"]]},
        {"name": "Failure Modes", "summary": "Failure containment và user-visible behavior", "headers": ["Failure", "Detected by", "Containment", "Residual"], "rows": [["Quota/key invalid", "Provider mapping", "safe error; stop retry", "No provider health circuit"], ["Bad 4×2 grid", "Quality gate", "rejected preview", "No automatic semantic QA"], ["Persistence failure", "Supabase warning", "AI result still completed", "History absent"], ["Backend restart", "Poll 404", "None", "Active/retry jobs lost"], ["Double backend listener", "Process audit", "Run one listener", "Split in-memory state"]]},
        {"name": "ADR Register", "summary": "Quyết định kiến trúc, lý do và trigger xem xét lại", "headers": ["ADR", "Decision", "Rationale", "Trade-off", "Revisit when"], "rows": [["ADR-01", "Grouped 4-call flow", "Identity lock + batch efficiency", "Grid dependence/cost", "Model/price changes"], ["ADR-02", "Process-local jobs for MVP", "Simple local demo", "No restart/multi-worker", "Production deployment"], ["ADR-03", "Persistence best-effort", "Do not lose generated result", "History inconsistency", "Durability becomes SLA"], ["ADR-04", "b64-only provider response", "Avoid URL fetch/SSRF", "Proxy must support b64", "Contract changes"], ["ADR-05", "Static manifest docs hub", "No backend/CMS dependency", "Manual rebuild/sync", "Docs need collaborative authoring"]]},
    ],
    "backlog": [
        {"name": "Priority Dashboard", "summary": "Tổng hợp 15 backlog item theo priority từ audit hiện tại", "headers": ["Priority", "Items", "Release meaning"], "rows": [["P0", 3, "Block public release/security"], ["P1", 8, "Durability, privacy and tests"], ["P2", 4, "Observability and cleanup"]], "formulas": [{"row": 0, "column": 1, "formula": "=COUNTIF(Backlog!$B$7:$B$21,A7)"}, {"row": 1, "column": 1, "formula": "=COUNTIF(Backlog!$B$7:$B$21,A8)"}, {"row": 2, "column": 1, "formula": "=COUNTIF(Backlog!$B$7:$B$21,A9)"}], "chart": {"type": "bar", "title": "15 backlog items by priority", "categoryColumn": 0, "valueColumns": [1]}},
        {"name": "Risk Register", "summary": "Risk, likelihood, impact và mitigation owner đề xuất", "headers": ["Risk", "Likelihood", "Impact", "Priority", "Mitigation", "Evidence"], "rows": [["Tracked Telegram base64", "High", "High", "P0", "Untrack/purge/TTL store", "backend/data/pending_telegram_packs.json"], ["Demo credential in client", "High", "High", "P0", "Remove/rotate", "authService.ts"], ["Multi-worker split jobs", "Medium", "High", "P1", "Durable job store", "global dictionaries"], ["Unknown RLS state", "Medium", "High", "P1", "Versioned policies/tests", "no SQL policies"], ["Grid pass but anatomy fail", "Medium", "Medium", "P2", "Human rubric/evals", "structural QA only"]]},
        {"name": "Security Workstream", "summary": "Các task security/privacy có acceptance cụ thể", "headers": ["ID", "Task", "Priority", "Dependency", "Acceptance"], "rows": [["SEC-01", "Remove tracked runtime payload", "P0", "Backup decision", "No user/base64 data in Git"], ["SEC-02", "Remove/rotate demo credential", "P0", "Auth UX", "No plaintext password in bundle"], ["SEC-03", "Auth/bound Telegram export", "P0", "JWT owner model", "Count/size/rate tests pass"], ["SEC-04", "Private Storage + signed URL", "P1", "Schema object_path", "No public portrait URL"], ["SEC-05", "Privacy notice/consent", "P1", "Product/legal", "Provider + retention disclosed"]]},
        {"name": "Data Workstream", "summary": "Durability, schema và retention backlog", "headers": ["ID", "Task", "Priority", "Blocked by", "Done evidence"], "rows": [["DATA-01", "Version base schema/FKs", "P1", "Confirm Supabase schema", "Migration from clean project"], ["DATA-02", "Version RLS/bucket policies", "P1", "DATA-01", "Policy integration tests"], ["DATA-03", "Durable job/artifact store", "P1", "Deployment target", "Restart/multi-worker test"], ["DATA-04", "Object retention/delete cascade", "P1", "Private storage", "Soft delete lifecycle test"], ["DATA-05", "Telegram durable TTL queue", "P1", "SEC-03", "Atomic claim + retry test"]]},
        {"name": "Test Workstream", "summary": "Coverage gaps được chuyển thành deliverable", "headers": ["ID", "Layer", "Priority", "Scenario", "Gate"], "rows": [["TEST-01", "Frontend unit", "P1", "Face gate 0/1/>1, timeout, stale/clear", "CI"], ["TEST-02", "Browser E2E", "P1", "Face reject no POST; auth/upload/poll/gallery/docs", "CI/manual"], ["TEST-03", "Supabase integration", "P1", "Owner/RLS/storage lifecycle", "Staging"], ["TEST-04", "Telegram integration", "P1", "Auth/bounds/claim/retry", "Sandbox bot"], ["TEST-05", "Provider canary", "P2", "One canonical + one sheet", "Budgeted manual"]]},
        {"name": "Release Gates", "summary": "Điều kiện trước demo nội bộ và public release", "headers": ["Gate", "Internal demo", "Public release", "Status"], "rows": [["Backend tests", "75 pass", "Pass + coverage monitored", "Current pass"], ["Frontend", "Lint/build", "Unit + E2E + a11y", "Partial"], ["Secrets/runtime data", "No print", "P0 cleanup + rotation", "Blocker"], ["Schema/RLS", "External config acceptable", "Versioned + tested", "Blocker"], ["Provider", "Manual smoke", "Budget/telemetry/fallback", "Partial"], ["Privacy", "Team notice", "User consent/retention policy", "Blocker"]]},
    ],
    "uiux": [
        {"name": "Design Tokens", "summary": "Token visual đang dùng và quy tắc áp dụng cho docs hub", "headers": ["Token", "Value", "Usage", "Accessibility"], "rows": [["Ink", "#0F172A", "Headings/text", "High contrast on white"], ["Primary", "#5B3DF5", "CTA/selected state", "Pair with label/icon"], ["Primary dark", "#4338CA", "Headers", "White text"], ["Pink", "#DB2777", "Accent/API", "Do not use alone"], ["Surface", "glass/white", "Cards/viewer", "Visible border/shadow"], ["Risk", "#DC2626", "Rejected/gap", "Icon + text + not color-only"]]},
        {"name": "Generation States", "summary": "Chi tiết UI state, content và primary action", "headers": ["State", "Primary content", "Primary action", "Persistence", "Accessibility"], "rows": [["idle", "Uploader/style picker", "Generate", "Selected style in hook", "File label + validation"], ["processing", "5 steps/progress/previews", "Wait", "session active job id", "status announcements"], ["completed", "20 cards/gallery", "Download/export/new", "pack data in state", "Alt/title/button labels"], ["error rejected", "raw comparison", "Thử Lại Ngay", "active job cleared on reset", "Error role/focus"], ["error provider", "safe message", "Thử Lại Ngay", "same reset", "No raw provider secret"]]},
        {"name": "Auth & History", "summary": "Modal states, ownership and empty/error handling", "headers": ["Surface", "Trigger", "States", "Owner rule", "Gap"], "rows": [["Auth modal", "Generate as guest/header", "login/register/demo", "Supabase token", "Demo credential hard-coded"], ["History modal", "Authenticated header", "loading/empty/list/error", "current JWT only", "Persistence best-effort"], ["Delete", "Pack action", "confirm/success/error", "pack id + user filter", "Storage objects remain"], ["Logout", "Header/menu", "reset generator", "clear tokens", "localStorage XSS boundary"]]},
        {"name": "Gallery & Export", "summary": "Sticker card, download và Telegram export behavior", "headers": ["Feature", "Input", "Feedback", "Error handling", "Constraint"], "rows": [["Sticker card", "data/storage URL", "preview/title/tags", "broken image fallback", "512px output"], ["Favorite", "local state", "heart state", "UI only", "not persisted"], ["Download", "PNG data/URL", "browser download", "per-file fallback", "Cross-origin URLs"], ["Telegram", "20 base64 PNG", "QR/deep link/progress", "frontend mock fallback", "API currently localhost/public"]]},
        {"name": "Responsive QA", "summary": "Viewport matrix và visual acceptance", "headers": ["Viewport", "Layout", "Critical checks", "Status"], "rows": [["1440 desktop", "sidebar + viewer", "No overflow; visual full-width", "Manual"], ["1024 tablet", "narrow two-column", "Download/header wrap", "Manual"], ["768 tablet", "stacked workspace", "Doc picker remains usable", "Manual"], ["390 mobile", "single column", "Visual horizontal scroll/expand", "Manual"], ["200% zoom", "reflow", "No clipped controls/text", "Planned"]]},
    ],
    "tdd": [
        {"name": "Coverage Dashboard", "summary": "Số case backend theo module đã thu thập", "headers": ["Module group", "Cases", "Automation boundary"], "rows": [["Grouped generation", 18, "Fake provider/fixtures"], ["Pipeline service", 10, "Fake provider/Supabase mocks"], ["Stickers API", 9, "TestClient"], ["Prompts", 9, "Pure unit"], ["Providers", 14, "HTTP mocks"], ["Other generation", 15, "Unit/CLI fixtures"]], "chart": {"type": "bar", "title": "Backend test cases by group", "categoryColumn": 0, "valueColumns": [1]}},
        {"name": "Unit Matrix", "summary": "Unit contracts và missing negative cases", "headers": ["Unit", "Covered", "Missing", "Priority"], "rows": [["Prompts", "cell map/reserve/invalid", "instruction length/model variation", "P2"], ["Identity", "used indirectly", "metadata/max-side explicit", "P2"], ["Postprocess", "border removal/determinism", "complex alpha/background", "P2"], ["Grid gate", "shift/3×2/crossing", "lower-density wrong grid", "P1"], ["Frontend hooks", "None", "all state transitions", "P1"]]},
        {"name": "API Matrix", "summary": "Endpoint scenarios và owner/security coverage", "headers": ["Endpoint", "Happy", "Auth/owner", "Validation", "Gap"], "rows": [["/auth/login", "Manual", "Supabase", "schema", "No tests"], ["/auth/register", "Manual", "admin auto-confirm", "duplicate/format", "No tests"], ["/stickers/generate", "Covered", "Bearer", "MIME/format/key", "No real storage"], ["/jobs/{id}", "Covered", "Owner-bound", "cache", "No restart"], ["/retry", "Covered", "Owner/max retry", "rejected only", "UI unwired"], ["/telegram/export", "None", "Current public", "No payload bounds", "P0"]]},
        {"name": "Integration Gaps", "summary": "External contracts chưa được chứng minh trong CI", "headers": ["Integration", "Current test", "Missing evidence", "Safe test strategy"], "rows": [["Supabase Auth", "Mock/client assumptions", "token/UUID/error contract", "Ephemeral staging project"], ["Postgres/RLS", "No policy tests", "owner isolation under anon/admin", "Migration + integration suite"], ["Storage", "Mock URLs", "private/signed/delete lifecycle", "Staging bucket"], ["Image provider", "HTTP mocks", "multi-ref/grid/cost", "Budgeted 2-call canary"], ["Telegram", "None", "claim/create/add/retry", "Sandbox bot + fixture pack"]]},
        {"name": "E2E Plan", "summary": "Browser scenarios cần tự động hóa mà không gọi paid API", "headers": ["Scenario", "Provider mode", "Assertions", "Viewport"], "rows": [["Face gate", "Local MediaPipe", "0 reject; 1 verified; >1 reject; reject no POST", "375/390/1440"], ["Guest generate", "Mock backend", "Auth modal; no POST", "390/1440"], ["Happy generation", "Fixture job", "progress → exactly 20 cards", "1440"], ["Rejected output", "Fixture raw preview", "CTA clears state → Upload", "390/1440"], ["History owner", "Fixture API", "open/list/delete", "1440"], ["Docs hub", "Static manifest", "12 files, visuals, downloads", "390/1440"]]},
        {"name": "Security Tests", "summary": "Abuse/misconfiguration cases và expected control", "headers": ["Case", "Layer", "Expected", "Status"], "rows": [["Missing/spoofed Bearer", "API", "401", "Partial"], ["Cross-owner job", "API/service", "404/deny", "Covered"], ["Oversized/decompression image", "Upload", "413/422", "Partial"], ["Telegram base64 flood", "API", "413/429", "Missing"], ["Service-role leak scan", "Build/repo", "No secret in output", "Manual"], ["RLS bypass owner", "Database", "Deny anon; backend filters", "Missing"]]},
    ],
    "database": [
        {"name": "Data Model Summary", "summary": "Entity/relationship inventory với mức độ bằng chứng", "headers": ["Entity", "Key", "Relationship", "Evidence", "Confidence"], "rows": [["auth.users", "id UUID", "1→N sticker_packs", "Supabase Auth user.id", "Inferred external"], ["sticker_packs", "id inferred", "N→1 user; 1→N stickers", "insert/query/migration", "Mixed I/F"], ["stickers", "id inferred", "N→1 pack", "insert/query", "Mixed I/F"], ["storage.objects", "object path", "loose via image_url", "upload/get_public_url", "Implemented/config-dependent"], ["EphemeralJob", "job_id", "owner map", "RAM dictionaries", "Implemented non-DB"]]},
        {"name": "Relationships", "summary": "Cardinality, FK status và delete behavior", "headers": ["Parent", "Child", "Cardinality", "FK in repo", "Delete behavior", "Target"], "rows": [["auth.users", "sticker_packs", "1:N semantic", "No", "Unknown", "FK ON DELETE CASCADE"], ["sticker_packs", "stickers", "1:N semantic", "No", "Unknown", "FK ON DELETE CASCADE"], ["stickers", "storage object", "N:0..1 loose", "No", "Soft delete leaves object", "object_path + lifecycle"], ["user", "EphemeralJob", "1:N runtime", "N/A", "TTL/temp cleanup", "Durable shared store if scaled"]]},
        {"name": "RLS Target", "summary": "Policy design đề xuất; chưa được triển khai/version-control", "headers": ["Table/object", "Operation", "Policy predicate", "Writer", "Status"], "rows": [["sticker_packs", "SELECT/UPDATE/DELETE", "auth.uid() = user_id", "Authenticated user/backend", "Recommended"], ["sticker_packs", "INSERT", "Backend service only or auth.uid=user_id", "Backend", "Recommended"], ["stickers", "SELECT", "EXISTS owned parent pack", "Authenticated user/backend", "Recommended"], ["stickers", "INSERT/UPDATE/DELETE", "Service-only", "Backend", "Recommended"], ["storage inputs/outputs", "READ", "owner prefix + signed URL", "Backend", "Recommended"]]},
        {"name": "Storage Objects", "summary": "Object naming, linkage, access và lifecycle gap", "headers": ["Artifact", "Current path/link", "Access", "Lifecycle", "Gap"], "rows": [["Selfie", "uploads/{uuid}_{file_name}", "public URL returned", "No explicit retention", "No DB row/cleanup"], ["Sticker output", "same uploads prefix", "public URL → image_url", "soft delete leaves object", "No object_path"], ["Temp canonical/raw/crops", "OS temp/job", "backend process", "TTL/retention cleanup", "lost on restart"], ["Telegram pack", "pending JSON base64", "local process", "claimed early/no abandoned TTL", "Tracked/runtime data risk"]]},
        {"name": "Retention & Deletion", "summary": "As-is behavior và policy cần chốt", "headers": ["Data", "Current delete", "Required SLA", "Implementation task", "Verification"], "rows": [["Pack row", "soft-delete flag/timestamp", "TBD", "Document retention policy", "Migration invariant test"], ["Sticker rows", "Not explicitly deleted", "Follow parent", "Cascade/FK or controlled cleanup", "Integration test"], ["Storage outputs", "Not deleted", "Follow pack policy", "Object lifecycle/delete job", "Bucket test"], ["Selfie", "Temp cleanup only; Storage remains", "Shortest practical", "Failed/success cleanup", "Object inventory audit"], ["Telegram pending", "Removed on claim", "TTL for abandoned", "Durable TTL queue", "Clock/claim tests"]]},
    ],
}


FACE_GATE_DOCX_EXTRA = {
    "project-charter": [
        {
            "title": "14. Baseline gate đúng một khuôn mặt",
            "type": "table",
            "headers": ["Điều kiện", "Hành vi đã triển khai", "Giá trị", "Giới hạn"],
            "rows": [
                ["0 khuôn mặt được phát hiện", "Từ chối cục bộ, hiển thị hướng dẫn chọn ảnh chân dung", "Không tạo job/không phát sinh image call", "Client-only; direct API có thể bypass"],
                ["Đúng 1 khuôn mặt được phát hiện", "Đọc preview, gắn trạng thái verified và cho phép Generate", "Giảm upload nhầm trước bước trả phí", "Không chứng minh identity, liveness hay likeness"],
                [">1 khuôn mặt được phát hiện", "Từ chối cục bộ và báo số mặt", "Giữ contract một chủ thể đầu vào", "Mặt nhỏ/che khuất có thể không được đếm"],
                ["Worker/model/timeout lỗi", "Fail closed; yêu cầu tải lại và thử lại", "Không silently bypass gate", "Phụ thuộc Web Worker, createImageBitmap, WASM CDN"],
            ],
        }
    ],
    "srs": [
        {
            "title": "15. Exact-one-face input gate",
            "type": "table",
            "headers": ["ID", "Requirement", "As-is implementation", "Verification/constraint"],
            "rows": [
                ["FG-FR-01", "Chỉ accept ảnh khi detector trả đúng một khuôn mặt", "useImageUpload gọi detectFaceCount sau MIME/15 MiB", "0 reject; 1 pass; >1 reject"],
                ["FG-FR-02", "Không block main thread", "Module Web Worker nhận transferred ImageBitmap", "Worker đóng bitmap ở finally"],
                ["FG-FR-03", "Fail closed khi runtime lỗi", "45 giây timeout; worker/message error reset singleton", "Không gọi onStartGeneration"],
                ["FG-NFR-01", "Không GPU và không paid vision API", "MediaPipe Tasks Vision 1.0.1, CPU/WASM", "Model TFLite cùng origin; WASM từ jsDelivr"],
                ["FG-SEC-01", "Preflight không gửi selfie ra khỏi thiết bị", "Detector chạy local trong browser", "Ảnh accepted vẫn sang backend/provider khi user Generate"],
                ["FG-GAP-01", "Authoritative server enforcement", "Chưa triển khai", "Direct API vẫn chỉ có MIME/size/decode guard"],
            ],
        }
    ],
    "input-validation": [
        {
            "title": "12. Gate đúng một khuôn mặt trong browser",
            "type": "table",
            "headers": ["Lớp", "Rule/config", "Pass", "Reject/failure", "Không chứng minh"],
            "rows": [
                ["Technical file", "JPEG/PNG/WebP; ≤15 MiB", "Bắt đầu face check", "Inline file error", "Nội dung ảnh"],
                ["MediaPipe model", "BlazeFace short-range; IMAGE; CPU; confidence 0.6; suppression 0.3", "detections.length = 1", "0 hoặc >1 mặt", "Đúng một người, identity, liveness"],
                ["Runtime", "Worker singleton; request id; timeout 45 giây", "Trả faceCount mới nhất", "Fail closed; reset worker", "Khả dụng tuyệt đối của CDN/browser"],
                ["Privacy", "ImageBitmap transfer; model local; WASM runtime CDN", "Không upload trong preflight", "Không tạo job khi reject", "Ảnh accepted không rời thiết bị sau khi Generate"],
                ["Authoritative API", "Chưa có server face detector", "Backend vẫn kiểm MIME/bytes/decode/40 MP", "Direct caller bypass client gate", "Semantic face/person policy"],
                ["Browser memory", "createImageBitmap xảy ra trước backend 40 MP guard", "Ảnh thường xử lý cục bộ", "Ảnh nén có pixel cực lớn có thể gây memory pressure", "Decompression safety hoàn chỉnh"],
            ],
        }
    ],
    "output-quality": [
        {
            "title": "14. Phân biệt input face gate và output quality",
            "type": "table",
            "headers": ["Gate", "Đo cái gì", "Thời điểm", "Pass không có nghĩa là", "Owner"],
            "rows": [
                ["Input exact-one-face", "Số khuôn mặt BlazeFace phát hiện", "Trước auth/generate POST", "Đúng người, ảnh đủ toàn thân, identity/liveness", "Frontend browser"],
                ["Output structural QA", "Kích thước, gutter, crossing, occupancy", "Sau mỗi raw sheet", "Giống selfie, tay đúng, không watermark/OCR", "Backend grouped generator"],
                ["Manual acceptance", "Identity, anatomy, pose, thẩm mỹ", "Trước sử dụng/xuất", "Cam kết SLA tự động", "Người dùng/QA"],
            ],
        }
    ],
    "source-security-operations": [
        {
            "title": "16. MediaPipe browser gate: security và vận hành",
            "type": "table",
            "headers": ["Control/asset", "Current implementation", "Release check", "Residual risk"],
            "rows": [
                ["Package", "@mediapipe/tasks-vision 1.0.1 được pin", "Lockfile exact version; dependency audit", "Supply-chain/CDN availability"],
                ["Model", "public/models/blaze_face_short_range.tflite; SHA-256 documented", "Model tồn tại trong dist và hash khớp", "Model face detector, không phải person/liveness classifier"],
                ["WASM", "Pinned jsDelivr path; CPU delegate", "CSP/network cho CDN; browser smoke", "CDN lỗi làm gate fail closed"],
                ["Worker lifecycle", "Singleton, request map, bitmap close, 45s timeout", "0/1/2-face matrix; console sạch", "Chưa có automated unit/E2E"],
                ["Trust boundary", "Rejected input không POST qua UI chính", "Network assertion no generate POST", "Direct API bypass; backend chưa semantic revalidate"],
            ],
        }
    ],
    "sla": [
        {
            "title": "14. Face gate: chi phí, khả dụng và giới hạn",
            "type": "table",
            "headers": ["Chỉ số/điều kiện", "Baseline hiện tại", "Chi phí", "SLA/giới hạn"],
            "rows": [
                ["Execution", "CPU/WASM trong browser; không server GPU", "$0 cho vision gate", "Phụ thuộc năng lực thiết bị/browser"],
                ["Model/runtime", "TFLite local khoảng 230 KB; WASM CDN khoảng 11.8 MB lần đầu", "$0 API", "Cache trình duyệt; CDN/network có thể lỗi"],
                ["Timeout", "45 giây mỗi request detector", "$0 khi reject", "Timeout fail closed; không tạo paid generation job"],
                ["Input contract", "Đúng một khuôn mặt được detector nhận diện", "Tránh 4 image calls khi 0/>1 bị chặn", "Không cam kết identity, likeness, liveness hoặc full-person"],
                ["Telemetry", "Chưa có dashboard acceptance/error/latency", "Savings thực tế = TBD", "Không tự suy diễn tiền tiết kiệm"],
                ["Enforcement", "UX gate phía client", "$0", "Direct API không thuộc bảo đảm semantic này"],
            ],
        }
    ],
}


FACE_GATE_XLSX_EXTRA = {
    "prd": [
        {
            "name": "Face Gate Requirements",
            "summary": "Yêu cầu sản phẩm cho preflight đúng một khuôn mặt chạy cục bộ và không phát sinh chi phí",
            "headers": ["ID", "Requirement", "Acceptance", "Status", "Evidence"],
            "rows": [
                ["FG-01", "Chỉ accept detections.length = 1", "0 reject; 1 verified; >1 reject", "Implemented", "useImageUpload.ts"],
                ["FG-02", "Không gửi ảnh ra ngoài trong preflight", "Worker xử lý ImageBitmap local", "Implemented", "faceDetector.worker.ts"],
                ["FG-03", "Không GPU/paid vision API", "CPU/WASM; không API key", "Implemented", "public/models/README.md"],
                ["FG-04", "Fail closed khi unsupported/timeout", "Không có preview/file hợp lệ và không Generate", "Implemented", "faceDetectionService.ts"],
                ["FG-05", "Không đổi generation contract", "onStartGeneration chỉ chạy sau verified", "Implemented", "ImageUploader.tsx"],
                ["FG-06", "Authoritative backend check", "Direct API cũng bị semantic gate", "Gap", "Chưa có server detector"],
                ["FG-07", "Metrics", "Latency/accept/reject/error rate", "TBD", "Chưa có telemetry"],
            ],
        }
    ],
    "architecture": [
        {
            "name": "Face Gate Architecture",
            "summary": "Component, dữ liệu, dependency và failure boundary của detector browser",
            "headers": ["Layer", "Component/data", "Responsibility", "Failure behavior", "Deployment"],
            "rows": [
                ["UI", "ImageUploader + useImageUpload", "State idle/checking/verified; copy/CTA", "Reject inline; stale result ignored", "Vite static"],
                ["Service", "faceDetectionService", "Worker singleton, request map, 45s timeout", "Terminate/reset; reject pending", "Browser runtime"],
                ["Worker", "faceDetector.worker", "MediaPipe detect on transferred ImageBitmap", "Fail closed; bitmap close", "Module worker chunk"],
                ["Model", "BlazeFace short-range TFLite", "Human face detections", "Missing model rejects", "Same-origin public/models"],
                ["WASM", "MediaPipe Tasks Vision 1.0.1", "CPU inference runtime", "CDN/network error rejects", "Pinned jsDelivr URL"],
                ["API", "FastAPI generate", "Unchanged multipart/JWT contract", "No server semantic check", "Separate backend"],
            ],
        }
    ],
    "backlog": [
        {
            "name": "Face Gate Backlog",
            "summary": "Đã triển khai browser MVP và các hạng mục còn lại để chống bypass/đo chất lượng",
            "headers": ["ID", "Task", "Priority", "Status", "Acceptance"],
            "rows": [
                ["FG-IMP-01", "Browser CPU/WASM exact-one-face gate", "P1", "Done", "0/1/2 browser matrix pass; no GPU/paid API"],
                ["FG-TEST-01", "Unit test service/hook race + timeout", "P1", "Next", "Stale/clear/same-file/fail-closed covered"],
                ["FG-E2E-01", "Browser network assertion", "P1", "Next", "Reject path never POSTs /stickers/generate"],
                ["FG-BE-01", "Decide authoritative backend face detector", "P1", "Gap", "Direct API policy documented/enforced"],
                ["FG-SUPPLY-01", "Self-host/fallback WASM decision", "P2", "Later", "CDN incident runbook"],
                ["FG-METRIC-01", "Latency/false-reject metrics", "P2", "Later", "TBD thresholds from real telemetry"],
            ],
        }
    ],
    "uiux": [
        {
            "name": "Face Gate UX",
            "summary": "Upload states, copy, accessibility và responsive behavior cho detector local",
            "headers": ["State", "Visual/copy", "Allowed action", "Accessibility", "Exit"],
            "rows": [
                ["idle", "Chọn ảnh chân dung đúng một khuôn mặt", "Picker/drop/style", "Keyboard upload control", "checking"],
                ["checking", "Spinner + filename + local/privacy note", "Upload/style/generate locked", "aria-busy + live status", "verified/error"],
                ["verified", "Green shield + filename/size", "Generate or clear", "Text + icon, not color only", "processing/idle"],
                ["0 face", "Không tìm thấy khuôn mặt", "Chọn lại", "role=alert", "idle"],
                [">1 face", "Báo số khuôn mặt", "Chọn lại", "role=alert", "idle"],
                ["runtime error", "Không thể kiểm tra; reload/retry", "Không Generate", "assertive error", "idle"],
                ["responsive", "Filename/message wrap", "Touch upload", "No horizontal overflow", "375/390 QA"],
            ],
        }
    ],
    "tdd": [
        {
            "name": "Face Gate Test Matrix",
            "summary": "Manual evidence hiện tại và regression cases cần tự động hóa",
            "headers": ["Case", "Expected verdict", "UI assertion", "Network assertion", "Automation"],
            "rows": [
                ["0 human face", "Reject", "Inline no-face error; no preview", "No generate POST", "Manual pass; E2E gap"],
                ["Exactly 1 detected face", "Accept", "Verified shield + preview", "Generate allowed", "Manual pass; E2E gap"],
                ["2 detected faces", "Reject", "Count error; no preview", "No generate POST", "Manual pass; E2E gap"],
                ["Worker/WASM/model error", "Reject", "Fail-closed error", "No generate POST", "Unit/E2E gap"],
                ["45s timeout", "Reject", "Worker reset", "No generate POST", "Unit gap"],
                ["Stale request/clear", "Ignore old result", "Newest state only", "No unintended POST", "Unit gap"],
                ["Direct API no-person image", "Outside client gate", "N/A", "Backend currently may accept", "Backend gap"],
            ],
        }
    ],
    "database": [
        {
            "name": "Face Gate Data Impact",
            "summary": "Ảnh reject không đi tới dữ liệu server qua UI chính; accepted/direct API lifecycle giữ nguyên",
            "headers": ["Condition", "Client state", "Server/storage impact", "Privacy meaning", "Residual gap"],
            "rows": [
                ["0 face", "Rejected local", "No standard-UI upload/job", "Ảnh ở thiết bị", "Direct API bypass"],
                [">1 face", "Rejected local", "No standard-UI upload/job", "Ảnh ở thiết bị", "False count possible"],
                ["1 face verified, not generated", "Preview local", "No upload yet", "Ảnh ở thiết bị", "Browser memory only"],
                ["1 face + Generate", "Generation processing", "Source upload + provider refs", "Existing consent/retention applies", "Public URL/cleanup gaps unchanged"],
                ["Detector failure", "Fail closed", "No standard-UI upload/job", "No external transfer", "CDN/browser availability"],
            ],
        }
    ],
}


def upsert_items(items: list[dict], extras: list[dict], key: str) -> None:
    """Insert generated details or replace their prior generated version by key."""
    positions = {item.get(key): index for index, item in enumerate(items)}
    for extra in extras:
        position = positions.get(extra.get(key))
        if position is None:
            positions[extra.get(key)] = len(items)
            items.append(extra)
        else:
            items[position] = extra


def refresh_snapshot_text(value):
    """Keep embedded prose/tables aligned with the current verified snapshot."""
    if isinstance(value, dict):
        return {key: refresh_snapshot_text(item) for key, item in value.items()}
    if isinstance(value, list):
        return [refresh_snapshot_text(item) for item in value]
    if isinstance(value, str):
        return value.replace("c09e26a", "4d23b9a").replace("2026-08-09", "2026-08-10")
    return value


def main() -> None:
    payload = refresh_snapshot_text(json.loads(MANIFEST.read_text(encoding="utf-8")))
    index = json.loads(FIGURE_INDEX.read_text(encoding="utf-8"))
    payload["schemaVersion"] = "2.0"
    payload["meta"]["version"] = "1.1"
    payload["meta"]["commit"] = "4d23b9a"
    payload["meta"]["verifiedAt"] = "2026-08-10"
    payload["meta"]["verification"] = [
        "Backend: 75 tests passed; provider trong test được mock, không gọi API ảnh trả phí.",
        "Frontend: lint và production build đều đạt sau khi thêm MediaPipe face gate.",
        "Browser QA: 0 mặt bị reject, đúng 1 mặt được verified, 2 mặt bị reject; viewport 375x667 không tràn ngang.",
        "Không đọc .env, secret, ảnh người dùng hoặc payload base64 runtime.",
    ]
    payload["meta"]["sourceSnapshot"] = {
        "branch": payload["meta"]["branch"],
        "commit": payload["meta"]["commit"],
        "workingTreeIncluded": True,
        "includedChanges": [
            "Documentation Hub",
            "Responsive docs UI",
            "MediaPipe exact-one-face browser gate",
            "Face gate documentation and diagrams",
        ],
    }
    payload["meta"]["verificationStats"] = {
        "backendTests": 75,
        "backendWarnings": 25,
        "frontendLint": "passed",
        "frontendBuild": "passed",
        "faceGateBrowserCases": 3,
        "faceGateViewport": "375x667",
        "paidApiCalls": 0,
    }
    payload["meta"]["faceGate"] = {
        "status": "implemented-client-side",
        "rule": "Accept only when MediaPipe detections.length equals 1.",
        "runtime": "Browser CPU/WebAssembly in a module Web Worker.",
        "cost": "No server GPU and no paid vision API.",
        "privacy": "Rejected input remains on-device in the standard UI flow.",
        "boundary": "Client UX/spend guard only; direct backend API calls can bypass it.",
    }
    payload["meta"]["visualPolicy"] = (
        "Sơ đồ vector được dựng mới từ source hiện tại và lưu SVG editable; ảnh mẫu/ảnh AI/ảnh người dùng không được tái sử dụng."
    )
    payload["meta"]["figmaSource"] = {
        "page": "Documentation Diagrams – Web v5",
        "url": "https://www.figma.com/design/RZJ594RY1AAAPEHm30vWfb/GenSticker-%E2%80%93-Mobile-MVP-UI-UX?node-id=42-2&p=f",
        "note": "Local assets/figures/figma-board.svg is the canonical updated vector board; source-derived diagrams only.",
    }
    payload["figures"] = {}
    for item in index:
        detail = {**FIGURE_DETAILS[item["id"]], **FACE_GATE_FIGURE_DETAILS.get(item["id"], {})}
        payload["figures"][item["id"]] = {
            **item,
            **detail,
            "statusLegend": ["Implemented", "Inferred", "Gap/Risk", "Recommended"],
        }

    ascii_assets = {
        "project-charter": "originals/01-project-charter.docx",
        "prd": "originals/02-prd.xlsx",
        "srs": "originals/03-srs.docx",
        "architecture": "originals/04-architecture.xlsx",
        "backlog": "originals/05-backlog.xlsx",
        "uiux": "originals/06-uiux.xlsx",
        "tdd": "originals/07-tdd.xlsx",
        "database": "originals/08-database.xlsx",
        "input-validation": "originals/09-input-validation.docx",
        "output-quality": "originals/10-output-quality.docx",
        "source-security-operations": "originals/11-source-security-operations.docx",
        "sla": "originals/12-sla.docx",
    }
    for document in payload["documents"]:
        document["assetPath"] = ascii_assets[document["id"]]
        document["visuals"] = VISUALS.get(document["id"], [])
        document["searchTerms"] = [document["title"], document["subtitle"], document["category"]]
        if document["kind"] == "DOCX":
            upsert_items(document.setdefault("sections", []), DOCX_EXTRA.get(document["id"], []), "title")
            upsert_items(document.setdefault("sections", []), FACE_GATE_DOCX_EXTRA.get(document["id"], []), "title")
            for section in document["sections"]:
                for row in section.get("rows", []):
                    if row and row[0] == "Phiên bản":
                        row[1] = payload["meta"]["version"]
        else:
            if document["id"] == "prd":
                requirements = next(
                    (sheet for sheet in document.setdefault("sheets", []) if sheet.get("name") == "Requirements"),
                    None,
                )
                if requirements is not None:
                    if requirements["headers"][-1] != "Implementation class":
                        requirements["headers"].append("Implementation class")
                    if not any(row[0] == "PRD-015" for row in requirements["rows"]):
                        requirements["rows"].append([
                            "PRD-015",
                            "Input gate",
                            "Kiểm tra đúng một khuôn mặt trong browser trước generation",
                            "0 mặt reject; 1 mặt verified; >1 mặt reject; failure fail closed",
                            "Must",
                            "Có",
                            "frontend/src/hooks/useImageUpload.ts; frontend/src/workers/faceDetector.worker.ts",
                            "Implemented",
                        ])
                    for row in requirements["rows"]:
                        status = str(row[5]).strip()
                        classification = "Implemented" if status == "Có" else "Gap" if status == "Chưa có" else "Partial"
                        if len(row) == len(requirements["headers"]):
                            row[-1] = classification
                        else:
                            row.append(classification)
            upsert_items(document.setdefault("sheets", []), XLSX_EXTRA.get(document["id"], []), "name")
            upsert_items(document.setdefault("sheets", []), FACE_GATE_XLSX_EXTRA.get(document["id"], []), "name")

    MANIFEST.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Enriched manifest schema 2.0: {len(payload['documents'])} documents, {len(payload['figures'])} figures")


if __name__ == "__main__":
    main()
