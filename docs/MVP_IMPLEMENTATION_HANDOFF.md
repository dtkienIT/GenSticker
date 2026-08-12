# Bàn giao triển khai MVP — Duhat Gen Sticker

> **Trạng thái:** Tài liệu bàn giao kỹ thuật cho bản MVP/prototype đã triển khai.  
> **Nguồn yêu cầu:** `PRD_Sticker_Generation_V1_VI.md` và `SRS_Sticker_Generation_V1_VI.md`.  
> **Lưu ý:** PRD và SRS vẫn đang ở trạng thái Draft. Các quyết định tạm trong tài liệu này nhằm giúp đội phát triển dựng và tích hợp MVP; chúng không tự động trở thành quyết định phát hành chính thức.

## 1. Kết quả mong đợi

MVP cần chứng minh được toàn bộ luồng sản phẩm bao quanh pipeline AI/image processing trên Android và iOS:

1. Người dùng chụp hoặc chọn đúng một ảnh.
2. Người dùng xác nhận họ sở hữu hoặc có quyền sử dụng ảnh.
3. Hệ thống kiểm tra ảnh đầu vào.
4. Người dùng chủ động bắt đầu tạo.
5. Ứng dụng theo dõi một generation job mà không làm mất job khi đổi màn hình.
6. Job thành công trả đúng 8 sticker Chibi 3D.
7. Người dùng xem trước, chọn/bỏ chọn, lưu và tạo lại toàn bộ bộ sticker.
8. Người dùng chia sẻ sticker qua native share sheet của Android/iOS.
9. Người dùng xem lại và xóa dữ liệu đã lưu.

Trong giai đoạn hiện tại, AI và image processing được thay bằng mock adapter. Vì vậy MVP này chứng minh kiến trúc, API, state machine, persistence và UX; nó **không chứng minh** chất lượng sinh ảnh, độ giống, tách nền, nhận diện chủ thể, moderation, bias hoặc an toàn nội dung ở mức phát hành.

## 2. Phạm vi sản phẩm áp dụng

### 2.1 Đã chốt từ SRS

- Đây là ứng dụng mobile độc lập, không phải module bên trong DUHAT.
- Nền tảng mục tiêu là Android và iOS.
- Mỗi generation job dùng đúng một ảnh nguồn.
- Ảnh có đúng một chủ thể chính: một người, một thú cưng hoặc một vật thể.
- Ảnh người phải có đúng một khuôn mặt rõ ràng.
- Một full-set success có đúng 8 sticker.
- Style V1 duy nhất là Chibi 3D.
- Biểu cảm/câu chữ lấy từ catalog cố định, hỗ trợ tiếng Việt và tiếng Anh.
- Không có prompt tự do, style selector, chỉnh sửa hoặc regenerate riêng từng sticker.
- Input và output phải qua các safety gate tương ứng trước khi được phép đi tiếp.
- Chỉ sticker được người dùng chọn mới được lưu; dữ liệu riêng tư mặc định.
- Chia sẻ/xuất dùng native share sheet, không dùng DUHAT chat hoặc sticker tray.
- Job thất bại không được tạo saved partial set.
- Save thất bại phải giữ preview để người dùng thử lại.
- Nội dung ảnh và reference ảnh nhạy cảm không được xuất hiện trong analytics hoặc application log.

### 2.2 Ngoài phạm vi MVP

- Web app, chat, sticker tray hoặc account DUHAT.
- Free-form prompt hoặc nhiều style.
- Chỉnh sửa pose, expression, wording, trang phục, nền hoặc style của từng item.
- Regenerate một item riêng lẻ.
- Nhiều ảnh tham chiếu, ghép sticker hoặc deepfake/photorealistic output.
- Marketplace, khám phá công khai hoặc thương mại hóa.
- Tích hợp xuất trực tiếp dành riêng cho một ứng dụng bên thứ ba.
- Tuyên bố production-ready khi pipeline thật, policy và release gate chưa hoàn tất.

## 3. Kiến trúc mục tiêu

```text
+--------------------------+
| Expo / React Native      |
| - camera, photo library  |
| - consent và UI state    |
| - job polling/resume     |
| - preview/save/share     |
+------------+-------------+
             | HTTPS/JSON và upload được kiểm soát
             v
+--------------------------+
| FastAPI                  |
| - auth/ownership         |
| - validation boundary    |
| - job orchestration      |
| - save/delete/share      |
| - pipeline abstraction   |
+------+-------------------+
       |
       +----------------------------+
       |                            |
       v                            v
+----------------------+   +----------------------------+
| Data/storage adapter |   | Sticker pipeline adapter   |
| - Supabase target    |   | - Mock trong MVP           |
| - local/dev fallback |   | - AI thật thay về sau      |
+----------------------+   +----------------------------+
```

