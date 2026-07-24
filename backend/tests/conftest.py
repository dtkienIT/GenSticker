# ruff: noqa: E402
import os
import tempfile
import uuid
from io import BytesIO
from pathlib import Path

_TEST_RUNTIME = tempfile.TemporaryDirectory(prefix="gensticker-tests-")
_TEST_RUNTIME_PATH = Path(_TEST_RUNTIME.name)
os.environ.update(
    {
        "APP_ENV": "test",
        "ASSET_ROOT": str(_TEST_RUNTIME_PATH / "assets"),
        "DATABASE_URL": f"sqlite:///{(_TEST_RUNTIME_PATH / 'bootstrap.db').as_posix()}",
        "STICKER_PROVIDER": "universal",
        "STICKER_DEVICE": "cpu",
        "BIREFNET_MODEL_PATH": str(_TEST_RUNTIME_PATH / "birefnet"),
        "SUPABASE_URL": "",
        "SUPABASE_ANON_KEY": "",
        "SUPABASE_SERVICE_ROLE_KEY": "",
        "SUPABASE_JWT_SECRET": "",
        "SUPABASE_STORAGE_BUCKET": "test-assets",
    }
)

import pytest
from backend.app.api.v1.endpoints import assets as assets_endpoint
from backend.app.api.v1.endpoints import characters as characters_endpoint
from backend.app.api.v1.endpoints import health as health_endpoint
from backend.app.core.config import settings
from backend.app.db.base import Base
from backend.app.db.session import get_db
from backend.app.jobs import runner as job_runner
from backend.app.main import app
from backend.app.providers.base import GenerationArtifact, GenerationResult, GenerationStage
from backend.app.storage import asset_store as asset_store_module
from backend.app.storage.asset_store import LocalFilesystemAssetStore
from fastapi.testclient import TestClient
from PIL import Image as PILImage
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture(scope="function")
def temp_dir():
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture(scope="function", autouse=True)
def isolated_external_services(temp_dir, monkeypatch):
    local_store = LocalFilesystemAssetStore(root_dir=Path(temp_dir) / "assets")

    monkeypatch.setattr(settings, "STICKER_PROVIDER", "universal")
    monkeypatch.setattr(settings, "STICKER_DEVICE", "cpu")
    monkeypatch.setattr(settings, "SUPABASE_URL", "")
    monkeypatch.setattr(settings, "SUPABASE_ANON_KEY", "")
    monkeypatch.setattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "")
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "")

    monkeypatch.setattr(asset_store_module, "default_asset_store", local_store)
    monkeypatch.setattr(assets_endpoint, "default_asset_store", local_store)
    monkeypatch.setattr(characters_endpoint, "default_asset_store", local_store)
    monkeypatch.setattr(health_endpoint, "default_asset_store", local_store)
    monkeypatch.setattr(job_runner, "default_asset_store", local_store)

    class TestGenerationProvider:
        async def generate(self, spec, progress_callback=None):
            if progress_callback:
                progress_callback(GenerationStage.GENERATING, 60)
            artifacts = []
            candidate_count = 3 if spec.kind == "canonical_generation" else 1
            for index in range(candidate_count):
                image = PILImage.new("RGBA", (8, 8), (99, 102, 241, 255))
                output = BytesIO()
                image.save(output, format="PNG")
                stored = local_store.save_bytes(
                    output.getvalue(),
                    user_id=spec.user_id,
                    extension=".png",
                    asset_subfolder="test-provider",
                )
                artifacts.append(
                    GenerationArtifact(
                        asset_id=str(uuid.uuid4()),
                        relative_path=stored.relative_path,
                        mime_type=stored.mime_type,
                        byte_size=stored.byte_size,
                        sha256=stored.sha256,
                        width=stored.width or 8,
                        height=stored.height or 8,
                        variant_name=f"candidate_{index + 1}",
                    )
                )
            return GenerationResult(
                success=True,
                provider="universal",
                workflow_version=spec.workflow_version,
                artifacts=artifacts,
                metrics={"gpu_seconds": 0.01},
            )

    monkeypatch.setattr(
        job_runner,
        "get_generation_provider",
        lambda: TestGenerationProvider(),
    )
    yield local_store


@pytest.fixture(scope="function")
def test_db_session(temp_dir, isolated_external_services):
    db_path = os.path.join(temp_dir, "test.db")
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()

    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture(scope="function")
def client(test_db_session):
    def _get_test_db():
        try:
            yield test_db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _get_test_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
