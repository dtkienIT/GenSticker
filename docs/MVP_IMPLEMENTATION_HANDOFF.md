# Bàn giao Triển khai MVP — Duhat Gen Sticker V1

## 0. Kiểm soát tài liệu

| Trường | Giá trị |
| --- | --- |
| Mã tài liệu | HANDOFF-DGS-V1 |
| Phiên bản | 1.0 |
| Ngày chốt chuẩn | 18/08/2026 |
| Sản phẩm | Duhat Gen Sticker — ứng dụng web full-stack |
| Branch | `duhat-android` |
| Nguồn yêu cầu | `SRS_Sticker_Generation_V1_VI.md` v1.0 |
| Nguồn kiến trúc | `Software_Architecture_Technical_Design.md` v1.0 |
| Nguồn sản phẩm | PRD tiếng Việt, bất biến |
| Trạng thái bàn giao | MVP hoạt động; nhiều yêu cầu V1 đã triển khai |

Tài liệu này bàn giao mã nguồn hiện tại và xác định khoảng cách so với SRS mục tiêu.

## 1. Kết quả cần đạt và điều kiện bất biến

Mục tiêu V1 phải chứng minh xuyên suốt toàn bộ luồng:

1. Chọn ảnh từ thư viện hoặc chụp selfie từ camera.
2. Đồng ý xác nhận quyền sở hữu ảnh trước khi tạo.
3. Kiểm tra hợp lệ AI: face count, clarity, quality, safety.
4. Đúng một người có một khuôn mặt rõ.
5. Người dùng chủ động bấm Generate sau consent.
6. Khi thành công, trả đúng 8 sticker Chibi 2D kawaii.
7. Ảnh đầu ra tách nền, phủ viền trắng die-cut.
8. Người dùng xem trước/chọn/lưu và tạo lại (tối đa 3 lần).
9. Phần đã lưu nằm trong IndexedDB và có thể mở lại trong Tray.
10. Người dùng tải PNG đơn hoặc ZIP pack.
11. Người dùng xóa pack/sticker và báo cáo nội dung.

Điều kiện bất biến: thiếu consent → không tạo; chưa đạt validation → không generate;
sticker bị filter → không hiển thị; lưu yêu cầu chọn ≥ 1 sticker.

## 2. Hiện trạng kho mã nguồn

### 2.1 Đã triển khai đầy đủ

| Hạng mục | Hiện trạng | Vị trí mã nguồn |
| --- | --- | --- |
| **Frontend Framework** | Vite + React 18 + TypeScript, mobile-first responsive | `frontend/` |
| **Wizard 5 bước** | Landing → Upload → Generating → Preview → Tray | `frontend/src/pages/` |
| **Upload ảnh** | Drag & drop + file picker (JPEG/PNG/WebP, ≤ 10 MB) | `frontend/src/pages/UploadPage.tsx` |
| **Camera capture** | getUserMedia, facingMode: user, face guide overlay | `frontend/src/components/CameraModal.tsx` |
| **Client validation** | File type + size check | `frontend/src/pages/UploadPage.tsx` |
| **Server AI validation** | Multi-provider: Gemini/OpenAI/Cloudflare Vision | `backend/validators.py` |
| **Consent modal** | Checkbox bắt buộc + Continue/Cancel | `frontend/src/components/ConsentModal.tsx` |
| **SSE Generation** | 8 parallel asyncio tasks, progressive streaming | `backend/main.py`, `frontend/src/services/api.ts` |
| **AI Multi-Provider** | Gemini (`gemini-3.1-flash-image`), OpenAI (`dall-e-3`), Cloudflare (`flux-1-schnell`) | `backend/main.py`, `backend/cloudflare_provider.py`, `backend/openai_provider.py` |
| **Chibi Prompt System** | 8 biểu cảm cố định, giữ đặc trưng nhận diện | `backend/prompts.py` |
| **Background Removal** | rembg U-2-Net + flood fill fallback + interior hole preservation + die-cut border | `backend/bg_remover.py` |
| **Preview & Selection** | Grid 8 sticker, checkbox, Select All/Deselect All | `frontend/src/pages/PreviewPage.tsx` |
| **Regenerate** | Tối đa 3 lượt/phiên, counter state | `frontend/src/App.tsx` |
| **Save to IndexedDB** | Blob storage + metadata localStorage | `frontend/src/services/storage.ts` |
| **Tray management** | List packs, expand, download PNG/ZIP, delete sticker/pack | `frontend/src/pages/TrayPage.tsx` |
| **Report modal** | 4 danh mục vi phạm + textarea chi tiết | `frontend/src/components/ReportModal.tsx` |
| **i18n bilingual** | EN/VI toggle, 47 keys mỗi ngôn ngữ | `frontend/src/i18n/` |
| **Analytics** | In-memory event tracking (10+ event types) | `frontend/src/services/analytics.ts` |
| **Text Compositor** | Canvas HTML5 text banner compositing | `frontend/src/services/textCompositor.ts` |
| **DUHAT Design System** | Màu thương hiệu, typography, spacing, animations | `DESIGN.md`, `frontend/src/index.css` |
| **StickerCard component** | Skeleton/loaded/selected states, menu actions | `frontend/src/components/StickerCard.tsx` |
| **Health check API** | `/api/health` trả provider + models | `backend/main.py` |
| **Android shell** | Gradle project, Compose, OkHttp, Coil | `android_app/` |
| **APK build** | `duhat-ai-debug.apk` (20.4 MB) | Root |