### 3.1 Mobile Expo/React Native chịu trách nhiệm

- Camera/library permission và chọn đúng một ảnh.
- Hiển thị nội dung consent và gửi bằng chứng consent cần thiết.
- Hiển thị các trạng thái validation, ready, progress, failure, timeout và retry.
- Lưu định danh job đang hoạt động đủ để quay lại màn hình mà không mất tiến trình.
- Preview đúng dữ liệu backend cho phép hiển thị; không tự suy diễn rằng artifact chưa moderation là an toàn.
- Quản lý selection ở UI và gửi danh sách variant được chọn khi lưu.
- Tải file được phép chia sẻ vào vùng tạm phù hợp rồi gọi native share sheet.
- Không chứa Supabase service-role key hoặc credential của AI provider.

### 3.2 FastAPI chịu trách nhiệm

- Xác định owner và kiểm tra quyền đối với mọi source, job, set và variant.
- Cấp quyền upload/download có thời hạn hoặc nhận upload qua boundary được kiểm soát.
- Kiểm tra kỹ thuật phía server; không tin hoàn toàn metadata do mobile gửi.
- Chặn submit nếu thiếu consent hoặc source chưa pass validation.
- Điều phối state machine của job và bảo đảm output chưa moderation không bị phát hành.
- Bảo đảm full-set success chỉ có khi nhận đúng 8 output hợp lệ.
- Lưu selection, cung cấp dữ liệu đã lưu và thực hiện delete theo policy tạm.
- Chuyển lỗi nội bộ/provider thành error code và user-safe message.
- Redact log và chỉ phát analytics metadata được phép.
- Gọi pipeline qua abstraction; route công khai không phụ thuộc implementation AI cụ thể.

### 3.3 Supabase và local/dev

- **Supabase target:** PostgreSQL lưu metadata/trạng thái; Storage bucket riêng tư lưu source và output; Supabase Auth hoặc owner model được duyệt dùng để cô lập dữ liệu.
- **Local/dev fallback:** chỉ phục vụ phát triển và demo khi chưa cấu hình Supabase. Adapter local phải giữ cùng repository contract để không đổi business logic hoặc API công khai.
- **Thiết bị:** chỉ giữ state cần thiết cho UX, ví dụ active job ID và selection chưa gửi. Backend vẫn là nguồn sự thật của job và dữ liệu đã lưu.
- Local/dev fallback không phải bằng chứng rằng RLS, encryption-at-rest, backup, retention hoặc cross-device ownership đã đạt yêu cầu production.

Implementation hiện có dùng `DATA_BACKEND=local|supabase`. Local mode lưu SQLite
và asset riêng tư dưới `backend/data`/`backend/storage`; Supabase mode dùng adapter
service-role ở FastAPI, bảng PostgreSQL và hai bucket riêng tư. Danh sách biến đầy
đủ nằm trong một file `.env.example` ở root repository. Cả backend và mobile dùng
root `.env`; chỉ biến `EXPO_PUBLIC_*` được Expo đưa vào bundle mobile.

## 4. Luồng và state machine

```text
Chọn/chụp ảnh
      |
      v
Consent -> validating --fail--> validation_failed -> chọn ảnh khác
                 |
                pass
                 v
               ready
                 |
          người dùng bấm Tạo
                 v
        queued/processing -> output_moderating
              |                    |
              |                    +--block--> failed theo policy tạm
              |
              +--failure/timeout--> failed/timed_out -> retry
                                   
output_moderating --pass--> succeeded -> preview 8 sticker
                                        |      |        |
                                        save   share    regenerate
                                         |
                                  saving -> saved
                                     |
                                  save_failed -> retry, vẫn giữ preview
```

Invariant cần được giữ ở application service, không chỉ ở UI:

- Không tạo job nếu thiếu consent hoặc validation chưa pass.
- Không public URL/output trước khi output moderation pass.
- `succeeded` theo full-set contract luôn có đúng 8 variant.
- Regenerate tạo job mới từ cùng source và cùng style, không sửa job cũ.
- Job failure không tự tạo saved set.
- Save chỉ nhận variant thuộc đúng set và owner hiện tại.
- Không tự động public hoặc share output.

## 5. Các giả định tạm để triển khai

Mọi mục dưới đây phải được coi là quyết định có thể thay đổi. Khi Product/Privacy/Legal/Trust & Safety chốt TBD, cần cập nhật code, test và tài liệu cùng lúc.

