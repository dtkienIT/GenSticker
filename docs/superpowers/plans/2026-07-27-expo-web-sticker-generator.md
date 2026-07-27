# Expo Web Sticker Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Chromium/WebGPU web build to the existing Expo SDK 57 app that runs the same `lcm-sd15-chibi` v1.0.1 generation model as Android, supports project-directory models during local development, and provides a persistent offline PWA mode for deployment.

**Architecture:** Keep Expo Router, Zustand, safety, coordination, and generation contracts shared. Add a browser service composition that uses an Expo Metro module worker for ONNX Runtime Web inference, web-specific model managers, IndexedDB assets, and browser export APIs; leave the Android Kotlin runtime unchanged.

**Tech Stack:** Expo 57.0.7, React Native Web 0.21, TypeScript 6, ONNX Runtime Web 1.27.0, IndexedDB via idb 8.0.3, @noble/hashes 2.2.0, Workbox 7.4.1, Vitest 4, Playwright 1.62.

## Global Constraints

- Read and follow the Expo SDK 57 documentation at `https://docs.expo.dev/versions/v57.0.0/`.
- Do not modify the existing Kotlin inference behavior or Android model bundle.
- Use model ID `lcm-sd15-chibi`, version `1.0.1`, FP16, 512×512 output, four LCM steps, guidance 1.5.
- Preserve the prompt suffix `chibi sticker, bold clean outline, centered subject`.
- Preserve the fixed negative prompt `photorealistic, text, watermark, gore, explicit content`.
- Supported web runtime is secure Chromium with WebGPU and `shader-f16`; WASM is Diagnostics-only.
- Local development reads `model_artifacts/model-lcm-sd15-v1.0.1` through localhost and does not duplicate generation weights into browser storage.
- Production uses a verified versioned browser cache and remains offline-capable after setup.
- Store sticker PNGs and local diagnostics in IndexedDB; add no Firebase or cloud inference.
- Preserve the user's uncommitted `docs/PRD_AI_Sticker_Generator.md` edits and stage only task-owned files.

---

## File Structure

- `src/services/generation/web/clipTokenizer.ts` — CLIP byte-pair tokenization parity.
- `src/services/generation/web/lcmMath.ts` — Java-compatible RNG, FP16 conversion, guidance, LCM scheduling, pixels, and alpha.
- `src/services/generation/web/workerProtocol.ts` — typed main-thread/worker messages.
- `src/services/generation/web/stickerInference.worker.ts` — ONNX sessions, diffusion, segmentation, and PNG encoding.
- `src/services/generation/web/webOnDeviceStickerGenerator.ts` — existing contract adapter and worker lifecycle.
- `src/services/generation/web/webCapabilities.ts` — secure-browser, WebGPU, FP16, and storage checks.
- `src/services/setup/web/webModelManifest.ts` — validates and augments the existing distribution manifest with U²-NetP.
- `src/services/setup/web/webModelBundleManager.ts` — local-server probe and cached production installation.
- `src/services/assets/webStickerAssetRepository.ts` — IndexedDB PNG/gallery repository.
- `src/services/export/webPlatformAssetExporter.ts` — PNG download and Web Share.
- `src/services/diagnostics/localDiagnostics.ts` — browser-local validation event store/export.
- `src/services/appServices.web.ts` — browser service composition selected by Metro.
- `scripts/serve-web-model.mjs` — range-capable localhost server rooted at the ignored model directory.
- `scripts/fetch-web-segmentation-model.mjs` — pinned U²-NetP acquisition and checksum verification.
- `scripts/stage-web-runtime.mjs` — copies the offline ORT WebGPU WASM runtime into `public/ort`.
- `scripts/build-web-pwa.mjs` — Workbox generation after Expo static export.
- `public/manifest.webmanifest`, `public/_headers` — installability and cross-origin isolation.
- `e2e/web-sticker.spec.ts`, `playwright.config.ts` — production browser acceptance.

---

