# Product Requirements Document: On-Device AI Sticker/Emoji Generator

> **Binding MVP decision (July 21, 2026):** The Android MVP is the existing Expo SDK 57 application plus the Kotlin `expo-sticker-runtime` local module, not a Jetpack Compose rewrite. It uses SD 1.5 revision `451f4fe16113bff5a5d2269ed5ad43b0592e9a14`, LCM-LoRA revision `cf2fced511dbe7e26c8d1d397e728fbab875db4b`, FP16 ONNX Runtime Android 1.27.0, four steps, guidance 1.5, 512×512 output, fixed `chibi` style, and ML Kit Subject Segmentation 16.0.0-beta1. First launch requires one-time verified model and ML Kit setup; generation is offline thereafter. This supersedes candidate/runtime, bundled-model, Kotlin/Compose, and Expo-scaffold language below where it conflicts.

**Status:** Complete — v2 draft (platform sequencing reversed to Android-first per updated direction)
**Last updated:** July 21, 2026

---

## 1. Executive Summary

This PRD defines an **on-device AI sticker generator**: a standalone Android app (iOS to follow) that lets users type a text prompt and receive a stylized, transparent-background sticker generated entirely on their device — no cloud inference, no internet required after install.

The core rationale is **cost-avoidance, not privacy**. Competing AI sticker tools — including Meta AI's Messenger stickers, powered by cloud-hosted Llama 2 and Emu models — paywall or throttle generation because every cloud request costs money. Running generation on-device makes "free and unlimited" a sustainable product position rather than a temporary trial hook, in support of a non-monetized engagement/brand objective aimed at 16–30-year-old, high-frequency chat users.

**Note on platform sequencing:** this project originally scoped iOS as the first platform, specifically because Android carries genuinely higher technical risk — less mature on-device ML tooling, more fragmented hardware, and no OS-bundled general-purpose background-removal API comparable to Apple's Vision framework. Platform direction has since been reversed to Android-first. That reversal doesn't make those risks disappear — it makes them the primary path's problem instead of one this project sequenced around. The risk register (Section 11) reflects this plainly rather than glossing over it.

The project carries real technical risk: the team has no prior experience deploying generative models on-device, and the 5-week deadline for the Deployable Release is fixed. The plan is built around an early **feasibility spike** (Week 1) with a formal go/no-go gate and a three-tier contingency ladder — full generative pipeline → constrained prompt-builder → template-based fallback — so schedule risk surfaces on day 4, not in week 4.

Scope for this release is deliberately narrow: text-to-sticker generation only (fusion/combination deferred), Android only (iOS as a near-term fast-follow), save-and-share via the native OS share sheet (no native sticker-pack integration yet), and input-side content moderation only (no output-image classification). These cuts are explicit, with rationale documented throughout — not silent gaps.

Success is measured first by a pre-launch acceptance gate (passing focused wide user testing across the defined device floor), then by a deliberately lightweight set of post-launch metrics — activation, engagement, retention, reliability, safety, and save/share rate — reflecting that the cost-avoidance architecture doesn't come with a rich analytics pipeline by default.

## 2. Problem Statement & Pain Points

### Problem Statement