| SRS/TBD | Giả định tạm cho MVP/prototype | Hệ quả khi tích hợp hoặc phát hành |
| --- | --- | --- |
| `TBD-001`, `TBD-002` | Dùng 8 slot expression/wording fixture cố định; locale chọn một catalog Việt hoặc Anh. Không khẳng định đây là catalog cuối. | Thay catalog/version và golden reference mà không đổi API job cốt lõi. |
| `TBD-003` | Mock không suy luận tuổi và không tuyên bố thực thi child-safety policy. | Là release blocker; Product và Legal phải quyết định policy. |
| `TBD-004` | Dữ liệu development là tạm thời; chưa cam kết retention production hoặc training-use. Training mặc định không được phép. | Cần retention/cleanup/delete policy trước release. |
| `TBD-005` | Không áp quota hoặc billing trong môi trường development; regenerate tạo job mới. | Phải thêm quota/cost policy trước khi mở rộng sử dụng. |
| `TBD-006` | Để giữ invariant đúng 8, nếu một output bị block hoặc số output khác 8 thì toàn job không được chuyển thành full-set success. | Product có thể đổi sang generate bù hoặc partial-safe UX sau này. |
| `TBD-007` | Mock mô phỏng progress/timeout; chưa có latency SLA. | Benchmark pipeline thật trước release. |
| `TBD-008` | FastAPI thực hiện các kiểm tra kỹ thuật cơ bản có thể làm chắc chắn; subject/face/blur/light/safety do mock trả kết quả có kiểm soát. | Không coi validation mock là protection thật. |
| `TBD-009` | Fixture output chỉ dùng để kiểm thử luồng; dimensions, MIME, alpha/background và quality threshold chưa phải baseline. | Chốt output contract trước khi tích hợp provider thật. |
| `TBD-010`, `TBD-012` | Dữ liệu backend riêng tư theo một owner tạm; Supabase anonymous auth là hướng ưu tiên nếu phù hợp implementation. Local mode chỉ là fallback dev. | Cần quyết định account, recovery, cross-device và ownership chính thức. |
| `TBD-011` | Hướng MVP là share một sticker được phép từ preview hoặc dữ liệu đã lưu, không tự share cả set. | Cần xác nhận có bắt buộc save trước và có hỗ trợ multi-item/pack hay không. |
| `TBD-014` | Mobile poll trạng thái và persist active job ID. Create/regenerate/save giữ cùng idempotency key cho retry của cùng user intent; chọn ảnh/selection hoặc intent mới sẽ đổi key. Upload source hiện chưa có replay key xuyên request. | Cần chốt upload idempotency, backoff, app kill/restart, cancel và stale reconciliation. |
| `TBD-016` | Report chỉ được scaffold/feature-flag; không giả lập một quy trình review/takedown đã hoàn chỉnh. | Workflow thật là release blocker. |
| `TBD-017` | Chỉ ghi metadata tối thiểu; mở share sheet không đồng nghĩa share thành công. | Chốt schema, consent, retention và metric denominator. |
| `TBD-018` | `DELETE` hiện xóa association `saved_pack` khỏi thư viện. Source, job, preview set và artifact vẫn theo retention chưa chốt; đây chưa phải privacy erasure hoàn chỉnh. | Chốt hard/soft delete, cascade storage/cache/backup và SLA trước release. |
| `TBD-019` | Preview mặc định chọn cả 8; nút Save chỉ bật khi có ít nhất một item được chọn. | Có thể đổi khi Product chốt selection behavior. |
| `TBD-020` | Preview còn truy cập được trong vòng đời job/set development để retry save; chưa cam kết TTL. | Chốt preview retention và cleanup. |
| `TBD-021` | Dùng stable machine-readable error code và map sang copy an toàn tại boundary ứng dụng. | Catalog code/copy/localization cần được baseline. |
| `TBD-022` | Tuân theo permission UI của hệ điều hành và cung cấp đường thử lại/mở Settings khi phù hợp. | Cần test deny/limited/revoked/cloud-only trên device matrix. |
| `TBD-023` | Mock không phát hiện đáng tin cậy logo hoặc nhân vật có thương hiệu/bản quyền. | Cần policy, classifier/moderation và report flow thật. |
| `TBD-024`, `TBD-025` | Generation qua backend yêu cầu mạng; chưa có SLA, throughput, RPO/RTO hoặc offline generation. | Chốt reliability/capacity/operations trước release. |
| `TBD-026`, `TBD-027` | Chưa baseline accessibility, UI localization hoặc resource budget. | Bổ sung test matrix trước phát hành. |
| `TBD-028` | MVP lưu consent accepted/version/timestamp ở mức đủ truy vết kỹ thuật; nội dung pháp lý chưa được phê duyệt. | Privacy/Legal phải duyệt notice, evidence và third-party disclosure. |
| `TBD-029` | Test strategy hoàn chỉnh sẽ được bổ sung sau khi mobile/backend contract ổn định. | Không coi smoke test prototype là release verification. |

