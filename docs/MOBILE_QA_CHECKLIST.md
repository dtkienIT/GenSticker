# Android Emulator QA Checklist

## Automated baseline

- [x] TypeScript strict typecheck passes.
- [x] ESLint passes.
- [x] Prettier check passes.
- [x] Frontend unit suite passes (7 tests), including profile/text constraint regression coverage.
- [x] Expo SDK 54 public configuration resolves successfully.
- [x] Basic mock-mode Maestro smoke flow is defined in `.maestro/mock-smoke.yaml`.

## Device/emulator evidence still required

- [ ] Run the Maestro smoke flow on an Android emulator and retain the result.
- [ ] Confirm mock mode makes no API traffic.
- [ ] Grant/deny picker permissions; select, remove, and reselect an image.
- [ ] Confirm Continue is disabled without an image and consent precedes processing.
- [ ] Background/foreground and force-close during generation; confirm resume.
- [ ] Confirm stages, timeline, cancellation, error retry, and three candidates.
- [ ] Confirm Recommended is not preselected; open full-screen preview and approve explicitly.
- [ ] Edit a profile and confirm a new immutable version.
- [ ] Confirm eight independent slots and `partial_pack`.
- [ ] Retry one failed slot; verify seven selected asset IDs remain unchanged.
- [ ] Test Vietnamese accents, overflow, placement, and the 16–48 font-size limits.
- [ ] Inspect transparency preview and native share sheet on a supported device.
- [ ] Confirm Product Library navigation for Character/Pack/Job and legacy text saves.
- [ ] Test dark mode, text scaling, keyboard overlap, and small screen.
- [ ] Delete a character with confirmation; verify related records disappear and a repeated delete is handled safely.
- [ ] Exercise every debug scenario and verify safe error guidance does not expose raw image data or tokens.

Record device/API level, Expo version, screenshots, request IDs, and whether each check was manual or automated. This checklist is not execution evidence by itself.
