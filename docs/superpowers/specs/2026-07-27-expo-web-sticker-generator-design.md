# Expo Web Sticker Generator Design

**Date:** July 27, 2026  
**Status:** Approved design pending written-spec review  
**Authority:** `docs/PRD_AI_Sticker_Generator.md`

## Summary

Extend the existing Expo SDK 57 application into a browser-based sticker generator without replacing or rewriting the Android app. The web and Android builds share the Expo Router screens, Zustand state, safety filter, generation coordinator, public TypeScript contracts, prompt behavior, and gallery-facing behavior. Platform-specific adapters provide inference, model setup, asset persistence, download/share, and capability checks.

The browser build uses ONNX Runtime Web with WebGPU and the exact SD1.5 + LCM model bundle already used by Android: `lcm-sd15-chibi` version `1.0.1`, 512×512 output, four denoising steps, guidance scale 1.5, the same prompt suffix, and the same fixed safety negative prompt. The existing Kotlin runtime and Android model pipeline remain unchanged.

The supported prototype target is Chromium with WebGPU: Chrome or Edge on desktop and Chrome on Android. Safari, Firefox, iOS browsers, insecure origins, and WebGPU adapters without required FP16 support are blocked before model setup. A WASM path is available only as a Diagnostics experiment and is not presented as a supported generation path.

## Architecture

### Shared application shell

- Keep the current Expo Router routes for prompt entry, generation progress, result, gallery, settings, and diagnostics.
- Keep the existing generation and asset contracts as the boundary used by the store and coordinator.
- Split application service composition by platform so web bundles never import native-only modules and native bundles never import browser-only modules.
- Preserve Android behavior and tests; web support is additive.

### Web inference runtime

- Implement the web `OnDeviceStickerGenerator` behind the existing contract.
- Run model loading, tokenization, tensor processing, diffusion, segmentation, and PNG encoding in an Expo Metro module worker so expensive work does not block the UI.
- Port the Kotlin CLIP tokenizer, Java-compatible seeded random behavior, FP16 conversion, classifier-free guidance, LCM scheduler, prompt augmentation, and fixed negative prompt into independently tested TypeScript modules.
- Load the existing text encoder, UNet, and VAE ONNX files through `onnxruntime-web/webgpu`.
- Keep warmed sessions in the worker after successful preparation to make regeneration faster.
- Cancel immediately by terminating the worker. The next generation recreates and prepares a clean worker.
- Treat worker crashes, GPU device loss, session creation failures, and out-of-memory exits as `GenerationFailure` values; no partial output enters the gallery.

### Background removal

- Use a lightweight U²-NetP ONNX segmenter for the browser pipeline.
- Source the model from the Apache-2.0 U²-Net project or a traceable conversion of the official weights, record its checksum and provenance, and include the applicable license notice.
- Do not use BRIA RMBG-1.4 because its published model terms restrict commercial deployment.
- Resize the generated image to the segmenter input, infer a foreground mask, resize the mask back to 512×512, smooth/clamp alpha using the same observable behavior as the Android composer, and encode the final RGBA image as PNG.

### Model sources

The web runtime supports two explicit model-source modes selected at build time.

**Local project mode**

- This is the default in local development.
- A repository script starts a localhost static server rooted at `model_artifacts/model-lcm-sd15-v1.0.1`.
- The server supports CORS, range requests, correct ONNX/JSON content types, and the cross-origin resource policy needed by a cross-origin-isolated app.
- The browser reads model artifacts from the localhost URLs and does not duplicate the 2.07 GB bundle into browser model storage.
- The existing distribution manifest remains the source of model identity, version, byte sizes, and SHA-256 values.
- Local mode requires the model server to remain running; it is not described as PWA-offline mode.

**Cached PWA mode**

- This is the default for production exports.
- An explicit model-install action requests persistent storage, downloads each manifest part, reports byte progress, verifies SHA-256 incrementally, and caches only complete verified responses.
- Completed parts survive a later-part failure. A failed or mismatched part is discarded and retried.
- The active model version is updated only after all required parts are verified. A partial or mixed-version bundle is never exposed as ready.
- The Service Worker returns cached model responses to ONNX Runtime so generation works without connectivity after setup.

`EXPO_PUBLIC_WEB_MODEL_SOURCE` selects `local` or `cache`; `EXPO_PUBLIC_WEB_MODEL_BASE_URL` supplies the localhost or hosted artifact base URL. Neither value contains secrets.

### PWA and hosting

- Keep Expo Router static web output and Metro as the web bundler.
- Generate a production Service Worker after `expo export --platform web` to precache the exported application shell and runtime assets.
- Keep large model installation under the versioned model manager rather than adding the model bundle to application-shell precaching.
- Include a web app manifest, installable icons, offline navigation fallback, and update handling.
- Include deployable COOP/COEP/CORP header configuration. WebGPU and production PWA operation require HTTPS; localhost remains valid for development.
- Do not deploy as part of this implementation unless separately requested.

## User Experience

### Responsive workspace