## 6. Boundary cho AI và image processing

### 6.1 Nguyên tắc

Kiến trúc đích đặt pipeline sau một port ổn định. FastAPI sở hữu orchestration,
ownership và publish gate; adapter sở hữu cách gọi model/provider. API mobile đã
được thiết kế để giữ ổn định khi thay pipeline, nhưng boundary AI đầy đủ bên dưới
vẫn là việc cần hoàn thiện cùng người phụ trách AI.

Code MVP hiện có một seam nhỏ tại `backend/app/pipeline.py`: repository nhận
`StickerPipeline` qua constructor, còn `MockStickerPipeline` hiện thực progress và
render placeholder. Seam này vẫn mang hình dạng của mock (`snapshot` và
`render_placeholder`), chưa bao phủ input assessment, provider job reference hay
output moderation thật. Vì vậy không chỉ tạo class provider mới rồi bật config;
cần refactor seam hiện tại theo port đích sau, bổ sung schema/state và contract test.

Boundary logic đề xuất:

```python
class StickerPipelinePort(Protocol):
    async def assess_input(self, request: InputAssessmentRequest) -> InputAssessment: ...
    async def start_generation(self, request: GenerationRequest) -> ProviderJobRef: ...
    async def get_generation(self, provider_job_id: str) -> ProviderJobSnapshot: ...
    async def assess_outputs(self, request: OutputAssessmentRequest) -> OutputAssessment: ...
```

Đây là **interface logic mục tiêu**, không phải chữ ký Python hiện đã triển khai.
Tên module/class cuối cùng có thể khác. Không để type của một vendor cụ thể xuất
hiện trong API public hoặc domain entity.

### 6.2 Input assessment contract

Request tối thiểu:

- `source_id` và reference riêng tư có thời hạn hoặc stream do backend kiểm soát.
- MIME/type và metadata kỹ thuật đã được backend thu thập.
- Policy/catalog version cần áp dụng.
- Correlation ID không chứa tên file hoặc dữ liệu cá nhân.

Response tối thiểu:

- `passed: boolean`.
- `subject_type: person | pet | object | unknown`.
- `subject_count`, và `face_count` khi có năng lực phù hợp.
- Danh sách check theo nhóm technical, quality, subject và safety.
- `reason_code` an toàn để backend ánh xạ sang UI.
- Model/provider/policy version dành cho audit nội bộ, không trả thẳng thông tin nhạy cảm cho client.

Không mô tả face count là identity verification, liveness hoặc bằng chứng consent.

### 6.3 Generation contract

Request tối thiểu:

- ID nội bộ của job và source.
- `style_id = chibi_3d`.
- `output_count = 8`.
- Locale và catalog version.
- Danh sách 8 slot expression/wording đã được backend khóa cho job.
- Yêu cầu output phi thực tế và phù hợp với output contract đã chốt.

Provider snapshot tối thiểu:

- Provider job ID.
- Trạng thái `queued`, `processing`, `succeeded`, `failed` hoặc `timed_out`.
- Stage/progress nếu provider có thể cung cấp đáng tin cậy.
- Error code nội bộ và khả năng retry.
- Khi thành công: đúng 8 candidate artifact, mỗi item có slot, expression/wording ID, MIME, kích thước, checksum và artifact reference tạm.

FastAPI phải kiểm tra count/slot/ownership, đưa artifact vào storage do hệ thống kiểm soát và chạy output assessment trước khi phát hành cho mobile. Không lưu signed URL dài hạn trong database.

### 6.4 Output assessment contract

- Quyết định cho từng output và quyết định cấp toàn set.
- Nhóm safety reason theo taxonomy được duyệt.
- Model/policy version cho audit.
- Không trả raw evidence hoặc provider message nhạy cảm cho mobile.
- Với policy tạm của MVP, chỉ chuyển job sang `succeeded` khi đủ 8 item đều được phép hiển thị.

### 6.5 Mock adapter

Mock adapter hiện tại:

- Trả 8 fixture an toàn, cố định và có thứ tự ổn định.
- Không giả vờ rằng fixture được sinh từ ảnh nguồn; UI nên ghi rõ đây là kết quả demo/mock.
- Mô phỏng progress nhưng lưu job state qua repository, không chỉ giữ trong process memory.
- Hỗ trợ scenario `success`, provider `failure`, `timeout` và output `blocked`.
- Upload kỹ thuật sai MIME/signature/size có failure riêng; subject/face/quality,
  unsafe input, output-count mismatch và partial moderation chưa được mô phỏng.
