# Deterministic Mock Service

Set `EXPO_PUBLIC_STICKER_SERVICE=mock`. The legacy `EXPO_PUBLIC_USE_MOCK_SERVICE=true` flag remains supported during migration. Mock is the safe default, even when neither variable is present.

The mock product service persists records under `@gensticker/mock-product-state/v1` and never performs fetch/XHR calls. Product session IDs and consent live in the versioned Zustand session store; stale consent is cleared by migration when the required consent version changes.

Canonical jobs advance deterministically through validating, preparing, generating, background removal, postprocessing, and completed. Completion materializes three bundled candidates; exactly one is recommended and none is selected automatically. Packs contain the versioned core-eight emotion template and advance slots independently. In `partial_pack`, only `confused` fails; targeted retry changes only that slot.

Export produces a deterministic manifest for PNG, WebP, or ZIP. Mock asset URIs describe the frontend contract; they are not production archive files. Native file sharing is used only when the selected manifest asset is a local `file:` URI and the platform supports it; otherwise the app uses the React Native share sheet fallback.

The development debug route exposes deterministic scenarios, safe record counts, active IDs, and local reset. Persistence and diagnostics reject image binary/base64, data URIs, raw selfie URIs, and tokens. In HTTP mode, scenario switching/reset are hidden and diagnostics come from the backend metadata endpoint.
