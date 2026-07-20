# Android Emulator QA Checklist

- [ ] Confirm mock mode makes no API traffic.
- [ ] Grant/deny picker permissions; select, remove, and reselect an image.
- [ ] Confirm Continue is disabled without an image and consent precedes processing.
- [ ] Background/foreground and force-close during generation; confirm resume.
- [ ] Confirm stages, timeline, cancellation, and three candidates.
- [ ] Confirm Recommended is not preselected; approve explicitly.
- [ ] Edit a profile and confirm a new version.
- [ ] Confirm eight independent slots and `partial_pack`.
- [ ] Retry one failed slot; verify seven selected asset IDs remain unchanged.
- [ ] Test Vietnamese accents, overflow, placement, and font size.
- [ ] Inspect transparency preview and native share sheet.
- [ ] Test dark mode, text scaling, keyboard overlap, and small screen.
- [ ] Delete a character twice; verify related records are gone.
- [ ] Exercise every debug scenario and safe error guidance.

Record device/API level, Expo version, screenshots, request IDs, and whether each check was manual or automated. This checklist is not execution evidence by itself.
