from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


JOB_ID_PATTERN = re.compile(r"job_[a-f0-9]{10}")
MAX_STATE_BYTES = 32 * 1024 * 1024


class JobStateStore:
  """Small atomic JSON store for recoverable local generation jobs."""

  def __init__(self, root: Path) -> None:
    self.root = root.resolve()

  def job_dir(self, job_id: str) -> Path:
    if not JOB_ID_PATTERN.fullmatch(job_id):
      raise ValueError("job_id_invalid")
    return self.root / job_id

  def save(self, job_id: str, payload: dict[str, Any]) -> Path:
    directory = self.job_dir(job_id)
    directory.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if len(encoded) > MAX_STATE_BYTES:
      raise ValueError("job_state_too_large")
    temporary = directory / "state.json.tmp"
    destination = directory / "state.json"
    temporary.write_bytes(encoded)
    temporary.replace(destination)
    return directory

  def load_all(self) -> tuple[tuple[Path, dict[str, Any]], ...]:
    if not self.root.is_dir():
      return ()
    records: list[tuple[Path, dict[str, Any]]] = []
    for directory in sorted(self.root.glob("job_*")):
      if not directory.is_dir() or not JOB_ID_PATTERN.fullmatch(directory.name):
        continue
      state_path = directory / "state.json"
      try:
        if not state_path.is_file() or state_path.stat().st_size > MAX_STATE_BYTES:
          continue
        payload = json.loads(state_path.read_text(encoding="utf-8"))
      except (OSError, ValueError, json.JSONDecodeError):
        continue
      if isinstance(payload, dict):
        records.append((directory.resolve(), payload))
    return tuple(records)
