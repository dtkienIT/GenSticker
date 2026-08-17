# DUHAT Design System Spec (v1.0)

> Extracted from DUHAT Mobile Application UI Screens.
> Brand Identity: Security-First, Playful, Warm, Expressive, and Human.

---

## 1. Executive Summary & Brand Principles

**DUHAT** combines top-tier real-time communication security (automatic scam detection, end-to-end encryption, screenshot protection, device verification) with a friendly, highly expressive visual identity centered around sunny warmth and playful 3D mascot imagery.

### Core Visual Principles
1. **Sunny Brand Warmth**: The signature sunny yellow background (`#FFC800`) creates an instantly recognizable, approachable brand halo around high-tech security features.
2. **High-Contrast Clarity**: Clean typography in high-contrast black (`#111111`) ensures high legibility across light backgrounds, cards, and video overlays.
3. **Soft Rounded Geometry**: Softened corners (`16px`–`24px` card radius, `9999px` full pill shapes) eliminate harsh edges and feel friendly to touch.
4. **Contextual Security Badging**: Security feedback is never hidden—reassuring translucent green pills (`The call is absolutely secure`) and high-impact red warning cards (`Scam Detection`) communicate state clearly.
5. **Playful Mascot & Sticker Integration**: 3D plush duckling mascot graphics ("DuckHat"), doodle stamps ("BUZZ!!"), and rich stickers turn utility screens into vibrant social experiences.

---

## 2. Color Palette & Design Tokens

### 2.1 Brand & Core Palette

| Token Name | Hex Code | Visual Sample | Usage / Context |
| :--- | :--- | :--- | :--- |
| `--color-brand-yellow` | `#FFC800` | Sunny Gold | Hero backgrounds, primary CTA buttons, brand highlights |
| `--color-brand-yellow-light` | `#FFE580` | Light Yellow | Sent chat bubbles, featured store card background |
| `--color-brand-yellow-soft` | `#FFF8D6` | Tinted Off-Yellow | Subtle background tint, store header highlight |
| `--color-text-primary` | `#111111` | Rich Black | Primary headings, button labels, high-contrast text |
| `--color-text-secondary` | `#7E7E82` | Muted Charcoal | Timestamps, subtitles, member counts, secondary labels |
| `--color-surface-white` | `#FFFFFF` | Pure White | Cards, received chat bubbles, modal bottom sheets |
| `--color-surface-grey` | `#F2F3F5` | Light Cool Grey | Search bar background, chat input background |

### 2.2 Functional & Security Colors

| Token Name | Hex Code | Visual Sample | Usage / Context |
| :--- | :--- | :--- | :--- |
| `--color-security-green` | `#34C759` | Safety Green | "Call secure" badge, online status dot, Accept Call CTA |
| `--color-security-green-bg` | `rgba(52, 199, 89, 0.15)` | Soft Green Tint | Security pill background accent |
| `--color-alert-red` | `#FF3B30` | Scam Alert Red | Scam warning box text, Decline Call CTA, End Call button |
| `--color-alert-red-bg` | `#4A0E0E` / `rgba(255,59,48,0.2)` | Dark Red Glow | Scam notification card overlay background |
| `--color-accent-buzz` | `#E63946` | Nudge Red | "BUZZ!!" stamp effect, priority call out |

### 2.3 Dark Mode & Media Overlay Colors

| Token Name | Hex Code | Visual Sample | Usage / Context |
| :--- | :--- | :--- | :--- |
| `--color-dark-bg` | `#121212` | Deep Charcoal | Scam alert incoming call background |
| `--color-dark-gradient-end` | `#260A0A` | Crimson Dark | Radial background gradient bottom tint on scam alerts |
| `--color-overlay-dark` | `rgba(0, 0, 0, 0.45)` | Semi-transparent | Translucent action buttons on video call, top action bar |

---

## 3. Typography Hierarchy

The design system uses a modern, geometric sans-serif typeface (e.g., **SF Pro Display / Inter / Outfit**).

```css
:root {
  --font-family-base: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
  --font-family-handwritten: "Comic Sans MS", "Caveat", cursive; /* For BUZZ!! & doodle accents */
}
```

### Type Scale Specification

| Role | Font Size | Weight | Line Height | Letter Spacing | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Hero Heavy** | `36px` - `44px` | Bold (`700`) | `1.1` | `-0.02em` | `Secure Calls` |
| **Display Hero Regular** | `36px` - `44px` | Regular (`400`) | `1.1` | `-0.01em` | `Make` |
| **Screen Heading** | `22px` - `24px` | Bold (`700`) | `1.2` | `-0.01em` | `Store`, `Driver` |
| **Section Header** | `17px` - `18px` | SemiBold (`600`) | `1.3` | `0` | `Featured sticker >` |
| **Card Title / Author** | `15px` - `16px` | SemiBold (`600`) | `1.3` | `0` | `Trần Thanh Minh Phúc` |
| **Body Regular** | `14px` - `15px` | Regular (`400`) | `1.4` | `0` | Chat bubble text |
| **Subtitle / Meta** | `12px` - `13px` | Medium (`500`) | `1.3` | `0` | `Public · 20.4k member`, `06:50` |
| **Micro Caption / Time** | `10px` - `11px` | Regular (`400`) | `1.2` | `0.02em` | Timestamps `14:20`, `Identified by:` |
| **Playful Accent Stamp** | `20px` - `24px` | ExtraBold (`800`) | `1.0` | `0.05em` | `BUZZ!!` |

