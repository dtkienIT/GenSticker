# PRD: AI Sticker Generation V1

| Field | Value |
| --- | --- |
| Product | DUHAT AI |
| Feature | AI Sticker Generation |
| Version | V1.0 |
| Status | Draft - proposed scope for Product review |
| Owner | Product |
| Date | August 2026 |

## 1. Overview

AI Sticker Generation turns a user-selected photo into a personalized sticker pack that can be previewed, saved, and sent in DUHAT chats. V1 focuses on a simple flow using a fixed visual style and a fixed set of common expressions.

The broader AI feature proposal supports photos of a person, pet, or object and describes a pack of 6-8 variants. More advanced capabilities such as dynamic wording, multiple styles, free-form prompts, combining stickers, and multi-photo identity enhancement are future phases.

## 2. Problem Statement

Generic sticker packs do not always represent the user's identity, personal moments, pets, or favorite objects. Creating a custom sticker manually requires background removal, cropping, styling, and packaging, which is too complex for casual chat users.

## 3. Goal

Let a user generate and save a usable personal sticker pack from one photo with minimal effort, while protecting privacy, consent, identity, and content safety.

## 4. Success Criteria

- A user can go from selecting a photo to previewing a generated pack without leaving DUHAT.
- Each successful generation returns 6-8 usable sticker variants.
- The user explicitly chooses which generated stickers to save.
- Saved stickers are available in the existing sticker tray and can be sent in chat.
- Generated outputs pass input and output safety checks before being shown or shared.
- Human subjects remain recognizably consistent without unintended changes to skin tone, age presentation, or core facial features.
- Product can measure generation completion, save rate, and send rate without retaining source images in analytics.

Quantitative generation-quality and latency targets are to be confirmed after prototype benchmarking.

## 5. Proposed V1 Scope

### 5.1 In Scope

- Entry from the DUHAT sticker tray or approved creation entry point.
- Select or capture one source photo.
- Supported subjects: one person, one pet, or one primary object.
- Consent confirmation that the user owns or has permission to use the photo.
- Input validation for file type, size, image quality, and subject suitability.
- For a person photo, validation that exactly one clear face is present.
- Background removal and transformation into a predefined non-photorealistic sticker style.
- Generate a pack of 6-8 sticker variants.
- Use a fixed set of Product-approved common expressions and wording.
- Preview individual stickers and the full pack.
- Select or deselect stickers before saving.
- Regenerate the pack using the same source photo and fixed style.
- Save the selected stickers as a private personal pack.
- Send saved stickers in one-to-one or group chats using the existing sticker flow.
- Report an abusive, unauthorized, or inappropriate generated sticker.
- Vietnamese and English fixed sticker wording.

### 5.2 Out of Scope for V1

- Dynamic AI-generated wording based on chat context or user style.
- Free-form text prompts.
- Choosing or switching between multiple visual styles.
- Editing individual poses, expressions, clothing, or backgrounds.
- Combining two existing stickers into a new sticker.
- Multiple reference photos or high-fidelity identity enhancement.
- Celebrity, public-figure, branded-character, or copyrighted-character generation.
- Public sticker marketplace or public discovery.
- Selling or monetizing generated sticker packs.
- Generating realistic photographs or deepfake-style content.
- Automatic sticker suggestions based on private chat context.

## 6. User Stories

### US-1: Generate a personal sticker pack

**As a** DUHAT user,  
**I want to** turn a photo of myself, my pet, or an object into a sticker pack,  
**so that** I can express myself more personally in chat.

### US-2: Preview and save selected stickers

**As a** user,  
**I want to** review the generated stickers before saving them,  
**so that** only stickers I approve appear in my sticker tray.

### US-3: Send a generated sticker

**As a** user,  
**I want to** send a saved AI sticker through the existing sticker experience,  
**so that** it feels native to DUHAT chat.

## 7. User Experience and Acceptance Criteria

### 7.1 Entry Point