- Chỉ cho phép ép scenario trong development/test.
- Không upload ảnh nguồn sang dịch vụ AI bên ngoài.
- Đi qua cùng publish gate, repository và API response như adapter thật.

### 6.6 Cách thay bằng adapter thật

1. Refactor seam `backend/app/pipeline.py` thành pipeline port/domain result mục
   tiêu ở Mục 6.1; không trả type riêng của vendor ra ngoài adapter.
2. Ánh xạ trạng thái/error vendor sang state và error taxonomy nội bộ.
3. Dùng private, short-lived source access; xác thực callback/polling channel nếu có.
4. Persist provider job ID để resume/reconcile; không giữ state quan trọng chỉ trong memory.
5. Đưa mọi output qua count/format/slot validation và output moderation.
6. Thêm contract test chạy chung cho mock và adapter thật.
7. Mở rộng `PIPELINE_BACKEND` và dependency injection để chọn adapter; mobile
   không cần đổi API.
8. Giữ production startup guard: code hiện từ chối khởi động khi
   `APP_ENV=production` và `PIPELINE_BACKEND=mock`.
9. Benchmark quality, safety và latency trên dataset đã được duyệt trước khi coi là hoàn tất.

## 7. API đã triển khai cho MVP

Đây là contract kỹ thuật của MVP hiện tại, với prefix `/api/v1`. Nó chưa biến các
quyết định sản phẩm `TBD` thành baseline phát hành.

| Method | Endpoint logic | Mục đích |
| --- | --- | --- |
| `GET` | `/health/live`, `/health/ready` | Liveness/readiness không trả secret hoặc cấu hình nhạy cảm. |
| `POST` | `/api/v1/source-images` | Multipart `file`, `consent_accepted`, `consent_version`; lưu source và trả validation mock. |
| `GET` | `/api/v1/source-images/{source_id}` | Lấy metadata/validation của source thuộc owner. |
| `POST` | `/api/v1/generation-jobs` | Body `source_image_id`; tạo job bất đồng bộ. `mock_scenario` chỉ dùng dev/test. |
| `GET` | `/api/v1/generation-jobs`, `/api/v1/generation-jobs/{job_id}` | Liệt kê/poll state, stage, progress, safe error và result set ID. |
| `POST` | `/api/v1/generation-jobs/{job_id}/regenerate` | Tạo job mới từ cùng source/style của job thành công. |
| `GET` | `/api/v1/sticker-sets/{set_id}` | Lấy preview đúng 8 output mock đã qua publish gate. |
| `POST` | `/api/v1/sticker-sets/{set_id}/save` | Body `sticker_ids`; lưu đúng subset đang chọn. |
| `GET` | `/api/v1/saved-packs`, `/api/v1/saved-packs/{pack_id}` | Liệt kê/xem pack riêng tư đã lưu. |
| `DELETE` | `/api/v1/saved-packs/{pack_id}` | Xóa association saved pack khỏi thư viện; chưa cascade source/output. |
| `GET` | `/api/v1/stickers/{sticker_id}/asset` | Stream SVG mock đã owner-check để preview/native share. |

Yêu cầu chung:

- Endpoint tạo job nên trả semantics bất đồng bộ; mobile không giữ kết nối chờ toàn bộ generation.
- Mutation cần chống submit trùng theo contract idempotency được chốt.
- Mobile hiện giữ stable key theo cùng user intent cho create/regenerate/save;
  source upload chưa idempotent xuyên lần retry nên response mất có thể tạo source
  riêng tư trùng. Đây là gap thuộc `TBD-014`, không được suy diễn thành semantics
  dùng lại ảnh theo checksum.
- Mọi resource lookup phải kiểm tra owner, kể cả khi client đoán được ID.
- Error response dùng code ổn định, `retryable` và safe message; không lộ stack trace, provider payload hoặc storage path.
- MVP stream artifact qua endpoint owner-protected với `private, no-store`; nếu
  adapter thật chuyển sang signed URL thì URL phải ngắn hạn. Client không được tự
  ghi moderation status.

Nhóm error code ban đầu có thể gồm:

