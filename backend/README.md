# GenSticker Backend

FastAPI API and durable local worker for the single supported generation path:

```text
arbitrary image
  -> local BiRefNet foreground mask
  -> subject crop and centering
  -> deterministic cartoon rendering
  -> white outline
  -> 512x512 transparent PNG
```

The API, SQLite database, private uploads, job runner, model inference, and final assets all run
locally. The default CPU path does not require a paid API, ComfyUI, or a GPU.

## Local setup

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Download BiRefNet once and configure `.env`:

```dotenv
STICKER_PROVIDER=universal
BIREFNET_MODEL_PATH=E:\Program Files\GenSticker\models\birefnet
STICKER_DEVICE=cpu
```

`BIREFNET_MODEL_PATH` must contain the local Hugging Face BiRefNet snapshot, including
`config.json`, its Python model files, and `model.safetensors`.

After setting the path, download the public model without a token:

```powershell
$env:PYTHONPATH="."
.\.venv\Scripts\python.exe scripts\download_birefnet.py
```

Run the API and worker in separate terminals:

```powershell
.\.venv\Scripts\python.exe -m backend.app.main
.\.venv\Scripts\python.exe -m backend.app.jobs.worker
```

The worker materializes the private source image, runs the local provider in a background thread,
and stores one `universal_sticker` RGBA artifact in the configured asset store.

## Validation without a GPU

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests
.\.venv\Scripts\python.exe -m ruff check backend
```

Tests inject an in-process segmentation mask. They never download models or contact an external
service.
