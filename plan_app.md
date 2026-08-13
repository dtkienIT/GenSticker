# GenSticker Mobile V1 implementation plan

## Product contract

- Build on `kien_v6` as a standalone Expo/FastAPI/Supabase app.
- Accept exactly one person, pet, or primary object from one source image.
- Offer four versioned presets: `chibi_2d`, `chibi_3d`, `plush`, and `pixel`.
- Generate eight candidates from one style-specific canonical and one 4x2 sheet.
- Publish only moderated, quality-approved results; success requires 6-8 stickers.
- Use subject-specific pose catalogs and deterministic Vietnamese/English wording based on app locale.
- Require Supabase Auth in production, block likely minors, allow two regenerations per source, and delete temporary source/canonical/preview assets after 24 hours.

The standalone app and multi-style selector are approved deviations from the original fixed-style DUHAT-integrated PRD. Free prompts, per-item editing, multiple reference images, photorealism, public packs, and DUHAT chat/tray integration remain out of scope.

## Architecture and reuse

Keep the Expo flow, FastAPI API/repository/job abstractions, Supabase RLS/private storage, idempotency, preview/library/delete/share, and mock pipeline from `kien_v6`. Port only the provider adapters, canonical prompt strategy, fixed 4x2 generation, post-processing, alpha cleanup, outline, checksum, and quality checks from `kien_v5`. Do not merge the Vite UI, Telegram path, 20-slot catalog, in-memory job ownership, or public asset URLs.

All real generation is behind a vendor-neutral `StickerPipelinePort` with input assessment, canonical creation, sheet generation, and output assessment. Mobile and public API contracts never expose vendor-specific types or raw provider errors.

## Input and safety gate

- Accept JPEG, PNG, WebP, HEIC/HEIF after magic-byte verification; maximum 10 MiB, minimum short edge 768 px, maximum 40 MP.
- Normalize orientation and sRGB, strip EXIF/GPS, and create a bounded internal image no larger than 2048 px.
- Server-side authoritative checks cover blur, lighting, clipping, subject visibility, one-primary-subject classification, face count for people, input moderation, celebrity/public-figure/copyrighted-character checks, and conservative minor blocking.
- Prototype defaults are Laplacian variance >= 80, mean luminance 35-220, clipped shadow/highlight <= 35%, primary subject confidence >= 0.70 and occupancy 20-85%. Person inputs require exactly one face with confidence >= 0.80 and occupancy >= 12%.
- Consent is versioned and attached to user/source. Client responses contain stable actionable reason codes only.

## Generation and output gate

Lock subject type, style, locale, and catalog version when the job is created. Reject a bad canonical before paying for a sheet. Generate a fixed 4x2 layout with explicit gutters, split at locked coordinates, clean alpha/color spill, add the die-cut outline, and composite catalog text server-side. If fewer than six cells pass, retry the full sheet once; a second result below six fails without creating a saved pack.

Each published sticker is PNG RGBA/sRGB, 512x512, <= 1 MiB, has at least 24 px margin, no adjacent-cell contamination or white halo, and includes checksum, ordinal, expression key, style, locale, moderation version, and quality result. Per-item gates cover decode/format/alpha, edge contact, truncation, dominant components, identity/subject fidelity, anatomy, pack consistency, duplicates, wording readability, and output moderation.

The shared semantic keys are `hello`, `love`, `ok`, `happy`, `sad`, `surprised`, `sleepy`, and `cheer`. Human, pet, and object catalogs provide different prompts while preserving the same product meaning.

## API, persistence, and mobile

- Source responses include subject type, validation checks, and safe reason codes.
- Job creation accepts source ID, style ID, locale, and catalog version under an idempotency key.
- Observable stages are validating, canonicalizing, generating, splitting, quality checking, moderating, succeeded, failed, and timed out.
- Sticker sets contain 6-8 published items plus target/published/rejected counts.
- Save accepts 1-8 owned sticker IDs; regenerate is limited to two per unexpired source.
- Reports support unauthorized likeness, harassment, copyright, not-like-me, unsafe, and other.
- Replace the exact-eight database trigger with a 6-8 publish invariant; add style/subject/catalog/provider/count/quality/moderation metadata and RLS for all owned resources.
- Mobile flow is auth -> consent/photo -> validation -> style -> progress/resume -> preview/select -> save/share/report. Active jobs survive navigation/background/restart.

Temporary source, canonical, intermediate, and unsaved preview assets are private and expire after 24 hours. Saved outputs remain until user deletion. Production refuses to start with a mock pipeline or missing required safety/retention configuration.

## Provider selection and release gate

Run an equivalent bake-off of available OpenAI, Gemini, and FAL adapters. Privacy/security requirements are hard gates; score passing providers by fidelity 40%, usable output quality 20%, latency 15%, cost 15%, and reliability/safety integration 10%. Keep one reviewed fallback adapter without changing provider inside an active job.

Use TDD with unit, shared provider-contract, API/repository/Supabase integration, cross-user security, and mobile flow tests. New/changed code targets at least 80% coverage. Release requires every successful job to expose 6-8 moderated stickers, exact catalog wording, no visible crop contamination/white halo, correct 24-hour cleanup, background job recovery, and approved quality/safety/provider benchmarks.

Report-evidence retention, takedown SLA, and final fidelity/bias thresholds remain Product/Privacy/Legal release blockers. They must be required deployment configuration, not choices silently made in code.
