from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List, Optional

from pydantic import BaseModel, Field


class GenerationSpec(BaseModel):
    user_id: str
    character_id: Optional[str] = None
    pack_id: Optional[str] = None
    kind: str = "canonical_generation"
    seed: int = 42
    workflow_version: str = "v1.0"
    prompt: Optional[str] = None
    style: str = "chibi"
    emotion: str = "happy"
    source_asset_id: Optional[str] = None
    extra_params: Dict[str, Any] = Field(default_factory=dict)


class GenerationArtifact(BaseModel):
    asset_id: str
    relative_path: str
    mime_type: str
    byte_size: int
    sha256: str
    width: int
    height: int
    variant_name: str  # e.g., "candidate_1", "candidate_2", "candidate_3"


class GenerationResult(BaseModel):
    success: bool
    provider: str
    workflow_version: str
    artifacts: List[GenerationArtifact]
    metrics: Dict[str, Any] = Field(default_factory=dict)
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class GenerationProvider(ABC):
    @abstractmethod
    async def generate(
        self,
        spec: GenerationSpec,
        progress_callback: Optional[Callable[[str, int], None]] = None,
    ) -> GenerationResult:
        pass
