# GenSticker Backend

FastAPI API and durable GPU worker for the one-person sticker pipeline:

```text
one portrait
  -> InsightFace: require exactly one face
  -> normalized face/hair crop
  -> InstantID identity embedding + facial landmarks
  -> SDXL + IdentityNet + hair-only Canny ControlNet + chibi LoRA
  -> BiRefNet foreground mask
  -> hard chin boundary + adaptive tone + white outline
  -> one 1024x1024 transparent PNG
```

The provider uses one generic chibi prompt for every person. It does not infer
gender or insert input-specific hair words. Identity, face geometry, hairline,
parting, texture, and the above-chin silhouette come from the image conditions.
Inputs with zero or multiple detected faces fail with an explicit 422 error.

## Local setup

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e "backend[dev]"
Copy-Item .env.example .env
```

Prepare the pinned public assets:

```powershell
$env:PYTHONPATH="."
.\.venv\Scripts\python.exe scripts\prepare_instantid_models.py --include-sdxl
```

Then copy the reviewed `antelopev2` pack and the exact
`StickersRedmond.safetensors` used by the accepted Colab pilot into the paths
documented in `models/README.md`. The worker validates every required file
before loading the heavy runtime and reports `provider_not_configured` with the
missing paths instead of silently falling back to a different pipeline.

Run the API and worker in separate terminals:

```powershell
.\.venv\Scripts\python.exe -m backend.app.main
.\.venv\Scripts\python.exe -m backend.app.jobs.worker
```

The model is loaded lazily on the first job and reused for later jobs in the
same worker. CUDA is required. CPU model offload and VAE tiling are enabled to
reduce peak VRAM, but 1024px SDXL inference is still a GPU workload.

## Validation without model downloads

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests
.\.venv\Scripts\python.exe -m ruff check backend scripts
```

Tests inject a lightweight runtime. They validate the provider contract,
single-face rule, deterministic seed forwarding, transparent output, and the
post-generation chin cutoff without downloading checkpoints or contacting an
external service.

## License boundary

This configuration is for research. InstantID code is Apache 2.0, but its
released checkpoint and InsightFace pretrained models are restricted upstream
to non-commercial research. The chibi LoRA must be reviewed separately before
any commercial deployment. See `governance/model_license_registry.example.yaml`.
