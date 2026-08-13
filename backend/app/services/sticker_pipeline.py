import asyncio
import base64
import shutil
import uuid
from contextlib import nullcontext
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional

from app.config import settings
from app.models.schemas import ProcessStepProgress, StickerItemResponse, StickerJobResponse
from app.services.job_state_store import JobStateStore
from app.services.supabase_service import SupabaseService
from sticker_generation.catalog import DEFAULT_STICKER_CATALOG
from sticker_generation.grouped import GroupedStickerGenerator
from sticker_generation.providers.openai_image import OpenAIImageProvider

job_store: Dict[str, StickerJobResponse] = {}
job_owners: Dict[str, str] = {}
background_tasks: set[asyncio.Task[None]] = set()
job_tasks: Dict[str, asyncio.Task[None]] = {}
job_artifacts: Dict[str, Path] = {}
job_retries: Dict[str, int] = {}


@dataclass(frozen=True)
class JobContext:
  style_id: str
  filename: str
  content_type: str


job_contexts: Dict[str, JobContext] = {}
MAX_SHEET_RETRIES = 2

STYLE_PROMPTS = {
  "3d-chibi": "polished soft 3D chibi sticker, gentle studio lighting, identity-faithful proportions",
  "anime-kawaii": "clean hand-drawn Korean and Japanese portrait sticker, soft cel shading, elegant expressive line art",
  "cyberpunk": "clean cyberpunk portrait sticker with restrained cyan and coral neon accents",
  "comic-pop": "bold modern comic portrait sticker, crisp ink contours, controlled halftone accents",
  "pixel-retro": "high-detail modern pixel-art portrait sticker with readable facial identity",
  "claymation": "premium handcrafted clay character sticker with soft tactile texture",
  "doodle-line": "minimal editorial doodle portrait sticker with expressive black line work",
  "watercolor": "soft watercolor portrait sticker with clean facial features and controlled edges",
  "pixel-art": "high-detail modern pixel-art portrait sticker with readable facial identity",
  "doodle-cartoon": "minimal editorial doodle portrait sticker with expressive black line work",
  "vector-flat": "premium flat vector portrait sticker with clean geometric color blocks",
  "neon-glow": "clean portrait sticker with restrained cyan and coral neon glow",
  "vintage-retro": "warm vintage editorial portrait sticker with subtle print texture",
}

STYLE_NAMES = {
  "3d-chibi": "3D Chibi Cutie",
  "anime-kawaii": "Anime Kawaii",
  "cyberpunk": "Cyberpunk Neon",
  "comic-pop": "Comic Pop Art",
  "pixel-retro": "Pixel Retro 16-bit",
  "claymation": "Claymation 3D",
  "doodle-line": "Doodle Line Art",
  "watercolor": "Watercolor Soft",
}

PIPELINE_STEPS_CONFIG = (
  (1, "Normalize portrait", "Rotate, strip metadata, and validate the uploaded image."),
  (2, "Lock facial identity", "Create an identity-faithful canonical character."),
  (3, "Lock character style", "Fix outfit, proportions, line work, and palette."),
  (4, "Generate three 8-cell sheets", "Generate three landscape 4x2 sheets from the approved canonical."),
  (5, "Extract twenty PNG stickers", "Split the three sheets, discard reserve cells, remove backgrounds, and add die-cut outlines."),
)