- `CONSENT_REQUIRED`
- `SOURCE_NOT_READY`
- `UNSUPPORTED_MEDIA`
- `IMAGE_TOO_LARGE`
- `LOW_RESOLUTION`
- `BLURRY_IMAGE`
- `POOR_LIGHTING`
- `SUBJECT_COUNT_INVALID`
- `FACE_COUNT_INVALID`
- `INPUT_BLOCKED`
- `GENERATION_FAILED`
- `GENERATION_TIMEOUT`
- `OUTPUT_COUNT_INVALID`
- `OUTPUT_BLOCKED`
- `SAVE_FAILED`
- `RESOURCE_NOT_FOUND`
- `RESOURCE_FORBIDDEN`

Tên và semantics cuối cùng thuộc `TBD-021`.

## 8. Data model và RLS đã triển khai

### 8.1 Physical schema hiện có

| Table | Nội dung hiện có | Ràng buộc chính |
| --- | --- | --- |
| `source_images` | owner, private object key, MIME/size/checksum, status, timestamp | Mỗi job tham chiếu đúng một source. |
| `consent_records` | source, owner, consent version, accepted_at | Unique theo source; phải có trước submit. |
| `validation_results` | source, kind, mock/pass/fail, safe reason, provider version | Chỉ backend service-role ghi; chưa có subject/face score thật. |
| `generation_jobs` | owner, source, parent job, state/stage/progress, mock scenario, idempotency hash, safe error | Regenerate tạo row mới; terminal state rõ ràng. |
| `sticker_sets` | owner, job, `chibi_3d`, preview/deleted, timestamp | Unique theo job. |
| `sticker_variants` | owner, set, slot 1–8, expression key, object key, MIME, moderation state | Unique set/slot; exact-eight constraint khi job success. |
| `saved_packs` | owner, source set, title, idempotency/selection hash, timestamp | Một record cho mỗi hành động lưu idempotent. |
| `saved_pack_items` | pack, selected variant, ordinal | Chỉ subset đã chọn, unique trong pack. |

Owner không có table riêng: Supabase mode dùng `auth.users`; local mode băm
`X-Device-ID` thành UUID. Locale/catalog version, provider job reference,
moderation evidence, abuse report và analytics table **chưa có**; đây là gap cần
bổ sung sau khi các TBD tương ứng được chốt.

Physical schema, constraint, index, RPC transaction, RLS và Storage policy hiện
nằm tại `supabase/migrations/001_mvp.sql`. Khi retention/delete được chốt, cần tạo
migration tiếp theo thay vì sửa migration đã áp dụng trên môi trường dùng chung.

### 8.2 RLS/ownership

Khi dùng Supabase:

- Bật RLS cho mọi bảng chứa dữ liệu người dùng.
- MVP dùng boundary API-only: migration revoke quyền `anon`/`authenticated` và
  không tạo client policy; RLS mặc định từ chối truy cập trực tiếp.
- Mobile xác thực với Supabase nhưng gửi Bearer token cho FastAPI; chỉ backend
  service-role truy cập table/bucket và mọi repository lookup vẫn lọc `owner_id`.
- Access/refresh session của Supabase và device ID được mobile giữ trong
  SecureStore; AsyncStorage chỉ giữ `activeJobId` phục vụ khôi phục UI.
- Không cho client đọc trực tiếp variant/object Storage để tránh bypass publish
  gate hoặc moderation status.
- Service role chỉ tồn tại ở FastAPI/worker được bảo vệ; không đưa vào Expo bundle.
- Bucket source/output là private; object path được namespace theo owner và resource ID.
- Asset được FastAPI stream sau owner/moderation check; hiện không cấp signed URL
  trực tiếp cho mobile.

Local/dev adapter phải mô phỏng ownership check ở repository layer, nhưng không được quảng bá là tương đương RLS production.

## 9. Bảo mật và quyền riêng tư

- Dùng mã hóa khi truyền và khả năng mã hóa at-rest của storage được phê duyệt.
- Không ghi image bytes, base64, local URI, storage object key, signed URL hoặc raw provider request/response vào log/analytics.
- ImagePicker tạo bản sao ảnh đã chọn/crop trong cache sandbox của ứng dụng;
  mobile phải dọn bản cũ khi thay ảnh và dọn bản hiện tại theo best-effort sau
  upload hoặc khi rời flow, không chỉ xóa React state. Việc OS có giữ bản sao
  ngoài sandbox ứng dụng hay không vẫn thuộc lifecycle của nền tảng.