### Task 1: Pin browser dependencies and implement numeric parity

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.json`
- Create: `src/services/generation/web/clipTokenizer.ts`
- Create: `src/services/generation/web/clipTokenizer.test.ts`
- Create: `src/services/generation/web/lcmMath.ts`
- Create: `src/services/generation/web/lcmMath.test.ts`

**Interfaces:**

- Produces: `ClipTokenizer.fromJson(json: string).encode(text: string): bigint[]`
- Produces: `JavaRandom`, `seededLatentsGaussian`, `float32ToFloat16`, `float16ToFloat32`, `guidedNoise`, `lcmTimesteps`, `lcmStep`, `decodedRgba`, and `composeAlpha`.

- [ ] **Step 1: Install exact dependencies**

Run:

```powershell
npm.cmd install --save-exact onnxruntime-web@1.27.0 idb@8.0.3 @noble/hashes@2.2.0
npm.cmd install --save-dev --save-exact workbox-build@7.4.1 fake-indexeddb@6.2.5 @playwright/test@1.62.0 @webgpu/types@0.1.71
```

Expected: `package.json` and `package-lock.json` contain the exact versions. Add `"types": ["@webgpu/types"]` to `compilerOptions`.

- [ ] **Step 2: Write parity tests before implementation**

Use fixed fixtures from the Kotlin runtime:

```ts
expect(lcmTimesteps(4)).toEqual([999, 759, 499, 259]);
expect(float16ToFloat32(float32ToFloat16(1.5))).toBeCloseTo(1.5, 3);
expect(guidedNoise(new Float32Array([1, 3]), 1, 1.5)).toEqual(new Float32Array([4]));
expect(composeAlpha(0xff336699, 0)).toBe(0x00336699);
expect(composeAlpha(0xff336699, 1) >>> 0).toBe(0xff336699);
```

Load `model_artifacts/model-lcm-sd15-v1.0.1/tokenizer/tokenizer.json` when present and assert the exact 77 IDs for the negative prompt and one safe prompt against a Kotlin-generated fixture committed as JSON.

- [ ] **Step 3: Run tests and verify failure**

Run:

```powershell
npx.cmd vitest run src/services/generation/web/clipTokenizer.test.ts src/services/generation/web/lcmMath.test.ts
```

Expected: FAIL because the web parity modules do not exist.

- [ ] **Step 4: Implement the pure modules**

Port the Kotlin behavior exactly. Keep all functions free of DOM and ONNX dependencies:

```ts
export function lcmTimesteps(steps: number): number[] {
  const origin = Array.from({ length: 50 }, (_, index) => 999 - index * 20);
  return Array.from({ length: steps }, (_, index) => origin[Math.floor((index * 50) / steps)]);
}

