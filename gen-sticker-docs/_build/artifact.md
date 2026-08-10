# Clean-room artifact notes

## Reference boundary

- Reference archive: `GenSticker-20260809T102350Z-1-001.zip`
- SHA-256: `B2038024F4E8690DBE12C4574675AFE6D82E10FAC29DE30742A99117D6C4ECDF`
- Reference use: document numbering, DOCX/XLSX grouping, heading hierarchy, compact evidence tables, metadata bands, frozen spreadsheet headings and restrained semantic colors.
- Explicitly excluded: all sample-project prose, values, images, embedded diagrams, archived sheets and external-link placeholders.

## Source of truth

- Project content comes from the checked-out `kien_v5` source, tests, configuration declarations and repository documentation.
- `project-docs.json` is the shared content manifest for the Office builders and the web viewer.
- Secret values, `.env` content, user images, base64 payloads and Telegram runtime packs are excluded.

## Visual system

- DOCX: portrait white page, violet/pink identity, clear numbered sections, compact evidence tables and source-derived figures with captions/alt text.
- XLSX: dark navy title band, violet section accents, alternating light rows, status colors, real Excel tables, filters, formulas, charts, frozen headings and dedicated visual sheets.
- Web: native React/CSS viewer with an SVG/PNG visual gallery, expandable diagrams, source captions and Figma provenance.
- Figures: 20 deterministic SVG diagrams generated from the source audit, with PNG fallbacks for Office. No AI image, sample image or user image is used.

## Fidelity gates

- All 6 DOCX packages are reopened and audited for relationships/figure counts. LibreOffice is unavailable and Microsoft Word PDF export times out in this environment, so final DOCX layout is not reported as visually passed. A manifest-equivalent ReportLab fallback rendered 39 QA pages for content/figure review only; it is not substituted for actual DOCX rendering.
- All 84 sheets across the 6 XLSX workbooks are rendered and inspected; formulas, charts, media relationships and visual-sheet layout are audited separately. The final audit covers 12 visual sheets, 12 embedded figures, 3 charts and 6 formula cells with no formula errors. Visual sheets include a cell-native fallback beneath each PNG so renderers without worksheet-drawing support never show a blank page.
- All 12 Office files include the exact-one-detected-face browser gate, and the shared 20-figure set is rebuilt from the same deterministic SVG source before PNG/Office/web synchronization.
- The web viewer must pass TypeScript build, lint, direct-browser desktop/mobile review, document switching and asset/hash checks.
- Root Office/manifest/figure artifacts are synchronized to `frontend/public/gen-sticker-docs` and verified by SHA-256.
