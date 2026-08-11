# Browser vision models

`blaze_face_short_range.tflite` is the MediaPipe BlazeFace short-range face detector used by the zero-cost, exact-one-face browser input gate.

- Source: https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite
- Package/runtime: `@mediapipe/tasks-vision@1.0.1`
- WASM base URL: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm`
- Runtime settings: CPU delegate, image mode, detection confidence `0.35`, suppression threshold `0.3`
- Client timeout: 45 seconds
- SHA-256: `B4578F35940BF5A1A655214A1CCE5CAB13EBA73C1297CD78E1A04C2380B0152F`
- License: Apache-2.0 (MediaPipe)

The model is served from the same frontend origin and runs in a Web Worker on the user's CPU through WebAssembly. The UI accepts the file only when the detector returns exactly one face; zero faces, multiple faces, initialization/detection errors, unsupported browsers, and timeouts fail closed before generation.

This gate does not require a server GPU or a paid vision API and is suitable for a Vercel Free frontend. It is client-only: direct FastAPI callers can bypass it. A BlazeFace detection count is not proof of one person, identity, or liveness and must not be presented as such.
