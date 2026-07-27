# Web Model Feasibility

## Acceptance Result

Real local-model acceptance passed on 2026-07-27 on branch `experiment/text2sticker-web`.
The Expo web app loaded the same `lcm-sd15-chibi` `1.0.1` FP16 ONNX graphs used by the mobile
runtime from the ignored project directory, generated one safe sticker through ONNX Runtime WebGPU,
removed its background, persisted it in IndexedDB, downloaded it, and reopened it offline.

This is desktop-browser feasibility evidence. It does not replace Android physical-device or
mobile-browser acceptance.

## Environment

| Field               | Observed value                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------ |
| OS                  | Windows 10, 64-bit                                                                         |
| Browser engine      | Chrome `150.0.7871.182`                                                                    |
| Test harness        | Playwright-controlled headless Chrome with a standard Chrome user agent                    |
| WebGPU adapter      | AMD, architecture `gcn-5`                                                                  |
| Required feature    | `shader-f16` present                                                                       |
| ONNX Runtime Web    | `1.27.0`, WebGPU execution provider                                                        |
| Model source        | `http://127.0.0.1:8790/`, backed by `model_artifacts/model-lcm-sd15-v1.0.1`                |
| Generation bundle   | 7 verified parts, 2,068,818,989 bytes                                                      |
| Segmentation bundle | Pinned U²-NetP, SHA-256 `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8` |

Playwright headless Chrome reports `HeadlessChrome` in its default user agent, which the product
correctly rejects because the supported-browser policy permits Chrome/Chromium/Edge identities.
The acceptance context used the standard Chrome 150 user-agent string; the WebGPU adapter and
inference process remained the actual local Chrome/GPU runtime.

## Artifact and Server Verification

The following commands exited successfully:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/stage-local-model.ps1 -ValidateOnly
npm.cmd run web:model:fetch-segmentation
npm.cmd run web:export
```

The generation bundle validator confirmed all seven parts and their combined byte count. The local
model server returned all required manifest, configuration, tokenizer, generation, and segmentation
resources from port `8790`; its range support had already been covered by the automated server
tests.

## Real Prompt Measurement

Prompt: `A cheerful astronaut cat holding boba`

| Phase                          | Elapsed from phase start |
| ------------------------------ | -----------------------: |
| Model/session preparation      |                   21.7 s |
| UNet step 1                    |                   10.0 s |
| UNet step 2                    |                    6.0 s |
| UNet step 3                    |                    5.9 s |
| UNet step 4                    |                    5.9 s |
| Decode after final UNet step   |                    8.2 s |
| U²-NetP background removal     |                    1.7 s |
| PNG encoding                   |                   0.04 s |
| Inference and post-processing  |                   37.7 s |
| End-to-end through persistence |                   59.5 s |

Progress events continued to update during the run, and the page remained interactive. ONNX Runtime
emitted non-fatal constant-folding warnings for FP16 `Sqrt` nodes without CPU kernels; execution
continued on WebGPU and completed.

## Output Validation

- Result: success, `512 × 512`, `image/png`, 62,872 bytes.
- Alpha: 4,028 fully transparent pixels and 258,115 partially transparent pixels out of 262,144.
- Persistence: the sticker and PNG blob remained present after reload and appeared in **My
  Stickers**.
- Download: Playwright saved the generated PNG successfully with no download failure.
- Offline: after the service worker had installed, an offline reload of `/library` still displayed
  the persisted sticker.
- Privacy: diagnostics stored request/stage timing and adapter metadata, but not the prompt.

## Defects Found During Acceptance

Two production-only defects were found and fixed before the successful run:

1. Production export could reuse Metro's preceding mock-build cache. Web exports now clear the
   bundler cache and explicitly select the web runtime.
2. The Expo/Metro worker bootstrap uses `importScripts`; launching it as a module worker caused
   `Module scripts don't support importScripts()`. The inference worker now launches as a classic
   worker, with a regression test covering the constructor contract.

## Remaining Limits

- This run covers one AMD desktop adapter and one safe prompt; it is not a quality or hardware
  matrix.
- The local project-directory source requires the model server to remain running. A deployable
  offline installation can instead be built with `EXPO_PUBLIC_WEB_MODEL_SOURCE=cache`, which uses
  the same manifest and checksums.
- Browser generation is intentionally blocked without Chromium WebGPU and `shader-f16`; there is no
  silent cloud or CPU fallback.
