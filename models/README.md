# InstantID model assets

Model weights are intentionally excluded from Git. The worker expects this
project-relative layout:

```text
models/
├── InstantID/
│   ├── pipeline_stable_diffusion_xl_instantid_full.py
│   └── ip_adapter/
├── sdxl-base/
│   └── model_index.json
├── instantid/
│   ├── ip-adapter.bin
│   └── ControlNetModel/
│       ├── config.json
│       └── diffusion_pytorch_model.safetensors
├── controlnet-canny-sdxl/
│   ├── config.json
│   └── diffusion_pytorch_model.safetensors
├── insightface/
│   └── models/
│       └── antelopev2/
│           ├── glintr100.onnx
│           └── scrfd_10g_bnkps.onnx
├── lora/
│   └── StickersRedmond.safetensors
└── birefnet/
    ├── config.json
    └── model.safetensors
```

Run `python scripts/prepare_instantid_models.py` to fetch the pinned InstantID
code/checkpoints, Canny ControlNet, and BiRefNet. Add `--include-sdxl` after
accepting the SDXL terms on Hugging Face.

The script deliberately does not fetch `antelopev2` or
`StickersRedmond.safetensors`. Copy the same reviewed files used by the Colab
pilot into the paths above. InsightFace pretrained models and the InstantID
checkpoint are restricted to non-commercial research by upstream; this worker
must not be presented as commercially cleared.
