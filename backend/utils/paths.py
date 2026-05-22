import os
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_STORAGE_ROOT = PROJECT_ROOT / "storage"


def storage_root() -> Path:
    return Path(os.getenv("STORAGE_PATH", str(DEFAULT_STORAGE_ROOT)))


def storage_path(env_name: str, default_relative: str) -> Path:
    return Path(os.getenv(env_name, str(storage_root() / default_relative)))