- Không dùng ảnh nguồn/output để model training khi chưa có policy, notice và consent phù hợp.
- Không tin MIME, file extension, dimensions hoặc size do client tự khai; kiểm tra lại tại boundary authoritative.
- Giới hạn upload size/type theo contract khi `TBD-008` được chốt; từ chối file bất thường trước khi gọi pipeline.
- Không dùng tên file gốc làm object path hoặc log field.
- Xóa/chuẩn hóa metadata ảnh nếu output contract yêu cầu; không vô tình chia sẻ EXIF của source.
- CORS, rate limit, idempotency và abuse protection phải được chốt trước môi trường public.
- Kiểm tra ownership ở mọi endpoint read/write/delete/download.
- Provider secret và Supabase service role phải được cấp qua secret management của môi trường, không commit hoặc nhúng vào app.
- Error client-visible chỉ chứa lý do an toàn; diagnostic chi tiết phải được bảo vệ và có retention phù hợp.
- Report evidence, nếu triển khai, cần quyền truy cập và retention riêng.
- Bản sao đã đi qua native share sheet nằm ngoài khả năng thu hồi của ứng dụng; UX/policy cần nói rõ giới hạn này.

## 10. Analytics tối thiểu

Nếu instrumentation được bật, chỉ cân nhắc metadata cho:

- mở flow;
- consent accepted;
- chọn camera/library;
- validation pass/fail theo safe category;
- generation started/completed/failed/timed out;
- regenerate;
- variant selected/deselected;
- save succeeded/failed;
- delete;
- native share sheet invoked;
- report sau khi flow được duyệt.

Không coi việc mở/đóng native share sheet là bằng chứng rằng sticker đã được gửi thành công. Event schema, retention, consent và metric denominator vẫn thuộc `TBD-017`.

## 11. Hạn chế hiện tại và release blocker

MVP dùng mock không được phát hành như sản phẩm AI hoàn chỉnh vì:

- Fixture không được sinh từ ảnh người dùng và không chứng minh Chibi 3D/identity fidelity.
- Chưa có validation thật cho subject count, face count, blur, lighting hoặc visibility.
- Chưa có input/output moderation thật.
- Chưa có khả năng phát hiện người nổi tiếng, nội dung có thương hiệu/bản quyền hoặc abuse đáng tin cậy.
- Chưa có child-safety policy đã được Legal/Product duyệt.
- Catalog Việt/Anh và Chibi 3D golden specification chưa baseline.
- Output format, alpha/background, dimensions, size và quality threshold chưa chốt.
- Retention, delete cascade, training-use và third-party disclosure chưa chốt.
- Account/anonymous ownership, recovery và cross-device behavior chưa chốt.
- Partial moderation behavior, quota, timeout, retry và app-restart semantics chưa baseline.
- Report/review/takedown workflow chưa sẵn sàng.
- Chưa benchmark latency, fidelity, safety và bias trên dataset được duyệt.
- Chưa có OS/device/accessibility/performance matrix và release verification đầy đủ.
- Local/dev storage không thay thế security/privacy review của Supabase production.

Không nên submit lên store hoặc mời người dùng thật xử lý ảnh nhạy cảm cho đến khi các release blocker tương ứng trong SRS Mục 13.4 và Mục 15 được giải quyết.

## 12. Checklist tiếp quản cho người phụ trách AI/image processing

### 12.1 Trước khi code

- [ ] Đọc PRD, SRS và tài liệu này; ghi rõ các TBD mà implementation cần giả định.
- [ ] Xác nhận pipeline chạy in-process, worker hay remote service và nơi dữ liệu được xử lý.
- [ ] Xác nhận provider/data region/third-party disclosure với Product/Privacy/Legal.
- [ ] Chốt input contract đủ cho MIME, size, resolution, subject, face, quality và moderation.
- [ ] Chốt output contract: 8 slot, catalog mapping, MIME, dimensions, alpha/background và max bytes.
- [ ] Chốt error/status mapping và cách timeout/retry/reconcile.
- [ ] Chuẩn bị fixture/dataset hợp pháp, đại diện và không chứa dữ liệu cá nhân không được phép.

### 12.2 Khi implement adapter thật

- [ ] Implement đúng pipeline port và không làm rò rỉ type/vendor detail ra domain/API public.
- [ ] Trả kết quả input assessment có subject/face/safety semantics chính xác với năng lực thật.
- [ ] Không gọi generation nếu input moderation chưa pass.
- [ ] Tạo đúng 8 candidate theo slot/catalog hoặc trả failure rõ ràng.
- [ ] Persist provider job reference để có thể poll/resume/reconcile.
- [ ] Xác thực callback hoặc response từ provider.
- [ ] Kiểm tra format/count/checksum trước khi lưu artifact.
- [ ] Chạy output moderation trước publish gate.
- [ ] Không log ảnh, signed URL, raw prompt/provider payload hoặc reference nhạy cảm.
- [ ] Xử lý timeout, retryable error và duplicate request an toàn.
- [ ] Dọn artifact tạm theo retention policy được duyệt.
- [ ] Thêm contract test dùng chung với mock adapter.

