# GenSticker Backend Package

Local-first FastAPI backend & durable job engine scaffold for GenSticker.

## Trained CUT provider

The worker can run the trained CUT `ResnetGenerator` without exposing PyTorch details to the
mobile API. From the repository root, create the project environment and install the backend
and CUT runtime dependencies:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

The epoch-8 checkpoint and its compatible ResNet-9 inference architecture are bundled in this
repository. Configure `.env` without any machine-specific model path:

```dotenv
GENERATION_PROVIDER=cut
CUT_ENABLED=true
CUT_DEVICE=auto
```

Start the API and worker in separate terminals. The checkpoint is lazy-loaded by the worker on
the first job and reused for later jobs:

```powershell
python -m backend.app.main
python -m backend.app.jobs.worker
```

Uploaded selfies remain in the private asset store. The worker passes an internal filesystem
path to CUT, writes the generated 512x512 RGBA PNG back through `AssetStore`, and the public API
returns only product-level asset IDs/content routes.

The checkpoint is stored with Git LFS. Install Git LFS before cloning or run `git lfs pull`
after cloning so `backend/models/cut/8_net_G.pth` is materialized instead of remaining a pointer.