export function guidedNoise(output: Float32Array, latentSize: number, guidance: number) {
  return Float32Array.from({ length: latentSize }, (_, index) => {
    const unconditional = output[index];
    return unconditional + guidance * (output[index + latentSize] - unconditional);
  });
}
```

Implement Java’s 48-bit LCG in `JavaRandom` so denoising noise matches `java.util.Random`, including cached Box–Muller Gaussian values. Implement `seededLatentsGaussian` separately to match Kotlin `SeededLatents`, which consumes two `nextDouble()` values per output and retains only the cosine sample.

- [ ] **Step 5: Run focused and full tests**

Run:

```powershell
npx.cmd vitest run src/services/generation/web/clipTokenizer.test.ts src/services/generation/web/lcmMath.test.ts
npm.cmd test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json tsconfig.json src/services/generation/web/clipTokenizer.ts src/services/generation/web/clipTokenizer.test.ts src/services/generation/web/lcmMath.ts src/services/generation/web/lcmMath.test.ts
git commit -m "feat: add web inference numeric parity"
```

---

### Task 2: Add browser capability detection and runtime diagnostics types

**Files:**

- Create: `src/services/generation/web/webCapabilities.ts`
- Create: `src/services/generation/web/webCapabilities.test.ts`
- Create: `src/services/diagnostics/types.ts`
- Create: `src/services/runtimeMode.ts`
- Modify: `src/services/generation/types.ts`
- Modify: `src/services/errors/generationErrorPresentation.ts`

**Interfaces:**

- Produces: `detectWebCapabilities(deps?: CapabilityDependencies): Promise<WebCapabilitySnapshot>`
- Produces: `getCapabilities(): Promise<DeviceCapabilityResult>` mapping supported WebGPU to adapter ID `onnxruntime-web-webgpu`.
- Produces: `StickerRuntimeMode = 'mock' | 'native' | 'web'`.

- [ ] **Step 1: Write failing capability tests**

Cover secure context, missing `navigator.gpu`, missing `shader-f16`, storage below `minimumStorageBytes`, and a supported Chrome adapter:

```ts
expect(await detectWebCapabilities(insecureDeps)).toMatchObject({
  supported: false,
  reasonCode: 'RUNTIME_UNAVAILABLE',
  detailCode: 'INSECURE_CONTEXT',
});
expect(await detectWebCapabilities(supportedDeps)).toMatchObject({
  supported: true,
  adapterId: 'onnxruntime-web-webgpu',
  selectedDelegate: 'WebGPU',
});
```

- [ ] **Step 2: Run the test and verify failure**

Run:

```powershell
npx.cmd vitest run src/services/generation/web/webCapabilities.test.ts
```

Expected: FAIL because capability detection is absent.

- [ ] **Step 3: Implement detection and stable presentation**

Define detail codes without changing the public generation error code union:

```ts
export type WebCapabilityDetailCode =
  | 'INSECURE_CONTEXT'
  | 'UNSUPPORTED_BROWSER'
  | 'WEBGPU_UNAVAILABLE'
  | 'FP16_UNAVAILABLE'
  | 'INSUFFICIENT_STORAGE';
```

Add platform-neutral error copy for `DEVICE_UNSUPPORTED`, `RUNTIME_UNAVAILABLE`, and `INSUFFICIENT_MEMORY`. Do not mention Android in shared copy.

- [ ] **Step 4: Run focused tests, typecheck, and commit**

```powershell
npx.cmd vitest run src/services/generation/web/webCapabilities.test.ts
npm.cmd run typecheck
git add src/services/generation/web/webCapabilities.ts src/services/generation/web/webCapabilities.test.ts src/services/diagnostics/types.ts src/services/runtimeMode.ts src/services/generation/types.ts src/services/errors/generationErrorPresentation.ts
git commit -m "feat: gate web inference on WebGPU"
```

Expected: tests and typecheck PASS.

---

### Task 3: Serve and resolve the existing project model

**Files:**

- Create: `scripts/serve-web-model.mjs`
- Create: `scripts/fetch-web-segmentation-model.mjs`
- Create: `src/services/setup/web/webModelManifest.ts`
- Create: `src/services/setup/web/webModelManifest.test.ts`
- Create: `src/services/setup/web/webModelBundleManager.ts`
- Create: `src/services/setup/web/webModelBundleManager.test.ts`
- Modify: `src/services/setup/types.ts`
- Modify: `src/services/setup/localModelSetupPresentation.ts`
- Modify: `src/services/setup/localModelSetupPresentation.test.ts`
- Modify: `.env.example`
- Modify: `package.json`

**Interfaces:**

- Produces: `WebModelFiles` with `textEncoderUrl`, `unetUrl`, `vaeDecoderUrl`, `tokenizerUrl`, `segmentationUrl`, `modelId`, and `modelVersion`.
- Produces: `WebModelBundleManager implements ModelBundleManager` plus `resolveFiles(): Promise<WebModelFiles>`.
- Produces: `createWebModelBundleManager(config, dependencies): WebModelBundleManager`.
- Produces: local scripts `npm run web:model:fetch-segmentation` and `npm run web:model:serve`.

- [ ] **Step 1: Write failing manifest and local-source tests**

Tests must reject traversal, mismatched model ID/version, missing required parts, byte mismatches, and a missing local server. A valid local manifest resolves URLs beneath the configured base:

```ts
expect(resolveWebModelFiles(manifest, 'http://127.0.0.1:8790/')).toMatchObject({
  unetUrl: 'http://127.0.0.1:8790/unet/model.onnx',
  segmentationUrl: 'http://127.0.0.1:8790/segmentation/u2netp.onnx',
});
```

- [ ] **Step 2: Run tests and verify failure**

```powershell
npx.cmd vitest run src/services/setup/web/webModelManifest.test.ts src/services/setup/web/webModelBundleManager.test.ts
```

Expected: FAIL because the model source classes are absent.

- [ ] **Step 3: Implement the range-capable local server**

Use only Node built-ins. Resolve every request under the configured root, reject traversal, and support `HEAD`, full `GET`, and one byte range:

```js
const modelRoot = path.resolve(
  process.env.GENSTICKER_MODEL_ROOT ?? 'model_artifacts/model-lcm-sd15-v1.0.1',
);
const port = Number(process.env.GENSTICKER_MODEL_PORT ?? 8790);
```

Return `Access-Control-Allow-Origin: *`, `Cross-Origin-Resource-Policy: cross-origin`, `Accept-Ranges: bytes`, and correct content types.

- [ ] **Step 4: Implement pinned U²-NetP acquisition**

Download `u2netp.onnx` to `model_artifacts/model-lcm-sd15-v1.0.1/segmentation/u2netp.onnx`, require the publisher-verified SHA-256 `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8`, and delete a mismatched temporary file. Add the upstream Apache-2.0 attribution URL to `docs/MODEL_PIPELINE.md`.

- [ ] **Step 5: Implement local `WebModelBundleManager`**

In `local` mode, `getState()` and `installLocal()` probe the manifest plus every required file with `HEAD`; `start()` delegates to `installLocal()`. Map an unreachable server to `LOCAL_MODEL_SERVER_UNAVAILABLE`.

Add:

```env
EXPO_PUBLIC_WEB_MODEL_SOURCE=local
EXPO_PUBLIC_WEB_MODEL_BASE_URL=http://127.0.0.1:8790/
```

- [ ] **Step 6: Run tests and a real local-server probe**

```powershell
npx.cmd vitest run src/services/setup/web/webModelManifest.test.ts src/services/setup/web/webModelBundleManager.test.ts src/services/setup/localModelSetupPresentation.test.ts
npm.cmd run web:model:fetch-segmentation
npm.cmd run web:model:serve
```

Expected: tests PASS; server logs the validated root and `http://127.0.0.1:8790`; a `HEAD` request for `/model-distribution.manifest.json` returns 200. Stop the server after the probe.