---

## 4. Spacing, Elevation & Geometry Tokens

### 4.1 Border Radius Tokens

```css
:root {
  --radius-xs: 6px;     /* Small tags & file type badges */
  --radius-sm: 12px;    /* Image grid items, quick action tiles */
  --radius-md: 16px;    /* Cards, warning containers, sticker banners */
  --radius-lg: 20px;    /* Chat bubbles, modal cards */
  --radius-xl: 28px;    /* Search inputs, chat bottom dock */
  --radius-full: 9999px;/* Action pills, CTA buttons, round avatars */
}
```

### 4.2 Elevation & Shadow Tokens

```css
:root {
  --shadow-sm: 0px 2px 8px rgba(0, 0, 0, 0.04);   /* Received chat bubbles */
  --shadow-md: 0px 4px 16px rgba(0, 0, 0, 0.08);  /* Community feed cards, store items */
  --shadow-lg: 0px 8px 24px rgba(0, 0, 0, 0.14);  /* Floating call control bar */
  --shadow-alert: 0px 0px 20px rgba(255, 59, 48, 0.3); /* Scam warning card glow */
}
```

### 4.3 Spacing Scale

```css
:root {
  --space-2xs: 4px;
  --space-xs: 8px;
  --space-sm: 12px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
}
```

---

## 5. Component Library Specifications

### 5.1 Security Badge Component (`SecurityPill`)

Top translucent status pill used across call screens and encrypted chats.

- **Visual Style**: Translucent dark/grey background (`rgba(0, 0, 0, 0.5)`), rounded pill (`9999px`), subtle border.
- **Content**:
  - Green indicator dot (`#34C759`) or green lock icon `🔒`.
  - Typography: `12px Medium`, color `#FFFFFF`.
  - Label: `"The call is absolutely secure"`.

```
+-------------------------------------------------+
|  ●  The call is absolutely secure               |
+-------------------------------------------------+
```

---

### 5.2 Chat Bubbles Component

#### A. Sent Message Bubble (`ChatBubbleSent`)
- **Background**: `--color-brand-yellow-light` (`#FFE580`).
- **Typography**: `--color-text-primary` (`#111111`), `14px Regular`.
- **Border Radius**: `18px` top-left, top-right, bottom-left; `4px` bottom-right.
- **Footer Metadata**: Alignment right, timestamp (`14:20`) + double check marks (`✓✓`) in muted dark grey (`#555555`).

#### B. Received Message Bubble (`ChatBubbleReceived`)
- **Background**: `--color-surface-white` (`#FFFFFF`).
- **Border/Shadow**: Subtle `1px` border (`#E5E5EA`) and `--shadow-sm`.
- **Typography**: `--color-text-primary` (`#111111`), `14px Regular`.
- **Border Radius**: `18px` top-left, top-right, bottom-right; `4px` bottom-left.
- **Floating Emoji Reaction**: Pill floating at bottom-left corner with shadow (`❤️ 1`).

#### C. File Attachment Sub-Card (`ChatFileCard`)
- Embedded card inside sent/received bubbles.
- White translucent background (`rgba(255, 255, 255, 0.6)` on yellow, or `#F7F8FA` on white).
- Red file type icon badge (e.g., `PDF`), title `Personal Information.pdf`, subtitle `1.0 MB · pdf`, right-aligned green checkmark circle icon `✓`.

---

### 5.3 Video Call Controls Dock

Floating translucent action bar overlaying video streams.

- **Container**: Translucent black pill bar (`rgba(0, 0, 0, 0.4)`), backdrop filter blur `12px`.
- **Action Buttons**:
  - Circular buttons (`48px x 48px`).
  - Dark state: `rgba(255, 255, 255, 0.2)` background + white vector icon + text label underneath (`11px Medium`).
  - Active/Destructive state (End Call): Solid Red (`#E53935`), white `X` icon, label `End Call`.
- **Side Vertical FX Panel**:
  - Stacked circular action buttons on right-edge: `Magic Wand` (Filters), `Mask` (Effects), `Sticker/Emoji` picker.

---

### 5.4 Scam Detection Warning Card (`DuhatRadarAlert`)

High-priority emergency warning overlay shown on incoming scam calls.

- **Background**: Dark red translucent card (`#4A0E0E` / `rgba(74, 14, 14, 0.85)`), border `1px solid rgba(255, 59, 48, 0.4)`, radius `20px`, glowing shadow `--shadow-alert`.
- **Warning Icon**: Red filled triangle alert symbol (`⚠️` / `#FF3B30`).
- **Warning Title**: `Scam: Impersonating a delivery driver` (Bold `16px`, Color `#FF3B30`, Center aligned).
- **Radar Footer**: `Identified by: 🕊️ Duhat Radar` (Muted caption `11px`, Color `#CCCCCC`).
- **Call CTAs**:
  - Left: Circular Red Decline Button (`#FF3B30`, `64px x 64px`, white `X`).
  - Right: Circular Green Accept Button (`#34C759`, `64px x 64px`, white Video Camera icon).