### 12.3 Trước khi bật adapter thật

- [ ] Happy path và toàn bộ failure scenario không yêu cầu thay đổi mobile API.
- [ ] Full-set success luôn đúng 8 item; partial moderation theo policy đã duyệt.
- [ ] Không có output chưa moderation truy cập được qua API/storage URL.
- [ ] Ownership và short-lived URL được kiểm thử chéo user.
- [ ] Quality/fidelity/cutout/text/bias đạt rubric và threshold được duyệt.
- [ ] Safety benchmark và abuse test đạt yêu cầu.
- [ ] Latency/timeout/retry đạt target sau benchmark.
- [ ] Privacy, security, Legal và Trust & Safety review hoàn tất.
- [ ] Mock override bị tắt trong môi trường phát hành.

## 13. Cách chạy và kiểm thử

### 13.1 Backend local với `.venv`

Yêu cầu Python 3.11 trở lên. Từ root `GenSticker/`:

```bash
cp .env.example .env
python3 -m venv backend/.venv
source backend/.venv/bin/activate
python -m pip install -r backend/requirements-dev.txt
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend đọc `.env` dùng chung ở root repository. Local mode mặc định dùng SQLite
và yêu cầu header `X-Device-ID`; mobile tự tạo ID theo lần cài app và giữ trong
SecureStore.

### 13.2 Mobile Expo

Mobile dùng Expo SDK 54, React Native 0.81 và React 19.1. Yêu cầu Node.js tối
thiểu 20.19 theo tài liệu Expo SDK 54.

```bash
cd mobile
npm install
npm start
```

Đặt `EXPO_PUBLIC_API_URL` thành origin FastAPI mà thiết bị truy cập được. Android
Emulator thường dùng `http://10.0.2.2:8000`; iOS Simulator dùng
`http://127.0.0.1:8000`; điện thoại thật cần IP LAN của máy chạy backend. Không
thêm `/api/v1` vào biến này vì mobile tự thêm prefix.

### 13.3 Supabase mode

1. Tạo project Supabase test riêng, sạch rồi áp dụng
   `supabase/migrations/001_mvp.sql`. Migration fail nếu `storage.objects` đã có
   policy để tránh một policy cũ bypass boundary FastAPI.
2. Điền biến `SUPABASE_*` trong root `.env` và đặt `DATA_BACKEND=supabase`.
3. Điền URL cùng anon/publishable key trong cùng root `.env`; không bao giờ đưa
   service-role key vào mobile.
4. Bật anonymous sign-in trong Supabase Auth nếu dùng owner tạm anonymous.

### 13.4 Verification đã chạy

```bash
cd backend
source .venv/bin/activate
pytest
ruff check app tests

cd ../mobile
npm run typecheck
npm run lint
npm test
npx expo-doctor
npx expo export --platform android --output-dir /tmp/gensticker-expo-export
```

Kết quả tại thời điểm bàn giao: backend 26 test pass; mobile 15 test pass;
Ruff, Python compile, TypeScript, ESLint, Expo Doctor (18/18) và Android
bundle/export đều pass. Test mobile gồm contract exact-eight, MIME inference,
idempotency intent, ánh xạ Problem Details an toàn và vòng đời file ảnh nguồn:
chỉ xóa file con trong cache riêng của app, trì hoãn xóa khi upload còn đọc file,
cleanup sau upload thành công, khi thay ảnh và khi rời màn hình. Cleanup là
best-effort và không tác động ảnh gốc nằm ngoài cache của app.
Camera, native share sheet và Supabase project thật vẫn cần smoke test trên thiết
bị/simulator và môi trường test tương ứng. `npm audit` hiện báo advisory gián tiếp
từ Expo/Metro; không dùng `npm audit fix --force` vì có thể đưa dependency ra
ngoài compatibility matrix của SDK 54. Theo dõi bản vá SDK 54 và chỉ nâng package
theo kết quả `npx expo install --check`/Expo Doctor.

## 14. Nguyên tắc cập nhật tài liệu bàn giao

Khi một TBD được chốt hoặc implementation thay đổi:

1. Cập nhật quyết định trong SRS theo quy trình phê duyệt.
2. Cập nhật API/data/pipeline contract liên quan trong tài liệu này.
3. Cập nhật migration, code và test tương ứng.
4. Gỡ hoặc thay giả định prototype đã hết hiệu lực.
5. Ghi rõ phần nào đã được kiểm chứng bằng mock, contract test, integration test hoặc benchmark thật.

Không được biến một default kỹ thuật thuận tiện thành policy sản phẩm hoặc cam kết phát hành mà không có phê duyệt phù hợp.