- [ ] **Step 7: Commit**

```powershell
git add scripts/serve-web-model.mjs scripts/fetch-web-segmentation-model.mjs src/services/setup/web src/services/setup/types.ts src/services/setup/localModelSetupPresentation.ts src/services/setup/localModelSetupPresentation.test.ts .env.example package.json package-lock.json docs/MODEL_PIPELINE.md
git commit -m "feat: serve project models to the web runtime"
```

---

### Task 4: Add verified cached-model installation for deployed PWA mode

**Files:**

- Modify: `src/services/setup/web/webModelBundleManager.ts`
- Modify: `src/services/setup/web/webModelBundleManager.test.ts`
- Create: `src/services/setup/web/incrementalDigest.ts`
- Create: `src/services/setup/web/incrementalDigest.test.ts`

**Interfaces:**

- Consumes: `WebModelFiles`, `ModelBundleManager`.
- Produces: cache name `gensticker-model-lcm-sd15-chibi-1.0.1`.
- Produces: active metadata key `@gensticker/web-model/active`.

- [ ] **Step 1: Write failing cached-mode tests**

Inject `fetch`, `CacheStorage`, persistent-storage, and active-metadata dependencies. Cover progress totals, completed-part reuse, digest mismatch deletion, cancellation, insufficient quota, and activation only after all eight files pass.

```ts
expect(await manager.start(onProgress)).toMatchObject({
  status: 'ready',
  modelId: 'lcm-sd15-chibi',
  modelVersion: '1.0.1',
});
expect(activeMetadata.set).toHaveBeenCalledAfter(cache.put);
```

- [ ] **Step 2: Verify tests fail**

