import os
import tempfile

import pytest
from backend.app.db.base import Base
from backend.app.db.session import get_db
from backend.app.main import app
from backend.app.storage.asset_store import LocalFilesystemAssetStore, default_asset_store
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture(scope="function")
def temp_dir():
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture(scope="function")
def test_db_session(temp_dir):
    db_path = os.path.join(temp_dir, "test.db")
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()

    # Configure custom asset store root for test
    asset_root = os.path.join(temp_dir, "assets")
    default_asset_store.root_dir = LocalFilesystemAssetStore(root_dir=asset_root).root_dir

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
