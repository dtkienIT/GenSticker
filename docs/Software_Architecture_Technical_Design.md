# Thiết kế Kiến trúc Phần mềm — Duhat Gen Sticker V1

## 0. Kiểm soát tài liệu

| Trường | Giá trị |
| --- | --- |
| Mã tài liệu | SAD-DGS-V1 |
| Phiên bản | 1.0 |
| Ngày chốt chuẩn | 18/08/2026 |
| Sản phẩm | Duhat Gen Sticker — ứng dụng web full-stack |
| Nguồn yêu cầu | `SRS_Sticker_Generation_V1_VI.md` v1.0 |
| Trạng thái | Đã chốt làm cơ sở triển khai |

Tài liệu phân biệt:

- **Hiện trạng:** mã nguồn đang tồn tại và có thể chạy/kiểm thử.
- **Mục tiêu V1:** kiến trúc bắt buộc trước khi phát hành theo SRS.

## 1. Tổng quan kiến trúc

### 1.1 Bối cảnh hệ thống

```text
+---------------------------+  HTTP/JSON     +---------------------------+
| Frontend                  | ------------> | Backend (FastAPI)          |
| Vite + React + TypeScript | <------------ | Python 3.11+               |
| Browser (Mobile-First)    |   SSE Stream  | Port 8000                  |
+---------------------------+               +-----+------------+--------+
                                                  |            |
                                                  v            v
                                          +-----------+  +----------+
                                          | rembg     |  | AI       |
                                          | U-2-Net   |  | Provider |
                                          | BG Remove |  | (switch) |
                                          +-----------+  +-----+----+
                                                               |
                                          +--------------------+----+
                                          |                         |
                                    +-----v------+  +---------v---------+  +------v----------+
                                    | Gemini API |  | OpenAI API        |  | Cloudflare      |
                                    | Vision +   |  | dall-e-3 /        |  | Workers AI      |
                                    | Image Gen  |  | gpt-4o-mini       |  | flux-1-schnell  |
                                    +------------+  +-------------------+  +-----------------+

+---------------------------+
| Client Storage (Browser)  |
| IndexedDB: duhat_stickers |
| localStorage: packs meta  |
+---------------------------+
```

### 1.2 Nguyên tắc kiến trúc

1. PRD → SRS → Kiến trúc → Bàn giao/Danh sách công việc → TDD.
2. Frontend không bao giờ nhận thông tin xác thực AI provider hoặc khóa API.
3. FastAPI là ranh giới duy nhất giữa frontend và AI providers.
4. Ảnh nguồn chỉ tồn tại trong bộ nhớ tạm server — không lưu trữ bền vững phía backend.
5. AI provider có thể chuyển đổi qua biến `AI_PROVIDER` mà không thay đổi frontend.
6. Sticker đã tạo lưu trữ hoàn toàn phía client (IndexedDB), không upload lại server.
7. SSE streaming cho progressive UX — sticker hiển thị ngay khi mỗi slot hoàn thành.

## 2. Ngăn xếp công nghệ

### 2.1 Frontend

| Công nghệ | Phiên bản | Vai trò |
| --- | --- | --- |
| Vite | 6.x | Build tool + Dev server |
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| JSZip | ^3.x | Xuất pack ZIP |
| FileSaver.js | ^2.x | Trigger download |
| Google Fonts (Inter) | — | Typography |

**Thư mục nguồn:**

```
frontend/src/
├── App.tsx                    # Root layout + wizard step router
├── index.css                  # Design tokens + global styles
├── main.tsx                   # Entry point
├── components/
│   ├── Header.tsx             # Branding header + back button
│   ├── LanguageToggle.tsx     # EN/VI language switcher
│   ├── StickerCard.tsx        # Sticker display: skeleton/loaded/selected states
│   ├── ConsentModal.tsx       # Photo ownership consent modal
│   ├── ReportModal.tsx        # Abuse/content reporting modal
│   └── CameraModal.tsx        # Camera capture modal with face guide
├── pages/
│   ├── LandingPage.tsx        # Hero intro page
│   ├── UploadPage.tsx         # Drag & drop / camera selfie uploader
│   ├── GeneratingPage.tsx     # SSE progress grid loader
│   ├── PreviewPage.tsx        # Pack selection + save
│   └── TrayPage.tsx           # Saved packs manager + ZIP exporter
├── services/
│   ├── api.ts                 # REST + SSE backend client
│   ├── storage.ts             # IndexedDB + localStorage persistence
│   ├── textCompositor.ts      # Canvas text overlay builder
│   └── analytics.ts           # In-memory analytics event tracking
├── i18n/
│   ├── i18n.ts                # i18n context + helper
│   ├── en.json                # English labels
│   └── vi.json                # Vietnamese labels
└── types/
    └── index.ts               # Domain interfaces + EXPRESSIONS config
```

### 2.2 Backend