```powershell
npx.cmd vitest run src/services/setup/web/incrementalDigest.test.ts src/services/setup/web/webModelBundleManager.test.ts
```

Expected: FAIL because cached mode is not implemented.

- [ ] **Step 3: Implement streaming verification and cache promotion**

Use `sha256.create()` from `@noble/hashes/sha2.js`. Read response chunks once, update progress/digest, and stream the same bytes into a staged cache response. Do not call `response.arrayBuffer()` for the 1.7 GB UNet.

After every part verifies, write active metadata. `resolveFiles()` returns the original request URLs so the Service Worker can satisfy them from the named cache.

- [ ] **Step 4: Run tests and commit**

```powershell
npx.cmd vitest run src/services/setup/web/incrementalDigest.test.ts src/services/setup/web/webModelBundleManager.test.ts
npm.cmd run typecheck
git add src/services/setup/web/incrementalDigest.ts src/services/setup/web/incrementalDigest.test.ts src/services/setup/web/webModelBundleManager.ts src/services/setup/web/webModelBundleManager.test.ts
git commit -m "feat: cache verified web model artifacts"
```

Expected: tests and typecheck PASS.

---

### Task 5: Implement worker-based WebGPU generation

**Files:**

- Create: `src/services/generation/web/workerProtocol.ts`
- Create: `src/services/generation/web/webOnDeviceStickerGenerator.ts`
- Create: `src/services/generation/web/webOnDeviceStickerGenerator.test.ts`
- Create: `src/services/generation/web/stickerInference.worker.ts`
- Create: `src/services/generation/web/imagePipeline.ts`
- Create: `src/services/generation/web/imagePipeline.test.ts`
- Create: `scripts/stage-web-runtime.mjs`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**

- Consumes: `WebModelBundleManager.resolveFiles()`, numeric parity modules, and the existing `OnDeviceStickerGenerator`.
- Produces: `WebOnDeviceStickerGenerator implements OnDeviceStickerGenerator`.
- Produces: ordered `WorkerResponse` messages: `ready`, `progress`, `result`, and `failure`.

- [ ] **Step 1: Write failing adapter and image tests**

Use a fake worker to verify preparation, ordered progress, result blob URL creation, duplicate/late-event rejection, worker failure mapping, concurrent-run rejection, and cancellation by termination:

```ts
await expect(generator.cancel('request-1')).resolves.toEqual({
  accepted: true,
  outcome: 'cancellation_requested',
});
expect(fakeWorker.terminate).toHaveBeenCalledOnce();
```

Test U²-Net preprocessing shape `[1, 3, 320, 320]`, mask normalization, resize, RGBA alpha composition, and PNG encoder failure mapping using deterministic pixels.

- [ ] **Step 2: Run tests and verify failure**

```powershell
npx.cmd vitest run src/services/generation/web/webOnDeviceStickerGenerator.test.ts src/services/generation/web/imagePipeline.test.ts
```

Expected: FAIL because the web generator is absent.

- [ ] **Step 3: Implement the typed worker adapter**

Construct the Expo worker using the literal module path:

```ts
new Worker(new URL('./stickerInference.worker', window.location.href));
```

Transfer the PNG `Blob` in the result message, create the temporary object URL on the main thread, and revoke it after repository persistence.

- [ ] **Step 4: Implement ONNX session and diffusion behavior**

In the worker:

```ts
import * as ort from 'onnxruntime-web/webgpu';
ort.env.wasm.wasmPaths = '/ort/';
ort.env.wasm.proxy = false;
```

Create FP16 sessions with `executionProviders: ['webgpu']`. Tokenize negative and positive prompts as one `[2,77]` `int64` tensor; run four UNet steps at `[999,759,499,259]`; apply guidance 1.5; divide latents by 0.18215; decode VAE; segment with U²-NetP; encode a 512×512 PNG. Emit stage progress matching the existing contract.

- [ ] **Step 5: Stage offline ORT runtime assets**

Copy the WebGPU JSEP WASM asset from `node_modules/onnxruntime-web/dist` into ignored `public/ort/`. Make `web`, `web:export`, and browser-test scripts run `web:runtime:stage` first.