Generative AI sticker tools (Meta AI's Messenger stickers, and most competing apps) run generation in the cloud. That gives them flexibility and quality, but it also means every sticker a user generates costs the provider real inference money — which is why nearly all of them gate usage behind paywalls, quotas, or ad-supported friction once a free trial runs out. For the target audience of this product — young, high-frequency chat users who want to generate stickers casually and often — that cost-driven gating is the core unsolved problem. An on-device generation model sidesteps the economics entirely: once the app is installed, the marginal cost of a sticker is zero, so "free and unlimited" is an actual sustainable product position rather than a temporary trial hook.

### Pain Points

1. **Paywalled generation.** Because cloud inference costs money per request, competing apps cap free usage and monetize the rest — directly at odds with how the target users want to use the feature (frequently, casually, without hitting a wall).
2. **Curated, not personalized.** Tools like Emoji Kitchen offer combination-based fun, but they're built from a fixed, hand-designed library — not true open-ended generation from what a user actually wants to express in the moment.
3. **Manual sticker-makers demand skill.** Existing "make your own sticker" apps often require users to manually crop, cut out backgrounds, and compose — a real barrier for users who just want to type a prompt and get a result.
4. **Data leaves the device.** Cloud-based competitors send prompts (and sometimes photos) to a third-party server to generate. That's a legitimate secondary concern for some users, even though it isn't the primary driver of this project's architecture.
5. **No offline fallback.** Every cloud-dependent competitor simply fails without connectivity — there's no degraded-but-working experience.
6. **Cluttered free experiences.** Free competitors often lean on ads or upsell prompts to make the economics work, which erodes the experience for casual users.

Taken together, these pain points point at one clear gap: **there's no sticker generation experience that's genuinely free, unlimited, and fast enough to fit into the rhythm of casual daily chatting** — and on-device generation is what makes that gap closeable.

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

1. Ship a working text-to-sticker generation experience that runs fully offline once the app is installed
2. Prove on-device generative AI is technically viable for this use case within a hard 5-week window
3. Keep marginal cost per generation at zero — no cloud inference dependency for the core value prop
4. Validate the concept on **Android first**, per updated platform direction, in a way that de-risks and informs the **iOS fast-follow**
5. Keep the experience fast and simple enough to fit casual, high-frequency chat use
6. Support the broader brand/engagement objective (distribution/promotion itself is owned by another team — see Section 6)

### Release Acceptance Criteria (Pre-Launch Gate)

Rather than a soft "activation" target, the MVP and Deployable Release are gated by **passing focused, wide user testing** across the defined device floor (Section 9) — functional stability, generation quality, and latency all need to clear an internal bar before shipping. This is a go/no-go milestone, not an ongoing metric.

### Post-Launch Metrics (Ongoing, Intentionally Lightweight)

Because the architecture avoids a server by design (cost-avoidance rationale, Section 2), there's no rich analytics pipeline by default. Tracking stays deliberately light — crash reporting and store-level data at minimum, plus light opt-in telemetry — but it should still exist, since "engagement/brand play" as a stated goal is only evaluable if someone can later answer "did this work":

- **Activation:** % of installs that complete a first successful generation and save/share it
- **Engagement:** stickers generated per active user per week; regeneration/retry rate (a proxy for output quality — high retry rates signal the model isn't landing on first try)
- **Retention:** D1/D7/D30 return rate, via basic store-level metrics at minimum
- **Reliability:** crash-free session rate; generation failure rate by device tier; end-to-end latency (generation + background removal combined)
- **Safety:** moderation block rate on prompts; passive monitoring of app store reviews and any in-app support channel for content complaints
- **Distribution proxy:** save/share rate per generated sticker — a signal of whether output quality is good enough to actually use, not just try once

## 5. Scope

### MVP Scope (2 weeks — target, not rigidly enforced)

- Feasibility spike: validate on-device text-to-image generation on **Android** (MediaPipe Image Generation task, or a custom TFLite/ONNX Runtime Mobile pipeline) against the agreed device floor
- Core pipeline only: prompt input → generation → background removal → preview
- Single style preset — no style customization yet
- Minimal, functional-only UI (no polish requirement)
- Basic input-side content filtering (keyword and/or lightweight classifier)
- Go/no-go decision point at the end of the spike (see Section 11)

### Deployable Release Scope (5 weeks — fixed deadline)

- Full text-to-sticker pipeline on **Android only**, with production-quality UI
- Save-and-share via the native OS share sheet (no native installable sticker-pack integration in v1)
- Content moderation: input-side filtering + a dedicated adversarial red-team pass + opportunistic remote blocklist sync when connectivity is available
- Enforced device floor: **Snapdragon 7-series / Google Tensor G2-equivalent and above**, with a clear "device not supported" message below that line
- Contingency ladder baked into scope, not bolted on after the fact: if the spike shows quality/latency issues, fall back to a constrained prompt-builder (Plan B) or a template-based system (Plan C) rather than slipping the date

### Explicitly Out of Scope (this release)

- Sticker fusion / combination generation (Emoji-Kitchen-style) — deferred, and structurally harder than single-subject generation, not easier
- Native installable sticker packs for WhatsApp / Telegram / RCS — deferred; v1 relies on the share sheet
- **iOS** — deferred to a near-term fast-follow, not indefinitely shelved
- Monetization — none; this is a non-monetized engagement/brand play
- Heavy behavioral analytics — only lightweight tracking as defined in Section 4
- Output-side (image) content moderation — v1 is input-prompt filtering only

## 6. Assumptions, Constraints & Dependencies

### Assumptions

- The BA's offline requirement means the app must run fully locally **after** installation — an initial internet connection to download the app from the store is acceptable and expected.
- The primary rationale for on-device generation is **cost-avoidance** (zero marginal cost per generation, enabling a genuinely free/unlimited product), not a strict zero-telemetry privacy stance. Light opt-in tracking is acceptable.
- Only **pretrained/distilled models** will be used — no model is being invented or trained from scratch. Light LoRA-style fine-tuning on top of a pretrained base (for sticker-style consistency) is considered in-scope as "using a pretrained model," not "inventing one."
- The team has **no prior experience** with on-device ML deployment (MediaPipe, TFLite, Core ML, or otherwise); this is being treated as a real, named risk rather than assumed away — hence the feasibility spike as the first milestone.
- Distribution/promotion for the engagement/brand objective is being handled by **another team**, not this one.

### Constraints

- **Deployable Release must ship within 5 weeks** — fixed. MVP within 2 weeks is a target, not rigid.
- **Device floor:** Snapdragon 7-series / Google Tensor G2-equivalent (or better) and above only.
- **Platform:** Android only for this release; iOS explicitly out of scope this cycle (reversed from the original iOS-first recommendation — see Section 9 for the risk implications of that reversal).
- **No server infrastructure** — no cloud moderation, no cloud generation fallback, no rich analytics backend.
- **No confirmed dedicated on-device ML engineer** on the team as of this writing — a resourcing risk that should be resolved before or during the spike, not discovered mid-build.
- **Google Play Store review cycles apply** to any update, including moderation/safety patches. Routine updates for an established app/developer account can clear in as little as 1–3 hours — meaningfully faster than Apple's typical turnaround — but the **initial submission** (new app, likely new developer account) commonly takes 3–7 days, sometimes up to 14 for a first app or one flagged for manual policy review. Week 5's buffer needs to account for the slower initial-launch case, not the fast routine-update case.

### Dependencies

- The success of the stated "engagement/brand play" goal depends on another department executing cross-promotion effectively. This is outside this team's control but is a real dependency worth naming, since the product could be built exactly right and still underperform if that piece doesn't happen.
- Availability and maturity of Android on-device diffusion tooling is assumed, but this is now a bigger open question than originally scoped: Google's own official framework for this (MediaPipe Image Generator task) is confirmed no longer actively maintained, meaning the primary path relies on a custom TFLite/ONNX Runtime Mobile pipeline built and maintained by this team, not an actively-supported first-party tool. This is a materially higher-risk position than "using Apple's Core ML tooling would have been" (Section 11).
- The entire contingency ladder in Section 11 — and therefore the shape of the Development Plan in Section 12 — depends on the outcome of the early feasibility spike. Nothing downstream should be considered locked until that gate is cleared.
- **macOS hardware is required for iOS development, but this is no longer a blocking dependency for the primary path.** Android Studio runs on Windows, Linux, or macOS, so no Mac procurement is needed to start Week 1. This becomes relevant again only once the iOS fast-follow begins (Section 13) — worth tracking ahead of that phase, not urgently now.

## 7. User Flow

### Happy Path

1. **First launch:** device capability check runs silently (verifies Snapdragon 7-series/Tensor G2-equivalent chip / on-device model support). If the device doesn't qualify, the user sees a clear "this device isn't supported yet" message and the flow stops here — no partial or broken experience is allowed to proceed.
2. **Home screen:** a prompt input area, with example prompts or a lightweight guided prompt-builder (subject + expression + style tags) to help users land in the space the model handles well, rather than pure open-ended free text.
3. **User submits a prompt.**
4. **Input passes through the on-device content filter.**
   - If blocked: a friendly message explains the request can't be generated, without echoing back or explaining which specific words tripped the filter, and invites the user to try a different description.
5. **If passed, generation begins** — a loading state is shown while:
   a. The on-device diffusion pipeline (MediaPipe Image Generation task, or a custom TFLite/ONNX pipeline — Section 9) generates the raw image
   b. The background-removal/segmentation step produces a transparent-background sticker
6. **Preview screen:** the generated sticker is shown composited on a neutral checkered backdrop (to make the transparency visible).
7. **User choices from preview:**
   - **Save** (to in-app gallery / device photo library)
   - **Share** (native OS share sheet — into WhatsApp, Telegram, Messenger, SMS, etc. as an image attachment)
   - **Regenerate** (try again, same prompt)
   - **Edit prompt** (adjust and resubmit)
8. **My Stickers gallery:** previously generated/saved stickers are accessible in-app for reuse without regenerating.

### Edge Cases & Alternate Paths

- **Generation failure** (timeout, memory pressure, crash): graceful error state with a retry option; logged against the reliability metrics in Section 4.
- **Repeated regeneration** (e.g., 3+ consecutive retries on the same prompt): a gentle nudge suggests rephrasing rather than silently letting the user loop indefinitely — this also doubles as a real-world signal for the regeneration-rate metric.
- **No connectivity at any point post-install:** has zero impact on the core flow, since generation is fully on-device. The only thing connectivity affects is the opportunistic remote blocklist sync (Section 10), which runs silently in the background and fails silently if offline — never blocking or degrading the user-facing flow.

## 8. System Design & Architecture

### High-Level Pipeline

```
[Prompt Input / Prompt-Builder UI]
        ↓
[On-Device Input Content Filter]  ──(blocked)──→ [Friendly rejection message]
        ↓ (passed)
[On-Device Text-to-Image Diffusion Model (custom TFLite/ONNX Runtime Mobile pipeline)]
        ↓ (raw generated image)
[Background Removal / Subject Segmentation (ML Kit)]
        ↓ (transparent-background sticker)
[Preview + Save/Share UI]
        ↓
[On-device "My Stickers" gallery storage]
```

### Component Responsibilities

- **Device capability check (app launch):** runs once per session/install; gates access to the generation feature entirely for devices below the Snapdragon 7-series/Tensor G2-equivalent floor.
- **Input content filter:** a lightweight on-device classifier or rule-based filter over the text prompt only (v1 scope — no output-side image classification, per Section 5). Runs before any generation compute is spent, so blocked prompts cost nothing.
- **Diffusion generation model:** a pretrained/distilled text-to-image model deployed via a custom TFLite or ONNX Runtime Mobile pipeline (Section 9) — not Google's MediaPipe Image Generator task, which is confirmed no longer actively maintained — running on whatever GPU/NPU delegate acceleration the device supports. Every generation call also passes a **fixed safety negative prompt** alongside the user's input — steering the denoising process away from NSFW content, gore, and hate symbols regardless of what was typed. This runs at effectively no extra cost (same forward pass, just additional conditioning) and acts as a second, always-on layer of defense behind the input filter — so a prompt that slips past filtering doesn't get a fully unguarded generation.
- **Background removal:** Google's ML Kit Subject Segmentation API, producing the transparent-background cutout that makes the output usable as an actual sticker rather than a square image. Runs immediately after generation, in the same latency budget.
- **Local storage:** generated/saved stickers and the "My Stickers" gallery are stored entirely on-device (no cloud sync in v1).
- **Opportunistic remote config sync:** a best-effort, background-only fetch of an updated moderation blocklist/config file when connectivity happens to be available. Never a functional requirement — the app works fully without it — but gives a lightweight patch channel for moderation gaps discovered post-launch (Section 10).
- **Lightweight telemetry (opt-in):** crash reporting and the basic usage counters defined in Section 4, synced opportunistically alongside the config check, never blocking core functionality.

### Latency Budget

The end-to-end latency that matters to the user is **generation + background removal combined**, not diffusion inference alone — this is measured as a single pipeline during the feasibility spike (Section 12), to avoid under-budgeting the real user-facing wait time. This matters even more on Android than it would have on iOS, given real GPU/NPU delegate behavior varies by chip vendor and isn't guaranteed consistent across "similar spec" devices.

### Failure Isolation

Each stage fails independently and visibly to the user where relevant (generation failure → retry option) or silently where it shouldn't affect the experience (remote sync failure → simply retried next time there's connectivity). No single component failure should be able to crash or hang the app outright.

## 9. Tech Stack & Design Justification

### Platform: Android First (reversed from original recommendation)

This project's original technical recommendation was iOS-first, for three concrete reasons that are worth restating honestly rather than quietly dropping now that direction has changed:

- **Tooling maturity** — Apple's `ml-stable-diffusion` conversion pipeline is official and mature, with pre-converted weights readily available. Android's equivalent (Google's MediaPipe Image Generation task, or manual TFLite/ONNX Runtime Mobile wiring) is real, but less mature and more hand-built — this is now the primary path's tooling, not a fast-follow's.
- **Hardware homogeneity** — iOS has a small, known set of Apple Neural Engine generations to target. Android's GPU/NPU delegate behavior is genuinely fragmented across Qualcomm, Samsung Exynos, MediaTek, and Google Tensor chips — the same model can behave inconsistently across "similar spec" devices. This fragmentation risk is now unavoidable, not something sequencing dodged.
- **Built-in background removal** — Apple's Vision framework offers general subject-lifting as a mature, non-beta OS API. Android's closest equivalent, ML Kit Subject Segmentation, is functionally well-matched (Section 9, Background Removal, below) but is currently in **beta** with no SLA or deprecation guarantee from Google.

None of this means Android-first is the wrong call — that's a business decision made above this document's scope — but the risk register (Section 11) treats these as live, elevated risks rather than footnotes, precisely because the original mitigation (sequencing them away) is no longer in play.

### Generation Model

- **Primary approach: a custom on-device pipeline via TFLite or ONNX Runtime Mobile**, manually wiring the text-encoding → denoising loop → decode steps, using a Stable Diffusion 1.5-architecture model with LCM (Latent Consistency Model) distillation to cut denoising from ~50 steps down to roughly 4–8. This is more implementation work than calling a pre-built task API, but it's the right default given the finding below.
- **Not defaulting to Google's MediaPipe Image Generator task, despite it being the officially documented Android on-device diffusion framework** — checked directly, and Google's own current documentation marks it as "still available, but no longer actively maintained." Betting a 5-week build on an unmaintained official tool is a real risk (Section 11), not a minor caveat. It also only supports models matching the exact Stable Diffusion v1.5 architecture and, per Google's own published figures at launch, ran generation in roughly 15 seconds on _high-end_ devices — before accounting for our device floor being mid-tier, not flagship. It remains worth knowing about (the architecture constraint it documents is still informative for model selection), but it isn't the path to build on.
- **Also not a fit: Google's Gemini Nano / ML Kit GenAI APIs (AICore)** — checked explicitly, since it seemed like a plausible shortcut analogous to Apple's Image Playground. It isn't: Gemini Nano's on-device GenAI APIs cover summarization, rewriting, proofreading, and image _description_ (captioning), not text-to-image _generation_. It also skews heavily toward newer Pixel hardware and requires its own ~1.7GB model download via AICore — reinforcing the fragmentation point above rather than solving it. There's no first-party shortcut here.
- **Candidate base models to validate during the feasibility spike** (final choice is an empirical decision, not fixed here):
  1. An LCM-distilled Stable Diffusion 1.5-architecture model, converted to TFLite or ONNX via community conversion tooling
  2. Other distilled diffusion architectures with an existing TFLite/ONNX conversion path (e.g., SDXS-class models), if the SD1.5+LCM path underperforms
- **Quantization** (int8/float16) will likely be necessary to fit acceptable latency and memory on the device floor — exact level to be tuned empirically against the spike's quality/latency findings, and re-validated across multiple chip vendors, not just one test device.
- **Sticker-style consistency:** preferred approach is a lightweight LoRA fine-tune on top of the chosen base model, trained on a small curated sticker-style dataset, since this fits the "pretrained model, not invented from scratch" constraint (Section 6). If the training pipeline proves too time-consuming inside the 5-week window, fall back to prompt-engineering (fixed style keywords prepended to every prompt) as a lower-effort, lower-consistency substitute.

**Model candidates considered and rejected:** Ideogram 4.0 (open-weight, released June 2026) was evaluated and rejected for direct deployment, despite being a genuinely strong open-weight model:

- **Compute footprint:** even its most aggressively quantized build requires a 24GB-class GPU — roughly two orders of magnitude beyond mobile memory/thermal budgets, versus the sub-1B-parameter class of models targeted for the Android device floor. This isn't a quantization gap that closes with more effort; it's a different weight class built for workstation/server GPUs.
- **Licensing:** its open weights are gated under a Non-Commercial Model Agreement — commercial deployment (this being a company-built product) requires a separate paid license, an unbudgeted cost and legal step that conflicts with the near-zero-infrastructure-cost design goal (see Local Storage & Sync, below).
- **Task mismatch:** it's optimized for design-grade typography and deterministic JSON-driven layout precision, not the lightweight stylized-cartoon generation this product needs.
- **Possible future use (not this release):** as an offline, workstation-side tool for generating a curated sticker-style training dataset to feed the LoRA fine-tune above — not as the deployed model itself. Carried into Section 13 as a follow-up option, pending a check on whether that use fits within its non-commercial license terms.

### Background Removal

**Google's ML Kit Subject Segmentation API** is the primary choice — it's explicitly built for sticker-creation/background-swap use cases and, unlike ML Kit's Selfie Segmentation API (people-only, not suitable here), handles general subjects (people, pets, objects). Three caveats to carry forward as active risks, not future footnotes:

- It's currently in **beta**, with no SLA or deprecation guarantee from Google — tracked as a live dependency risk (Section 11), since it's now core to the primary release, not a fast-follow consideration.
- The segmentation model is delivered as a **dynamically-downloaded module via Google Play Services**, not bundled in the app binary — this first-time download needs to be validated as part of the install flow during the spike, not assumed to behave like the app binary install itself.
- Google's own benchmark shows ~200ms for the segmentation step alone on a Pixel 7 Pro — a useful reference point, but likely higher-tier than the agreed device floor, so it needs retesting on the actual floor device(s), across multiple chip vendors, not just one.

**iOS equivalent (for the fast-follow):** Apple's Vision framework (general subject-lifting, not limited to people) is the direct analog, and notably more mature/non-beta than ML Kit's offering — worth remembering when the iOS fast-follow is scoped, since that phase will likely have an easier time on this specific component than this release does.

### Input Filter & Negative Prompting

- **Real platform asymmetry worth being honest about:** iOS has a first-party, OS-bundled Natural Language framework offering embedding-based semantic similarity checks essentially for free. Android has no direct equivalent bundled at the OS level — achieving the same embedding-based filtering approach here means **bundling a small dedicated text-embedding model** (e.g., a distilled MiniLM-class sentence encoder, converted to TFLite) rather than calling a free system API. This is genuinely more implementation work than the original iOS-first plan assumed for this component.
- A fixed safety negative prompt is passed to every generation call as a second, always-on layer (Section 8) — this technique is diffusion-model-level, not OS-specific, so it applies identically here.

### Application Stack (Client)

- **Language & UI framework: Kotlin + Jetpack Compose.** Native rather than cross-platform (React Native, Flutter), for the same underlying reason as before, just pointed the other direction: the highest-risk part of this app — the ML pipeline — has to be written as native platform code regardless of framework choice, since Android (MediaPipe/ML Kit/TFLite) and iOS (Core ML/Vision) are separate runtimes with no shared abstraction between them. A cross-platform framework wouldn't remove that native ML work; it would only wrap a shared UI layer around two still-separate native implementations underneath, while adding a second unfamiliar-tooling risk on top of the team's first-time ML integration (Risk #1) inside a fixed 5-week window.
  - **Revisit at the iOS fast-follow:** Kotlin Multiplatform is worth evaluating then, since it can share non-UI orchestration logic (the filter → generate → segment → save sequence, config-fetch logic) between native Jetpack Compose and native SwiftUI, consumed from Swift via a compiled framework — while still keeping ML calls native per platform where they must be. That captures real reuse on the layer where reuse is actually available.
- **Local persistence: Room** (Android Jetpack's persistence library) for structured metadata — prompt text, timestamps, favorited flags. Generated sticker images themselves are stored as files in the app's local storage directory, not as blobs in the database.
- **Testing & beta distribution:** JUnit + Espresso for unit/UI tests; the **Google Play Console's Internal or Closed Testing track** (or Firebase App Distribution as an alternative) to distribute builds to the Week 4 wide-user-testing group (Section 12) ahead of full Play Store submission — this closes the same real gap flagged before: testers need an actual distribution channel before public release.
- **Build/CI: GitHub Actions with Gradle** as the default, since there's no single Google-native CI service as tightly integrated as Xcode Cloud was for iOS; Firebase Test Lab is worth layering in specifically for running the app across a matrix of real device configurations, which matters more here than it would have on iOS given the fragmentation risk above.

### Backend-Adjacent Services (deliberately minimal — no custom servers)

Given there's no existing analytics/infrastructure to build on, and consistent with the cost-avoidance architecture (Section 2), every choice here favors a managed free-tier service over standing up and maintaining anything custom. Firebase's cross-platform nature means this layer is actually unaffected by the platform reversal:

- **Remote config/blocklist sync (Section 8, 10): Firebase Remote Config** (free tier) — a close-to-exact fit for the opportunistic, best-effort config fetch already designed into the architecture. No server to run, no infrastructure to maintain.
- **Crash reporting: Firebase Crashlytics** (rather than Apple's MetricKit, which is iOS-only and no longer the relevant default given the platform reversal) — a mature, free, Android-native crash reporting tool that also works on iOS later, keeping this layer consistent across the eventual fast-follow.
- **Lightweight opt-in usage telemetry** (Section 4 metrics — activation, generation counts, thumbs up/down): **Firebase Analytics** (free tier), unchanged from before — fastest to integrate, no server to run, disclosed clearly in the app's privacy labeling per the opt-in, cost-avoidance-not-privacy-first framing (Section 6).

### Model Development Tooling (offline workstation pipeline — not shipped in the app)

Distinct from the Kotlin application stack above — this is the pipeline that _produces_ the model artifact bundled into the app, run by developers on a workstation, never on a user's device:

- **Python + TensorFlow Lite Converter (or ONNX Runtime's conversion tools)** for converting the chosen base diffusion model (SD1.5-architecture, LCM-distilled) to `.tflite` or `.onnx` format for the custom pipeline
- **Hugging Face `diffusers`** for the LoRA fine-tuning pipeline (Generation Model, above) — unchanged from the original plan, since this library isn't platform-specific
- Output is a `.tflite` or `.onnx` model artifact bundled into the Kotlin app at build time — none of this Python tooling runs on-device or ships in the binary

### Local Storage & Sync

- **On-device storage only** for the "My Stickers" gallery and generation history — no backend database (see Application Stack, above, for the specific persistence choice: Room).
- Remote config sync and opt-in telemetry are both intentionally lightweight and run on managed free-tier services (Backend-Adjacent Services, above) rather than custom infrastructure — keeping cost near-zero, consistent with the cost-avoidance rationale (Section 2). Standing up a full custom backend would itself reintroduce the recurring-cost problem this architecture is designed to avoid.

## 10. Content Safety & Moderation

### Layered Defense (v1 scope: input-side only, no output/image classification)

1. **Input prompt filtering** — an on-device keyword and/or embedding-based check on the text prompt (via a bundled small text-embedding model, Section 9), run before any generation compute is spent. Blocked prompts get a friendly rejection message that doesn't echo back or explain which specific terms tripped the filter.
2. **Fixed safety negative prompt** (Section 8/9) — applied to every single generation automatically, steering the model away from NSFW content, gore, and hate symbols regardless of what passed the input filter. This is defense-in-depth, not a replacement for layer 1.
3. **Output-side image classification is explicitly out of v1 scope** (Section 5) — an accepted risk given the compute budget on the device floor, to be revisited once the base pipeline's real headroom is known.

### Adversarial Testing (distinct from functional QA)

A dedicated red-team pass is scheduled before release specifically to try to break the input filter — misspellings, synonyms, non-English phrasing, and other common bypass patterns — rather than assuming general QA will surface these incidentally.

### Patch Channel for Post-Launch Gaps

Because any code-level fix (including a bundled model or hardcoded blocklist) requires a full Google Play Store review cycle (Section 6), the **opportunistic remote config sync** (Section 8) exists specifically so that blocklist/config updates can reach installed devices without needing a binary update — best-effort, background-only, never a functional dependency. Fixes to the filtering _logic_ itself still require a store review cycle; routine updates can clear quickly for an established app, but this narrows, rather than eliminates, the exposure window — especially around the slower initial-launch review.

### Audience Considerations

The target audience (16–30) is not child-directed, so this isn't held to full child-safety compliance requirements. However, 16–17-year-olds remain legal minors in most jurisdictions, so moderation is calibrated conservatively rather than treated as an adult-only tool with a permissive bar.

### Feedback Signal

The lightweight opt-in telemetry from Section 4 includes a simple thumbs up/down on generated output. A thumbs-down flagged as "inappropriate" (vs. general low quality) is bucketed separately, feeding the same passive review-and-support-channel monitoring used as a safety metric in Section 4 — giving the team at least some visibility into real-world moderation gaps between releases, even without a live classification pipeline.

### Residual, Accepted Risk

This is a known trade-off, not an oversight: v1 ships with input-only filtering, no output classification, and a review-cycle-gated ability to patch filtering logic. It's an accepted risk for this release given the compute and timeline constraints, explicitly flagged for re-evaluation in the **iOS fast-follow** and any future release once the pipeline's real performance headroom is better understood.

## 11. Risk Register & Contingency Plan

### Risk Register

| #   | Risk                                                                                                                                                                     | Category    | Likelihood  | Impact | Mitigation                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ----------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Team has no prior on-device ML deployment experience                                                                                                                     | Feasibility | High        | High   | Spike-first validation as the very first milestone (Section 12); contingency ladder below                                                                                                                                                                             |
| 2   | On-device model may not meet quality/latency bar on the device floor                                                                                                     | Feasibility | Medium-High | High   | Spike measures full pipeline latency on multiple chip vendors, not one device; Plan B/C ready in advance, not improvised mid-project                                                                                                                                  |
| 3   | Android hardware/GPU-NPU delegate fragmentation causes inconsistent behavior across "similar spec" devices                                                               | Feasibility | High        | High   | **Elevated from a previously-avoided risk to an active one** — this was the core reason iOS-first was originally recommended; now unavoidable. Test across multiple chip vendors (Qualcomm, Samsung Exynos, MediaTek, Tensor) during the spike, not just one flagship |
| 4   | Google's own official on-device diffusion framework (MediaPipe Image Generator task) is confirmed no longer actively maintained                                          | Dependency  | High        | High   | Build on a custom TFLite/ONNX Runtime Mobile pipeline instead of the unmaintained official task (Section 9); accept the added implementation burden as the cost of not depending on stale tooling                                                                     |
| 5   | ML Kit Subject Segmentation is in beta with no SLA/deprecation guarantee, and is now core to the primary release (not a fast-follow item)                                | Dependency  | Medium      | High   | Explicit validation in the spike against stylized/cartoon output; monitor for breaking changes throughout development                                                                                                                                                 |
| 6   | Sticker-style consistency not guaranteed from the base pretrained model                                                                                                  | Quality     | Medium      | Medium | LoRA fine-tune as primary approach; prompt-engineering fallback if training pipeline is too slow to complete                                                                                                                                                          |
| 7   | Training data for the LoRA fine-tune could carry licensing/copyright risk if sourced without clear rights                                                                | Legal       | Medium      | High   | Source style references from properly licensed/permissively licensed sets, or commission original references; confirm before training begins                                                                                                                          |
| 8   | Input-only content filtering can be bypassed (misspellings, synonyms, other languages); Android also lacks an OS-bundled embedding API, requiring a custom bundled model | Safety      | High        | Medium | Dedicated adversarial red-team pass; fixed safety negative prompt as a second layer; accepted residual risk for v1                                                                                                                                                    |
| 9   | Any moderation code-level fix requires a full Play Store review cycle                                                                                                    | Safety/Ops  | Medium      | Medium | Opportunistic remote blocklist sync narrows, but doesn't eliminate, this exposure window; routine updates are faster on Play Store than they would have been on the App Store                                                                                         |
| 10  | Initial Play Store submission (new app/developer account) may take significantly longer than assumed — 3–7 days typical, up to 14 for a first app or manual policy flag  | Timeline    | Medium      | Medium | Week 5 buffer sized for the slower first-submission case, not the fast routine-update case (Section 12)                                                                                                                                                               |
| 11  | Bundled model size may push toward Android app bundle (AAB) size limits or require Play Asset Delivery for on-demand assets                                              | Technical   | Medium      | Medium | Evaluate on-demand asset delivery vs. full bundling once real model size is known from the spike                                                                                                                                                                      |
| 12  | Distribution/cross-promotion is owned by another team                                                                                                                    | Business    | Medium      | High   | Named dependency (Section 6) — the "engagement play" goal isn't fully within this team's control                                                                                                                                                                      |
| 13  | No confirmed dedicated on-device ML engineer on the team                                                                                                                 | Resourcing  | High        | High   | Must be resolved before or during the spike, not discovered mid-build                                                                                                                                                                                                 |
| 14  | Fixed 5-week deadline leaves little slack if Plan B/C is triggered mid-project, and the platform reversal removed the original risk-avoidance strategy                   | Timeline    | Medium-High | High   | Go/no-go gate placed at end of spike (~day 4) to surface this as early as possible                                                                                                                                                                                    |

### Contingency Ladder (formalized)

- **Plan A (full win):** the spike shows acceptable quality and latency on the device floor, across multiple chip vendors, with open text prompts → proceed with the full scope as planned.
- **Plan B (degrade gracefully):** quality or latency is insufficient with freeform prompts → constrain the input to a curated prompt-builder (subject + expression + style tags), keeping generation inside the distribution the model handles reliably.
- **Plan C (hard fallback):** even constrained generation doesn't clear the bar → ship a template/parametric sticker system for this release; true generative stickers become a fast-follow once the pipeline has more runway.
- **Decision gate:** end of the feasibility spike (~day 4 of the dev plan, Section 12), assessed against pre-agreed pass/fail criteria on the defined floor device(s) — plural, given fragmentation risk (#3) makes single-device testing insufficient. This is a named milestone, not an implicit hope — everything downstream in the dev plan branches from this decision.

## 12. Development Plan & Timeline

_(5-week window is fixed; the "2-week MVP" marker below is a soft internal checkpoint, not a hard gate.)_

### Week 1 — Feasibility Spike & Go/No-Go

- Set up the custom TFLite/ONNX Runtime Mobile diffusion pipeline (Section 9) — not Google's MediaPipe Image Generator task, which is confirmed no longer actively maintained; test 1–2 candidate base models (an LCM-distilled SD1.5-architecture model, plus a backup) across **multiple physical devices spanning different chip vendors** at the agreed floor — not just one flagship, given fragmentation risk (#3)
- Measure **end-to-end latency** (generation + background removal combined, per Section 8) — not diffusion inference alone
- Validate ML Kit Subject Segmentation specifically against stylized/cartoon output, and confirm its Play-Services-delivered model download behaves correctly as part of the install flow (Risk #4)
- Procure/confirm access to physical test devices across the required chip-vendor spread
- **Milestone (~Day 4): Go/No-Go decision** — select Plan A, B, or C from the contingency ladder (Section 11) based on real measurements, not assumptions
- Stand up the basic app shell/navigation (Kotlin + Jetpack Compose) in parallel

### Week 2 — Core Loop (soft MVP checkpoint)

- Integrate the chosen pipeline path (Plan A/B/C) into the app: prompt input → input filter → generation → background removal → preview
- Implement the input content filter — including bundling the small text-embedding model needed on Android (Section 9), since there's no free OS-level equivalent here
- Build the local "My Stickers" gallery storage skeleton (Room)
- **Internal milestone:** a working end-to-end core loop on real target devices across the chip-vendor spread, UI still rough — this is the informal "2-week MVP" marker

### Week 3 — Style, Safety Depth, and Flow Completion

- Begin LoRA fine-tune data curation and training if Plan A/B (skip if Plan C); start early since training and iteration take time
- Build the save/share flow (native OS share sheet) and polish the "My Stickers" gallery UI
- First round of the adversarial red-team pass against the content filter
- Implement the device capability check and graceful "not supported" messaging for below-floor devices

### Week 4 — Integration, Wide Testing Begins

- Integrate fine-tuned weights (if applicable) and re-test quality/latency against the spike's baseline, across the device spread
- Implement the opportunistic remote config sync and the lightweight opt-in telemetry (crash reporting via Crashlytics, usage counters, thumbs up/down)
- **Begin focused wide user testing** — the release acceptance gate defined in Section 4 — distributed via the Play Console's Internal/Closed Testing track, across the device-tier matrix, with real target-age (16–30) users
- Second red-team pass incorporating first-round findings
- Bug fixing from wide-testing feedback, in parallel

### Week 5 — Hardening & Release

- Final bug fixes and polish from wide-testing results
- Final device-tier QA pass confirming both floor-device performance (across chip vendors) and graceful degradation on unsupported devices
- Google Play Store submission prep (Data Safety form, store listing, screenshots, privacy policy reflecting the lightweight telemetry disclosed in Section 4)
- **Submit for Play Store review with a larger buffer than a routine-update assumption would suggest** — first submissions from a new app/developer account commonly take 3–7 days, sometimes up to 14 (Section 6); this shouldn't be allowed to blow the fixed deadline
- Release

### Note on Schedule Risk

Everything from Week 2 onward branches from the Week 1 go/no-go decision. If Plan B or C is triggered, the _shape_ of Weeks 2–4 changes (e.g., building a prompt-builder or template system instead of open text input), but the overall 5-week structure and milestone cadence stays intact — this is precisely why the decision gate is placed as early as day 4, to preserve maximum runway for whichever path gets chosen. Given the platform reversal removed the original fragmentation-avoidance strategy, this gate matters even more here than it would have on the originally-planned iOS-first path.

## 13. Open Questions & Future Considerations

### Deferred to Future Releases

1. **Sticker fusion / combination generation** (Emoji-Kitchen-style) — explicitly deferred (Section 5). Worth remembering: this is a _harder_ generative problem than single-subject generation, not a simpler follow-on.
2. **iOS platform** — a near-term fast-follow, not indefinitely shelved. Requires macOS/Xcode hardware (Section 6), a Core ML conversion pipeline via Apple's `ml-stable-diffusion` tooling, and validation of Apple's Vision framework for background removal — all of which are, notably, more mature than their Android counterparts used in this release.
3. **Native installable sticker-pack integration** for WhatsApp/Telegram/iMessage — v1 relies on the OS share sheet; true pack integration is separate, platform-specific engineering for a later release.
4. **Output-side (image) content moderation** — accepted as a residual risk for v1 (Section 10); revisit once real compute headroom on the device floor is better understood.
5. **Heavier behavioral analytics** — current plan is intentionally lightweight (Section 4); could expand if the brand/engagement bet needs deeper post-launch evaluation.

### Watch Items

6. **Ideogram 4.0** (or similar open-weight design models) as an offline, workstation-side tool for generating curated sticker-style training data for the LoRA fine-tune — not for deployment (Section 9) — pending a license check on whether that specific use fits its non-commercial terms.
7. **Apple's hinted "StickerKit"-style framework** for third-party sticker registration — unreleased/unconfirmed as of this writing. Relevant to the iOS fast-follow specifically; could meaningfully simplify iOS distribution if it ships by then.
8. **Kotlin Multiplatform** — worth evaluating once the iOS fast-follow begins, to share non-UI business logic (Section 9) between the existing Android codebase and the new iOS build, rather than duplicating orchestration logic from scratch.

### Explicitly Not Revisited (would require re-scoping)

9. **Monetization** — none planned; this is a non-monetized engagement/brand play (Section 2). Introducing monetization later is a distinct product decision, not a natural extension of this plan.
10. **Support for users under 16** — explicitly out of scope (Section 3). Would require substantial compliance and moderation rework (parental gates, stricter filtering, potential COPPA/GDPR-K-style obligations) if the target audience ever shifted younger.

### Unresolved Gap Worth Naming

11. **Prompt language/localization** hasn't been addressed anywhere else in this PRD. The input content filter, the base model's prompt understanding, and the fixed negative prompt have all been discussed assuming English-language input. If the target audience includes non-English speakers, this affects filter coverage (a keyword/embedding-based filter tuned for English won't reliably catch unsafe prompts in other languages) as much as it affects usability. This should be resolved as a deliberate scope decision — English-only for v1, or multi-language from day one — rather than left as a silent assumption.

---

_Appendix: This PRD was developed through an extended scoping conversation that stress-tested feasibility, safety, platform strategy, and business rationale before drafting began. Platform sequencing was reversed from iOS-first to Android-first partway through drafting; Section 9 and the risk register document that reversal's technical implications explicitly rather than silently absorbing it._