| Công nghệ | Phiên bản | Vai trò |
| --- | --- | --- |
| Python | 3.11+ | Runtime |
| FastAPI | <1.0 | REST API framework |
| Uvicorn | latest | ASGI server |
| google-genai | latest | Gemini API client |
| rembg | latest | U-2-Net AI background removal |
| Pillow | latest | Image processing |
| NumPy/SciPy | latest | Image manipulation + morphology |
| python-dotenv | latest | Environment variable management |

**Thư mục nguồn:**

```
backend/
├── main.py                    # FastAPI app + SSE router + multi-provider dispatch
├── models.py                  # Pydantic schemas (ValidationRequest/Result, GenerateResult, etc.)
├── prompts.py                 # Chibi prompt template + EXPRESSIONS config + validation prompt
├── validators.py              # Server-side AI image validation (multi-provider)
├── bg_remover.py              # Multi-stage background removal pipeline
├── cloudflare_provider.py     # Cloudflare Workers AI adapter
├── openai_provider.py         # OpenAI API adapter
├── requirements.txt           # Python dependencies
└── .env.example               # Environment template
```

### 2.3 Android App (WebView wrapper)

```
android_app/
├── app/src/main/
│   ├── AndroidManifest.xml    # Permissions: INTERNET, READ_MEDIA_IMAGES
│   └── res/                   # Icons, themes, values
├── build.gradle.kts           # Compose + OkHttp + Coil + Navigation3
└── settings.gradle.kts
```

Ứng dụng Android bọc web app trong native shell. Sử dụng Jetpack Compose + OkHttp cho networking tương lai.

## 3. Kiến trúc AI Multi-Provider

### 3.1 Provider Selection

```
AI_PROVIDER env variable → "gemini" | "cloudflare" | "openai"
```

### 3.2 Luồng xử lý theo provider

```text
Request
  ├── AI_PROVIDER = "gemini"
  │   ├── Validation: gemini-3.6-flash (Vision)
  │   └── Generation: gemini-3.1-flash-image (Interactions API)
  │
  ├── AI_PROVIDER = "cloudflare"
  │   ├── Validation: @cf/meta/llama-3.2-11b-vision-instruct
  │   └── Generation: @cf/black-forest-labs/flux-1-schnell
  │
  └── AI_PROVIDER = "openai"
      ├── Validation: gpt-4o-mini (Vision)
      └── Generation: dall-e-3
```

### 3.3 Interface thống nhất

Cả 3 provider đều implement cùng interface:
- `call_*_validation(image_base64, mime_type, ...) → Dict[str, Any]`
- `call_*_generation(image_base64, mime_type, expression, ...) → str (base64)`

Backend `main.py` dispatch dựa trên `AI_PROVIDER` — frontend hoàn toàn không biết provider nào đang dùng.

## 4. Pipeline tạo Sticker

### 4.1 Luồng dữ liệu chi tiết

```mermaid
graph TB
    subgraph Frontend
        UP[Upload Page] --> |Base64 + MIME| VAL_REQ[POST /api/validate]
        GEN_PAGE[Generating Page] --> |Base64 + MIME| GEN_REQ[POST /api/generate-pack]
    end

    subgraph Backend
        VAL_REQ --> DISPATCH_VAL{AI_PROVIDER?}
        DISPATCH_VAL --> |gemini| GEMINI_VAL[Gemini Vision Validate]
        DISPATCH_VAL --> |cloudflare| CF_VAL[Cloudflare Vision Validate]
        DISPATCH_VAL --> |openai| OAI_VAL[OpenAI Vision Validate]
        GEMINI_VAL --> VAL_RESULT[ValidationResult]
        CF_VAL --> VAL_RESULT
        OAI_VAL --> VAL_RESULT

        GEN_REQ --> PARALLEL[8 Parallel asyncio Tasks]
        PARALLEL --> |per expression| DISPATCH_GEN{AI_PROVIDER?}
        DISPATCH_GEN --> |gemini| GEMINI_GEN[Gemini Image Generation]
        DISPATCH_GEN --> |cloudflare| CF_GEN[Cloudflare Image Generation]
        DISPATCH_GEN --> |openai| OAI_GEN[OpenAI Image Generation]
        GEMINI_GEN --> RAW_IMG[Raw Image Base64]
        CF_GEN --> RAW_IMG
        OAI_GEN --> RAW_IMG
        RAW_IMG --> BG_REMOVE[rembg Background Removal]
        BG_REMOVE --> DIE_CUT[White Die-Cut Border]
        DIE_CUT --> SSE_EVENT[SSE Event]
    end

    SSE_EVENT --> |stream| GEN_PAGE
```

### 4.2 Background Removal Pipeline (bg_remover.py)

```text
Ảnh đầu vào (base64)
  │
  ├─ Stage 1: rembg U-2-Net AI cutout
  │    ├─ Tách nền AI
  │    ├─ _preserve_interior_alpha() → Bảo toàn mắt/răng/chi tiết bên trong
  │    └─ _check_cutout_validity() → Kiểm tra 5%–92% opaque pixels
  │
  ├─ Stage 2: Edge-connected flood fill (fallback)
  │    ├─ Lấy mẫu màu 4 góc ảnh
  │    ├─ Connected-component labeling
  │    └─ Chỉ xóa component nối tới viền ngoài
  │
  ├─ Stage 3: Fail-safe (giữ ảnh gốc nếu cả 2 stage thất bại)
  │
  └─ Stage 4: add_uniform_sticker_border()
       ├─ Dilate mask outwards (MaxFilter)
       ├─ Anti-alias edge (GaussianBlur)
       └─ Alpha composite character over white border canvas
```

