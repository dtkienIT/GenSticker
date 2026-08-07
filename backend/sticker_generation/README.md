# Standalone Sticker Generation

This package owns only image generation. It does not depend on Expo, FastAPI,
SQLAlchemy, or the app's job schema.

In the `kien_v4` worktree it lives under `backend/sticker_generation`. Run it
from the repository root with `PYTHONPATH=backend`.

## Prepare Pose References

The supplied 5x4 reference sheet can be converted into 20 clean pose images.
The crop removes the caption strip so the image model does not copy the text.

```powershell
python -m sticker_generation extract-pose-refs `
  --sheet path/to/reference-sheet.png `
  --out backend/assets/pose_references/reference-v1
```

## Generate Canonical Candidates

Keep the best candidate manually. Do not run the full pack before approving a
canonical character.

```powershell
# Put GEMINI_API_KEY=... in the repository .env file first.
$env:PYTHONPATH = "backend"
python -m sticker_generation canonical `
  --selfie path/to/selfie.jpg `
  --out outputs/canonical `
  --provider gemini `
  --model gemini-2.5-flash-image `
  --candidates 1
```

Start with one candidate because Gemini image generation requires paid-tier
billing. At the current listed price, one generated image is approximately
USD 0.039 plus input-token charges.

## Generate The Pack

```powershell
python -m sticker_generation pack `
  --selfie path/to/selfie.jpg `
  --canonical outputs/canonical/canonical_2.png `
  --pose-refs backend/assets/pose_references/reference-v1 `
  --out outputs/sticker_pack `
  --provider gemini `
  --model gemini-2.5-flash-image `
  --concurrency 3 `
  --retries 1
```

The output contains 20 individual PNGs, a `contact_sheet.png`, and a
`manifest.json` with input hashes, provider/model, request IDs, attempts,
latency, and estimated cost. The package intentionally does not render the
Vietnamese labels; the consumer can add them deterministically later.

## Provider Choice

The provider is isolated behind `ImageProvider`. Included adapters support the
fal queue API, Gemini native image generation, and OpenAI GPT Image editing.
Select one with `--provider fal`, `--provider gemini`, or `--provider openai`;
the catalog and orchestration remain provider-independent. For OpenAI, set
`OPENAI_API_KEY` and use `--model gpt-image-1.5`.

## Web App Three-Call Mode

The web app's grouped OpenAI flow uses three image-generation requests. The
first creates a high-resolution canonical character from the selfie. The next
two use both the selfie and canonical as references and each create a strict
5-column by 2-row landscape sheet. The server crops the two sheets row by row
into 20 ordered PNG stickers.

The raw selfie and both generated sheets remain available in the result view so
the user can compare identity before using the cropped stickers. A malformed or
structurally invalid sheet is rejected rather than reported as a false success,
and the grouped flow does not retry automatically.
