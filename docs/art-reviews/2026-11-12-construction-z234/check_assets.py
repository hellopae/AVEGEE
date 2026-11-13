"""ตรวจเฉพาะไฟล์ครบ / เปิดได้ / ขนาดถูก ตาม CONSTRUCTION-Z234.

Run: python3 docs/art-reviews/2026-11-12-construction-z234/check_assets.py
Requires Pillow. Does not judge art, animation quality, or in-game rendering.
"""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent


def main():
    images = 0
    for zone in ("asia", "west", "cyberhell"):
        folder = ROOT / zone
        manifest = json.loads((folder / "construction.json").read_text(encoding="utf-8"))
        (folder / "README.md").read_text(encoding="utf-8")
        assert (manifest["frameW"], manifest["frameH"]) == (704, 704), zone
        for stage in (1, 2, 3):
            for path, size in (
                (folder / f"stage-{stage}.webp", (5632, 704)),
                (folder / "preview" / f"stage-{stage}.gif", (704, 704)),
            ):
                assert path.is_file(), str(path)
                with Image.open(path) as im:
                    for frame in range(getattr(im, "n_frames", 1)):
                        im.seek(frame)
                        im.load()
                        assert im.size == size, (str(path), frame, im.size, size)
                images += 1
        print(f"{zone}: required files present, JSON/text readable, 6 images decoded at expected sizes")
    print(f"Checked {images} images, 3 manifests, 3 Thai READMEs. File/decode/size checks only.")


if __name__ == "__main__":
    main()
