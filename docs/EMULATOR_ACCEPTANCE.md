# API 37.1 Real-Model Acceptance

## Run

- Date: 2026-07-25
- Device: Pixel 7 Android Studio AVD
- Android: 17 / API 37
- ABI: `x86_64`
- Reported RAM: 8,130,992 kB
- Runtime: ONNX Runtime Android 1.27.0
- Provider policy: `NNAPI_REFERENCE`
- Model: `lcm-sd15-chibi` version `1.0.1`
- Bundle digest:
  `7821175c2410bee3a4cc7be6aa9d1c0c19647aa99983746b2b4ef6b868998397`

## Installation

The corrected seven-part bundle passed host and device-side byte-length and SHA-256 validation.
The app installed it through `installLocalModel()`, removed the staging directory after promotion,
and created the expected ready marker. The two pre-existing gallery PNGs and app preferences were
preserved.

## Real inference evidence

The native adapter selected `expo-sticker-runtime-onnx`. All three FP16 sessions were accepted:

```text
ORT_SESSION_READY component=text_encoder
ORT_SESSION_READY component=unet
ORT_SESSION_READY component=vae_decoder
ORT_RUN_START component=text_encoder
ORT_RUN_END component=text_encoder
ORT_RUN_START component=unet_step_0
```

NNAPI reference reported two UNet partitions, with 39 supported nodes out of approximately 1,800.
The remaining nodes were assigned outside the preferred provider.

## Stop condition

The first UNet run exceeded the emulator's usable memory. Android's low-memory killer terminated
the foreground GenSticker process:

```text
Kill 'com.vinai.gensticker.dev' ... to free 6384476kB rss ...
reason: min watermark is breached even after kill
Process com.vinai.gensticker.dev ... has died: fg TOP
Process ... exited due to signal 9 (Killed)
```

Per the acceptance plan, testing stopped at this point. Generation success, PNG alpha validation,
and active-inference cancellation are not accepted on this emulator. No mock, cloud, CPU-only, or
alternate-model fallback was introduced.

## Cleanup audit

After termination:

- the gallery still contained exactly the original two durable PNGs;
- no native temporary PNG directory or file existed; and
- the corrected `1.0.1` ready marker remained installed.

## 12 GB retry

A second real-model run was attempted on 2026-07-26 after starting the same API 37.1 `x86_64`
AVD with an explicit 12,288 MB memory override. Android reported `MemTotal: 12247476 kB`.
The app was connected to an isolated native-mode Metro server, and the UI identified the
`Native adapter`. The durable gallery baseline before this run was four PNGs.

All three FP16 sessions initialized with the `NNAPI_REFERENCE` policy. The text encoder and first
UNet step completed, and the second UNet step started:

```text
ORT_SESSION_READY component=text_encoder
ORT_SESSION_READY component=unet
ORT_SESSION_READY component=vae_decoder
ORT_RUN_START component=text_encoder
ORT_RUN_END component=text_encoder
ORT_RUN_START component=unet_step_0
ORT_RUN_END component=unet_step_0
ORT_RUN_START component=unet_step_1
```

Android then killed the foreground process for memory pressure:

```text
Kill 'com.vinai.gensticker.dev' ... to free 9132176kB rss, 8923336kB anon rss, 0kB swap ...
reason: min watermark breached even after kill
Process com.vinai.gensticker.dev ... died: fg TOP
Process ... exited due to signal 9
```

The extra emulator RAM allowed inference to progress from UNet step 0 to step 1, but did not make
the existing FP16 pipeline executable end to end. Per the acceptance stop condition, no further
generation or cancellation attempt was made and no fallback was introduced.

After the 12 GB termination:

- the gallery still contained exactly its four-file pre-run baseline;
- `cache/generated-stickers` did not exist;
- the app process was no longer running; and
- the corrected `1.0.1` ready marker remained installed with bundle digest
  `7821175c2410bee3a4cc7be6aa9d1c0c19647aa99983746b2b4ef6b868998397`.