- An AI Sticker creation action is available from the sticker tray or another Product-approved entry point.
- Starting creation opens an explanation of the feature and supported photo requirements.
- The user must confirm that they own or have permission to use the selected photo before generation.

### 7.2 Photo Selection and Validation

- The user can take a photo or select one from the device gallery, subject to platform permissions.
- The app validates supported file type, file size, minimum resolution, blur, lighting, and subject visibility.
- For person photos, exactly one clear face is required in V1.
- Photos containing multiple people are rejected with guidance to crop or choose another photo.
- Photos that fail quality or safety checks are rejected with a specific, actionable reason where safe to provide.
- The original photo is not added to a public gallery or shared with other users.

### 7.3 Generation

- After validation, the user starts generation explicitly.
- The UI displays a generation progress state and lets the user leave the screen without losing a submitted job.
- A successful job produces 6-8 sticker variants in the fixed V1 style.
- Each variant uses one expression/wording item from the Product-approved fixed set.
- Output must be non-photorealistic and suitable for use as a chat sticker.
- Input and output moderation must complete before results are presented.

### 7.4 Preview and Regeneration

- Generated stickers are displayed in a pack preview.
- The user can inspect each sticker and deselect unwanted results.
- The user can regenerate the full pack from the same source photo.
- V1 does not support editing individual wording, pose, expression, or style.
- The number of allowed regenerations and any usage quota require Product confirmation.

### 7.5 Save and Send

- Saving requires an explicit user action.
- Only selected stickers are saved.
- A generated pack is private to its creator by default.
- Saved stickers appear in the user's personal sticker tray.
- A saved sticker can be sent through the existing sticker message flow in one-to-one and group chats.
- Sending a sticker does not automatically publish the whole pack to other users.
- Pack deletion behavior follows the existing personal sticker-management experience.

### 7.6 Failure States

- Validation failures preserve the user's place in the creation flow and allow another photo to be selected.
- If generation times out or fails, the user sees a non-blocking error and can retry.
- Failed jobs do not create partial packs in the sticker tray.
- If some generated outputs fail moderation, blocked outputs are not shown or saved; Product must confirm whether safe outputs may still be presented.
- If saving fails, the preview remains available so the user can retry without regenerating immediately.

## 8. Trust, Safety, and Compliance Requirements

### 8.1 Consent and Identity

- Before generation, the user confirms they own or have permission to use the source photo.
- Person-photo generation accepts only one clear face in V1.
- Generation intended to impersonate, defraud, harass, sexualize, or abuse another person is prohibited.
- Public figures and celebrity likenesses are out of scope and must be blocked when reliably detected or handled through moderation and reporting.

### 8.2 Content Safety

- Source images are checked for prohibited sexual, exploitative, abusive, or illegal content.
- Generated images and wording are moderated before display and sharing.
- Unsafe or abusive generated outputs are blocked.
- Users can report unauthorized likeness use, harassment, copyright violation, or other abuse from the sticker action menu.
- A takedown and review process must exist before launch.

### 8.3 Child Safety

- Unsafe or sexualized content involving minors must be blocked.
- Product and Legal must decide whether photos of minors are prohibited entirely in V1 or allowed under stricter private-only rules.

### 8.4 Bias and Identity Fidelity

- The system must avoid unintended changes to skin tone, ethnicity, gender presentation, age presentation, or other core identity traits.
- Evaluation must cover representative skin tones and demographic groups.
- Users can report a result as inaccurate or "Not like me."

### 8.5 Privacy and Retention

- Source images must not be included in product analytics or application logs.
- Generated packs are private by default.
- Product, Privacy, and Legal must define source-photo, intermediate-image, failed-job, generated-output, and report-evidence retention before implementation commitment.
- Use of source or generated images for model training requires an explicit policy and appropriate user notice or consent.
- Users must be able to delete their saved generated packs.

## 9. Functional Requirements