### 2.2 Chi tiết triển khai Backend

| Module | File | Chức năng |
| --- | --- | --- |
| `main.py` | 228 dòng | FastAPI app, CORS, 3 endpoints, SSE generator, provider dispatch |
| `models.py` | 37 dòng | Pydantic schemas: ValidationRequest/Result, GenerateResult, ExpressionConfig, PackGenerateRequest |
| `prompts.py` | 101 dòng | 8 EXPRESSIONS config, `get_sticker_prompt()`, VALIDATION_PROMPT |
| `validators.py` | 139 dòng | Multi-provider validation: Gemini/CF/OpenAI, structured safety/quality/face checks |
| `bg_remover.py` | 179 dòng | 4-stage pipeline: rembg → flood fill → fail-safe → die-cut border |
| `cloudflare_provider.py` | 97 dòng | Cloudflare Workers AI adapter (vision + generation) |
| `openai_provider.py` | 97 dòng | OpenAI API adapter (vision + generation) |

### 2.3 Chi tiết triển khai Frontend

| Module | File | Chức năng |
| --- | --- | --- |
| `App.tsx` | 77 dòng | Root layout, wizard state machine, language context |
| 5 Pages | ~490 dòng tổng | Landing/Upload/Generating/Preview/Tray |
| 6 Components | ~370 dòng tổng | Header/LanguageToggle/StickerCard/ConsentModal/ReportModal/CameraModal |
| 4 Services | ~180 dòng tổng | api/storage/textCompositor/analytics |
| Types | 60 dòng | Domain interfaces + EXPRESSIONS config |
| i18n | 94 dòng (2 JSON) | Bilingual labels |
| CSS | ~14 files | Component + page styles + design tokens |

## 3. Bản đồ mã nguồn

```
GenSticker/
├── docs/                          # Tài liệu PRD + SRS + SAD + SLA + TDD + Handoff + Backlog
│   ├── PRD_Sticker_Generation_V1.md
│   ├── PRD_Sticker_Generation_V1_VI.md
│   ├── SRS_Sticker_Generation_V1_VI.md
│   ├── Software_Architecture_Technical_Design.md
│   ├── SLA_Duhat_Gen_Sticker_V1_VI.md
│   ├── TDD_Sticker_Generation_V1.md
│   ├── MVP_IMPLEMENTATION_HANDOFF.md
│   └── IMPLEMENTATION_BACKLOG_SPRINT_PLAN.md
├── backend/                       # Python FastAPI Backend
│   ├── main.py                    # App + endpoints + SSE
│   ├── models.py                  # Pydantic models
│   ├── prompts.py                 # Prompt system + expressions
│   ├── validators.py              # AI validation logic
│   ├── bg_remover.py              # Background removal pipeline
│   ├── cloudflare_provider.py     # Cloudflare AI adapter
│   ├── openai_provider.py         # OpenAI adapter
│   ├── requirements.txt           # Dependencies
│   ├── .env.example               # Environment template
│   └── .u2net/                    # U-2-Net model weights (auto-downloaded)
├── frontend/                      # Vite + React + TypeScript
│   ├── src/
│   │   ├── App.tsx                # Root wizard
│   │   ├── index.css              # Design tokens
│   │   ├── pages/                 # 5 wizard pages
│   │   ├── components/            # 6 reusable components
│   │   ├── services/              # API, storage, analytics, compositor
│   │   ├── i18n/                  # EN/VI translations
│   │   └── types/                 # TypeScript interfaces
│   ├── index.html
│   └── package.json
├── android_app/                   # Android native shell
│   └── app/                       # Compose + OkHttp + Coil
├── DESIGN.md                      # DUHAT Design System spec
├── PRD_Sticker_Generation_V1.md   # Product Requirements (EN)
├── README.md                      # Setup & run guide
└── duhat-ai-debug.apk             # Pre-built Android APK
```

