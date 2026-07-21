# Mobile User Flows

1. Bootstrap resolves persisted frontend session IDs and routes the user back to the latest character, job, pack, or sticker state.
2. Text-to-Sticker remains a separate client-only prototype.
3. Selfie creation requires versioned consent, picker permission, image preview, local validation, and character creation.
4. A canonical job is polled until terminal; its timeline is non-blocking, may be cancelled, and can be resumed from persisted state.
5. Three candidates appear; recommendation never selects or approves automatically. A candidate can be opened in a full-screen preview.
6. Explicit approval creates profile v1; subsequent editor saves create immutable versions.
7. Pack creation requires approval and creates eight independently progressing emotion slots.
8. Partial packs remain usable; retry targets one slot and preserves the other seven.
9. Exact text is applied after generation with placement, font-size controls, validation, and transparency preview.
10. Export returns a PNG/WebP/ZIP manifest. The app invokes native file sharing for a local file URI when available and falls back to the React Native share sheet otherwise.
11. Product Library lists Character, Pack, and Job records, resumes each entity at its latest valid route, and still shows legacy Text-to-Sticker saves.
12. Character deletion requires confirmation, cascades related local mock records, invalidates related queries, and removes stale session IDs.

All flows above are available deterministically in mock mode and through the FastAPI adapter in HTTP mode. HTTP mode persists consent/product state, uploads private assets, and queues generation in the durable worker.