- **F1:** Accept one supported source photo from camera or gallery.
- **F2:** Validate image quality, subject type, and safety before generation.
- **F3:** Require consent confirmation before image submission.
- **F4:** Remove the background and create a fixed-style, non-photorealistic sticker representation.
- **F5:** Generate 6-8 variants using fixed Product-approved expressions and wording.
- **F6:** Moderate inputs and outputs before display or sharing.
- **F7:** Preview, select, regenerate, and save generated stickers.
- **F8:** Add saved stickers to the user's private personal sticker tray.
- **F9:** Send generated stickers through the existing sticker message flow.
- **F10:** Support reporting and deletion.

## 10. Non-Functional Requirements

### 10.1 Quality

- Human-subject results must preserve recognizable identity across the pack.
- Pet and object results must preserve the primary visual characteristics of the source subject.
- Stickers must have a clean cut-out, readable fixed wording, and transparent or Product-approved backgrounds.
- The quality benchmark and pass thresholds for likeness, cut-out quality, text correctness, safety, and diversity require Product approval.

### 10.2 Performance

- Generation latency target is to be confirmed after prototype benchmarking.
- A generation job must have visible progress, timeout, and retry states.
- Leaving the creation screen must not silently cancel a successfully submitted generation job.

### 10.3 Security

- Images must be encrypted in transit and at rest for any approved temporary retention period.
- Access to source images, intermediates, and generated outputs must follow least-privilege controls.
- Sensitive image references must not appear in client-visible logs or analytics payloads.

## 11. Analytics

The following metadata events may be captured without source or generated image content:

- AI Sticker creation opened.
- Consent confirmed.
- Camera or gallery selected.
- Photo validation passed or failed by non-sensitive reason category.
- Generation started, completed, failed, or timed out.
- Pack regenerated.
- Sticker selected or deselected.
- Pack saved or save failed.
- Generated sticker sent.
- Generated sticker deleted.
- Generated sticker reported.

Primary proposed metrics:

- Generation Completion Rate.
- Generation-to-Save Rate.
- Generated Sticker Send Rate per Conversation.
- Seven-day Reuse Rate of Generated Stickers.
- Regeneration Rate.
- Validation Failure Rate.
- Safety Block and Report Rate.

## 12. Dependencies

- Existing sticker tray, personal pack management, and sticker message flow.
- Camera/gallery permission and upload experience.
- Image validation, generation, and moderation capabilities.
- Product-approved fixed style and expression/wording set.
- Privacy and retention decisions.
- Abuse reporting, review, and takedown operations.
- Quality, safety, bias, and identity-fidelity evaluation sets.

## 13. Future Scope

- Dynamic wording personalized to language, context, or communication style.
- Multiple selectable styles such as Chibi, 3D, Plush, and Pixel.
- Free-form prompt-based sticker generation.
- Individual sticker editing.
- Combining multiple stickers into a new creation.
- Multiple reference photos and high-fidelity identity enhancement.
- Contextual AI sticker suggestion.
- Public packs, discovery, and monetization.

## 14. Product Decisions Required Before V1 Commitment

1. Confirm that V1 supports a person, pet, and object, or narrow V1 to a single-person selfie.
2. Approve the fixed visual style and the fixed set of expressions/wording.
3. Confirm whether photos of minors are blocked or supported under stricter rules.
4. Define source-photo, intermediate-image, generated-output, failed-job, and report retention.
5. Confirm regeneration quotas and whether generation is free or usage-limited.
6. Confirm behavior when only some outputs in a pack fail moderation.
7. Approve quantitative generation latency and quality thresholds.

## 15. Sources

- [Duhat | AI Features - Feature 3.3 AI Sticker Creator](https://xanhsm.atlassian.net/wiki/spaces/PHC/pages/1734377474/Duhat+AI+Features)
- [AI Sticker - PRD](https://xanhsm.atlassian.net/wiki/spaces/PHC/pages/1749975666/AI+Sticker+-+PRD)
- [AI Image Generation - Trust, Safety & Compliance Evaluation](https://xanhsm.atlassian.net/wiki/spaces/PHC/pages/1753515100/AI+image+generation+-+Trust+Safety+Compliance+evaluation)