## 4. Hướng dẫn chạy

### 4.1 Backend

```bash
cd backend
cp .env.example .env
# Chỉnh AI_PROVIDER và API key trong .env

# Tạo virtualenv (nếu chưa có)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Chạy server
uvicorn main:app --reload --port 8000
```

> Backend: `http://localhost:8000`
> Health check: `http://localhost:8000/api/health`

**Lưu ý:** Model `u2net.onnx` (~176 MB) tự động tải khi request đầu tiên. Để tải thủ công:
```bash
mkdir -p .u2net
curl -L "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx" -o .u2net/u2net.onnx
```

### 4.2 Frontend

```bash
cd frontend
npm install
npm run dev
```

> Frontend: `http://localhost:5173`

### 4.3 Android

- Mở `android_app/` trong Android Studio.
- Build APK hoặc cài `duhat-ai-debug.apk` trực tiếp.

## 5. Phần chưa triển khai so với SRS mục tiêu

| Phần còn thiếu | Mô tả | Mức ưu tiên |
| --- | --- | --- |
| Server-side storage | SRS đề cập lưu trữ bền vững server-side; hiện chỉ IndexedDB client | P2 (cân nhắc cho V2) |
| Authentication | SRS đề cập owner identity; hiện không có auth | P2 |
| Hỗ trợ thú cưng/vật thể | PRD gốc đề xuất; V1 chỉ làm selfie người | P3 (V2) |
| HEIC/HEIF input | SRS kien_v7 hỗ trợ; branch này chỉ JPEG/PNG/WebP | P3 |
| Download to device album | Hiện tải qua FileSaver (browser download); chưa có MediaLibrary native | P3 |
| Automated test suite | TDD đặc tả 87 ca; 67 đã implement logic, chưa có test runner | P1 |
| Docker deployment | SRS đề cập Docker Compose; hiện chạy trực tiếp | P2 |
| Rate limiting | 5 requests/ngày; hiện không có giới hạn | P2 |
| Idempotency keys | SRS kien_v7 yêu cầu; hiện chưa có | P3 |
| HTTPS production | Hiện chỉ HTTP localhost | P1 (trước deploy) |
| Vận hành báo cáo | Report chỉ ghi analytics client; chưa có backend xử lý | P2 |

## 6. Rủi ro và Giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
| --- | --- | --- |
| AI provider rate limit/cost | Cao | Multi-provider switch + regenerate limit |
| rembg model tải chậm lần đầu | Trung bình | Pre-download script trong README |
| IndexedDB bị xóa (clear browser data) | Trung bình | Hướng dẫn người dùng tải ZIP backup |
| SSE bị ngắt do network | Trung bình | Frontend hiển thị lỗi + cho retry |
| Sticker chất lượng không đều | Trung bình | Regenerate 3 lần/phiên |

## 7. Danh sách kiểm tra phát hành

- [ ] AI provider API key hoạt động.
- [ ] `u2net.onnx` model đã tải.
- [ ] Backend `/api/health` trả 200.
- [ ] Frontend connect được backend (CORS).
- [ ] Wizard flow hoàn chỉnh: Upload → Generate → Preview → Save → Tray.
- [ ] Download PNG và ZIP hoạt động.
- [ ] Consent modal hiển thị và chặn đúng.
- [ ] i18n EN/VI hoạt động.
- [ ] CameraModal hoạt động (HTTPS required cho production).
- [ ] Android APK cài và chạy được.
