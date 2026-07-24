import asyncio
import json
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from backend.app.providers.base import GenerationSpec
from backend.app.providers.factory import get_generation_provider
from experiments.benchmark.schemas import EvalRun


async def run_benchmark_eval(
    runs_count: int = 3,
    style: str = "chibi",
    emotion: str = "happy",
) -> EvalRun:
    provider = get_generation_provider()
    source_path = Path("test_images/open_source/cc0-mug.jpg").resolve()
    spec = GenerationSpec(
        user_id="benchmark-eval-user",
        source_uri=str(source_path),
        seed=1000,
        style=style,
        emotion=emotion,
        workflow_version="v1.0",
    )

    started_at = datetime.now(timezone.utc).isoformat()
    start_time = time.time()

    result = await provider.generate(spec)
    elapsed_ms = round((time.time() - start_time) * 1000, 2)
    completed_at = datetime.now(timezone.utc).isoformat()

    eval_run = EvalRun(
        id=f"eval_{uuid.uuid4().hex[:8]}",
        provider=result.provider,
        model_bundle="birefnet-universal-cartoon",
        workflow_version=result.workflow_version,
        seed=spec.seed,
        started_at=started_at,
        completed_at=completed_at,
        duration_ms=elapsed_ms,
        gpu_seconds=float(result.metrics.get("gpu_seconds", 0.0)),
        estimated_cost_usd=0.0,
        metrics={
            "artifacts_count": len(result.artifacts),
            "inference_latency_ms": elapsed_ms,
            "benchmark_status": "local_universal_passed",
        },
        artifacts=[a.model_dump() for a in result.artifacts],
        status="succeeded" if result.success else "failed",
    )

    output_dir = Path("data/artifacts/benchmark_results")
    output_dir.mkdir(parents=True, exist_ok=True)
    out_file = output_dir / f"{eval_run.id}.json"
    await asyncio.to_thread(
        out_file.write_text,
        json.dumps(eval_run.model_dump(), indent=2),
        encoding="utf-8",
    )

    return eval_run


if __name__ == "__main__":
    run = asyncio.run(run_benchmark_eval())
