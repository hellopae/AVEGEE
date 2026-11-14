"""Read-only checks for the BOSS-ART-3 delivery; run from repo root."""
import hashlib
import json
from pathlib import Path

from PIL import Image


def main():
    review = Path(__file__).resolve().parent
    root = review.parents[2]
    manifest = json.loads((review / "file-validation.json").read_text())
    assert len(manifest["assets"]) == 9
    for asset in manifest["assets"]:
        path = root / asset["path"]
        with Image.open(path) as image:
            image.load()
            assert image.size == (1672, 941), path
            assert image.mode == "RGB", path
            assert image.format == "WEBP", path
            assert getattr(image, "n_frames", 1) == 1, path
        assert hashlib.sha256(path.read_bytes()).hexdigest() == asset["sha256"], path
    evidence = list(review.glob("*.webp"))
    assert len(evidence) == 10
    for path in evidence:
        with Image.open(path) as image:
            image.load()
            assert image.mode == "RGB" and image.format == "WEBP", path
    print("Checked 9 assets: 1672x941 RGB WebP, one frame, SHA-256 matches.")
    print("Decoded 10 evidence images. Text/identity/style require visual review.")


if __name__ == "__main__":
    main()