- [ ] **Step 6: Run tests, typecheck, and web export**

```powershell
npx.cmd vitest run src/services/generation/web
npm.cmd run typecheck
npm.cmd run web:export
```

Expected: tests and typecheck PASS; Expo exports the worker bundle and `/ort` runtime without resolving native modules.

- [ ] **Step 7: Commit**

```powershell
git add src/services/generation/web scripts/stage-web-runtime.mjs package.json package-lock.json .gitignore
git commit -m "feat: run sticker generation in a WebGPU worker"
```

---

### Task 6: Add IndexedDB stickers, browser export, and local metrics

**Files:**

- Create: `src/services/assets/webStickerAssetRepository.ts`
- Create: `src/services/assets/webStickerAssetRepository.test.ts`
- Create: `src/services/export/webPlatformAssetExporter.ts`
- Create: `src/services/export/webPlatformAssetExporter.test.ts`
- Create: `src/services/diagnostics/localDiagnostics.ts`
- Create: `src/services/diagnostics/localDiagnostics.test.ts`
- Modify: `vitest.config.ts`

**Interfaces:**

- Produces: `WebStickerAssetRepository implements StickerAssetRepository`.
- Produces: `WebPlatformAssetExporter implements PlatformAssetExporter`.
- Produces: `LocalDiagnostics.record`, `list`, `exportJson`, and `clear`.

- [ ] **Step 1: Write failing persistence/export tests**

Use `fake-indexeddb/auto`. Verify PNG blob persistence across repository instances, object URL recreation/revocation, request deduplication, deletion, failed transaction rollback, download anchor behavior, `navigator.canShare`, and JSON export without raw blocked prompts.

- [ ] **Step 2: Run tests and verify failure**

```powershell
npx.cmd vitest run src/services/assets/webStickerAssetRepository.test.ts src/services/export/webPlatformAssetExporter.test.ts src/services/diagnostics/localDiagnostics.test.ts
```

Expected: FAIL because web persistence/export is absent.

- [ ] **Step 3: Implement one IndexedDB schema**

Create database `gensticker-web-v1` with stores `stickers`, `diagnostics`, and `meta`. Store `{ metadata, png: Blob }` for each sticker. Return object URLs only at the contract boundary.

Download with a temporary `<a download="gensticker-<assetId>.png">`; share a PNG `File` only when `navigator.canShare({ files: [file] })` returns true.

- [ ] **Step 4: Run tests and commit**

```powershell
npx.cmd vitest run src/services/assets/webStickerAssetRepository.test.ts src/services/export/webPlatformAssetExporter.test.ts src/services/diagnostics/localDiagnostics.test.ts
npm.cmd run typecheck
git add src/services/assets/webStickerAssetRepository.ts src/services/assets/webStickerAssetRepository.test.ts src/services/export/webPlatformAssetExporter.ts src/services/export/webPlatformAssetExporter.test.ts src/services/diagnostics/localDiagnostics.ts src/services/diagnostics/localDiagnostics.test.ts vitest.config.ts
git commit -m "feat: persist and export web stickers"
```

---

### Task 7: Compose browser services and connect store behavior

**Files:**

- Create: `src/services/appServices.web.ts`
- Modify: `src/services/appServices.ts`
- Modify: `src/store/useStickerStore.ts`
- Modify: `src/store/useStickerStore.test.ts`
- Modify: `src/services/setup/localModelSetupPresentation.ts`
- Modify: `src/services/setup/localModelSetupPresentation.test.ts`

**Interfaces:**

- Consumes: all web services from Tasks 2–6.
- Produces: the same `stickerServices`, `getStickerRuntimeMode`, `getMockScenario`, and `setMockScenario` exports used by screens.

- [ ] **Step 1: Write failing store/composition tests**

Mock web services and verify initialization order is gallery → model state → capability, local source calls `installLocal`, cache source calls `start`, successful generation persists before navigation data is exposed, cancellation resets the worker, and diagnostics receive stage timings/errors.

- [ ] **Step 2: Run tests and verify failure**