---

### 5.5 Chat Input Bar (`ChatDock`)

- **Container**: Full-width floating bottom dock with rounded input container (`border-radius: 28px`, background `#F2F3F5`).
- **Left Actions**: `+` add attachment icon, `📷` gallery media icon.
- **Center Input**: Placeholder `"Type a message..."`, text size `14px`, color `#8E8E93`.
- **Right Actions**:
  - Duck mascot sticker icon picker.
  - `"BUZZ"` pill button (sketches/nudges recipient).
  - Voice Mic button inside solid rounded container (`32px x 32px`).

---

### 5.6 Community & Store Cards

#### A. Community Post Card (`PostCard`)
- **Header**: Avatar thumbnail, Author name (`Trang Đặng > General`), relative time (`2h`), menu (`...`).
- **Body**: Text description + 2x2 media grid with rounded corners (`12px`).
- **Count Overlay**: Dark translucent overlay tag `+7` for extra gallery images.
- **Reactions**: Heart icon + like count `120`, inline emoji reaction pill group (`❤️ 👍 😆`).
- **Primary CTA Button**: Full width yellow pill (`#FFCC00`), text `+ Create new post` (`15px Bold`, `#111111`).

#### B. Store Featured Banner (`StoreCardFeatured`)
- Soft yellow container card with subtle background graphics and floating badge (`Hi!`).
- Graphic thumbnail preview (e.g. `Firebird` character), title, author (`Studio Mochi`), dark download CTA button pill (`⬇ Tải`, black `#111111`, text `#FFFFFF`).

---

## 6. Layout Architecture & Screen Templates

### 6.1 Hero Header Template
- **Background**: Full viewport warm sunny yellow (`#FFC800`).
- **Headline Structure**:
  - Line 1: Regular weight verb (`Make`, `Keep`, `Automatic`, `Join`, `Express`).
  - Line 2: Bold heavy weight noun (`Secure Calls`, `Chats Private`, `Scam Detection`, `Your Community`, `Your Style`).
- **Brand Emblem**: Centered black bird/duck wing logo mark (`🕊️` / `Y`).

### 6.2 Phone Frame Display Mockup
- Silver/titanium bezel smartphone frame (`border-radius: 40px`, stroke shadow `0 20px 50px rgba(0,0,0,0.2)`).
- Top status bar: Time `9:41`, Signal bars, Wi-Fi, Battery icon.

---

## 7. Motion & Micro-Interactions

| Interaction | Trigger | Animation Spec | Visual Outcome |
| :--- | :--- | :--- | :--- |
| **BUZZ!! Stamp** | Tap "BUZZ" button | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` scale-up + subtle vibration | Red sketchy "BUZZ!!" text pops with haptic feedback |
| **Scam Warning Alert** | Incoming call flagged | Pulse opacity & border glow (`1.5s infinite ease-in-out`) | Soft red glow pulsates around dark warning card |
| **Floating Scroll Button** | Scroll up in long chat | Fade-in + translate Y (`200ms ease-out`) | White circular down-arrow button floats above input dock |
| **Call Button Press** | Tap End/Decline/Accept | Scale `0.92` on active tap (`100ms ease-in-out`) | Instant visual tactile response |

---

## 8. Accessibility & Internationalization (i18n)

- **Color Contrast**: Dark text (`#111111`) on Primary Yellow (`#FFC800`) yields a high contrast ratio of **13.5:1** (exceeds WCAG AAA standard of 7:1).
- **Multilingual Support**: Layouts accommodate multi-line Vietnamese text (e.g. `Trần Trang Tuệ Nhiên`, `Ồ hay nhỉ?`, `Tải`) and English phrases cleanly without layout breakage.
- **Minimum Tap Targets**: All circular action icons and navigation buttons adhere to minimum `44px x 44px` touch target areas.

---

## 9. Summary of Design Tokens Cheat Sheet (CSS Custom Properties)

```css
:root {
  /* Primary Brand Colors */
  --duhat-yellow: #FFC800;
  --duhat-yellow-light: #FFE580;
  --duhat-yellow-soft: #FFF8D6;
  --duhat-black: #111111;
  --duhat-grey-muted: #7E7E82;
  --duhat-white: #FFFFFF;
  --duhat-surface-grey: #F2F3F5;

  /* Security & Functional Feedback */
  --duhat-green: #34C759;
  --duhat-red: #FF3B30;
  --duhat-red-dark: #4A0E0E;
  --duhat-buzz-red: #E63946;

  /* Border Radii */
  --duhat-radius-card: 16px;
  --duhat-radius-bubble: 18px;
  --duhat-radius-dock: 28px;
  --duhat-radius-pill: 9999px;

  /* Typography */
  --duhat-font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
}
```
