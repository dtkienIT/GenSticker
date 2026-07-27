# Product Requirements Document: On-Device AI Sticker/Emoji Generator

**Status:** Complete — v3 draft (near-term deliverable is now a web prototype validation phase, no fixed deadline; native mobile deferred until validated)
**Last updated:** July 22, 2026

---

## 1. Executive Summary

This PRD defines an **on-device AI sticker generator**. Per updated direction, the near-term deliverable is a **browser-based PWA prototype** — not the final product, but a faster, lower-friction environment to validate the generation pipeline and UX before committing to native mobile engineering (Android first, iOS to follow, per earlier scoping). The model choices made in this phase are deliberately mobile-compatible, so the validation work carries forward rather than being thrown away once native development begins.

The core rationale is **cost-avoidance, not privacy**. Competing AI sticker tools — including Meta AI's Messenger stickers, powered by cloud-hosted Llama 2 and Emu models — paywall or throttle generation because every cloud request costs money. Running generation client-side (in-browser now, on-device later) makes "free and unlimited" a sustainable product position rather than a temporary trial hook, in support of a non-monetized engagement/brand objective aimed at 16–30-year-old, high-frequency chat users.

**Note on how this plan has evolved:** this project was originally scoped as iOS-first, then reversed to Android-first, and has now shifted again to a web-prototype-first sequencing ahead of any native build. Each reversal is documented plainly rather than silently absorbed, because the risk profile changes each time — most recently, moving fast on the web doesn't eliminate the native-specific risks already identified (Android hardware fragmentation, ML Kit Subject Segmentation's beta status, Play Store review timing); it defers them to when native development resumes (Section 13).

**Note on timeline:** this phase has **no fixed deadline** — a deliberate choice, since the point is to validate the approach before investing further, not to hit a date. That said, open-ended timelines carry their own risk (Section 11): without an external forcing function, validation work can drift indefinitely. A soft internal pacing suggestion is offered in Section 12, explicitly non-binding.

Scope for this phase is deliberately narrow: text-to-sticker generation only (fusion/combination deferred), a single offline-capable web app (not yet native), save-and-share via whatever the browser supports (Web Share API or image download), and input-side content moderation only (no output-image classification). These cuts are explicit, with rationale documented throughout — not silent gaps.

Success for this phase is measured by **validation criteria, not a launch date**: does the pipeline produce acceptable quality and latency on real mobile browsers, does the offline/PWA architecture actually work, and is there a clear enough picture to justify committing to native engineering — and if so, on which platform first.

## 2. Problem Statement & Pain Points