## 5. Lưu trữ Client-Side

### 5.1 IndexedDB (`duhat_stickers`)

- **Database name:** `duhat_stickers`
- **Object Store:** `images` (key-value: sticker_id → base64 blob)
- **Version:** 1

### 5.2 localStorage (`duhat_sticker_packs`)

```typescript
interface StickerPack {
  id: string;           // "pack_{timestamp}"
  createdAt: string;    // ISO 8601
  stickers: Sticker[];  // imageBase64 = "" (chỉ metadata, blob ở IndexedDB)
}
```

### 5.3 Lifecycle

| Thao tác | IndexedDB | localStorage |
| --- | --- | --- |
| Save Pack | PUT blob per sticker | Push pack metadata (imageBase64 cleared) |
| Load Tray | GET blob by id | Read all packs |
| Delete Sticker | DELETE blob | Remove from pack stickers array |
| Delete Pack | DELETE all blobs | Remove pack entry |

## 6. Internationalization (i18n)

### 6.1 Kiến trúc

- `LanguageContext` (React Context) cung cấp `language` + `setLanguage` toàn app.
- Helper `t(key, language, params?)` tra cứu từ `en.json` / `vi.json`.
- Hỗ trợ template interpolation: `{current}`, `{total}`, `{count}`.

### 6.2 Phạm vi bao phủ

- UI labels: buttons, headings, instructions, error messages.
- Expression names: `exp_happy`, `exp_laughing`, ... (8 biểu cảm).
- Report categories: 4 danh mục vi phạm.

## 7. Bảo mật và Quyền riêng tư

### 7.1 Ranh giới dữ liệu

| Dữ liệu | Nơi tồn tại | Thời hạn |
| --- | --- | --- |
| Ảnh gốc (base64) | Bộ nhớ tạm server (xử lý) | Chỉ trong thời gian request |
| Ảnh sticker đầu ra | IndexedDB phía client | Cho tới khi người dùng xóa |
| Pack metadata | localStorage phía client | Cho tới khi người dùng xóa |
| API keys | .env file server-side | Vĩnh viễn (không commit) |
| Analytics events | In-memory phía client | Mất khi refresh page |

### 7.2 Kiểm soát truy cập

- CORS: cho phép `http://localhost:5173` và wildcard (dev).
- API keys không bao giờ gửi tới frontend.
- Không có authentication/session phía frontend trong V1 (lưu trữ hoàn toàn local).

### 7.3 Dữ liệu nhạy cảm

- Analytics/log không chứa: base64 ảnh, tên file, đường dẫn, URL, prompt thô.
- Server log chỉ ghi: expression_id, base64 length, success/error status.

## 8. Triển khai và Vận hành

### 8.1 Phát triển cục bộ

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev    # http://localhost:5173
```

### 8.2 Biến môi trường

```bash
# Bắt buộc
AI_PROVIDER=gemini          # "gemini" | "cloudflare" | "openai"
GEMINI_API_KEY=AIzaSy...    # Khi AI_PROVIDER=gemini

# Tùy chọn
ENABLE_BG_REMOVAL=true      # Bật/tắt rembg
CF_ACCOUNT_ID=...           # Khi AI_PROVIDER=cloudflare
CF_API_TOKEN=...
OPENAI_API_KEY=...          # Khi AI_PROVIDER=openai
```

### 8.3 Android App

- Package: `com.example.duhatstickerai`
- Min SDK: 24, Target SDK: 36
- Build: Gradle + Kotlin + Jetpack Compose
- Networking: OkHttp 4.12.0 + SSE
- Image Loading: Coil Compose 2.6.0

## 9. Hiệu năng và Tối ưu

### 9.1 Frontend

- Skeleton loading cho tất cả sticker slots.
- Progressive rendering: mỗi sticker hiện ngay khi SSE event đến.
- Lazy loading sticker blob từ IndexedDB khi mở Tray.
- Canvas text compositing phía client (không cần server round-trip).

### 9.2 Backend

- `asyncio.as_completed()` cho 8 tác vụ song song — tận dụng tối đa throughput.
- `asyncio.to_thread()` wrap blocking AI calls.
- SSE streaming tránh long-polling/timeout.
- rembg model tải 1 lần, cache trong process.

### 9.3 Mục tiêu hiệu năng

| Chỉ số | Mục tiêu |
| --- | --- |
| Thời gian validation | < 5 giây |
| Thời gian tạo 8 sticker (song song) | < 120 giây |
| Thời gian tách nền/sticker | < 10 giây |
| Kích thước app bundle (frontend) | < 500 KB gzipped |