- On desktop, render a two-column home workspace: prompt/model controls in the primary column and recent stickers/runtime status in the secondary column.
- On narrow screens, retain a single-column flow with the same route order and actions.
- Keep one `chibi` style preset and the existing example prompts.
- Update wording from Android-specific “on-device/native adapter” language to platform-neutral “runs locally” language.

### Setup and capability flow

1. Hydrate local gallery metadata and draft state.
2. Check secure context, supported browser, WebGPU availability, required FP16 support, storage estimate, and runtime initialization.
3. In local project mode, check that the manifest and all model URLs are reachable.
4. In cached PWA mode, show the total download size and require an explicit install action.
5. Enable generation only after the selected model source is ready.

Unsupported browsers receive a clear Chrome/Edge requirement and never begin the multi-gigabyte download. Diagnostics explains the detected browser, WebGPU adapter, storage estimate, cross-origin isolation state, model source, model version, and failure reason.

### Generation flow

1. Validate the draft and run the local input safety evaluator.
2. Prepare the selected model source and worker.
3. Generate the raw 512×512 image with the shared model configuration.
4. Run U²-NetP background removal.
5. Encode a transparent PNG.
6. Persist the PNG and metadata before navigating to the result route.

Progress retains the existing stages: validating, preparing model, generating, removing background, encoding, completed, and saving. Repeated generation with the same prompt increments the existing retry count and retains the prompt-edit nudge.

### Gallery, download, and sharing

- Store generated PNG blobs and gallery metadata in IndexedDB; only model files use local-server or model-cache storage.
- Recreate object URLs when gallery items are loaded and revoke them when no longer needed.
- Preserve generation outputs across browser sessions.
- Implement Save as a browser PNG download without requesting photo-library permission.
- Use the Web Share API only when `navigator.canShare()` accepts the PNG `File`; otherwise keep download as the universal fallback.
- Deleting a gallery entry removes both metadata and its PNG blob.

### Local diagnostics and metrics

- Do not add Firebase or another telemetry backend.
- Record opt-in validation events locally: capability outcome, model setup result, stage timings, total generation latency, safety blocks, failures, retries, downloads, and shares.
- Never record raw blocked prompts.
- Allow Diagnostics to export the local records as JSON and clear diagnostic records independently of stickers.
- Keep the unsupported WASM override in Diagnostics only and label its results as experimental.

## Failure and Recovery

- **Unsupported runtime:** block setup and generation with an actionable browser requirement.
- **Insufficient storage:** block cached installation before download; local project mode remains available on development machines.
- **Local model server unavailable:** show the expected command and base URL, then allow recheck.
- **Interrupted or corrupt download:** keep already verified parts, discard the failed part, and retry it.
- **Offline before cached setup completes:** explain that setup needs connectivity; do not show the model as ready.
- **Offline after cached setup:** app shell, model, gallery, generation, download, and diagnostics remain functional.
- **Worker crash, GPU device loss, or memory pressure:** terminate the worker, preserve existing stickers, and offer retry after freeing resources.
- **Generation, segmentation, encoding, or persistence failure:** create no gallery record and expose the existing safe retry/edit flow.
- **Cancellation:** terminate active inference immediately, save no asset, and return to an editable state.
- **Share unavailable or cancelled:** preserve the sticker and continue offering download.

## Testing and Acceptance

### Automated tests

- Add parity fixtures for token IDs, seeded latent/noise values, FP16 conversion, guided noise, LCM timesteps, LCM steps, pixel conversion, and alpha composition.
- Unit-test capability classification, worker messages, progress ordering, cancellation, worker restart, and error mapping.
- Unit-test both model-source managers, manifest validation, incremental digest acceptance/rejection, partial-download recovery, active-version promotion, and local-server reachability.
- Unit-test IndexedDB gallery persistence, object URL lifecycle, deletion, download, share capability checks, and local metrics export/clear.
- Browser-test responsive routes, prompt validation, safety rejection, unsupported-browser UI, model setup states, mocked generation, persistence, result actions, and gallery recovery.
- Production-browser test the generated Service Worker, application-shell offline reload, and cached-model readiness with small deterministic fixtures.
- Run the existing TypeScript and Android tests to detect native regressions.

### Real-model acceptance

- Build and serve the production web export in Chromium.
- Confirm local project mode reads the existing artifacts without creating a browser model-cache copy.
- Attempt at least one full real generation on the available WebGPU PC and record adapter, browser, model preparation time, four denoising-step timings, segmentation time, total latency, peak-observable failure symptoms, and output image.
- Confirm the result is a 512×512 transparent PNG stored in the gallery and downloadable.
- If the available GPU cannot load or complete the model, report the exact capability/session/runtime failure and retain mocked browser coverage; do not claim real-model success.

## Assumptions

- The user will keep the localhost model server running while using local project mode.
- The existing ignored `model_artifacts/model-lcm-sd15-v1.0.1` directory contains the complete v1.0.1 bundle.
- Chromium WebGPU is the supported validation target; Safari/iOS support is not promised in this phase.
- Web and Android use the same generation weights and parameters, but background removal remains platform-specific.
- Generated stickers and diagnostics remain browser-local; no backend, cloud inference, Firebase, or deployment work is included.
- The user's uncommitted PRD changes remain untouched.