### Problem Statement
Generative AI sticker tools (Meta AI's Messenger stickers, and most competing apps) run generation in the cloud. That gives them flexibility and quality, but it also means every sticker a user generates costs the provider real inference money — which is why nearly all of them gate usage behind paywalls, quotas, or ad-supported friction once a free trial runs out. For the target audience of this product — young, high-frequency chat users who want to generate stickers casually and often — that cost-driven gating is the core unsolved problem. Client-side generation (in-browser now, on-device later) sidesteps the economics entirely: once the model is loaded, the marginal cost of a sticker is zero, so "free and unlimited" is an actual sustainable product position rather than a temporary trial hook.

### Pain Points

1. **Paywalled generation.** Because cloud inference costs money per request, competing apps cap free usage and monetize the rest — directly at odds with how the target users want to use the feature (frequently, casually, without hitting a wall).
2. **Curated, not personalized.** Tools like Emoji Kitchen offer combination-based fun, but they're built from a fixed, hand-designed library — not true open-ended generation from what a user actually wants to express in the moment.
3. **Manual sticker-makers demand skill.** Existing "make your own sticker" apps often require users to manually crop, cut out backgrounds, and compose — a real barrier for users who just want to type a prompt and get a result.
4. **Data leaves the device.** Cloud-based competitors send prompts (and sometimes photos) to a third-party server to generate. That's a legitimate secondary concern for some users, even though it isn't the primary driver of this project's architecture.
5. **No offline fallback.** Every cloud-dependent competitor simply fails without connectivity — there's no degraded-but-working experience.
6. **Cluttered free experiences.** Free competitors often lean on ads or upsell prompts to make the economics work, which erodes the experience for casual users.

Taken together, these pain points point at one clear gap: **there's no sticker generation experience that's genuinely free, unlimited, and fast enough to fit into the rhythm of casual daily chatting** — and client-side generation is what makes that gap closeable.

## 3. Target Users

### Primary Profile
- **Age range:** 16–30 (Gen Z / young millennial)
- **Behavior:** Active daily users of chat apps (WhatsApp, Messenger, Telegram, iMessage); already send stickers/memes as a regular part of how they communicate
- **Motivation:** Casual creative self-expression — reacting in the moment, being funny or relatable in a group chat — not "serious" design or content creation
- **Price sensitivity:** Unwilling or unable to pay recurring costs for sticker subscriptions or premium packs
- **Cultural fluency:** Plugged into meme/trend culture; wants fast, personalized reactive content rather than generic stock art

### Persona (illustrative)
> **Minh, 19, university student.** Sends 50+ stickers a day across three different group chats. Has tried a couple of AI sticker apps before but hit the free-generation limit within the first week and wasn't willing to pay to continue. Wants to make a sticker of an inside joke or a specific reaction on the spot, not browse a static library hoping something close enough exists.

### Explicitly Out of Scope
To keep the product focused, this is **not** designed for:
- Professional designers or illustrators needing fine creative control
- Users expecting photorealistic image generation (the target aesthetic is stylized/sticker-like, not photo-quality)
- Enterprise, older, or non-chat-app-centric demographics

This scoping matters beyond messaging — it directly shapes the model/style choices in Section 9 (a model tuned for expressive, cartoon-like output doesn't need to also excel at photorealism) and the moderation posture in Section 10 (built around a younger adult audience, not a general-purpose or child-directed one).

## 4. Goals & Success Metrics

### Product Goals
1. Validate a working text-to-sticker generation experience that runs fully offline once loaded, in a browser environment first
2. Prove client-side generative AI is technically viable for this use case, using mobile-compatible model choices from the start
3. Keep marginal cost per generation at zero — no cloud inference dependency for the core value prop, in this phase or the eventual native one
4. Use this web prototype to **de-risk and inform** the eventual native build (Android first, per earlier direction, with iOS to follow), rather than committing to native engineering before the approach is proven
5. Keep the experience fast and simple enough to fit casual, high-frequency chat use
6. Support the broader brand/engagement objective (distribution/promotion itself is owned by another team — see Section 6)

### Graduation Criteria (replacing a launch-date gate)
Rather than a calendar deadline, this phase ends when there's enough evidence to make an informed decision about committing to native engineering. Concretely, that means:
- Generation quality and end-to-end latency (generation + background removal) measured on **real mobile browsers**, not just desktop
- The offline/PWA architecture confirmed actually working (model caches correctly, app functions with no connectivity after first load)
- A clear read on whether Plan A (open prompts), Plan B (constrained prompt-builder), or Plan C (template fallback) — Section 11 — is the right starting point for native
- Enough UX signal (from informal testing, not necessarily a full public release) to know whether the core loop is worth carrying forward

### Post-Validation Metrics (Ongoing, Intentionally Lightweight)
Once this phase produces a working prototype, lightweight tracking is still worth having, even if usage is limited to internal/informal testing rather than a public release — since "did this actually work" should be answerable with evidence, not impression:
- **Activation:** % of sessions that complete a first successful generation and save/share it
- **Engagement:** stickers generated per session; regeneration/retry rate (a proxy for output quality)
- **Reliability:** error rate; generation failure rate by device/browser; end-to-end latency (generation + background removal combined)
- **Safety:** moderation block rate on prompts
- **Distribution proxy:** save/share (or download) rate per generated sticker

## 5. Scope

### Web Prototype Phase (validation-driven, no fixed deadline)
- **Goal:** validate the core generation pipeline, model quality/latency, background removal, and moderation approach in a browser environment, using mobile-compatible model choices, before committing further native engineering effort
- **In scope:**
  - Offline-capable PWA (Service Worker model caching), running fully in-browser once loaded
  - Text-to-sticker generation only — single style preset, no fusion/combination
  - Input-side content filtering + fixed safety negative prompt
  - Background removal via a browser-compatible segmentation model (Section 9 — a new selection for this phase)
  - Save/share via whatever the browser supports (Web Share API where available, image download as the universal fallback)
  - Runtime acceleration detection (is WebGPU actually active, or has the browser silently fallen back to slow CPU/WASM execution)
- **Explicitly out of scope for this phase:**
  - Native app development (Android or iOS) — deferred until this phase produces a validated approach (Section 13 carries forward the native-specific risks and tooling already scoped, so that work isn't lost, just paused)
  - Sticker fusion / combination generation — deferred regardless of platform, and structurally harder than single-subject generation, not easier
  - Native installable sticker-pack integration (WhatsApp/Telegram/iMessage) — not relevant to a web prototype
  - Monetization — none; this remains a non-monetized engagement/brand play
  - Heavy behavioral analytics — only lightweight tracking as defined in Section 4
  - Output-side (image) content moderation — this phase is input-prompt filtering only

## 6. Assumptions, Constraints & Dependencies

### Assumptions
- The BA's offline requirement is being satisfied **in this phase** via a genuine PWA architecture (Service Worker model caching) — an initial internet connection to load the app and model for the first time is acceptable and expected, consistent with how this requirement has been interpreted throughout.
- The primary rationale for client-side generation is **cost-avoidance** (zero marginal cost per generation), not a strict zero-telemetry privacy stance. Light opt-in tracking is acceptable.
- Only **pretrained/distilled models** will be used — no model is being invented or trained from scratch. Light LoRA-style fine-tuning on top of a pretrained base (for sticker-style consistency) is considered in-scope as "using a pretrained model," not "inventing one."
- The team has **no prior experience** with client-side ML deployment, whether in-browser (WebGPU/ONNX Runtime Web) or native (MediaPipe, TFLite, Core ML); this is being treated as a real, named risk rather than assumed away.
- Distribution/promotion for the engagement/brand objective is being handled by **another team**, not this one — though its relevance is reduced for this phase specifically, since a validation prototype isn't necessarily a public release (Section 11).
- **Model choices made now are expected to carry forward to native** — the same `.onnx` artifacts (SD1.5 + LCM-LoRA, Section 9) are reused rather than re-selected when native development begins.

### Constraints
- **No fixed deadline for this phase** — a deliberate choice, not an oversight. Progress is validation-gated (Section 4's Graduation Criteria), not date-gated. See Section 11 for the risk this itself creates.
- **No server infrastructure** — no cloud moderation, no cloud generation fallback, no rich analytics backend, in this phase or the intended native one.
- **No confirmed dedicated on-device/client-side ML engineer** on the team as of this writing — a resourcing risk that should be resolved early, not discovered mid-build.
- **App-store review cycles do not apply to this phase** — a genuine, if temporary, benefit of building for the web first: updates ship as soon as they're deployed, with no Play Store or App Store review gate. This goes away once native development resumes (Section 13).

### Dependencies
- The success of the stated "engagement/brand play" goal depends on another department executing cross-promotion effectively — relevant mainly once this graduates to an actual release, less urgent during pure validation.
- **Browser support for WebGPU/WebNN** across target browsers (Chrome, Safari, Firefox, Samsung Internet, and in-app WebViews) is assumed to be broadly available in 2026, but real acceleration availability per specific mobile browser/OS combination still needs direct validation — see Section 11.
- **Correct COEP/COOP header configuration** on whatever hosts the model assets is required for multi-threaded WASM performance — a real, easy-to-miss infrastructure dependency with no native-app equivalent.
- The entire contingency ladder in Section 11 — and therefore the shape of the plan in Section 12 — depends on real measurements from this phase, not assumptions carried over from desktop benchmarks.
- **Native-specific dependencies already identified (Android tooling maturity, ML Kit Subject Segmentation, macOS/Xcode for iOS) are paused, not resolved** — they become relevant again once this phase concludes and native development begins (Section 13).

## 7. User Flow

### Happy Path
1. **First load:** browser/device capability check runs silently (is WebGPU active, or will the app fall back to slow CPU/WASM execution). If acceleration isn't available and the fallback would be unacceptably slow, the user sees a clear message rather than a silent, frustrating wait.
2. **Home screen:** a prompt input area, with example prompts or a lightweight guided prompt-builder (subject + expression + style tags) to help users land in the space the model handles well, rather than pure open-ended free text.
3. **User submits a prompt.**
4. **Input passes through the client-side content filter.**
   - If blocked: a friendly message explains the request can't be generated, without echoing back or explaining which specific words tripped the filter, and invites the user to try a different description.
5. **If passed, generation begins** — a loading state is shown while:
   a. The in-browser diffusion pipeline (ONNX Runtime Web, Section 9) generates the raw image
   b. The background-removal/segmentation step produces a transparent-background sticker
6. **Preview screen:** the generated sticker is shown composited on a neutral checkered backdrop (to make the transparency visible).
7. **User choices from preview:**
   - **Save/Download** (to the device via the browser's download mechanism)
   - **Share** (Web Share API where the browser supports it; download-then-manual-share as the universal fallback)
   - **Regenerate** (try again, same prompt)
   - **Edit prompt** (adjust and resubmit)
8. **My Stickers gallery:** previously generated stickers are accessible for the session (and across sessions if browser storage permits) for reuse without regenerating.

### Edge Cases & Alternate Paths
- **Generation failure** (timeout, memory pressure, browser tab crash): graceful error state with a retry option; logged against the reliability metrics in Section 4.
- **Repeated regeneration** (e.g., 3+ consecutive retries on the same prompt): a gentle nudge suggests rephrasing rather than silently letting the user loop indefinitely.
- **No connectivity at any point post-first-load:** has zero impact on the core flow, since generation is fully client-side once the model is cached by the Service Worker. Only affects any opportunistic remote config sync (Section 10), which fails silently if offline — never blocking the user-facing flow.

## 8. System Design & Architecture

### High-Level Pipeline
```
[Prompt Input / Prompt-Builder UI]
        ↓
[Client-Side Input Content Filter]  ──(blocked)──→ [Friendly rejection message]
        ↓ (passed)
[In-Browser Text-to-Image Diffusion Model (ONNX Runtime Web, WebGPU/WASM)]
        ↓ (raw generated image)
[Background Removal / Segmentation (browser-compatible model, Section 9)]
        ↓ (transparent-background sticker)
[Preview + Save/Share UI]
        ↓
[Browser-storage "My Stickers" gallery]
```

### Component Responsibilities
- **Browser/acceleration capability check (app load):** runs once per session; detects whether WebGPU is actually active versus a silent CPU/WASM fallback, and sets user-facing latency expectations (or blocks) accordingly.
- **Input content filter:** a lightweight client-side classifier or rule-based filter over the text prompt only (v1 scope — no output-side image classification, per Section 5). Runs before any generation compute is spent, so blocked prompts cost nothing.
- **Diffusion generation model:** a pretrained/distilled text-to-image model run via ONNX Runtime Web (Section 9), using WebGPU acceleration where available and WASM as the CPU fallback. Every generation call also passes a **fixed safety negative prompt** alongside the user's input — steering the denoising process away from NSFW content, gore, and hate symbols regardless of what was typed. This runs at effectively no extra cost (same forward pass, just additional conditioning) and acts as a second, always-on layer of defense behind the input filter.
- **Background removal:** a browser-compatible segmentation model (Section 9), producing the transparent-background cutout that makes the output usable as an actual sticker rather than a square image. Runs immediately after generation, in the same latency budget.
- **Local storage:** generated stickers and the "My Stickers" gallery are stored in browser storage (no cloud sync in this phase).
- **Opportunistic remote config sync:** a best-effort, background-only fetch of an updated moderation blocklist/config file when connectivity happens to be available. Never a functional requirement — the app works fully without it.
- **Lightweight telemetry (opt-in):** the basic usage counters defined in Section 4, synced opportunistically, never blocking core functionality.

### Latency Budget
The end-to-end latency that matters to the user is **generation + background removal combined**, not diffusion inference alone — this is measured as a single pipeline during this validation phase (Section 12), to avoid under-budgeting the real user-facing wait time. This matters especially here, since available benchmarks (Section 9) are desktop-GPU figures, not verified mobile-browser numbers.

### Failure Isolation
Each stage fails independently and visibly to the user where relevant (generation failure → retry option) or silently where it shouldn't affect the experience (remote sync failure → simply retried next time there's connectivity). No single component failure should be able to hang the browser tab outright.

## 9. Tech Stack & Design Justification

### Web Prototype Phase (current, near-term work)

**Runtime: ONNX Runtime Web**, using WebGPU acceleration with WASM as the CPU fallback. Confirmed as a real, working pattern — Microsoft's own documentation demonstrates Stable-Diffusion-family models running client-side this way, and WebGPU now ships by default in Chrome, Firefox, and Safari, including Chrome on Android since v121. This isn't experimental-flag territory for the core API anymore.

**Generation model — same candidates as previously scoped, chosen specifically because they carry forward to native:**
- **`stable-diffusion-v1-5/stable-diffusion-v1-5`** (base checkpoint — the community-maintained successor repo, since the original `runwayml/stable-diffusion-v1-5` was taken down in an IP dispute in August 2024) or **`Lykon/dreamshaper-7`** (a more illustrative, less photoreal alternative base) fused with **`latent-consistency/lcm-lora-sdv1-5`** (LCM LoRA adapter, cutting denoising from ~50 steps to 2–8)
- **Pre-converted ONNX starting points worth checking first, to save conversion time:** `TheyCallMeHex/LCM-Dreamshaper-V7-ONNX` is a community conversion of exactly this combination — worth validating for correctness and browser compatibility before committing to a from-scratch conversion. `Disty0/LCM_SoteMix` (an anime-styled LCM SD1.5 model, also in ONNX) is a style alternative worth a side-by-side comparison.
- **Known unresolved risk:** the only concrete browser-based Stable Diffusion benchmark found (~15 seconds at 512×512) is on a **mid-range desktop GPU**, not a mobile phone. There is no verified mobile-browser-specific benchmark yet — this needs to be measured directly in this phase, not assumed from desktop figures, and should be treated as a starting expectation rather than a best case (consistent with how the native-Android CPU benchmark was treated before this pivot).
- **Not using Google's MediaPipe Image Generator task or Gemini Nano/ML Kit GenAI APIs** — both were investigated for the native path and rejected (the former confirmed no longer actively maintained by Google; the latter doesn't do text-to-image generation at all). Neither is relevant to a browser-based approach anyway, but the underlying findings remain relevant once native development resumes (Section 13).
- **Sticker-style consistency:** preferred approach is a lightweight LoRA fine-tune on top of the chosen base model, trained on a small curated sticker-style dataset. If the training pipeline proves too time-consuming, fall back to prompt-engineering (fixed style keywords prepended to every prompt) as a lower-effort, lower-consistency substitute.

**Model candidates considered and rejected:** Ideogram 4.0 (open-weight, released June 2026) was evaluated and rejected for direct deployment, despite being a genuinely strong open-weight model:
- **Compute footprint:** even its most aggressively quantized build requires a 24GB-class GPU — roughly two orders of magnitude beyond mobile/browser memory budgets, versus the sub-1B-parameter class of models targeted here. This isn't a quantization gap that closes with more effort; it's a different weight class built for workstation/server GPUs.
- **Licensing:** its open weights are gated under a Non-Commercial Model Agreement — commercial deployment (this being a company-built product) requires a separate paid license, an unbudgeted cost and legal step that conflicts with the near-zero-infrastructure-cost design goal.
- **Task mismatch:** it's optimized for design-grade typography and deterministic JSON-driven layout precision, not the lightweight stylized-cartoon generation this product needs.
- **Possible future use (not this phase):** as an offline, workstation-side tool for generating a curated sticker-style training dataset to feed the LoRA fine-tune above — not as the deployed model itself. Carried into Section 13, pending a check on whether that use fits within its non-commercial license terms.

**Background removal — a new selection for this phase, since neither native option (ML Kit Subject Segmentation, Apple's Vision framework) exists for the web:**
- A lightweight, browser-compatible segmentation model run via ONNX Runtime Web is needed. A candidate worth evaluating: `briaai/RMBG-1.4`, a well-known open background-removal model with existing ONNX conversions — worth checking its license terms specifically before committing, the same diligence applied to every other model choice in this document, since its exact current terms aren't verified here.
- This is genuinely new work created by the web pivot, not a carryover from the native plan — budget real time for it.

**Model Development Tooling (offline workstation pipeline — not shipped in the app):**
- **Fuse the LCM LoRA into the base checkpoint** (`pipe.fuse_lora()`, per the model card's own usage example) before export.
- **Export via Hugging Face Diffusers' own `convert_stable_diffusion_checkpoint_to_onnx.py` script** (or use the pre-converted candidates above directly, pending validation).
- **Apply ONNX Runtime's graph optimizations** and float16/int8 quantization for size and speed, tuned for browser memory constraints specifically (browser tabs have tighter memory limits than native apps).
- Output is a set of `.onnx` model artifacts served from the app's own origin (not bundled in a binary, since this is a web app) with correct COEP/COOP headers configured.

**Application Stack (Client):**
- **Frontend: React + Vite.** The UI layer isn't the hard part of this project — the ML pipeline is — so this is a pragmatic default based on ecosystem support for `onnxruntime-web` and PWA tooling, not a hard technical requirement. Svelte is a legitimate lighter-weight alternative if bundle size becomes a real concern, though with a multi-hundred-MB model as the actual payload, framework-level bundle size matters far less here than usual.
- **PWA/offline caching: `vite-plugin-pwa`** (Workbox-based) for Service Worker generation and model caching — avoids hand-rolling a cache strategy for a large, versioned model file from scratch.
- **Local persistence (the "My Stickers" gallery): IndexedDB, via a lightweight wrapper like `idb`.** `localStorage` isn't suitable here (no blob support, ~5–10MB limits) — IndexedDB is the correct client-side store, playing the same role Room does for Android and SwiftData does for iOS.
- **Runtime acceleration detection:** feature-detect WebGPU availability at load time; if unavailable, decide whether to proceed with a WASM fallback (with adjusted latency expectations) or block with a clear message, rather than silently degrading.
- **Hosting: Cloudflare Pages** — checked specifically because of the COEP/COOP header requirement already flagged (Section 6, Risk #6): **GitHub Pages does not support custom response headers at all**, which would silently break the multi-threaded WASM performance this pipeline depends on, despite being the common reflexive choice for "just get something live." Netlify, Vercel, and Cloudflare Pages all support custom headers via a config file; Cloudflare Pages is recommended specifically for its unlimited free-tier bandwidth (relevant since the model file is served repeatedly, not just HTML/CSS/JS) and the absence of the non-commercial-use restriction that applies to Vercel's free tier — relevant since this is a company-built product even without direct monetization.

**Backend-Adjacent Services (deliberately minimal, unchanged in spirit from the native plan):**
- **Firebase Remote Config** for the opportunistic moderation blocklist sync — cross-platform, works identically whether the client is a web app or, later, a native app.
- **Firebase Analytics** for the lightweight opt-in telemetry in Section 4 — same reasoning as before: fastest to integrate, no server to run.

### Future Native Phase (paused, not abandoned — resumes once this phase graduates)
Everything below was already scoped in detail before this pivot and remains valid reference material for when native development begins. It is explicitly **not current work**.

- **Platform sequencing:** Android first, then iOS — reversed once already (originally iOS-first, for tooling-maturity and hardware-homogeneity reasons that don't disappear just because Android was chosen; see the risk register discussion below).
- **Android generation pipeline:** a custom TFLite/ONNX Runtime Mobile pipeline (not Google's MediaPipe Image Generator task, confirmed no longer actively maintained), using the same SD1.5+LCM-LoRA model family as this web phase. Confirmed limitation: ONNX Runtime on Android does not currently support NNAPI acceleration for Stable-Diffusion-family models, forcing CPU execution — a community benchmark showed ~10 seconds per UNet step on a Snapdragon 8 Gen 1 (flagship-tier), implying 20–80+ seconds even with LCM's reduced steps.
- **Android background removal:** Google's ML Kit Subject Segmentation API — functionally well-matched to the need, but currently in beta with no SLA or deprecation guarantee, and delivered as a dynamically-downloaded Play Services module rather than bundled in the binary.
- **Android hardware fragmentation:** GPU/NPU delegate behavior varies across Qualcomm, Samsung Exynos, MediaTek, and Google Tensor chips — the same model can behave inconsistently across "similar spec" devices. This was the core reason iOS-first was originally recommended; it remains true, just paused rather than resolved by this web-first pivot.
- **Android application stack:** Kotlin + Jetpack Compose, Room for local persistence, JUnit/Espresso for testing, Google Play Console's Internal/Closed Testing track (or Firebase App Distribution) for beta distribution, GitHub Actions + Gradle for CI, Firebase Test Lab for device-matrix testing.
- **Android input filter:** no OS-bundled semantic embedding API exists (unlike iOS's Natural Language framework) — requires bundling a small dedicated text-embedding model.
- **iOS equivalent (further out):** Core ML via Apple's `ml-stable-diffusion` tooling, Apple's Vision framework for background removal (notably more mature/non-beta than ML Kit's offering), Swift + SwiftUI, SwiftData for persistence, TestFlight for beta distribution, Xcode Cloud for CI. Requires macOS/Xcode hardware — not a blocker for this web phase or even the Android phase, but a real procurement item to plan for ahead of the iOS phase specifically.
- **Play Store / App Store review cycles:** once native ships, updates (including moderation patches) are gated by store review — Play Store first-submission timelines commonly run 3–7 days (up to 14 for a first app), though routine updates for an established app can clear in 1–3 hours.
- **Cross-platform framework question:** considered and rejected for the native phase for the same reason regardless of which platform goes first — the ML pipeline has to be native platform code either way (Core ML/Vision vs. MediaPipe/ML Kit/TFLite are separate runtimes), so a cross-platform UI framework wouldn't remove the hardest work, only add a second unfamiliar-tooling risk. Kotlin Multiplatform is worth evaluating once both platforms are in play, to share non-UI orchestration logic without pretending the ML layer itself can be shared.

## 10. Content Safety & Moderation

### Layered Defense (this phase's scope: input-side only, no output/image classification)
1. **Input prompt filtering** — a client-side keyword and/or embedding-based check on the text prompt, run before any generation compute is spent. Blocked prompts get a friendly rejection message that doesn't echo back or explain which specific terms tripped the filter.
2. **Fixed safety negative prompt** (Section 8/9) — applied to every single generation automatically, steering the model away from NSFW content, gore, and hate symbols regardless of what passed the input filter. This is defense-in-depth, not a replacement for layer 1.
3. **Output-side image classification is explicitly out of scope for this phase** — an accepted gap given the compute budget, to be revisited once real performance headroom is known.

### Adversarial Testing (distinct from functional QA)
A dedicated pass to try to break the input filter — misspellings, synonyms, non-English phrasing, and other common bypass patterns — is worth doing even during validation, since it's cheap to do now and expensive to discover later.

### Patch Channel — a genuine, if temporary, advantage of the web-first approach
Unlike a native app, **this phase has no app-store review cycle gating fixes.** Updates, including moderation-logic changes, ship as soon as they're deployed. This is a real benefit of validating on the web first — worth remembering when the native phase reintroduces this constraint (Section 9, Future Native Phase).

### Audience Considerations
The target audience (16–30) is not child-directed, so this isn't held to full child-safety compliance requirements. However, 16–17-year-olds remain legal minors in most jurisdictions, so moderation is calibrated conservatively rather than treated as an adult-only tool with a permissive bar.

### Residual, Accepted Gap
Input-only filtering with no output classification is a known trade-off for this phase, not an oversight — accepted given the compute and validation-focused nature of this work, explicitly flagged for re-evaluation once real performance headroom is understood, in this phase or the native one that follows.

## 11. Risk Register & Contingency Plan

### Risk Register (active for the current Web Prototype Phase)

| # | Risk | Category | Likelihood | Impact | Mitigation |
|---|------|----------|------------|--------|------------|
| 1 | Team has no prior client-side ML deployment experience (browser or native) | Feasibility | High | High | Validation-first approach as the whole point of this phase; contingency ladder below |
| 2 | Mobile-browser-specific diffusion latency is unverified — only desktop-GPU benchmarks exist (~15s at 512×512 on a mid-range desktop GPU) | Feasibility | High | High | Measure directly on real mobile browsers/devices as the first task of this phase; treat the desktop figure as a starting expectation, not a best case |
| 3 | WebGPU/WebNN acceleration may silently fall back to slow CPU/WASM execution on some browsers without clear indication to the user | Feasibility | Medium | Medium | Explicit runtime acceleration detection (Section 8); block or warn rather than silently degrade |
| 4 | Browser/OS fragmentation (Safari/iOS, Chrome/Android, Samsung Internet, in-app WebViews, each on different WebGPU/WebNN rollout timelines) | Feasibility | Medium-High | Medium | Test across a representative spread of real mobile browsers, not just one |
| 5 | No existing browser-compatible background-removal equivalent to ML Kit/Vision — this is new, unscoped-until-now work | Technical | Medium | Medium | Evaluate concrete candidates (e.g., `briaai/RMBG-1.4`, license pending verification) early in this phase, not as an afterthought |
| 6 | COEP/COOP hosting misconfiguration could silently disable multi-threaded WASM performance | Technical | Medium | Low-Medium | Cloudflare Pages recommended specifically for reliable custom-header support (Section 9); GitHub Pages confirmed **not** viable here since it doesn't support custom response headers at all |
| 7 | **No fixed deadline creates its own risk: open-ended validation without a clear graduation trigger** | Timeline | Medium | Medium | Graduation criteria defined up front (Section 4), with a soft internal pacing suggestion (Section 12) to avoid indefinite drift |
| 8 | Sticker-style consistency not guaranteed from the base pretrained model | Quality | Medium | Medium | LoRA fine-tune as primary approach; prompt-engineering fallback if training pipeline is too slow to complete |
| 9 | Training data for the LoRA fine-tune could carry licensing/copyright risk if sourced without clear rights | Legal | Medium | High | Source style references from properly licensed/permissively licensed sets, or commission original references; confirm before training begins |
| 10 | Input-only content filtering can be bypassed (misspellings, synonyms, other languages) | Safety | High | Medium | Adversarial testing pass; fixed safety negative prompt as a second layer; accepted residual gap for this phase |
| 11 | No confirmed dedicated client-side ML engineer on the team | Resourcing | High | High | Should be resolved early in this phase, not discovered mid-build |
| 12 | Distribution/cross-promotion dependency on another team | Business | Low-Medium (reduced relevance for a validation-only phase) | High (once released) | Named dependency (Section 6); becomes relevant again once this graduates to an actual release |

**Paused, not eliminated:** all native-specific risks previously identified (Android hardware fragmentation, ML Kit Subject Segmentation's beta status, NNAPI incompatibility for Stable Diffusion on Android, Play Store review timing, macOS/Xcode requirement for iOS) remain real and are carried forward in Section 13, to be reactivated as active risks once this phase concludes and native development begins. They are not currently in this active register because they aren't this phase's problem yet — but they haven't gone away.

### Contingency Ladder (formalized, now used for the graduation decision rather than a launch gate)
- **Plan A (full win):** validation shows acceptable quality and latency on real mobile browsers, across a representative device/browser spread, with open text prompts → the approach is validated for native investment as-is.
- **Plan B (degrade gracefully):** quality or latency is insufficient with freeform prompts → constrain the input to a curated prompt-builder (subject + expression + style tags), keeping generation inside the distribution the model handles reliably, and carry that constraint into the native build.
- **Plan C (hard fallback):** even constrained generation doesn't clear the bar → this validation phase itself surfaces that a template/parametric sticker system may be the more realistic starting point for native, rather than open generative stickers — a genuinely useful (if less exciting) finding to have before committing native engineering time.
- **Decision point:** whenever the Graduation Criteria (Section 4) are met — not a calendar date. This is the actual deliverable of this phase: a validated (or invalidated) approach, with real evidence either way, ready to inform the native build.

## 12. Development Plan & Timeline

*(No fixed deadline for this phase, per updated direction — Section 6. The phase structure below is a suggested internal pacing aid, not an enforced schedule. If useful for planning purposes: given the technical scope involved, this phase might reasonably take somewhere in the range of 3–5 weeks based on the same effort estimates that informed the original — now superseded — week-by-week native plan. That number is offered only to help with resourcing conversations; the actual pace should be set by how the validation work goes, not by this estimate.)*

### Phase 1 — Pipeline Validation
- Set up ONNX Runtime Web with the SD1.5+LCM-LoRA model (starting from the pre-converted `TheyCallMeHex/LCM-Dreamshaper-V7-ONNX` candidate if it validates correctly, to save conversion time)
- Test WebGPU acceleration and WASM fallback across a representative spread of real mobile browsers (at minimum: Chrome/Android, Safari/iOS)
- Measure actual mobile-browser end-to-end latency (generation + background removal) — filling the gap where only desktop benchmarks currently exist
- Evaluate and select a browser-compatible background-removal model candidate (Section 9)
- Configure COEP/COOP hosting correctly and confirm multi-threaded WASM actually engages

### Phase 2 — Core Loop & Offline Capability
- Build the prompt input → filter → generate → segment → preview flow as a web UI
- Implement Service Worker-based offline model caching (satisfying the "runs without internet after first load" requirement)
- Implement input content filtering
- Implement save/share (Web Share API where supported, download as the universal fallback)

### Phase 3 — Validation & Graduation Decision
- Run structured testing across a real device/browser spread (at least one flagship-tier and one mid-tier device per platform)
- Document quality, latency, and UX findings explicitly — this write-up is the actual deliverable of this phase, more than the web app itself, since it's what informs the native decision
- Reach the graduation decision point (Section 11): does the evidence justify committing to native engineering, and does it change which platform should go first, or which contingency plan (A/B/C) the native build should start from

### Note on This Plan's Nature
Because there's no fixed deadline, the risk here isn't running out of time — it's the plan quietly running forever. The Graduation Criteria (Section 4) and the risk entry above (#7) exist specifically to prevent that: this phase should have a definite end, marked by having real answers, not by exhausting a calendar.

## 13. Open Questions & Future Considerations

### Native Development — Paused Risks and Decisions to Reactivate
1. **Android hardware/GPU-NPU delegate fragmentation** — real and unresolved; test across multiple chip vendors once native development begins, not just one flagship.
2. **ML Kit Subject Segmentation's beta status** (no SLA/deprecation guarantee from Google) — re-verify before relying on it in the native Android build.
3. **ONNX Runtime on Android's lack of NNAPI support for Stable-Diffusion-family models** — the ~10s-per-UNet-step benchmark on a Snapdragon 8 Gen 1 remains a sobering reference point for native Android latency expectations.
4. **Play Store / App Store review cycles** — once native ships, this phase's "no review gate" advantage (Section 10) disappears; budget accordingly, especially for the first submission (3–7 days typical, up to 14 for Play Store; roughly 24–48h typical for Apple's).
5. **macOS/Xcode hardware requirement** for iOS development — confirm team access ahead of that phase specifically, not urgently now.
6. **Kotlin Multiplatform** — worth evaluating once both Android and iOS are in play, to share non-UI orchestration logic between them, without pretending the ML layer itself can be shared across platforms.

### Deferred Regardless of Platform
7. **Sticker fusion / combination generation** (Emoji-Kitchen-style) — structurally harder than single-subject generation, not a simpler follow-on; deferred regardless of which platform or delivery mechanism is current.
8. **Native installable sticker-pack integration** for WhatsApp/Telegram/iMessage — not relevant to the web prototype; a separate, platform-specific engineering effort once native ships.
9. **Output-side (image) content moderation** — accepted as a gap for this phase (Section 10); revisit once real compute headroom is better understood, in this phase or native.
10. **Heavier behavioral analytics** — current plan is intentionally lightweight (Section 4); could expand once there's an actual release to measure.

### Watch Items
11. **Ideogram 4.0** as an offline, workstation-side tool for generating curated sticker-style training data for the LoRA fine-tune — not for deployment (Section 9) — pending a license check on whether that specific use fits its non-commercial terms.
12. **Apple's hinted "StickerKit"-style framework** for third-party sticker registration — unreleased/unconfirmed as of this writing; relevant to the iOS phase specifically, well down the line.

### Explicitly Not Revisited (would require re-scoping)
13. **Monetization** — none planned; this is a non-monetized engagement/brand play (Section 2). Introducing monetization later is a distinct product decision, not a natural extension of this plan.
14. **Support for users under 16** — explicitly out of scope (Section 3). Would require substantial compliance and moderation rework if the target audience ever shifted younger.

### Unresolved Gap Worth Naming
15. **Prompt language/localization** hasn't been addressed anywhere else in this PRD. The input content filter, the base model's prompt understanding, and the fixed negative prompt have all been discussed assuming English-language input. If the target audience includes non-English speakers, this affects filter coverage as much as usability. This should be resolved as a deliberate scope decision — English-only for now, or multi-language from day one — rather than left as a silent assumption.

---
*Appendix: This PRD has been reshaped twice during drafting — first reversing platform sequencing from iOS-first to Android-first, then shifting the near-term deliverable from a native Android app to a web-based validation prototype with no fixed deadline. Each shift is documented explicitly, including which prior risk findings remain relevant (just paused) rather than resolved. Sections 9, 11, and 13 carry the technical detail needed to resume native development once this phase concludes.*