```powershell
npx.cmd vitest run src/store/useStickerStore.test.ts src/services/setup/localModelSetupPresentation.test.ts
```

Expected: new web cases FAIL.

- [ ] **Step 3: Implement web composition**

`appServices.web.ts` selects mock only when `EXPO_PUBLIC_STICKER_RUNTIME === 'mock'`; otherwise compose:

```ts
const modelBundle = createWebModelBundleManager(webModelConfig);
const generator = new WebOnDeviceStickerGenerator({
  resolveModelFiles: () => modelBundle.resolveFiles(),
  getCapabilities: detectWebCapabilities,
});
```

Use `WebStickerAssetRepository`, `WebPlatformAssetExporter`, shared safety, and shared coordinator. Keep `appServices.ts` as the native/default implementation used by Vitest and Android.

- [ ] **Step 4: Run full application tests and commit**

```powershell
npm.cmd test
npm.cmd run typecheck
git add src/services/appServices.web.ts src/services/appServices.ts src/store/useStickerStore.ts src/store/useStickerStore.test.ts src/services/setup/localModelSetupPresentation.ts src/services/setup/localModelSetupPresentation.test.ts
git commit -m "feat: connect browser sticker services"
```

Expected: all tests and typecheck PASS.

---

### Task 8: Build the responsive web experience and diagnostics

**Files:**

- Modify: `app/index.tsx`
- Modify: `app/create/generating.tsx`
- Modify: `app/create/result.tsx`
- Modify: `app/library/index.tsx`
- Modify: `app/settings/index.tsx`
- Modify: `app/debug.tsx`
- Modify: `app/_layout.tsx`
- Modify: `src/components/common/ScreenContainer.tsx`
- Modify: `src/components/sticker/LoadingProgress.tsx`
- Modify: `src/components/export/CheckerboardPreview.tsx`
- Create: `src/components/web/RuntimeStatusCard.tsx`
- Create: `src/components/web/DiagnosticsEventList.tsx`

**Interfaces:**

- Consumes: existing store plus web model/capability/diagnostic state.
- Produces: desktop two-column workspace at widths ≥1024 and single-column behavior below it.

- [ ] **Step 1: Add component tests for copy and responsive decisions**

Extract pure helpers for runtime labels and column widths. Assert web copy says “Runs locally in this browser,” local mode shows the model-server command, cache mode shows download size, and native copy remains unchanged.

- [ ] **Step 2: Run tests and verify failure**

```powershell
npx.cmd vitest run src/components
```

Expected: new helper tests FAIL.

- [ ] **Step 3: Implement responsive layouts**

Use `useWindowDimensions()` and flexbox. At desktop width, cap content at 1280, make the prompt column flex 3 and the recent/status column flex 2. Do not use intrinsic `div`/`img`, CSS, or `Dimensions.get`.

Update result actions to “Download PNG” on web and “Save to Photos” on native. Show Web Share only when available. Add Diagnostics controls for JSON export, diagnostics clear, capability recheck, model source/status, and the explicitly labeled experimental WASM switch.