class StickerPipelineService:
  @staticmethod
  def _track_task(job_id: str, task: asyncio.Task[None] | None) -> None:
    if task is None:
      return
    background_tasks.add(task)
    job_tasks[job_id] = task

    def forget(completed: asyncio.Task[None]) -> None:
      background_tasks.discard(completed)
      job_tasks.pop(job_id, None)

    task.add_done_callback(forget)

  @staticmethod
  async def wait_for_job(job_id: str) -> StickerJobResponse | None:
    task = job_tasks.get(job_id)
    if task is not None:
      await task
    return job_store.get(job_id)

  @staticmethod
  def _compact_inline_job(job: StickerJobResponse) -> None:
    if not settings.RUN_GENERATION_INLINE:
      return
    job.preview_image_url = None
    job.preview_image_urls = []

  @staticmethod
  def _state_store() -> JobStateStore:
    return JobStateStore(Path(settings.JOB_STORAGE_ROOT))

  @staticmethod
  def _persist_job(job_id: str) -> None:
    job = job_store.get(job_id)
    owner_id = job_owners.get(job_id)
    context = job_contexts.get(job_id)
    if job is None or owner_id is None or context is None:
      return
    StickerPipelineService._state_store().save(
      job_id,
      {
        "version": 1,
        "owner_id": owner_id,
        "context": asdict(context),
        "retry_count": job_retries.get(job_id, 0),
        "job": job.model_dump(mode="json"),
      },
    )

  @staticmethod
  def restore_persisted_jobs() -> int:
    restored_count = 0
    for artifact_dir, payload in StickerPipelineService._state_store().load_all():
      try:
        owner_id = payload.get("owner_id")
        context_payload = payload.get("context")
        retry_count = payload.get("retry_count", 0)
        job_payload = payload.get("job")
        if not isinstance(owner_id, str) or not owner_id or len(owner_id) > 200:
          continue
        if not isinstance(context_payload, dict) or not isinstance(job_payload, dict):
          continue
        job = StickerJobResponse.model_validate(job_payload)
        if job.job_id != artifact_dir.name or job.job_id in job_store:
          continue
        context = JobContext(
          style_id=str(context_payload.get("style_id", "")),
          filename=Path(str(context_payload.get("filename", "portrait.png"))).name,
          content_type=str(context_payload.get("content_type", "")),
        )
        if (
          context.style_id not in STYLE_PROMPTS
          or context.content_type not in {"image/jpeg", "image/png", "image/webp"}
          or not isinstance(retry_count, int)
          or retry_count < 0
          or retry_count > MAX_SHEET_RETRIES
        ):
          continue

        interrupted = job.status == "processing"
        if interrupted:
          job.status = "error"
          job.error_message = (
            "Phiên xử lý bị gián đoạn. Có thể tiếp tục từ các bảng đã hoàn thành."
          )
          if job.preview_image_urls:
            job.quality_status = "rejected"
          active_index = max(0, min(job.current_step - 1, len(job.steps) - 1))
          job.steps[active_index].status = "error"

        job_store[job.job_id] = job
        job_owners[job.job_id] = owner_id
        job_contexts[job.job_id] = context
        job_artifacts[job.job_id] = artifact_dir
        job_retries[job.job_id] = retry_count
        if interrupted:
          StickerPipelineService._persist_job(job.job_id)
        restored_count += 1
      except (OSError, TypeError, ValueError):
        continue
    StickerPipelineService._prune_state(datetime.utcnow())
    return restored_count

  @staticmethod
  def _drop_job(job_id: str) -> None:
    artifact_dir = job_artifacts.pop(job_id, None)
    if artifact_dir is not None:
      shutil.rmtree(artifact_dir, ignore_errors=True)
    job_store.pop(job_id, None)
    job_owners.pop(job_id, None)
    job_contexts.pop(job_id, None)
    job_retries.pop(job_id, None)

  @staticmethod
  def _prune_state(now: datetime) -> None:
    cutoff = now - timedelta(seconds=settings.JOB_TTL_SECONDS)
    expired_ids = [
      job_id
      for job_id, job in job_store.items()
      if job.status != "processing" and job.created_at < cutoff
    ]
    for job_id in expired_ids:
      StickerPipelineService._drop_job(job_id)

    completed = sorted(
      (
        (job.created_at, job_id)
        for job_id, job in job_store.items()
        if job.status != "processing"
      ),
      reverse=True,
    )
    for _, job_id in completed[max(0, settings.MAX_RETAINED_JOBS):]:
      StickerPipelineService._drop_job(job_id)

  @staticmethod
  def create_job(
    *,
    owner_id: str,
    style_id: str,
    file_bytes: bytes,
    filename: str,
    content_type: str,
  ) -> StickerJobResponse:
    if not settings.OPENAI_API_KEY.strip():
      raise ValueError("openai_api_key_required")
    if style_id not in STYLE_PROMPTS:
      raise ValueError("unsupported_style")

    now = datetime.utcnow()
    StickerPipelineService._prune_state(now)
    active_jobs = sum(job.status == "processing" for job in job_store.values())
    if active_jobs >= settings.MAX_ACTIVE_GENERATIONS:
      raise ValueError("generation_capacity_reached")
    if any(
      owner == owner_id
      and job_store.get(existing_id)
      and job_store[existing_id].status == "processing"
      for existing_id, owner in job_owners.items()
    ):
      raise ValueError("generation_already_in_progress")

    job_id = f"job_{uuid.uuid4().hex[:10]}"
    steps = [
      ProcessStepProgress(
        id=step_id,
        step_name=name,
        description=description,
        status="processing" if step_id == 1 else "pending",
        progress=0,
      )
      for step_id, name, description in PIPELINE_STEPS_CONFIG
    ]
    job = StickerJobResponse(
      job_id=job_id,
      status="processing",
      current_step=1,
      progress_percentage=0,
      steps=steps,
      created_at=now,
    )
    job_store[job_id] = job
    job_owners[job_id] = owner_id
    artifact_dir = StickerPipelineService._state_store().job_dir(job_id)
    artifact_dir.mkdir(parents=True, exist_ok=False)
    job_artifacts[job_id] = artifact_dir
    job_contexts[job_id] = JobContext(
      style_id=style_id,
      filename=filename,
      content_type=content_type,
    )
    job_retries[job_id] = 0
    StickerPipelineService._persist_job(job_id)
    task = asyncio.create_task(
      StickerPipelineService._run_pipeline_async(
        job_id=job_id,
        style_id=style_id,
        file_bytes=file_bytes,
        filename=filename,
        content_type=content_type,
      )
    )
    StickerPipelineService._track_task(job_id, task)
    return job

  @staticmethod
  def retry_job(job_id: str, *, owner_id: str) -> StickerJobResponse:
    now = datetime.utcnow()
    StickerPipelineService._prune_state(now)
    job = job_store.get(job_id)
    if job is None or job_owners.get(job_id) != owner_id:
      raise ValueError("job_not_found")
    if job.status != "error" or job.quality_status != "rejected":
      raise ValueError("job_not_retryable")
    if job_id not in job_artifacts or job_id not in job_contexts:
      raise ValueError("job_artifacts_missing")

    retry_count = job_retries.get(job_id, 0)
    if retry_count >= MAX_SHEET_RETRIES:
      raise ValueError("job_retry_limit_reached")
    if sum(item.status == "processing" for item in job_store.values()) >= settings.MAX_ACTIVE_GENERATIONS:
      raise ValueError("generation_capacity_reached")

    job_retries[job_id] = retry_count + 1
    job.status = "processing"
    job.error_message = None
    job.quality_status = "reviewing"
    job.current_step = 4
    job.progress_percentage = 35
    job.steps[3].status = "processing"
    job.steps[3].progress = 0
    job.steps[4].status = "pending"
    job.steps[4].progress = 0
    StickerPipelineService._persist_job(job_id)
    task = asyncio.create_task(StickerPipelineService._resume_pipeline_async(job_id))
    StickerPipelineService._track_task(job_id, task)
    return job

  @staticmethod
  def get_job(job_id: str, *, owner_id: str) -> Optional[StickerJobResponse]:
    StickerPipelineService._prune_state(datetime.utcnow())
    if job_owners.get(job_id) != owner_id:
      return None
    return job_store.get(job_id)

  @staticmethod
  async def _run_pipeline_async(
    *,
    job_id: str,
    style_id: str,
    file_bytes: bytes,
    filename: str,
    content_type: str,
  ) -> None:
    job = job_store.get(job_id)
    if not job:
      return

    loop = asyncio.get_running_loop()
    deadline_at = loop.time() + max(1.0, settings.GENERATION_DEADLINE_SECONDS)
    provider: OpenAIImageProvider | None = None
    try:
      provider = OpenAIImageProvider(
        api_key=settings.OPENAI_API_KEY,
        model_id=settings.OPENAI_IMAGE_MODEL,
        base_url=settings.OPENAI_BASE_URL,
        timeout_seconds=(
          min(
            settings.OPENAI_IMAGE_TIMEOUT_SECONDS,
            settings.INLINE_IMAGE_TIMEOUT_SECONDS,
          )
          if settings.RUN_GENERATION_INLINE
          else settings.OPENAI_IMAGE_TIMEOUT_SECONDS
        ),
        trusted_result_domains=tuple(
          domain.strip()
          for domain in settings.OPENAI_IMAGE_RESULT_DOMAINS.split(",")
          if domain.strip()
        ),
      )
      artifact_dir = job_artifacts.get(job_id)
      if artifact_dir is None:
        raise ValueError("job_artifacts_missing")

      with nullcontext(artifact_dir) as temp_dir:
        root = Path(temp_dir)
        suffix = {
          "image/jpeg": ".jpg",
          "image/png": ".png",
          "image/webp": ".webp",
        }.get(content_type, ".png")
        selfie_path = root / f"{Path(filename).stem or 'selfie'}{suffix}"
        selfie_path.write_bytes(file_bytes)

        def on_progress(stage: str, current: int, total: int) -> None:
          if stage == "identity":
            StickerPipelineService._complete_step(job, 0)
            StickerPipelineService._activate_step(job, 1, 15)
          elif stage == "canonical":
            StickerPipelineService._complete_step(job, 1)
            StickerPipelineService._activate_step(job, 2, 25)
          elif stage == "groups":
            if job.steps[2].status != "completed":
              StickerPipelineService._complete_step(job, 2)
              StickerPipelineService._activate_step(job, 3, 35)
            job.steps[3].progress = round((current / total) * 100)
            job.progress_percentage = min(89, 35 + round((current / total) * 54))
          StickerPipelineService._persist_job(job_id)

        preview_bytes_total = 0

        def on_sheet(image_bytes: bytes) -> None:
          nonlocal preview_bytes_total
          if len(image_bytes) > 8 * 1024 * 1024:
            raise ValueError("preview_image_too_large")
          if settings.RUN_GENERATION_INLINE:
            return
          preview_bytes_total += len(image_bytes)
          if preview_bytes_total > 16 * 1024 * 1024:
            raise ValueError("preview_image_too_large")
          encoded = base64.b64encode(image_bytes).decode("ascii")
          preview_url = f"data:image/png;base64,{encoded}"
          job.preview_image_url = preview_url
          if preview_url not in job.preview_image_urls:
            job.preview_image_urls = [*job.preview_image_urls, preview_url]
          job.quality_status = "reviewing"
          StickerPipelineService._persist_job(job_id)

        generator = GroupedStickerGenerator(
          provider=provider,
          canvas_size=512,
          max_provider_attempts=settings.OPENAI_IMAGE_MAX_ATTEMPTS,
          retry_base_delay_seconds=settings.OPENAI_IMAGE_RETRY_BASE_DELAY_SECONDS,
          sheet_concurrency=(
            settings.INLINE_IMAGE_SHEET_CONCURRENCY
            if settings.RUN_GENERATION_INLINE
            else settings.OPENAI_IMAGE_SHEET_CONCURRENCY
          ),
        )
        paths = await asyncio.wait_for(
          generator.generate(
            selfie_path=selfie_path,
            output_dir=root / "result",
            style_prompt=STYLE_PROMPTS[style_id],
            on_progress=on_progress,
            on_sheet=on_sheet,
          ),
          timeout=max(0.1, deadline_at - loop.time()),
        )
        if len(paths) != len(DEFAULT_STICKER_CATALOG):
          raise RuntimeError("incomplete_sticker_pack")

        StickerPipelineService._complete_step(job, 3)
        StickerPipelineService._activate_step(job, 4, 92)
        job.stickers = StickerPipelineService._build_responses(
          paths,
          style_id,
          include_data_urls=not settings.RUN_GENERATION_INLINE,
        )
        job.quality_status = "reviewing"
        StickerPipelineService._persist_job(job_id)
        await asyncio.wait_for(
          StickerPipelineService._persist_completed_pack(job_id, style_id, paths),
          timeout=max(0.1, deadline_at - loop.time()),
        )
        StickerPipelineService._complete_step(job, 4)
        job.progress_percentage = 100
        job.quality_status = "accepted"
        StickerPipelineService._compact_inline_job(job)
        job.status = "completed"
        StickerPipelineService._persist_job(job_id)
    except Exception as error:
      job.status = "error"
      job.error_message = StickerPipelineService._safe_error(error)
      if job.preview_image_url:
        job.quality_status = "rejected"
      StickerPipelineService._compact_inline_job(job)
      active_index = max(0, min(job.current_step - 1, len(job.steps) - 1))
      job.steps[active_index].status = "error"
      StickerPipelineService._persist_job(job_id)
    finally:
      if provider is not None:
        await provider.close()

  @staticmethod
  async def _resume_pipeline_async(job_id: str) -> None:
    job = job_store.get(job_id)
    context = job_contexts.get(job_id)
    root = job_artifacts.get(job_id)
    if job is None or context is None or root is None:
      return

    loop = asyncio.get_running_loop()
    deadline_at = loop.time() + max(1.0, settings.GENERATION_DEADLINE_SECONDS)
    provider: OpenAIImageProvider | None = None
    try:
      provider = OpenAIImageProvider(
        api_key=settings.OPENAI_API_KEY,
        model_id=settings.OPENAI_IMAGE_MODEL,
        base_url=settings.OPENAI_BASE_URL,
        timeout_seconds=(
          min(
            settings.OPENAI_IMAGE_TIMEOUT_SECONDS,
            settings.INLINE_IMAGE_TIMEOUT_SECONDS,
          )
          if settings.RUN_GENERATION_INLINE
          else settings.OPENAI_IMAGE_TIMEOUT_SECONDS
        ),
        trusted_result_domains=tuple(
          domain.strip()
          for domain in settings.OPENAI_IMAGE_RESULT_DOMAINS.split(",")
          if domain.strip()
        ),
      )
      preview_bytes_total = 0

      def on_progress(stage: str, current: int, total: int) -> None:
        if stage == "groups":
          job.steps[3].progress = round((current / total) * 100)
          job.progress_percentage = min(89, 35 + round((current / total) * 54))
          StickerPipelineService._persist_job(job_id)

      def on_sheet(image_bytes: bytes) -> None:
        nonlocal preview_bytes_total
        if len(image_bytes) > 8 * 1024 * 1024:
          raise ValueError("preview_image_too_large")
        if settings.RUN_GENERATION_INLINE:
          return
        preview_bytes_total += len(image_bytes)
        if preview_bytes_total > 16 * 1024 * 1024:
          raise ValueError("preview_image_too_large")
        preview_url = f"data:image/png;base64,{base64.b64encode(image_bytes).decode('ascii')}"
        job.preview_image_url = preview_url
        if preview_url not in job.preview_image_urls:
          job.preview_image_urls = [*job.preview_image_urls, preview_url]
        job.quality_status = "reviewing"
        StickerPipelineService._persist_job(job_id)

      generator = GroupedStickerGenerator(
        provider=provider,
        canvas_size=512,
        max_provider_attempts=settings.OPENAI_IMAGE_MAX_ATTEMPTS,
        retry_base_delay_seconds=settings.OPENAI_IMAGE_RETRY_BASE_DELAY_SECONDS,
        sheet_concurrency=(
          settings.INLINE_IMAGE_SHEET_CONCURRENCY
          if settings.RUN_GENERATION_INLINE
          else settings.OPENAI_IMAGE_SHEET_CONCURRENCY
        ),
      )
      paths = await asyncio.wait_for(
        generator.resume(
          output_dir=root / "result",
          style_prompt=STYLE_PROMPTS[context.style_id],
          on_progress=on_progress,
          on_sheet=on_sheet,
        ),
        timeout=max(0.1, deadline_at - loop.time()),
      )
      if len(paths) != len(DEFAULT_STICKER_CATALOG):
        raise RuntimeError("incomplete_sticker_pack")

      StickerPipelineService._complete_step(job, 3)
      StickerPipelineService._activate_step(job, 4, 92)
      job.stickers = StickerPipelineService._build_responses(
        paths,
        context.style_id,
        include_data_urls=not settings.RUN_GENERATION_INLINE,
      )
      job.quality_status = "reviewing"
      StickerPipelineService._persist_job(job_id)
      await asyncio.wait_for(
        StickerPipelineService._persist_completed_pack(job_id, context.style_id, paths),
        timeout=max(0.1, deadline_at - loop.time()),
      )
      StickerPipelineService._complete_step(job, 4)
      job.progress_percentage = 100
      job.quality_status = "accepted"
      StickerPipelineService._compact_inline_job(job)
      job.status = "completed"
      StickerPipelineService._persist_job(job_id)
    except Exception as error:
      job.status = "error"
      job.error_message = StickerPipelineService._safe_error(error)
      if job.preview_image_url:
        job.quality_status = "rejected"
      StickerPipelineService._compact_inline_job(job)
      active_index = max(0, min(job.current_step - 1, len(job.steps) - 1))
      job.steps[active_index].status = "error"
      StickerPipelineService._persist_job(job_id)
    finally:
      if provider is not None:
        await provider.close()

  @staticmethod
  async def _persist_completed_pack(
    job_id: str,
    style_id: str,
    paths: tuple[Path, ...],
  ) -> None:
    """Keep kien_v4 history/Telegram data available after real AI generation."""
    job = job_store.get(job_id)
    owner_id = job_owners.get(job_id)
    if job is None or not owner_id or not job.stickers:
      return

    style_name = STYLE_NAMES.get(style_id, style_id.replace("-", " ").title())
    uploaded_public_urls: list[str] = []
    try:
      sticker_payloads = [sticker.model_dump() for sticker in job.stickers]
      has_storage = SupabaseService.has_storage_client()
      if settings.RUN_GENERATION_INLINE and not has_storage:
        raise RuntimeError("sticker_storage_unavailable")
      if has_storage:
        uploaded_count = 0
        upload_total = len(job.stickers)

        async def upload_sticker(sticker, path: Path, payload: dict) -> None:
          nonlocal uploaded_count
          public_url = await asyncio.to_thread(
            SupabaseService.upload_image_to_storage,
            path.read_bytes(),
            f"{job_id}_{sticker.id}.png",
            "image/png",
          )
          if public_url and "api.dicebear.com" not in public_url:
            uploaded_public_urls.append(public_url)
            payload["image_url"] = public_url
            if settings.RUN_GENERATION_INLINE:
              sticker.image_url = public_url
          elif settings.RUN_GENERATION_INLINE:
            raise RuntimeError("sticker_storage_unavailable")

          uploaded_count += 1
          if job.steps[4].status == "processing":
            job.steps[4].progress = round((uploaded_count / upload_total) * 100)
            job.progress_percentage = min(
              99,
              92 + round((uploaded_count / upload_total) * 7),
            )
            StickerPipelineService._persist_job(job_id)

        upload_items = tuple(zip(job.stickers, paths, sticker_payloads, strict=True))
        for sticker, path, payload in upload_items:
          await upload_sticker(sticker, path, payload)

      await asyncio.to_thread(
        SupabaseService.save_sticker_pack,
        user_id=owner_id,
        title=f"Bộ Sticker {style_name}",
        prompt=None,
        style_id=style_id,
        style_name=style_name,
        stickers=sticker_payloads,
      )
    except Exception as error:
      if settings.RUN_GENERATION_INLINE:
        if uploaded_public_urls:
          await asyncio.to_thread(
            SupabaseService.delete_storage_urls,
            uploaded_public_urls,
          )
        raise RuntimeError("sticker_storage_unavailable") from error
      # Persistence must not turn an already generated pack into an AI failure.
      print(f"[WARN] Auto-saving pack to DB failed: {error}")

  @staticmethod
  def _build_responses(
    paths: tuple[Path, ...],
    style_id: str,
    *,
    include_data_urls: bool = True,
  ) -> list[StickerItemResponse]:
    responses: list[StickerItemResponse] = []
    for template, path in zip(DEFAULT_STICKER_CATALOG, paths, strict=True):
      file_size = path.stat().st_size
      image_url = ""
      if include_data_urls:
        data = path.read_bytes()
        encoded = base64.b64encode(data).decode("ascii")
        image_url = f"data:image/png;base64,{encoded}"
      responses.append(
        StickerItemResponse(
          id=f"stk_{template.display_order:02d}",
          title=template.label,
          emotion=template.emotion_prompt,
          tags=[template.template_id, template.emotion_prompt],
          image_url=image_url,
          style_id=style_id,
          width=512,
          height=512,
          file_size_kb=max(1, round(file_size / 1024)),
        )
      )
    return responses

  @staticmethod
  def _activate_step(job: StickerJobResponse, index: int, overall: int) -> None:
    job.current_step = index + 1
    job.steps[index].status = "processing"
    job.progress_percentage = overall

  @staticmethod
  def _complete_step(job: StickerJobResponse, index: int) -> None:
    job.steps[index].status = "completed"
    job.steps[index].progress = 100

  @staticmethod
  def _safe_error(error: Exception) -> str:
    error_code = "generation_timed_out" if isinstance(error, TimeoutError) else str(error)
    messages = {
      "openai_safety_rejection": "Dịch vụ tạo ảnh từ chối ảnh theo chính sách an toàn. Vui lòng chọn ảnh khác.",
      "openai_timeout": "Dịch vụ tạo ảnh phản hồi quá lâu. Vui lòng thử lại.",
      "openai_provider_unavailable": "Dịch vụ tạo ảnh tạm thời không khả dụng. Vui lòng thử lại sau.",
      "openai_quota_or_billing_required": "Dịch vụ tạo ảnh đã hết credit/quota hoặc chưa bật billing.",
      "openai_rate_limit": "Dịch vụ tạo ảnh đang giới hạn tần suất. Vui lòng thử lại sau.",
      "openai_invalid_request": "Dịch vụ tạo ảnh từ chối cấu hình request hiện tại.",
      "openai_api_key_or_permission_invalid": "API key tạo ảnh không hợp lệ hoặc không có quyền dùng model ảnh.",
      "openai_invalid_response": "Proxy tạo ảnh trả về dữ liệu không tương thích. Vui lòng kiểm tra cấu hình proxy.",
      "openai_missing_image_result": "Proxy tạo ảnh không trả về tệp ảnh. Vui lòng kiểm tra cấu hình proxy.",
      "openai_invalid_image_result": "Proxy tạo ảnh trả về định dạng ảnh không được hỗ trợ.",
      "openai_invalid_image_data": "Proxy tạo ảnh trả về dữ liệu ảnh bị lỗi.",
      "openai_untrusted_image_url": "Proxy tạo ảnh trả về đường dẫn ảnh không an toàn hoặc khác máy chủ.",
      "provider_output_too_large": "Ảnh trả về vượt giới hạn an toàn.",
      "pack_sheet_grid_not_detected": "Bảng ảnh đã được tạo nhưng bố cục không đủ sạch để tự động cắt thành 20 sticker. Bạn vẫn có thể xem ảnh gốc bên dưới.",
      "preview_image_too_large": "Bảng ảnh trả về quá lớn để hiển thị an toàn trên web.",
      "pack_sheet_invalid_image": "Dịch vụ tạo ảnh không trả về một tệp ảnh hợp lệ để hiển thị.",
      "sticker_storage_unavailable": "Không thể lưu bộ sticker lên kho ảnh. Vui lòng thử lại.",
      "generation_timed_out": "Tác vụ tạo sticker vượt quá thời gian xử lý an toàn. Vui lòng thử lại.",
    }
    return messages.get(
      error_code,
      "Hệ thống xử lý sticker gặp lỗi. Vui lòng thử lại.",
    )
