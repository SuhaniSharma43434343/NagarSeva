"""Resolve LFS pointers from operator-supplied HTTPS artifact URLs; verify SHA-256."""
import hashlib
import os
from pathlib import Path
import shutil
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parent.parent

def prepare(name, required=True):
    path = ROOT / "models" / f"{name}.pt"
    prefix = path.read_bytes()[:256] if path.exists() and path.stat().st_size < 1024 else b""
    pointer = prefix.startswith(b"version https://git-lfs.github.com/spec/v1")
    expected = os.getenv(f"{name.upper()}_MODEL_SHA256", "")
    if pointer and not expected:
        expected = next(line.split(":")[1] for line in prefix.decode().splitlines() if line.startswith("oid sha256:"))
    url = os.getenv(f"{name.upper()}_MODEL_URL")
    if not path.exists() or pointer:
        if not url:
            if required:
                raise RuntimeError(f"Real {name} weights missing. Set {name.upper()}_MODEL_URL or upload the Git LFS object.")
            return False
        if not url.startswith("https://") or not expected:
            raise RuntimeError("Model downloads require HTTPS and a SHA-256 checksum.")
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = None
        try:
            with urllib.request.urlopen(url, timeout=120) as response, tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as output:
                temporary = Path(output.name)
                shutil.copyfileobj(response, output)
            verify(temporary, expected)
            temporary.replace(path)
        finally:
            if temporary:
                temporary.unlink(missing_ok=True)
    if expected:
        verify(path, expected)
    if path.stat().st_size < 1024:
        raise RuntimeError(f"{name} is not a usable model file.")
    return True

def verify(path, expected):
    with path.open("rb") as file:
        actual = hashlib.file_digest(file, "sha256").hexdigest()
    if actual != expected.lower():
        raise RuntimeError(f"Model checksum mismatch: {path.name}")

if __name__ == "__main__":
    prepare("pothole")
    prepare("garbage", required=False)