- [ ] **Step 4: Run tests, typecheck, lint, and commit**

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
git add app src/components
git commit -m "feat: add responsive web sticker workspace"
```

Expected: tests, typecheck, and lint PASS.

---

### Task 9: Add installable PWA packaging and production browser tests

**Files:**

- Create: `public/manifest.webmanifest`
- Create: `public/_headers`
- Create: `scripts/build-web-pwa.mjs`
- Create: `src/services/pwa/registerServiceWorker.ts`
- Create: `src/services/pwa/registerServiceWorker.web.ts`
- Create: `playwright.config.ts`
- Create: `e2e/web-sticker.spec.ts`
- Modify: `app/_layout.tsx`
- Modify: `app.json`
- Modify: `package.json`
- Modify: `docs/LOCAL_DEVELOPMENT.md`
- Modify: `docs/TESTING_AND_RELEASE.md`

**Interfaces:**

- Produces: `npm run web:export`, `npm run web:serve`, and `npm run test:web`.
- Produces: generated `dist/sw.js` with application-shell precache and model-cache lookup.

- [ ] **Step 1: Write the browser acceptance tests**

Cover:

```ts
test('shows a WebGPU requirement when capability is absent', async ({ page }) => {});
test('uses the local project model source in development configuration', async ({ page }) => {});
test('persists a mocked generated sticker after reload', async ({ page }) => {});
test('reloads the production shell while offline', async ({ page, context }) => {});
```

Use a deterministic mock worker for automated generation; do not download the 2.07 GB bundle in routine CI.

- [ ] **Step 2: Implement production Service Worker generation**

Run `expo export --platform web`, then `workbox-build.generateSW` with:

```js
{
  globDirectory: 'dist',
  globPatterns: ['**/*.{html,js,css,json,png,ico,wasm,webmanifest}'],
  swDest: 'dist/sw.js',
  navigateFallback: '/index.html',
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  runtimeCaching: [{
    urlPattern: /(?:model-lcm-sd15-v1\.0\.1|u2netp\.onnx)/,
    handler: 'CacheFirst',
    options: { cacheName: 'gensticker-model-lcm-sd15-chibi-1.0.1' },
  }],
}
```

Register only in production web. Add COOP `same-origin`, COEP `require-corp`, and CORP `same-origin` under `public/_headers`.

- [ ] **Step 3: Configure PWA metadata and scripts**

Set web output to static, keep Metro, reference the web manifest from the root document, and document these local commands:

```powershell
npm.cmd run web:model:fetch-segmentation
npm.cmd run web:model:serve
npm.cmd run web
```

- [ ] **Step 4: Run production browser verification**

```powershell
npm.cmd run web:export
npm.cmd run test:web
```

Expected: static export succeeds; Chromium tests PASS; offline reload returns the app shell; model files are absent from `dist`.

- [ ] **Step 5: Run the full verification suite**

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run web:export
npm.cmd run test:web
```

Expected: every command exits 0.

- [ ] **Step 6: Commit**

```powershell
git add public scripts/build-web-pwa.mjs src/services/pwa playwright.config.ts e2e app/_layout.tsx app.json package.json package-lock.json docs/LOCAL_DEVELOPMENT.md docs/TESTING_AND_RELEASE.md
git commit -m "feat: package the sticker generator as a PWA"
```

---

### Task 10: Run real-model acceptance on the available PC

**Files:**

- Create: `docs/WEB_FEASIBILITY.md`
- Modify: `docs/TESTING_AND_RELEASE.md`

**Interfaces:**

- Consumes: the completed local-source web application.
- Produces: an evidence record; it does not change the model or supported-browser policy.

- [ ] **Step 1: Verify the ignored model bundle**

```powershell
powershell -ExecutionPolicy Bypass -File scripts/stage-local-model.ps1 -ValidateOnly
npm.cmd run web:model:fetch-segmentation
```

Expected: every generation part and U²-NetP checksum passes.

- [ ] **Step 2: Start the local model server and web app**

In separate terminals:

```powershell
npm.cmd run web:model:serve
npm.cmd run web
```

Open the localhost URL in Chrome or Edge with WebGPU enabled.

- [ ] **Step 3: Execute one real safe prompt**

Use `A cheerful astronaut cat holding boba`. Record browser version, adapter information, model preparation duration, each UNet step, segmentation duration, total latency, success/failure code, and whether the page remained responsive.

- [ ] **Step 4: Validate the output when generation succeeds**

Confirm the result is a 512×512 PNG with non-opaque alpha, persists after reload, downloads successfully, and remains available with the app offline.

If the runtime cannot complete, record the exact session/model/operator/GPU error and do not mark the real-model criterion successful.

- [ ] **Step 5: Write evidence and run final regression**

Document measured facts in `docs/WEB_FEASIBILITY.md`, then run:

```powershell
npm.cmd run verify
npm.cmd test
npm.cmd run test:web
```

- [ ] **Step 6: Commit**

```powershell
git add docs/WEB_FEASIBILITY.md docs/TESTING_AND_RELEASE.md
git commit -m "docs: record web model feasibility"
```
